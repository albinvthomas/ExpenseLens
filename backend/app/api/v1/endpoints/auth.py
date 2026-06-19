from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.schemas.user import Token, UserCreate, UserResponse, OTPRequest
from app.services import user_service
from app.models.email_verification import EmailVerificationOTP
from app.services.email_service import send_otp_email
import random
from datetime import datetime

router = APIRouter()

import asyncio

@router.post("/request-otp")
async def request_otp(req: OTPRequest, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user_by_email(db, email=req.email)
    if user:
        raise HTTPException(status_code=400, detail="User already exists.")
        
    otp_code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    # Check if there's an existing OTP and update it or create new
    from sqlalchemy.future import select
    q = select(EmailVerificationOTP).where(EmailVerificationOTP.email == req.email)
    res = await db.execute(q)
    record = res.scalars().first()
    
    if record:
        record.otp = otp_code
        record.expires_at = expires
    else:
        record = EmailVerificationOTP(email=req.email, otp=otp_code, expires_at=expires)
        db.add(record)
        
    await db.commit()
    
    # Send email synchronously but in a separate thread so it doesn't block the async event loop
    try:
        await asyncio.to_thread(send_otp_email, req.email, otp_code)
        return {"message": "OTP sent successfully."}
    except Exception as e:
        # If Resend fails, we inform the user instead of failing silently
        raise HTTPException(
            status_code=500, 
            detail="Failed to send OTP email. Please try again or check your email address."
        )

@router.post("/signup", response_model=UserResponse)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    # Verify OTP
    from sqlalchemy.future import select
    q = select(EmailVerificationOTP).where(EmailVerificationOTP.email == user_in.email)
    res = await db.execute(q)
    record = res.scalars().first()
    
    if not record or record.otp != user_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
    
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    user = await user_service.create_user(db, user_in=user_in)
    
    # Cleanup OTP
    await db.delete(record)
    await db.commit()
    
    return user

@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await user_service.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
