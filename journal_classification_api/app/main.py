from fastapi import FastAPI
from app.routes import journal

app = FastAPI(title="Journal Entries API", version="1.0")
app.include_router(journal.router)
