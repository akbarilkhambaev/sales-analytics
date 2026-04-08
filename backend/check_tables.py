import sqlite3

db_path = 'db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Получаем список всех таблиц
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("Таблицы в базе данных:")
for table in tables:
    print(f"  - {table[0]}")

conn.close()
