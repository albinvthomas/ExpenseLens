from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ExpenseLens"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey-change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "expenselens"
    
    # Optional direct database URI (Render uses DATABASE_URL)
    DATABASE_URL: str | None = None
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # Render provides postgres:// and Neon provides postgresql:// which asyncpg needs as postgresql+asyncpg://
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and "asyncpg" not in url:
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
                
            # Neon and Render sometimes include query params like ?sslmode=require or ?options=endpoint=...
            # asyncpg strictly rejects many of these (like channel_binding, sslmode, options, etc).
            # Since database.py explicitly sets connect_args={"ssl": True}, we can safely strip the entire query string!
            if "?" in url:
                url = url.split("?")[0]
                
            return url
            # If they provide sqlite:// add aiosqlite
            if self.DATABASE_URL.startswith("sqlite://") and "aiosqlite" not in self.DATABASE_URL:
                return self.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)
            return self.DATABASE_URL
            
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
