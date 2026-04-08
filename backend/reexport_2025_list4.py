"""Переэкспорт одного листа с исправлением формата даты"""
import pandas as pd
import json
import os
from datetime import datetime

excel_file = '2025 ГОТОВЫЙ.xlsx'
sheet_name = 'Лист4'
json_file = f'2025_{sheet_name}.json'
year = 2025

print(f"Переэкспорт: {excel_file} → {json_file}")
print(f"Лист: {sheet_name}")

# Читаем лист
df = pd.read_excel(excel_file, sheet_name=sheet_name)
print(f"Прочитано: {len(df)} строк")

# Добавляем поля
df['year'] = year
df['sheet_name'] = sheet_name

# ПРАВИЛЬНАЯ конвертация даты в ISO формат
if 'Дата' in df.columns:
    df['Дата'] = pd.to_datetime(df['Дата'], errors='coerce').dt.strftime('%Y-%m-%d')

# Заменяем NaN на None
df = df.where(pd.notnull(df), None)

# Сохраняем в JSON
data = df.to_dict('records')

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✓ Сохранено: {len(data)} записей")
print(f"✓ Файл: {json_file}")
