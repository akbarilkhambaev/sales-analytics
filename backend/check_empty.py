import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
import pandas as pd

print('=== ПРОВЕРКА ПУСТЫХ ЗНАЧЕНИЙ ===\n')

with connection.cursor() as cursor:
    # Статистика
    cursor.execute("SELECT COUNT(*) FROM sales")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sales WHERE профиль_перечень IS NULL OR профиль_перечень = ''")
    empty = cursor.fetchone()[0]
    
    filled = total - empty
    
    print(f'Всего записей в БД: {total:,}')
    print(f'Заполнено профилей: {filled:,} ({filled/total*100:.1f}%)')
    print(f'Пустых профилей: {empty:,} ({empty/total*100:.1f}%)')
    print()
    
    # Примеры товаров с пустым профилем
    cursor.execute("""
        SELECT ТОВАРЫ, COUNT(*) as cnt
        FROM sales
        WHERE (профиль_перечень IS NULL OR профиль_перечень = '')
        AND ТОВАРЫ IS NOT NULL AND ТОВАРЫ != ''
        GROUP BY ТОВАРЫ
        ORDER BY cnt DESC
        LIMIT 20
    """)
    
    print('Топ-20 товаров с пустым профилем:')
    for tovar, count in cursor.fetchall():
        print(f'  {tovar}: {count:,} записей')
    print()

# Проверим, есть ли эти товары в Excel
print('=== ПРОВЕРКА В EXCEL ===\n')
df = pd.read_excel('перечень продукций.xlsx', skiprows=1, header=None, names=['tovar', 'profil'])
print(f'Всего товаров в Excel: {len(df)}')
print(f'С заполненным профилем: {df["profil"].notna().sum()}')
print(f'С пустым профилем: {df["profil"].isna().sum()}')
