import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Смотрим пример данных
    cursor.execute('''
        SELECT КОД_ТОВАРА, ТОВАРЫ, профиль_перечень, ГРУППА, ГРУППА_ТОВАРА
        FROM sales 
        WHERE профиль_перечень IS NOT NULL 
        LIMIT 15
    ''')
    
    print('Пример данных из БД:')
    print('='*100)
    print(f'{"КОД_ТОВАРА":<20} | {"ТОВАРЫ":<35} | {"профиль":<20} | {"ГРУППА":<15}')
    print('-'*100)
    for row in cursor.fetchall():
        kod = row[0] or 'None'
        tovar = (row[1][:32] + '...') if row[1] and len(row[1]) > 35 else (row[1] or 'None')
        profil = row[2] or 'None'
        gruppa = row[3] or 'None'
        print(f'{kod:<20} | {tovar:<35} | {profil:<20} | {gruppa:<15}')
    
    print('\n' + '='*100)
    
    # Проверяем уникальные значения КОД_ТОВАРА
    cursor.execute('SELECT DISTINCT КОД_ТОВАРА FROM sales WHERE КОД_ТОВАРА IS NOT NULL AND КОД_ТОВАРА != "" LIMIT 20')
    print('\nПримеры КОД_ТОВАРА (основные продукции?):')
    for row in cursor.fetchall():
        print(f'  - {row[0]}')
    
    print('\n' + '='*100)
    
    # Проверяем уникальные профили
    cursor.execute('SELECT профиль_перечень, COUNT(*) as cnt FROM sales WHERE профиль_перечень IS NOT NULL GROUP BY профиль_перечень ORDER BY cnt DESC LIMIT 15')
    print('\nТоп профилей:')
    for row in cursor.fetchall():
        print(f'  - {row[0]}: {row[1]:,} записей')
