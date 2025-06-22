import oracledb
import pandas as pd

# Initialize Oracle Client in thick mode
oracledb.init_oracle_client(lib_dir=r"C:\program files\instantclient_23_8")

# Load CSVs
entries_df = pd.read_csv("journal_entries.csv")

# Ensure numeric columns are float with NaN → None
entries_df["debit"] = pd.to_numeric(entries_df["debit"], errors="coerce")
entries_df["credit"] = pd.to_numeric(entries_df["credit"], errors="coerce")

# Replace NaN with None for Oracle
entries_df = entries_df.where(pd.notnull(entries_df), None)
accounts_df = pd.read_csv("accounts.csv").drop_duplicates(subset=["account_code"])

# Connect to Oracle XE
conn = oracledb.connect(
    user="system",
    password="YourStrongPassword1",
    dsn="localhost/XEPDB1"
)
cur = conn.cursor()

# Drop and create normalized tables
cur.execute("""
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE journal_entries';
EXCEPTION WHEN OTHERS THEN NULL;
END;
""")

cur.execute("""
CREATE TABLE journal_entries (
    entry_id        NUMBER PRIMARY KEY,
    entry_date      DATE,
    account_name    VARCHAR2(100),
    account_code    VARCHAR2(10),
    debit           NUMBER(15,2),
    credit          NUMBER(15,2),
    description     VARCHAR2(255),
    entry_type      VARCHAR2(50)
)
""")

cur.execute("""
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE accounts';
EXCEPTION WHEN OTHERS THEN NULL;
END;
""")

cur.execute("""
CREATE TABLE accounts (
    account_code VARCHAR2(10) PRIMARY KEY,
    account_name VARCHAR2(100)
)
""")

# Insert data
cur.executemany("INSERT INTO accounts (account_code, account_name) VALUES (:1, :2)",
                [tuple(x) for x in accounts_df.values])

entries_df["entry_id"] = pd.to_numeric(entries_df["entry_id"], errors="coerce")
entries_df["debit"] = pd.to_numeric(entries_df["debit"], errors="coerce")
entries_df["credit"] = pd.to_numeric(entries_df["credit"], errors="coerce")
entries_df["entry_date"] = pd.to_datetime(entries_df["entry_date"], errors="coerce").dt.strftime('%Y-%m-%d')

# ✅ This is critical
entries_df = entries_df.astype(object).where(pd.notnull(entries_df), None)


cur.executemany("""
    INSERT INTO journal_entries (
        entry_id, entry_date, account_name, account_code, debit, credit, description, entry_type
    ) VALUES (
        :1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8
    )
""", [tuple(x) for x in entries_df.values])

conn.commit()
print("✅ Data loaded successfully!")

cur.close()
conn.close()

