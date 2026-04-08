import os
import django
import pandas as pd

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

print('Создаем список товаров без профиля для заполнения...\n')

with connection.cursor() as cursor:
    # Получаем товары с пустым профилем и количество записей
    cursor.execute("""
        SELECT ТОВАРЫ, COUNT(*) as cnt
        FROM sales
        WHERE (профиль_перечень IS NULL OR профиль_перечень = '')
        AND ТОВАРЫ IS NOT NULL AND ТОВАРЫ != ''
        GROUP BY ТОВАРЫ
        ORDER BY cnt DESC
    """)
    
    results = cursor.fetchall()

# Создаем DataFrame
df = pd.DataFrame(results, columns=['ТОВАРЫ', 'Количество_записей'])
df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'] = ''  # Пустая колонка для заполнения

# Сохраняем в Excel
output_file = 'товары_без_профиля.xlsx'
df.to_excel(output_file, index=False, engine='openpyxl')

print(f'✓ Создан файл: {output_file}')
print(f'  Товаров для заполнения: {len(df):,}')
print(f'  Записей затронуто: {df["Количество_записей"].sum():,}')
print()
print('Заполните колонку ПЕРЕЧЕНЬ_ПРОФИЛЬ для каждого товара,')
print('затем добавьте эти данные в основной файл "перечень продукций.xlsx"')
