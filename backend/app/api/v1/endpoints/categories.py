from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api import deps
from app.models.user import User
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    result = await db.execute(select(Category).where(Category.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=CategoryResponse)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    category = Category(
        user_id=current_user.id,
        name=category_in.name,
        is_custom=True, # User created are always custom
        is_essential=category_in.is_essential,
        manual_amount=category_in.manual_amount
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from fastapi import HTTPException
    # Find category
    result = await db.execute(select(Category).where(Category.id == category_id, Category.user_id == current_user.id))
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Delete associated budget allocations
    from sqlalchemy import delete
    from app.models.budget_allocation import BudgetAllocation
    await db.execute(delete(BudgetAllocation).where(BudgetAllocation.category_id == category.id))
    
    await db.delete(category)
    await db.commit()
    return {"ok": True}
