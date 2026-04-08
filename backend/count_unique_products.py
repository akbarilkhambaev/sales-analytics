import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Уникальные товары
    cursor.execute("SELECT COUNT(DISTINCT ТОВАРЫ) FROM sales WHERE ТОВАРЫ IS NOT NULL AND ТОВАРЫ != ''")
    unique_tovary = cursor.fetchone()[0]
    
    # Всего записей
    cursor.execute("SELECT COUNT(*) FROM sales")
    total = cursor.fetchone()[0]
    
    # Записи с заполненным товаром
    cursor.execute("SELECT COUNT(*) FROM sales WHERE ТОВАРЫ IS NOT NULL AND ТОВАРЫ != ''")
    with_tovary = cursor.fetchone()[0]
    
    print('=== СТАТИСТИКА ТОВАРОВ В БД ===\n')
    print(f'Всего записей в БД: {total:,}')
    print(f'Записей с заполненным товаром: {with_tovary:,} ({with_tovary/total*100:.1f}%)')
    print(f'Уникальных товаров: {unique_tovary:,}')
    print()
    
    # Сравнение с Excel
    print('=== СРАВНЕНИЕ С EXCEL ===\n')
    import pandas as pd
    df = pd.read_excel('перечень продукций.xlsx', skiprows=1, header=None, names=['tovar', 'profil'])
    
    excel_total = len(df)
    excel_with_profil = df['profil'].notna().sum()
    excel_empty_profil = df['profil'].isna().sum()
    
    print(f'Товаров в Excel: {excel_total:,}')
    print(f'  С заполненным профилем: {excel_with_profil:,}')
    print(f'  С пустым профилем: {excel_empty_profil:,}')
    print()
    
    print(f'Разница (БД - Excel): {unique_tovary - excel_total:+,} товаров')
