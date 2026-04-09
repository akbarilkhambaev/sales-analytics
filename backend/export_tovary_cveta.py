import django
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import openpyxl
from api.models import Sale

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Товары и цвета'

# Шапка
ws.append(['КОД_ТОВАРА', 'ТОВАРЫ', 'ЦВЕТ'])

# Ширина колонок
ws.column_dimensions['A'].width = 25
ws.column_dimensions['B'].width = 40
ws.column_dimensions['C'].width = 30

rows = (
    Sale.objects
    .exclude(kod_tovara='')
    .values('kod_tovara', 'tovary', 'cvet')
    .distinct()
    .order_by('kod_tovara', 'cvet')
)

for r in rows:
    ws.append([r['kod_tovara'], r['tovary'] or '', r['cvet'] or ''])

output = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tovary_cveta.xlsx')
wb.save(output)
print(f'Готово! Строк: {rows.count()}')
print(f'Файл: {output}')
