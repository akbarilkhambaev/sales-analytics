"""
Заполняет справочник TovaryMapping из существующих данных таблицы sales.
Берёт уникальные комбинации ТОВАРЫ → КОД_ТОВАРА, ГРУППА_ТОВАРА, ЦВЕТ, профиль_перечень.
Запускать один раз после создания таблицы.
"""
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale, TovaryMapping
from django.db.models import Max

print("Собираем уникальные ТОВАРЫ из sales...")

# Для каждого уникального значения ТОВАРЫ берём последнюю запись
# (самую актуальную по id), чтобы получить связанные поля
unique_tovary = (
    Sale.objects
    .exclude(tovary__isnull=True)
    .exclude(tovary='')
    .values('tovary')
    .annotate(last_id=Max('id'))
)

total = unique_tovary.count()
print(f"Найдено уникальных ТОВАРЫ: {total}")

created = 0
updated = 0

for i, item in enumerate(unique_tovary, 1):
    if i % 500 == 0:
        print(f"  {i}/{total}...")

    sale = Sale.objects.get(id=item['last_id'])

    obj, was_created = TovaryMapping.objects.update_or_create(
        tovary=sale.tovary,
        defaults={
            'kod_tovara':     sale.kod_tovara or None,
            'gruppa_tovara':  sale.gruppa_tovara or None,
            'cvet':           sale.cvet or None,
            'profil_perechen': sale.profil_perechen or None,
        }
    )
    if was_created:
        created += 1
    else:
        updated += 1

print()
print(f"✓ Создано: {created}")
print(f"✓ Обновлено: {updated}")

coded   = TovaryMapping.objects.filter(is_coded=True).count()
uncoded = TovaryMapping.objects.filter(is_coded=False).count()
print(f"✓ Закодированы полностью: {coded}")
print(f"⚠ Не закодированы: {uncoded}")
