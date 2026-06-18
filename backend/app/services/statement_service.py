import os
import re
import json
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from decimal import Decimal
import pdfplumber

from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.transaction_rule import TransactionRule
from app.models.category import Category

# Gemini setup
from google import genai
from google.genai import types

def parse_csv(file_path):
    df = pd.read_csv(file_path)
    
    # Simple heuristic to find Date, Description, Amount columns
    cols = [c.lower() for c in df.columns]
    date_col = next((c for c in df.columns if 'date' in c.lower()), None)
    desc_col = next((c for c in df.columns if 'description' in c.lower() or 'details' in c.lower() or 'narrative' in c.lower()), None)
    amt_col = next((c for c in df.columns if 'amount' in c.lower() or 'withdrawal' in c.lower()), None)
    
    if not (date_col and desc_col and amt_col):
        raise ValueError("Could not automatically identify Date, Description, and Amount columns in the CSV.")
    
    parsed = []
    for _, row in df.iterrows():
        try:
            amt_str = str(row[amt_col]).replace(',', '')
            amt = float(amt_str)
            if pd.isna(amt) or amt == 0:
                continue
            
            # Usually we track expenses as positive in ExpenseLens, or keep them negative. 
            # If "withdrawal" is positive, keep it. If "amount" has negative for expenses, make it positive.
            # Let's assume expenses are negative in CSV and we want positive, or vice versa.
            # We'll just take the absolute value if it's a known expense, but let's just keep the value as is.
            # For personal finance, expenses are usually recorded as positive amounts.
            if 'deposit' in cols and 'withdrawal' in cols:
                if 'withdrawal' in amt_col.lower():
                    pass # It's already the withdrawal amount
            elif amt < 0:
                amt = abs(amt)
            
            # Simple date parsing
            date_val = pd.to_datetime(row[date_col]).to_pydatetime()
            desc_val = str(row[desc_col])
            
            parsed.append({
                "date": date_val,
                "description": desc_val,
                "amount": amt
            })
        except Exception:
            continue
    return parsed

def parse_pdf(file_path):
    parsed = []
    # Broad regex to catch dates like 01/05/2026, 01-May-2026, 1 May 2026, etc.
    date_pattern = re.compile(r'(\d{1,2}[/\-\s]+[A-Za-z]{3,9}[/\-\s]+\d{2,4}|\d{1,2}[/\-\s]+\d{1,2}[/\-\s]+\d{2,4}|\d{4}[/\-\s]+\d{1,2}[/\-\s]+\d{1,2})')
    
    with pdfplumber.open(file_path) as pdf:
        previous_balance = None
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
            lines = text.split('\n')
            for line in lines:
                # First, check if this line gives us an opening balance without a transaction
                if 'Opening Balance' in line or 'Balance Brought Forward' in line:
                    amt_matches = re.findall(r'-?[\d,]+\.\d{2}', line)
                    if amt_matches:
                        try:
                            previous_balance = float(amt_matches[-1].replace(',', ''))
                        except:
                            pass
                    continue
                    
                # Look for a date
                date_match = date_pattern.search(line)
                if not date_match:
                    continue
                
                # Look for amounts
                amt_matches = re.findall(r'-?[\d,]+\.\d{2}', line)
                if len(amt_matches) < 2:
                    continue
                
                # In bank statements, typically the last amount is the balance
                # and the second to last is the actual transaction amount
                amt_str = amt_matches[-2].replace(',', '')
                bal_str = amt_matches[-1].replace(',', '')
                try:
                    amt = float(amt_str)
                    current_balance = float(bal_str)
                    if amt == 0: continue
                    if amt < 0: amt = abs(amt)
                    
                    tx_type = "expense"
                    if previous_balance is not None:
                        # If balance increased, it's a deposit
                        if current_balance > previous_balance:
                            tx_type = "income"
                        else:
                            tx_type = "expense"
                    
                    previous_balance = current_balance
                    
                    date_str = date_match.group(1)
                    # Attempt standard parse
                    try:
                        date_val = pd.to_datetime(date_str).to_pydatetime()
                    except:
                        date_val = datetime.now()
                        
                    # Remove date, amounts, and leading numbers from description
                    desc = line.replace(date_str, '')
                    for m in amt_matches[-2:]:
                        desc = desc.replace(m, '')
                    desc = re.sub(r'^\s*\d+\s+', '', desc).strip()
                    
                    parsed.append({
                        "date": date_val,
                        "description": desc,
                        "amount": amt,
                        "balance": current_balance,
                        "type": "unknown"
                    })
                except:
                    continue
                    
    # Fix Income vs Expense using global sorting order
    if len(parsed) >= 2:
        # Determine if statement is chronological or reverse
        # by comparing first and last dates
        first_date = parsed[0]['date']
        last_date = parsed[-1]['date']
        
        is_reverse = first_date > last_date
        
        for i in range(len(parsed)):
            # Find the balance before this transaction
            if is_reverse:
                # The "previous" balance in time is the NEXT item in the list
                prev_balance = parsed[i+1]['balance'] if i < len(parsed)-1 else None
            else:
                # The "previous" balance in time is the PREVIOUS item in the list
                prev_balance = parsed[i-1]['balance'] if i > 0 else None
                
            curr_balance = parsed[i]['balance']
            
            if prev_balance is not None:
                if curr_balance > prev_balance:
                    parsed[i]['type'] = "income"
                else:
                    parsed[i]['type'] = "expense"
            else:
                # Fallback if it's the very first transaction in time
                # Look at the NEXT transaction in time to guess
                if is_reverse and i > 0:
                    next_bal = parsed[i-1]['balance']
                    parsed[i]['type'] = "income" if curr_balance > next_bal else "expense"
                elif not is_reverse and i < len(parsed)-1:
                    next_bal = parsed[i+1]['balance']
                    parsed[i]['type'] = "income" if curr_balance > next_bal else "expense"
                else:
                    parsed[i]['type'] = "expense" # Ultimate fallback
                    
    # Clean up balance key before returning
    for p in parsed:
        if 'balance' in p:
            del p['balance']
            
    return parsed

