from sqlalchemy import Column, Integer, ForeignKey, Numeric, DateTime, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    statement_id = Column(Integer, ForeignKey("statements.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    description = Column(String)
    type = Column(String, nullable=False, default="expense")

    owner = relationship("User")
    category = relationship("Category")
    statement = relationship("Statement")
