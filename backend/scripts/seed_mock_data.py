import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from datetime import datetime
from decimal import Decimal

from app.core.config import settings
from app.models.user import User
from app.models.category import Category
from app.models.budget import Budget
from app.models.budget_allocation import BudgetAllocation
from app.models.transaction import Transaction
from app.schemas.budget import BudgetSetupRequest, BudgetAllocationBase
from app.services import budget_service

async def seed_data():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get first user
        res = await db.execute(select(User).limit(1))
        user = res.scalars().first()
        if not user:
            print("No user found. Please register a user first.")
            return

        # Get categories
        res = await db.execute(select(Category))
        categories = {c.name: c for c in res.scalars().all()}
        
        if not categories:
            print("No categories found.")
            return

        print(f"Seeding data for user {user.email}")
        
        # 1. Clear out month 5 & 6 data for testing
        from sqlalchemy import delete
        
        # Delete Month 6 budget
        b6 = await db.execute(select(Budget).where(Budget.user_id == user.id, Budget.month == 6))
        b6 = b6.scalars().first()
        if b6:
            await db.execute(delete(BudgetAllocation).where(BudgetAllocation.budget_id == b6.id))
            await db.delete(b6)
            
        # Delete Month 5 budget
        b5 = await db.execute(select(Budget).where(Budget.user_id == user.id, Budget.month == 5))
        b5 = b5.scalars().first()
        if b5:
            await db.execute(delete(BudgetAllocation).where(BudgetAllocation.budget_id == b5.id))
            await db.delete(b5)
            
        # Delete transactions
        await db.execute(delete(Transaction).where(Transaction.user_id == user.id))
        await db.commit()
        
        # 2. Set up Month 5 Budget (May)
        print("Setting up May Budget...")
        req_5 = BudgetSetupRequest(
            income=50000.0,
            savings_target=10000.0,
            month=5,
            year=2026,
            allocations=[
                BudgetAllocationBase(category_id=categories['Housing/Rent'].id, amount=15000.0),
                BudgetAllocationBase(category_id=categories['Groceries'].id, amount=8000.0),
                BudgetAllocationBase(category_id=categories['Transport'].id, amount=5000.0),
                BudgetAllocationBase(category_id=categories['Entertainment'].id, amount=4000.0) # We will overspend here
            ]
        )
        
        await budget_service.setup_budget(db, user.id, req_5)
        
        # 3. Insert mock transactions for May
        print("Inserting May Transactions...")
        txs = [
            # Rent: exactly on budget
            Transaction(user_id=user.id, category_id=categories['Housing/Rent'].id, amount=15000.0, date=datetime(2026, 5, 1), description="Rent", type="expense", statement_id=None),
            
            # Groceries: Underspend (Allocated 8000, Spend 6000 -> 2000 Rollover)
            Transaction(user_id=user.id, category_id=categories['Groceries'].id, amount=6000.0, date=datetime(2026, 5, 10), description="Supermarket", type="expense", statement_id=None),
            
            # Transport: Underspend (Allocated 5000, Spend 4000 -> 1000 Rollover)
            Transaction(user_id=user.id, category_id=categories['Transport'].id, amount=4000.0, date=datetime(2026, 5, 15), description="Fuel", type="expense", statement_id=None),
            
            # Entertainment: OVERSPEND (Allocated 4000, Spend 5500 -> 1500 Deficit)
            Transaction(user_id=user.id, category_id=categories['Entertainment'].id, amount=5500.0, date=datetime(2026, 5, 20), description="Movie & Dinner", type="expense", statement_id=None),
        ]
        db.add_all(txs)
        await db.commit()
        
        # 4. Set up Month 6 Budget (June) to trigger rollover logic
        print("Setting up June Budget to test rollover...")
        req_6 = BudgetSetupRequest(
            income=50000.0,
            savings_target=10000.0,
            month=6,
            year=2026,
            allocations=[
                BudgetAllocationBase(category_id=categories['Housing/Rent'].id, amount=15000.0),
                BudgetAllocationBase(category_id=categories['Groceries'].id, amount=8000.0), # Should get +2000 rollover
                BudgetAllocationBase(category_id=categories['Transport'].id, amount=5000.0), # Should get +1000 rollover
                BudgetAllocationBase(category_id=categories['Entertainment'].id, amount=4000.0) # Overspent by 1500, so deficit_carried should be 1500
            ]
        )
        june_budget = await budget_service.setup_budget(db, user.id, req_6)
        
        print("-------------------------------------------------")
        print(f"June Deficit Carried: {june_budget.deficit_carried}")
        assert june_budget.deficit_carried == Decimal('1500.00'), f"Expected 1500 deficit, got {june_budget.deficit_carried}"
        
        # Fetch June Allocations to verify rollover
        allocs = await db.execute(select(BudgetAllocation).where(BudgetAllocation.budget_id == june_budget.id))
        for a in allocs.scalars().all():
            if a.category_id == categories['Groceries'].id:
                print(f"Groceries Rollover In: {a.rollover_in}")
                assert a.rollover_in == Decimal('2000.00')
            elif a.category_id == categories['Transport'].id:
                print(f"Transport Rollover In: {a.rollover_in}")
                assert a.rollover_in == Decimal('1000.00')
            elif a.category_id == categories['Entertainment'].id:
                print(f"Entertainment Rollover In: {a.rollover_in}")
                assert a.rollover_in == Decimal('0.00')
                
        # 5. Insert some June transactions so the analytics dashboard has data
        june_txs = [
            Transaction(user_id=user.id, category_id=categories['Housing/Rent'].id, amount=15000.0, date=datetime(2026, 6, 1), description="Rent", type="expense", statement_id=None),
            Transaction(user_id=user.id, category_id=categories['Groceries'].id, amount=4000.0, date=datetime(2026, 6, 5), description="Supermarket", type="expense", statement_id=None),
            Transaction(user_id=user.id, category_id=categories['Entertainment'].id, amount=2000.0, date=datetime(2026, 6, 8), description="Games", type="expense", statement_id=None),
        ]
        db.add_all(june_txs)
        await db.commit()
        
        print("Seed data completed successfully. Math checks out perfectly!")

asyncio.run(seed_data())
