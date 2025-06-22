import oracledb
oracledb.init_oracle_client(lib_dir=r"C:\program files\instantclient_23_8")

conn = oracledb.connect(
    user="system",
    password="YourStrongPassword1",
    dsn="localhost/XEPDB1"
)
cur = conn.cursor()

# Example: total entries per entry_type
cur.execute("""
    SELECT entry_type, COUNT(*) AS total_entries
    FROM journal_entries
    GROUP BY entry_type
    ORDER BY total_entries DESC
""")

for row in cur:
    print(row)

cur.close()
conn.close()