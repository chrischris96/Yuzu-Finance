from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import journal

app = FastAPI(title="Journal Entries API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(journal.router)



