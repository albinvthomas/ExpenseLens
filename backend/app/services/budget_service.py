from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.budget import Budget
from app.models.budget_allocation import BudgetAllocation
from app.models.category import Category
from app.schemas.budget import BudgetSetupRequest
from decimal import Decimal

BASELINE_PERCENTAGES = {
    "Housing/Rent": 0.35,
    "Groceries": 0.15,
    "Transport": 0.10,
    "Utilities": 0.08,
    "Entertainment": 0.07,
    "Dining Out": 0.07,
    "Subscriptions": 0.05,
    "Shopping": 0.08,
    "Miscellaneous": 0.05,
}

async def setup_budget(db: AsyncSession, user_id: int, request: BudgetSetupRequest):
    income = Decimal(str(request.income))
    savings_target = Decimal(str(request.savings_target))
    
    # 1. Calculate Rollover and Deficit from Previous Month
    prev_month = request.month - 1 if request.month > 1 else 12
    prev_year = request.year if request.month > 1 else request.year - 1
    
    from sqlalchemy import extract
    from app.models.transaction import Transaction
    
    prev_budget_q = select(Budget).where(Budget.user_id == user_id, Budget.month == prev_month, Budget.year == prev_year)
    prev_budget_res = await db.execute(prev_budget_q)
    prev_budget = prev_budget_res.scalars().first()
    
    rollover_map = {}
    deficit_carried = Decimal(0)
    
    if prev_budget:
        # Fetch previous allocations
        prev_allocs_q = select(BudgetAllocation).where(BudgetAllocation.budget_id == prev_budget.id)
        prev_allocs_res = await db.execute(prev_allocs_q)
        prev_allocs = prev_allocs_res.scalars().all()
        
        # Fetch previous transactions
        tx_q = select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == prev_month,
            extract('year', Transaction.date) == prev_year
        )
        tx_res = await db.execute(tx_q)
        prev_txs = tx_res.scalars().all()
        
        spend_by_cat = {}
        for tx in prev_txs:
            spend_by_cat[tx.category_id] = spend_by_cat.get(tx.category_id, Decimal(0)) + Decimal(str(tx.amount))
            
        for alloc in prev_allocs:
            allocated = Decimal(str(alloc.amount)) + Decimal(str(alloc.rollover_in))
            spent = spend_by_cat.get(alloc.category_id, Decimal(0))
            
            if spent < allocated:
                rollover_map[alloc.category_id] = allocated - spent
            elif spent > allocated:
                deficit_carried += (spent - allocated)
    
    # Delete existing budget for this month if any
    existing = await db.execute(select(Budget).where(Budget.user_id == user_id, Budget.month == request.month, Budget.year == request.year))
    existing_budget = existing.scalars().first()
    if existing_budget:
        from sqlalchemy import delete
        await db.execute(delete(BudgetAllocation).where(BudgetAllocation.budget_id == existing_budget.id))
        await db.delete(existing_budget)
        await db.commit()

    sum_allocations = sum(Decimal(str(a.amount)) for a in request.allocations)

    new_budget = Budget(
        user_id=user_id,
        month=request.month,
        year=request.year,
        income=income,
        savings_target=savings_target,
        total_amount=sum_allocations,
        deficit_carried=deficit_carried
    )
    db.add(new_budget)
    await db.commit()
    await db.refresh(new_budget)

    # Create allocations
    for alloc in request.allocations:
        ba = BudgetAllocation(
            budget_id=new_budget.id,
            category_id=alloc.category_id,
            amount=Decimal(str(alloc.amount)),
            rollover_in=rollover_map.get(alloc.category_id, Decimal(0))
        )
        db.add(ba)
    
    await db.commit()
    
    # Reload budget with allocations
    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.owner))
        .where(Budget.id == new_budget.id)
    )
    return result.scalars().first()

async def get_current_budget(db: AsyncSession, user_id: int, month: int, year: int):
    # Get budget with allocations and categories
    query = select(Budget).where(
        Budget.user_id == user_id,
        Budget.month == month,
        Budget.year == year
    )
    result = await db.execute(query)
    budget = result.scalars().first()
    
    if budget:
        allocs_query = select(BudgetAllocation).options(selectinload(BudgetAllocation.category)).where(BudgetAllocation.budget_id == budget.id)
        allocs_result = await db.execute(allocs_query)
        budget.allocations = allocs_result.scalars().all()
        
    return budget
