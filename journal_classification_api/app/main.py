from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import journal
from app.db import engine, Base
from app.models import JournalEntry

Base.metadata.create_all(engine)


app = FastAPI(title="Journal Entries API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(journal.router)



