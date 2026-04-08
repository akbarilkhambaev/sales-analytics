"""
Скрипт для обновления профиля товаров из Excel файла
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
from django.db import connection


def update_colors_from_excel(excel_file='перечень продукций.xlsx'):
    """
    Обновляет профиль_перечень товаров в базе данных из Excel файла
    
    Excel файл должен содержать:
    - Первый столбец: название товара (ТОВАРЫ)
    - Второй столбец: профиль_перечень
    """
    print(f'Чтение файла {excel_file}...')
    
    # Читаем Excel файл (первая строка пустая, пропускаем)
    df = pd.read_excel(excel_file, skiprows=1, header=None, names=['tovar', 'profil'])
    
    # Убираем пустые строки
    df = df.dropna(subset=['tovar'])
    
    print(f'Найдено {len(df)} товаров в Excel файле')
    print(f'Первые 5 записей:')
    print(df.head())
    print()
    
    # Создаем словарь товар -> профиль_перечень
    color_mapping = dict(zip(df['tovar'], df['profil']))
    
    # Статистика
    total_products = len(color_mapping)
    updated_count = 0
    not_found_count = 0
    
    print(f'Начинаем обновление профиль_перечень...')
    print(f'Всего товаров для обновления: {total_products}')
    print()
    
    # Используем Django ORM для эффективного обновления батчами
    from django.db import transaction
    
    batch_size = 100
    processed = 0
    
    with transaction.atomic():
        for tovar_name, profil in color_mapping.items():
            # Пропускаем если профиль пустой
            if pd.isna(profil):
                not_found_count += 1
                continue
            
            # Обновляем записи в БД где ТОВАРЫ соответствует названию из Excel
            rows_affected = Sale.objects.filter(tovary=tovar_name).update(profil_perechen=profil)
            
            if rows_affected > 0:
                updated_count += rows_affected
            else:
                not_found_count += 1
            
            processed += 1
            if processed % batch_size == 0:
                print(f'  Обработано товаров: {processed}/{len(color_mapping)}, обновлено записей: {updated_count:,}')
        
        # Финальная статистика
        print(f'  Обработано товаров: {processed}/{len(color_mapping)}, обновлено записей: {updated_count:,}')
    
    print()
    print('='*70)
    print('РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ:')
    print(f'  Товаров в Excel файле: {total_products}')
    print(f'  Записей обновлено в БД: {updated_count}')
    print(f'  Товаров не найдено в БД: {not_found_count}')
    print('='*70)
    
    # Проверка результатов
    print()
    print('Проверка обновленных данных:')
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


if __name__ == '__main__':
    start_time = datetime.now()
    print('Запуск скрипта обновления профиль_перечень товаров')
    print(f'Время начала: {start_time}')
    print()
    
    try:
        update_colors_from_excel()
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
