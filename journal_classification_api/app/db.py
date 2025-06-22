import os
from dotenv import load_dotenv
import oracledb

load_dotenv()
# Initialize Oracle client for Windows
def get_connection():
    return oracledb.connect(
        user=os.getenv("ORACLE_USER"),
        password=os.getenv("ORACLE_PASSWORD"),
        dsn=os.getenv("ORACLE_DSN")
    )
