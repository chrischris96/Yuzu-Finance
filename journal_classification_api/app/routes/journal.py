from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from app.db import get_db
from app import models
from app.schemas import JournalEntry as JournalEntrySchema

router = APIRouter()

# -----------------------------------------------
# GET /journal_entries
# -----------------------------------------------
@router.get(
    "/journal_entries",
    response_model=List[JournalEntrySchema]
)
def get_journal_entries(db: Session = Depends(get_db)):
    """
    Return all journal entries from the database.
    """
    db_entries = db.query(models.JournalEntry).all()
    entries = [JournalEntrySchema.from_orm(entry) for entry in db_entries]
    return entries

# -----------------------------------------------
# GET /us_gaap_summary
# -----------------------------------------------
@router.get("/us_gaap_summary")
def us_gaap_summary(db: Session = Depends(get_db)):
    """
    Return balance sheet grouped by account_code.
    """
    db_entries = db.query(models.JournalEntry).all()
    df = pd.DataFrame([e.__dict__ for e in db_entries])

    if df.empty:
        return {}

    summary = (
        df.groupby("account_code")
        .agg({
            "debit": "sum",
            "credit": "sum"
        })
        .reset_index()
        .to_dict(orient="records")
    )
    return summary

# -----------------------------------------------
# POST /upload_journal_entries
# -----------------------------------------------
@router.post("/upload_journal_entries")
async def upload_journal_entries(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV of journal entries and insert them into the database.
    """
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    # Validate required columns
    required_cols = ["entry_date", "account_code", "debit", "credit"]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column: {col}")

    # Insert into database
    for _, row in df.iterrows():
        entry = models.JournalEntry(
            entry_date=row["entry_date"],
            account_code=row["account_code"],
            account_name=row.get("account_name"),
            debit=row["debit"] if not pd.isna(row["debit"]) else None,
            credit=row["credit"] if not pd.isna(row["credit"]) else None,
            description=row.get("description"),
            currency=row.get("currency"),
            cost_center=row.get("cost_center"),
            entry_type=row.get("entry_type"),
        )
        db.add(entry)

    db.commit()

    return {"message": f"Uploaded {len(df)} journal entries."}
@router.post("/journal_entries")
def create_journal_entries(
    entries: List[JournalEntrySchema],
    db: Session = Depends(get_db),
):
    try:
        for entry in entries:
            new_entry = models.JournalEntry(**entry.model_dump())
            db.add(new_entry)
        db.commit()
        return {"message": "Entries saved successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))