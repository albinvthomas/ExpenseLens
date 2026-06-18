from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.category import CategoryResponse

class BudgetAllocationBase(BaseModel):
    category_id: int
    amount: float

class BudgetAllocationResponse(BudgetAllocationBase):
    id: int
    budget_id: int
    rollover_in: float = 0.0
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class BudgetSetupRequest(BaseModel):
    income: float
    savings_target: float
    month: int
    year: int
    allocations: List[BudgetAllocationBase]

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    month: int
    year: int
    income: float
    savings_target: float
    total_amount: float
    deficit_carried: float = 0.0
    allocations: List[BudgetAllocationResponse] = []

    class Config:
        from_attributes = True
