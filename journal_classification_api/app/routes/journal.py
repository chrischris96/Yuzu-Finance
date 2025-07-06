from collections import defaultdict
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



@router.get("/us_gaap_summary")
def get_us_gaap_summary():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT
          entry_id,
          TO_CHAR(entry_date, 'YYYY-MM-DD'),
          account_name,
          account_code,
          debit,
          credit,
          description,
          entry_type
        FROM journal_entries
    """)
    
    rows = cur.fetchall()
    
    cur.close()
    conn.close()

    entries_by_account = defaultdict(list)

    for r in rows:
        account_code = r[3]
        entry = {
            "entry_id": r[0],
            "entry_date": r[1],
            "account_name": r[2],
            "account_code": r[3],
            "debit": float(r[4]) if r[4] is not None else None,
            "credit": float(r[5]) if r[5] is not None else None,
            "description": r[6],
            "entry_type": r[7],
        }
        entries_by_account[account_code].append(entry)

    summary_by_type = defaultdict(list)

    account_mapping = {
        '1010': 'Asset', '1310': 'Asset', '1320': 'Asset', '1400': 'Asset',
        '2100': 'Liability', '2200': 'Liability', '2400': 'Liability', '2600': 'Liability',
        '4100': 'Revenue', '4200': 'Revenue', '5100': 'Expense'
    }

    for account_code, entries in entries_by_account.items():
        total_debit = sum(e["debit"] or 0 for e in entries)
        total_credit = sum(e["credit"] or 0 for e in entries)
        balance = total_debit - total_credit

        account_name = entries[0]["account_name"]
        account_type = account_mapping.get(account_code, "Unclassified")

        summary_by_type[account_type].append({
            "account_code": account_code,
            "account_name": account_name,
            "balance": balance,
            "entries": entries
        })

    return summary_by_type
