"""Скрипт для загрузки данных из файлов 2024-2025 ГОТОВЫЙ в базу данных"""
import pandas as pd
import os
import django
from datetime import datetime

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import ReadySale


def clean_value(value):
    """Очистка значения от NaN"""
    if pd.isna(value):
        return None
    return value


def load_excel_to_db(file_path, year):
    """Загрузка данных из Excel в базу данных"""
    print(f"\n{'='*60}")
    print(f"Загрузка файла: {file_path}")
    print(f"Год: {year}")
    print(f"{'='*60}")
    
    # Читаем Excel файл
    print("Чтение Excel файла...")
    df = pd.read_excel(file_path)
    
    total_rows = len(df)
    print(f"Всего строк: {total_rows}")
    
    # Подготовка данных
    print("Подготовка данных для загрузки...")
    batch_size = 1000
    objects_to_create = []
    processed = 0
    
    for index, row in df.iterrows():
        ready_sale = ReadySale(
            data=clean_value(row.get('Дата')),
            diler=clean_value(row.get('Дилер')),
            klient_id=clean_value(row.get('Клиент ИД')),
            klient=clean_value(row.get('Клиент')),
            invoice_sid=clean_value(row.get('Инвоиcе CИД')),
            tip=clean_value(row.get('Тип')),
            tip_organizacii=clean_value(row.get('Тип организации')),
            produkt=clean_value(row.get('Продукт')),
            gruppa_produktov=clean_value(row.get('Группа продуктов')),
            kolichestvo=clean_value(row.get('Количество')),
            ves_kg=clean_value(row.get('Вес(кг)')),
            obshchaya_summa=clean_value(row.get('Общая сумма')),
            dokhod=clean_value(row.get('Доход')),
            valyuta=clean_value(row.get('Валюта')),
            tovary=clean_value(row.get('ТОВАРЫ')),
            year=year
        )
        objects_to_create.append(ready_sale)
        processed += 1
        
        # Пакетная вставка
        if len(objects_to_create) >= batch_size:
            ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)
            objects_to_create = []
            # Вывод прогресса каждые 10000 строк
            if processed % 10000 == 0:
                print(f"Обработано: {processed}/{total_rows} ({processed*100//total_rows}%)")
    
    # Вставка остатка
    if objects_to_create:
        ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)
    
    print(f"\n✓ Данные из {file_path} успешно загружены!")
    print(f"Загружено записей: {total_rows}")


def main():
    """Основная функция"""
    print("\n" + "="*60)
    print("ЗАГРУЗКА ДАННЫХ ИЗ ФАЙЛОВ 2024-2025 ГОТОВЫЙ")
    print("="*60)
    
    # Файлы для загрузки
    files = [
        ('2024 ГОТОВЫЙ.xlsx', 2024),
        ('2025 ГОТОВЫЙ.xlsx', 2025)
    ]
    
    # Проверяем, существуют ли файлы
    for file_path, year in files:
        if not os.path.exists(file_path):
            print(f"\n⚠ Файл {file_path} не найден! Пропускаем...")
            continue
    
    # Очищаем таблицу перед загрузкой
    print("\n" + "-"*60)
    count = ReadySale.objects.count()
    if count > 0:
        response = input(f"В таблице уже есть {count} записей. Удалить их? (yes/no): ")
        if response.lower() in ['yes', 'y', 'да', 'д']:
            print("Удаление старых записей...")
            ReadySale.objects.all().delete()
            print("✓ Старые записи удалены")
    
    # Загружаем данные из файлов
    start_time = datetime.now()
    
    for file_path, year in files:
        if os.path.exists(file_path):
            try:
                load_excel_to_db(file_path, year)
            except Exception as e:
                print(f"\n✗ Ошибка при загрузке {file_path}: {e}")
                import traceback
                traceback.print_exc()
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    # Статистика
    print("\n" + "="*60)
    print("СТАТИСТИКА ЗАГРУЗКИ")
    print("="*60)
    print(f"Время выполнения: {duration}")
    print(f"Всего записей в БД: {ReadySale.objects.count()}")
    print(f"Записей за 2024: {ReadySale.objects.filter(year=2024).count()}")
    print(f"Записей за 2025: {ReadySale.objects.filter(year=2025).count()}")
    print("\n✓ Загрузка завершена успешно!")


if __name__ == '__main__':
    main()
