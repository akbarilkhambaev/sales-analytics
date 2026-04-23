"""
Скрипт: копирует КОД_ТОВАРА -> ТОВАРЫ в таблице ready_sales
Запуск: python fix_tovary_from_kod.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Показываем текущее состояние (3 примера)
    cursor.execute(
        'SELECT id, "ТОВАРЫ", "КОД_ТОВАРА" FROM ready_sales WHERE "КОД_ТОВАРА" IS NOT NULL LIMIT 5'
    )
    rows = cursor.fetchall()
    print("Примеры ДО обновления (id | ТОВАРЫ | КОД_ТОВАРА):")
    for r in rows:
        print(f"  id={r[0]}  ТОВАРЫ={r[1]!r:40}  КОД_ТОВАРА={r[2]!r}")

    # Считаем сколько строк обновится
    cursor.execute(
        'SELECT COUNT(*) FROM ready_sales WHERE "КОД_ТОВАРА" IS NOT NULL AND "КОД_ТОВАРА" <> \'\''
    )
    count = cursor.fetchone()[0]
    print(f"\nБудет обновлено строк: {count}")

    # Выполняем обновление
    cursor.execute(
        'UPDATE ready_sales SET "ТОВАРЫ" = "КОД_ТОВАРА" WHERE "КОД_ТОВАРА" IS NOT NULL AND "КОД_ТОВАРА" <> \'\''
    )
    updated = cursor.rowcount
    print(f"Обновлено строк: {updated}")

    # Показываем результат
    cursor.execute(
        'SELECT id, "ТОВАРЫ", "КОД_ТОВАРА" FROM ready_sales WHERE "КОД_ТОВАРА" IS NOT NULL LIMIT 5'
    )
    rows = cursor.fetchall()
    print("\nПримеры ПОСЛЕ обновления (id | ТОВАРЫ | КОД_ТОВАРА):")
    for r in rows:
        print(f"  id={r[0]}  ТОВАРЫ={r[1]!r:40}  КОД_ТОВАРА={r[2]!r}")

print("\nГотово.")
