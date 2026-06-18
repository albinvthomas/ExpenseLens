from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.database import Base

class EmailVerificationOTP(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
