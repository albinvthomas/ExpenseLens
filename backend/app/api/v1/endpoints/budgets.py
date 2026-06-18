from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api import deps
from app.models.user import User
from app.schemas.budget import BudgetSetupRequest, BudgetResponse
from app.services import budget_service
from app.core.database import get_db

router = APIRouter()

@router.post("/setup", response_model=BudgetResponse)
async def setup_budget(
    request: BudgetSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    print("RECEIVED BUDGET SETUP:", request.income, request.savings_target)
    for a in request.allocations:
        print(f"Alloc {a.category_id}: {a.amount}")
    budget = await budget_service.setup_budget(db, user_id=current_user.id, request=request)
    # We need to reload to get the full allocations with categories
    return await budget_service.get_current_budget(db, user_id=current_user.id, month=request.month, year=request.year)

@router.get("/current", response_model=BudgetResponse)
async def get_current_budget(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year
        
    budget = await budget_service.get_current_budget(db, user_id=current_user.id, month=month, year=year)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for this month")
    return budget
