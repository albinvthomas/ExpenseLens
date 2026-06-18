from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.api import deps
from app.models.user import User
from app.models.transaction import Transaction
from app.models.transaction_rule import TransactionRule
from app.core.database import get_db
from pydantic import BaseModel
from datetime import datetime
from app.schemas.category import CategoryResponse

router = APIRouter()

class TransactionResponse(BaseModel):
    id: int
    amount: float
    date: datetime
    description: str
    type: str = "expense"
    category_id: int
    category: CategoryResponse

    class Config:
        from_attributes = True

class TransactionUpdate(BaseModel):
    category_id: int

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction_category(
    transaction_id: int,
    tx_in: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # Fetch the transaction
    query = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    result = await db.execute(query)
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Update category
    tx.category_id = tx_in.category_id
    
    # Save a rule for self-learning
    # Create a simple pattern based on the description
    # We can just take the exact description, or the first couple words.
    # To be safe, let's take the first 3 words or the exact description.
    words = tx.description.split()
    pattern = " ".join(words[:min(3, len(words))])
    
    # Check if rule exists
    rule_query = select(TransactionRule).where(
        TransactionRule.user_id == current_user.id,
        TransactionRule.description_pattern == pattern
    )
    rule_result = await db.execute(rule_query)
    rule = rule_result.scalars().first()
    
    if rule:
        rule.category_id = tx_in.category_id
    else:
        new_rule = TransactionRule(
            user_id=current_user.id,
            description_pattern=pattern,
            category_id=tx_in.category_id
        )
        db.add(new_rule)
        
    await db.commit()
    
    # Reload with category for response
    reload_q = select(Transaction).options(selectinload(Transaction.category)).where(Transaction.id == tx.id)
    reload_res = await db.execute(reload_q)
    return reload_res.scalars().first()
