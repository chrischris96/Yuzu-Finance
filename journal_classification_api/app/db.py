import os
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

Base = declarative_base()

# Read credentials and DSN from environment
user = os.getenv("ORACLE_USER", "system")
password = os.getenv("ORACLE_PASSWORD", "YourStrongPassword1")
dsn = os.getenv("ORACLE_DSN")  # Should be in the form: localhost/XEPDB1 or localhost:1521/XEPDB1

engine = create_engine(f"oracle+oracledb://{user}:{password}@/?dsn={dsn}")

# Optional: You can also use ORACLE_CLIENT_LIB for the Instant Client location if needed by oracledb/thick mode

# Build SQLAlchemy Oracle connection string
# For oracledb (SQLAlchemy 1.4+): oracle+oracledb://user:pass@dsn
db_url = f"oracle+oracledb://{user}:{password}@{dsn}"
# where dsn = "localhost:1521/XEPDB1"


engine = create_engine(
    db_url,
    echo=True,
    # future=True,  # if you are using SQLAlchemy 2.x
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
