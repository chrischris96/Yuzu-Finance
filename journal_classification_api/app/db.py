from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine

Base = declarative_base()

# Example Oracle connection string
engine = create_engine(
    "oracle+oracledb://YOUR_USER:YOUR_PASSWORD@localhost:1521/?service_name=XE",
    echo=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
