from fastapi import APIRouter
from app.db import get_connection
from app.models import JournalEntry

router = APIRouter()

@router.get("/journal_entries", response_model=list[JournalEntry])
def get_journal_entries():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT entry_id, TO_CHAR(entry_date, 'YYYY-MM-DD'), account_name,
               account_code, debit, credit, description, entry_type
        FROM journal_entries
        ORDER BY entry_id
    """)
    rows = cur.fetchall()
    entries = [JournalEntry(**{
        "entry_id": r[0],
        "entry_date": r[1],
        "account_name": r[2],
        "account_code": r[3],
        "debit": r[4],
        "credit": r[5],
        "description": r[6],
        "entry_type": r[7]
    }) for r in rows]
    cur.close()
    conn.close()
    return entries
