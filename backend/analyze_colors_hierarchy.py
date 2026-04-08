import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale
from django.db.models import Sum, Count
from django.db.models.functions import Cast
from django.db.models import FloatField

# Анализируем структуру данных для цветов
print("="*60)
print("АНАЛИЗ ДАННЫХ ПО ЦВЕТАМ")
print("="*60)

# Получаем топ цвета
top_colors = Sale.objects.filter(
    cvet__isnull=False
).exclude(
    cvet=''
).values('cvet').annotate(
    total=Sum(Cast('dopoln_kol_vo', FloatField())),
    count=Count('id')
).order_by('-total')[:20]

print(f"\nТоп-20 цветов по объему продаж:\n")
for i, color in enumerate(top_colors, 1):
    print(f"{i:2}. {color['cvet'][:40]:40} | Объем: {color['total']:>15,.0f} | Записей: {color['count']:>8,}")

# Проверяем какие поля можно использовать для вложенной структуры
print(f"\n{'='*60}")
print("Проверяем связь ЦВЕТ -> КОД_ТОВАРА")
print(f"{'='*60}\n")

sample_color = top_colors[0]['cvet']
products_for_color = Sale.objects.filter(
    cvet=sample_color
).values('kod_tovara').annotate(
    total=Sum(Cast('dopoln_kol_vo', FloatField()))
).order_by('-total')[:10]

print(f"Для цвета '{sample_color}' найдено КОД_ТОВАРА:\n")
for i, prod in enumerate(products_for_color, 1):
    print(f"{i:2}. {prod['kod_tovara'][:50]:50} | Объем: {prod['total']:>15,.0f}")

# Проверяем связь ЦВЕТ -> ТОВАРЫ
print(f"\n{'='*60}")
print("Проверяем связь ЦВЕТ -> ТОВАРЫ")
print(f"{'='*60}\n")

tovary_for_color = Sale.objects.filter(
    cvet=sample_color
).values('tovary').annotate(
    total=Sum(Cast('dopoln_kol_vo', FloatField()))
).order_by('-total')[:10]

print(f"Для цвета '{sample_color}' найдено ТОВАРЫ:\n")
for i, tov in enumerate(tovary_for_color, 1):
    if tov['tovary']:
        print(f"{i:2}. {tov['tovary'][:50]:50} | Объем: {tov['total']:>15,.0f}")

# Проверяем уникальные значения
total_colors = Sale.objects.filter(cvet__isnull=False).exclude(cvet='').values('cvet').distinct().count()
print(f"\n{'='*60}")
print(f"Всего уникальных цветов: {total_colors}")
print(f"{'='*60}")
