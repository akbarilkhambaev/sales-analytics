"""
Скрипт для обновления профиль_перечень из файла товары_без_профиля.xlsx
"""
import os
import sys
import django
import pandas as pd
from datetime import datetime

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale
from django.db import transaction

def update_from_filled_file(excel_file='товары_без_профиля.xlsx'):
    """
    Обновляет профиль_перечень товаров из заполненного файла
    """
    print(f'Чтение файла {excel_file}...')
    
    # Читаем Excel файл
    df = pd.read_excel(excel_file)
    
    # Фильтруем только заполненные профили
    df_filled = df[df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'].notna() & (df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'] != '')]
    
    print(f'Найдено {len(df_filled)} товаров с заполненным профилем')
    print(f'Первые 5 записей:')
    print(df_filled.head())
    print()
    
    # Создаем словарь товар -> профиль
    mapping = dict(zip(df_filled['ТОВАРЫ'], df_filled['ПЕРЕЧЕНЬ_ПРОФИЛЬ']))
    
    # Статистика
    total_products = len(mapping)
    updated_count = 0
    not_found_count = 0
    
    print(f'Начинаем обновление профиль_перечень...')
    print(f'Всего товаров для обновления: {total_products}')
    print()
    
    # Используем Django ORM для обновления батчами
    batch_size = 100
    processed = 0
    
    with transaction.atomic():
        for tovar_name, profil in mapping.items():
            # Обновляем записи в БД
            rows_affected = Sale.objects.filter(tovary=tovar_name).update(profil_perechen=profil)
            
            if rows_affected > 0:
                updated_count += rows_affected
            else:
                not_found_count += 1
            
            processed += 1
            if processed % batch_size == 0:
                print(f'  Обработано товаров: {processed}/{total_products}, обновлено записей: {updated_count:,}')
        
        # Финальная статистика
        print(f'  Обработано товаров: {processed}/{total_products}, обновлено записей: {updated_count:,}')
    
    print()
    print('='*70)
    print('РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ:')
    print(f'  Товаров в файле: {total_products}')
    print(f'  Записей обновлено в БД: {updated_count:,}')
    print(f'  Товаров не найдено в БД: {not_found_count}')
    print('='*70)
    
    # Проверка результатов
    print()
    print('Проверка обновленных данных:')
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT профиль_перечень, COUNT(*) as cnt 
            FROM sales 
            WHERE профиль_перечень IS NOT NULL AND профиль_перечень != ''
            GROUP BY профиль_перечень 
            ORDER BY cnt DESC 
            LIMIT 10
        """)
        results = cursor.fetchall()
        
        print('Топ-10 профилей по количеству записей:')
        for profil, count in results:
            print(f'  {profil}: {count:,} записей')
        
        # Общая статистика
        cursor.execute("SELECT COUNT(*) FROM sales WHERE профиль_перечень IS NOT NULL AND профиль_перечень != ''")
        total_filled = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sales")
        total_records = cursor.fetchone()[0]
        
        print()
        print('ОБЩАЯ СТАТИСТИКА:')
        print(f'  Всего записей в БД: {total_records:,}')
        print(f'  С заполненным профилем: {total_filled:,} ({total_filled/total_records*100:.1f}%)')
        print(f'  С пустым профилем: {total_records - total_filled:,} ({(total_records - total_filled)/total_records*100:.1f}%)')


if __name__ == '__main__':
    start_time = datetime.now()
    print('Запуск скрипта обновления из товары_без_профиля.xlsx')
    print(f'Время начала: {start_time}')
    print()
    
    try:
        update_from_filled_file()
        print()
        print('Успешно завершено!')
    except Exception as e:
        print()
        print(f'ОШИБКА: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    end_time = datetime.now()
    duration = end_time - start_time
    print(f'Время окончания: {end_time}')
    print(f'Затрачено времени: {duration}')
