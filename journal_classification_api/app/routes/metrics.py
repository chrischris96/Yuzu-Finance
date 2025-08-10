from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()

@router.get("/metrics")
def metrics():
    return {
        "coverage_pct": 82.4,
        "reviewer_accept_pct": 93.1,
        "avg_handling_time_sec": 46,
        "top_unclassified_patterns": [
            {"pattern": "FX reclass on vendor prepayment", "count": 14},
            {"pattern": "Accrued bonus reversal (missing CC)", "count": 10},
            {"pattern": "IC clearing without counterparty", "count": 8},
            {"pattern": "Lease modification (term change)", "count": 7},
            {"pattern": "Capex vs Opex threshold", "count": 5},
        ],
        "as_of_iso": datetime.now(timezone.utc).isoformat(),
    }
