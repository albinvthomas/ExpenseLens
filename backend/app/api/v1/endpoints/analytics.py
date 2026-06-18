from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import extract, func
from datetime import datetime
from decimal import Decimal

from app.api import deps
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.budget_allocation import BudgetAllocation
from app.models.category import Category
from app.core.database import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    # 1. Fetch Current Budget
    budget_q = select(Budget).where(Budget.user_id == current_user.id, Budget.month == month, Budget.year == year)
    budget_res = await db.execute(budget_q)
    budget = budget_res.scalars().first()

    if not budget:
        return {"error": "No budget found for the current month. Please set up your budget first."}

    # Fetch Allocations
    allocs_q = select(BudgetAllocation).options(selectinload(BudgetAllocation.category)).where(BudgetAllocation.budget_id == budget.id)
    allocs_res = await db.execute(allocs_q)
    allocations = allocs_res.scalars().all()

    # 2. Fetch Current Month Transactions (Both Income and Expense)
    tx_q = select(Transaction).options(selectinload(Transaction.category)).where(
        Transaction.user_id == current_user.id,
        extract('month', Transaction.date) == month,
        extract('year', Transaction.date) == year
    )
    tx_res = await db.execute(tx_q)
    transactions = tx_res.scalars().all()

    # Aggregate spend by category
    spend_by_cat = {}
    for tx in transactions:
        cat_name = tx.category.name if tx.category else "Unknown"
        amt = float(tx.amount)
        
        # If it's an expense, it adds to the category spend.
        # If it's income (like a reimbursement or refund), it subtracts.
        if tx.type == 'income':
            spend_by_cat[cat_name] = spend_by_cat.get(cat_name, 0) - amt
        else:
            spend_by_cat[cat_name] = spend_by_cat.get(cat_name, 0) + amt

    # 3. Build Budget vs Actual Data
    category_data = []
    total_spent = 0
    total_allocated = 0

    from app.models.advice_log import AdviceLog
    from app.services.llm_service import generate_financial_advice
    
    # Fetch existing advice for this month
    advice_q = select(AdviceLog).where(
        AdviceLog.user_id == current_user.id,
        AdviceLog.month == month,
        AdviceLog.year == year
    )
    advice_res = await db.execute(advice_q)
    existing_advice = {a.category_name: a for a in advice_res.scalars().all()}

    for alloc in allocations:
        cat_name = alloc.category.name if alloc.category else "Unknown"
        allocated = float(alloc.amount) + float(alloc.rollover_in)
        spent = spend_by_cat.get(cat_name, 0)
        
        # Remove from spend_by_cat so we can find unbudgeted spend
        if cat_name in spend_by_cat:
            del spend_by_cat[cat_name]
            
        total_allocated += allocated
        total_spent += spent
        overage = max(0, spent - allocated)
        
        advice_text = None
        if overage > 0:
            if cat_name in existing_advice:
                advice_text = existing_advice[cat_name].content
            else:
                # Generate new advice
                advice_text = await generate_financial_advice(cat_name, allocated, spent, overage)
                new_advice = AdviceLog(
                    user_id=current_user.id,
                    month=month,
                    year=year,
                    category_name=cat_name,
                    overage_amount=overage,
                    content=advice_text
                )
                db.add(new_advice)
                await db.commit()
                existing_advice[cat_name] = new_advice
        
        category_data.append({
            "category": cat_name,
            "allocated": allocated,
            "spent": spent,
            "rollover_in": float(alloc.rollover_in),
            "overage": overage,
            "advice": advice_text
        })

    # Add unbudgeted spend
    for cat_name, spent in spend_by_cat.items():
        if spent <= 0:
            # Skip pure income categories (e.g., Salary) or fully reimbursed unbudgeted categories
            continue
            
        total_spent += spent
        overage = spent
        
        advice_text = None
        if overage > 0:
            if cat_name in existing_advice:
                advice_text = existing_advice[cat_name].content
            else:
                # Generate new advice
                advice_text = await generate_financial_advice(cat_name, 0, spent, overage)
                new_advice = AdviceLog(
                    user_id=current_user.id,
                    month=month,
                    year=year,
                    category_name=cat_name,
                    overage_amount=overage,
                    content=advice_text
                )
                db.add(new_advice)
                await db.commit()
                existing_advice[cat_name] = new_advice
                
        category_data.append({
            "category": cat_name,
            "allocated": 0,
            "spent": spent,
            "rollover_in": 0,
            "overage": overage,
            "advice": advice_text
        })

    # Sort categories by overage descending, then spent descending
    category_data.sort(key=lambda x: (x["overage"], x["spent"]), reverse=True)

    # 4. Monthly Trend Data (Last 6 Months)
    trend_data = []
    for i in range(5, -1, -1):
        m = month - i
        y = year
        if m <= 0:
            m += 12
            y -= 1
            
        # Get total spend for this month
        m_tx_q = select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == m,
            extract('year', Transaction.date) == y
        )
        m_tx_res = await db.execute(m_tx_q)
        m_total = m_tx_res.scalar() or 0
        
        month_name = datetime(y, m, 1).strftime('%b %Y')
        trend_data.append({
            "month": month_name,
            "spent": float(m_total)
        })

    # 5. Build Final Payload
    return {
        "budget": {
            "income": float(budget.income),
            "savings_target": float(budget.savings_target),
            "total_allocated": total_allocated,
            "deficit_carried": float(budget.deficit_carried),
            "effective_available": float(budget.total_amount) - float(budget.deficit_carried)
        },
        "summary": {
            "total_spent": total_spent,
            "remaining": (total_allocated - float(budget.deficit_carried)) - total_spent,
            "savings_progress": max(0, float(budget.income) - total_spent)
        },
        "category_data": category_data,
        "trend_data": trend_data
    }
