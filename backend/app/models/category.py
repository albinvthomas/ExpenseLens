from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    is_custom = Column(Boolean, default=False)
    is_essential = Column(Boolean, default=True)
    manual_amount = Column(Numeric(10, 2), nullable=True)

    owner = relationship("User")
