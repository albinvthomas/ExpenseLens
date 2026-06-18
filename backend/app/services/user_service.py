from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.models.category import Category
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

DEFAULT_CATEGORIES = [
    {"name": "Housing/Rent", "is_essential": True},
    {"name": "Groceries", "is_essential": True},
    {"name": "Transport", "is_essential": True},
    {"name": "Utilities", "is_essential": True},
    {"name": "Entertainment", "is_essential": False},
    {"name": "Dining Out", "is_essential": False},
    {"name": "Subscriptions", "is_essential": False},
    {"name": "Shopping", "is_essential": False},
    {"name": "Miscellaneous", "is_essential": False},
]

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user_in: UserCreate):
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # Seed default categories
    categories = [
        Category(
            user_id=db_user.id,
            name=cat["name"],
            is_custom=False,
            is_essential=cat["is_essential"],
        )
        for cat in DEFAULT_CATEGORIES
    ]
    db.add_all(categories)
    await db.commit()

    return db_user