async def process_statement(db: AsyncSession, user_id: int, file_path: str, filename: str):
    # 1. Parse raw file
    if filename.endswith('.csv'):
        raw_txns = parse_csv(file_path)
    else:
        raw_txns = parse_pdf(file_path)
        
    if not raw_txns:
        raise ValueError("No transactions could be parsed from the file.")
        
    # 2. Fetch User Categories & Rules
    cats_result = await db.execute(select(Category).where(Category.user_id == user_id))
    categories = cats_result.scalars().all()
    cat_map = {c.id: c.name for c in categories}
    name_to_id = {c.name.lower(): c.id for c in categories}
    
    rules_result = await db.execute(select(TransactionRule).where(TransactionRule.user_id == user_id))
    rules = rules_result.scalars().all()
    
    # 3. Apply memory (rules)
    uncategorized = []
    categorized_txns = []
    
    for tx in raw_txns:
        desc_lower = tx['description'].lower()
        matched_rule = None
        for rule in rules:
            if rule.description_pattern.lower() in desc_lower:
                matched_rule = rule
                break
                
        if matched_rule:
            categorized_txns.append({
                **tx,
                "category_id": matched_rule.category_id
            })
        else:
            uncategorized.append(tx)
            
    # 4. Ask Gemini for remaining
    if uncategorized:
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing.")
            
        client = genai.Client(api_key=api_key)
        
        # Prepare context
        cat_list_str = ", ".join([c.name for c in categories])
        
        prompt = f"""
        You are a financial categorization AI.
        Map each of the following transactions to exactly one of the user's categories.
        User Categories: {cat_list_str}
        
        If unsure, choose "Miscellaneous".
        Respond ONLY with valid JSON in this exact format:
        [
            {{"index": 0, "category_name": "Groceries"}},
            ...
        ]
        
        Transactions:
        """
        for i, tx in enumerate(uncategorized):
            prompt += f"[{i}] {tx['description']} - {tx['amount']}\n"
            
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            # Find JSON array
            json_str = re.search(r'\[.*\]', response.text, re.DOTALL)
            if json_str:
                ai_results = json.loads(json_str.group(0))
                for res in ai_results:
                    idx = res.get("index")
                    cat_name = res.get("category_name", "Miscellaneous")
                    
                    # Fuzzy match category
                    matched_cat_id = name_to_id.get(cat_name.lower())
                    if not matched_cat_id:
                        # Fallback to Misc
                        matched_cat_id = name_to_id.get("miscellaneous")
                        if not matched_cat_id:
                            matched_cat_id = categories[0].id if categories else None
                            
                    uncategorized[idx]["category_id"] = matched_cat_id
            else:
                # Fallback if Gemini fails format
                misc_id = name_to_id.get("miscellaneous") or (categories[0].id if categories else None)
                for tx in uncategorized:
                    tx["category_id"] = misc_id
                    
        except Exception as e:
            # Fallback to Miscellaneous on API failure
            misc_id = name_to_id.get("miscellaneous") or (categories[0].id if categories else None)
            for tx in uncategorized:
                tx["category_id"] = misc_id
                
        categorized_txns.extend(uncategorized)
        
    # 5. Save Statement
    now = datetime.now()
    statement = Statement(
        user_id=user_id,
        month=now.month,
        year=now.year,
        file_path=file_path
    )
    db.add(statement)
    await db.commit()
    await db.refresh(statement)
    
    # 6. Save Transactions
    # Fetch existing signatures to prevent duplicates
    existing_q = select(Transaction.date, Transaction.amount, Transaction.description).where(Transaction.user_id == user_id)
    existing_res = await db.execute(existing_q)
    existing_sigs = set((d.strftime('%Y-%m-%d') if d else None, float(a) if a else 0, str(desc).strip()) for d, a, desc in existing_res.all())

    db_txns = []
    for tx in categorized_txns:
        if tx.get("category_id"):
            # Check duplicate signature
            sig = (
                tx["date"].strftime('%Y-%m-%d') if isinstance(tx["date"], datetime) else str(tx["date"]).split('T')[0],
                float(tx["amount"]),
                str(tx["description"]).strip()
            )
            if sig in existing_sigs:
                continue
                
            db_txns.append(
                Transaction(
                    user_id=user_id,
                    category_id=tx["category_id"],
                    statement_id=statement.id,
                    amount=Decimal(str(tx["amount"])),
                    date=tx["date"],
                    description=tx["description"],
                    type=tx.get("type", "expense")
                )
            )
            existing_sigs.add(sig)
            
    if db_txns:
        db.add_all(db_txns)
        await db.commit()
    
    return categorized_txns
