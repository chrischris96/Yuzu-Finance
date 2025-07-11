from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import pandas as pd
import io

from app.db import get_db
from app import models
from app.schemas import JournalEntry as JournalEntrySchema
from app.schemas import JournalBatchWithEntries

router = APIRouter()

# --- This is for fetching batches with entries (keep this!) ---
@router.get("/journal_batches", response_model=list[JournalBatchWithEntries])
def get_journal_batches(db: Session = Depends(get_db)):
    batches = (
        db.query(models.JournalBatch)
        .options(joinedload(models.JournalBatch.entries))
        .all()
    )
    return batches

# --- This is the UPLOAD endpoint (update THIS to assign batch_id!) ---
@router.post("/upload_journal_entries")
async def upload_journal_entries(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: str = "admin",
):
    from datetime import datetime
    contents = await file.read()
    try:
        import pandas as pd, io
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    # --- Create batch here ---
    new_batch = models.JournalBatch(
        created_at=datetime.utcnow(),
        uploaded_by=user
    )
    db.add(new_batch)
    db.flush()  # To get new_batch.batch_id

    # --- Assign batch_id to every entry ---
    for _, row in df.iterrows():
        entry = models.JournalEntry(
            batch_id=new_batch.batch_id,
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
    return {"message": f"Uploaded {len(df)} journal entries to batch {new_batch.batch_id}."}

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