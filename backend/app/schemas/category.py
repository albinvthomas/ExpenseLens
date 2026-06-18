from pydantic import BaseModel
from typing import List, Optional

class CategoryBase(BaseModel):
    name: str
    is_custom: bool = False
    is_essential: bool = True
    manual_amount: Optional[float] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
