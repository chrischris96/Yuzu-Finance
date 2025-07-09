from pydantic import BaseModel
from typing import Optional


from datetime import datetime
from app.db import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Date, Identity
from sqlalchemy.orm import relationship     

# Models for the Journal Classification API
class JournalBatch(Base):
    __tablename__ = "journal_batches"
    batch_id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(Date)
    uploaded_by = Column(String(100))
    entries = relationship("JournalEntry", back_populates="batch")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    entry_id = Column(Integer, Identity(start=1, cycle=False), primary_key=True)    
    batch_id = Column(Integer, ForeignKey("journal_batches.batch_id"))
    entry_date = Column(String(20))
    account_code = Column(String(50))
    account_name = Column(String(100))
    debit = Column(Numeric)
    credit = Column(Numeric)
    description = Column(String(200))
    currency = Column(String(10))
    cost_center = Column(String(50))
    entry_type = Column(String(50))
    batch = relationship("JournalBatch", back_populates="entries")
