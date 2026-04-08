"""Быстрая загрузка данных из JSON (всех листов) в базу данных"""
import json
import os
import django
from datetime import datetime
import glob

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import ReadySale


def load_json_to_db(json_file):
    """Загрузка данных из JSON в БД"""
    print(f"\n  Загрузка: {json_file}")
    
    if not os.path.exists(json_file):
        print(f"  ✗ Файл не найден!")
        return 0
    
    # Читаем JSON
    start_time = datetime.now()
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    read_time = datetime.now() - start_time
    total_rows = len(data)
    print(f"    Прочитано: {total_rows} записей за {read_time}")
    
    # Подготовка данных для загрузки
    batch_size = 5000
    objects_to_create = []
    processed = 0
    start_time = datetime.now()
    
    for row in data:
        ready_sale = ReadySale(
            data=row.get('Дата'),
            diler=row.get('Дилер'),
            klient_id=row.get('Клиент ИД'),
            klient=row.get('Клиент'),
            invoice_sid=row.get('Инвоиcе CИД'),
            tip=row.get('Тип'),
            tip_organizacii=row.get('Тип организации'),
            produkt=row.get('Продукт'),
            gruppa_produktov=row.get('Группа продуктов'),
            kolichestvo=row.get('Количество'),
            ves_kg=row.get('Вес(кг)'),
            obshchaya_summa=row.get('Общая сумма'),
            dokhod=row.get('Доход'),
            valyuta=row.get('Валюта'),
            tovary=row.get('ТОВАРЫ'),
            year=row.get('year'),
            sheet_name=row.get('sheet_name')
        )
        objects_to_create.append(ready_sale)
        processed += 1
        
        # Пакетная вставка
        if len(objects_to_create) >= batch_size:
            ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)
            objects_to_create = []
    
    # Вставка остатка
    if objects_to_create:
        ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)
    
    load_time = datetime.now() - start_time
    
    print(f"    Загружено за {load_time} ({total_rows / load_time.total_seconds():.0f} зап/сек)")
    
    return total_rows


def main():
    """Основная функция"""
    print("\n" + "="*60)
    print("ЗАГРУЗКА ВСЕХ JSON → БАЗА ДАННЫХ")
    print("="*60)
    
    # Проверка существующих данных
    count = ReadySale.objects.count()
    if count > 0:
        print(f"\n⚠ В таблице уже есть {count:,} записей")
        response = input("Удалить их перед загрузкой? (yes/no): ")
        if response.lower() in ['yes', 'y', 'да', 'д']:
            print("Удаление старых записей...")
            ReadySale.objects.all().delete()
            print("✓ Старые записи удалены")
        else:
            print("Загрузка будет добавлять к существующим данным...")
    
    # Находим все JSON файлы
    json_files = sorted(glob.glob('202*_*.json'))
    
    if not json_files:
        print("\n✗ JSON файлы не найдены!")
        print("Сначала запустите: python export_excel_to_json.py")
        return
    
    print(f"\nНайдено JSON файлов: {len(json_files)}")
    for f in json_files:
        print(f"  - {f}")
    
    total_start = datetime.now()
    total_loaded = 0
    
    # Загружаем каждый файл
    for year in [2024, 2025]:
        year_files = [f for f in json_files if f.startswith(f'{year}_')]
        if not year_files:
            continue
            
        print(f"\n{'='*60}")
        print(f"ГОД {year} - Загрузка {len(year_files)} файлов")
        print(f"{'='*60}")
        
        for json_file in year_files:
            try:
                loaded = load_json_to_db(json_file)
                total_loaded += loaded
            except Exception as e:
                print(f"\n  ✗ Ошибка при загрузке {json_file}: {e}")
                import traceback
                traceback.print_exc()
    
    total_time = datetime.now() - total_start
    
    # Статистика
    print("\n" + "="*60)
    print("СТАТИСТИКА")
    print("="*60)
    print(f"Загружено записей: {total_loaded:,}")
    print(f"Общее время: {total_time}")
    print(f"Средняя скорость: {total_loaded / total_time.total_seconds():.0f} записей/сек")
    print(f"\nВсего записей в БД: {ReadySale.objects.count():,}")
    print(f"  Записей за 2024: {ReadySale.objects.filter(year=2024).count():,}")
    print(f"  Записей за 2025: {ReadySale.objects.filter(year=2025).count():,}")
    
    # Примеры данных
    if ReadySale.objects.exists():
        print("\nПримеры загруженных данных:")
        for sale in ReadySale.objects.all()[:3]:
            print(f"  - {sale.data} | {sale.diler} | {sale.produkt} | {sale.dokhod} {sale.valyuta}")
    
    print("\n✓ Загрузка завершена успешно!")
    print("="*60)


if __name__ == '__main__':
    main()
