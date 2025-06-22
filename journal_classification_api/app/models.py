from pydantic import BaseModel
from typing import Optional

class JournalEntry(BaseModel):
    entry_id: int
    entry_date: str
    account_name: str
    account_code: str
    debit: Optional[float]
    credit: Optional[float]
    description: str
    entry_type: str
