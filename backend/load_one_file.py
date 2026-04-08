"""Загрузка одного JSON файла в БД"""
import json
import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import ReadySale

json_file = '2025_Лист4.json'

print(f"Загрузка: {json_file}")

# Читаем JSON
with open(json_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Прочитано: {len(data)} записей")

# Загрузка
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
    
    if len(objects_to_create) >= batch_size:
        ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)
        objects_to_create = []

if objects_to_create:
    ReadySale.objects.bulk_create(objects_to_create, ignore_conflicts=True)

load_time = datetime.now() - start_time

print(f"✓ Загружено за {load_time}")
print(f"\nВсего в БД: {ReadySale.objects.count():,}")
print(f"За 2024: {ReadySale.objects.filter(year=2024).count():,}")
print(f"За 2025: {ReadySale.objects.filter(year=2025).count():,}")
