import os
import django
import pandas as pd

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# Читаем Excel
df = pd.read_excel('перечень продукций.xlsx', skiprows=1, header=None, names=['tovar', 'profil'])

# Создаем словарь товар -> профиль (только с заполненным профилем)
excel_mapping = dict(zip(df['tovar'], df['profil']))

print('=== АНАЛИЗ НЕСООТВЕТСТВИЙ ===\n')

with connection.cursor() as cursor:
    # Получаем товары с пустым профилем
    cursor.execute("""
        SELECT DISTINCT ТОВАРЫ
        FROM sales
        WHERE (профиль_перечень IS NULL OR профиль_перечень = '')
        AND ТОВАРЫ IS NOT NULL AND ТОВАРЫ != ''
    """)
    
    db_empty_products = [row[0] for row in cursor.fetchall()]
    
    print(f'Уникальных товаров с пустым профилем в БД: {len(db_empty_products)}')
    
    # Проверяем, есть ли они в Excel
    found_in_excel = 0
    found_with_profil = 0
    not_in_excel = 0
    
    examples_found = []
    examples_not_found = []
    
    for tovar in db_empty_products:
        if tovar in excel_mapping:
            found_in_excel += 1
            if pd.notna(excel_mapping[tovar]):
                found_with_profil += 1
                if len(examples_found) < 10:
                    examples_found.append((tovar, excel_mapping[tovar]))
        else:
            not_in_excel += 1
            if len(examples_not_found) < 10:
                examples_not_found.append(tovar)
    
    print(f'  Найдено в Excel: {found_in_excel}')
    print(f'    Из них с заполненным профилем: {found_with_profil}')
    print(f'    Из них с пустым профилем: {found_in_excel - found_with_profil}')
    print(f'  Не найдено в Excel: {not_in_excel}')
    print()
    
    if examples_found:
        print('Примеры товаров, которые ЕСТЬ в Excel с профилем, но НЕ обновились:')
        for tovar, profil in examples_found:
            print(f'  "{tovar}" -> "{profil}"')
        print()
    
    if examples_not_found:
        print('Примеры товаров, которых НЕТ в Excel:')
        for tovar in examples_not_found:
            print(f'  "{tovar}"')
