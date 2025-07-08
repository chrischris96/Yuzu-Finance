from pydantic import BaseModel, model_validator
from typing import Optional

class JournalEntry(BaseModel):
    entry_id: Optional[int] = None
    entry_date: Optional[str] = None
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    debit: Optional[float] = None
    credit: Optional[float] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    cost_center: Optional[str] = None
    entry_type: Optional[str] = None

    @model_validator(mode='after')
    def check_debit_or_credit(self) -> "JournalEntry":
        if self.debit is None and self.credit is None:
            raise ValueError("Either debit or credit must be provided.")
        return self

    class Config:
        orm_mode = True
