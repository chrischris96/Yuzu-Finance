from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import pandas as pd
import io

from app.db import get_db
from app import models
from app.schemas import JournalEntry as JournalEntrySchema
from app.schemas import JournalBatchWithEntries
# routes/auth.py

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import timedelta, datetime
import jwt  # pip install pyjwt
from passlib.context import CryptContext  # pip install passlib[bcrypt]


SECRET_KEY = "your-very-secret-key"  # Move to env in prod!
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()

# Dummy user for example
fake_user = {
    "email": "admin@yuzu.com",
    "hashed_password": pwd_context.hash("test123"),
}

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    # TODO: replace with real user lookup and hashed password check
    if data.email != fake_user["email"] or not pwd_context.verify(data.password, fake_user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    expire = datetime.utcnow() + timedelta(hours=2)
    token = jwt.encode({"sub": data.email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

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
    
from fastapi import APIRouter, Response, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from datetime import timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(username: str, password: str):
    # Dummy authentication for demonstration; replace with real DB lookup
    if username == fake_user["email"] and pwd_context.verify(password, fake_user["hashed_password"]):
        class User:
            email = username
        return User()
    return None

@router.post("/login")
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    # Validate user from DB...
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(hours=1))
    # Set cookie
    response = JSONResponse(content={"msg": "Logged in"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # use only in HTTPS
        samesite="lax",
        max_age=3600,
        path="/",
    )
    return response

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from app.schemas import UserCreate  # Add this import at the top with other schema imports

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"msg": "Registration successful"}
