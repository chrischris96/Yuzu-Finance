from pydantic import BaseModel
from typing import Optional


from datetime import datetime
from app.db import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship     

# Models for the Journal Classification API
class JournalBatch(Base):
    __tablename__ = "journal_batches"

    batch_id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String, default="admin")

    entries = relationship("JournalEntry", back_populates="batch")

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    entry_id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("journal_batches.batch_id"))
    entry_date = Column(String)
    account_code = Column(String)
    account_name = Column(String)
    debit = Column(Numeric, nullable=True)
    credit = Column(Numeric, nullable=True)
    description = Column(String)
    currency = Column(String)
    cost_center = Column(String)
    entry_type = Column(String)

    batch = relationship("JournalBatch", back_populates="entries")