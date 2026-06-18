from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class TransactionRule(Base):
    __tablename__ = "transaction_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description_pattern = Column(String, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    owner = relationship("User")
    category = relationship("Category")
