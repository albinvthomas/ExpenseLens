from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.database import get_db

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return current_user
