from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api import deps
from app.models.user import User
from app.core.database import get_db
from app.services.statement_service import process_statement
import os
import shutil
from datetime import datetime

router = APIRouter()

@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not file.filename.endswith(('.csv', '.pdf')):
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are supported.")
    
    # Save the file temporarily or permanently
    upload_dir = f"uploads/{current_user.id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Process the statement (parse, categorize, save)
        transactions = await process_statement(db, current_user.id, file_path, file.filename)
        return {"ok": True, "transactions_parsed": len(transactions)}
    except Exception as e:
        # cleanup on failure
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))
