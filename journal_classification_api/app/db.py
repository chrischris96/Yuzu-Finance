import os
import oracledb
from dotenv import load_dotenv

load_dotenv()

oracledb.init_oracle_client(lib_dir=r"C:\Program Files\instantclient_23_8")

def get_connection():
    return oracledb.connect(
        user=os.getenv("ORACLE_USER"),
        password=os.getenv("ORACLE_PASSWORD"),
        dsn=os.getenv("ORACLE_DSN"),
    )
