from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL and ("neon.tech" in settings.DATABASE_URL or "onrender.com" in settings.DATABASE_URL or "sslmode=require" in settings.DATABASE_URL or "ssl=require" in settings.DATABASE_URL):
    connect_args["ssl"] = True

engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True, connect_args=connect_args)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db() -> AsyncSession: # type: ignore
    async with SessionLocal() as session:
        yield session
