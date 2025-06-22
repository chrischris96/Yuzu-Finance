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
def get_us_gaap_balance_summary():
    conn = get_connection()
    cur = conn.cursor()

    account_mapping = {
        '1010': 'Asset', '1310': 'Asset', '1320': 'Asset', '1400': 'Asset',
        '2100': 'Liability', '2200': 'Liability', '2400': 'Liability', '2600': 'Liability',
        '4100': 'Revenue', '4200': 'Revenue', '5100': 'Expense'
    }

    cur.execute("""
        SELECT account_code, account_name,
               SUM(NVL(debit, 0)) AS total_debit,
               SUM(NVL(credit, 0)) AS total_credit
        FROM journal_entries
        GROUP BY account_code, account_name
        ORDER BY account_code
    """)
    
    raw = cur.fetchall()
    cur.close()
    conn.close()

    grouped = {}

    for row in raw:
        code, name, debit, credit = row
        balance = (debit or 0) - (credit or 0)
        acc_type = account_mapping.get(code)

        if acc_type is None:
            # Assign to fallback error bucket
            acc_type = "Unclassified"
            code = '9999'
            name = 'Unknown Account'

        grouped.setdefault(acc_type, []).append({
            "account_code": code,
            "account_name": name,
            "balance": balance
        })

    return grouped
