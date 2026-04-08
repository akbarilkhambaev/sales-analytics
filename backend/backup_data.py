import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import ReadySale

print("Создание резервной копии ReadySale...")
data = []
count = 0

for sale in ReadySale.objects.all().iterator(chunk_size=10000):
    data.append({
        'model': 'api.readysale',
        'pk': sale.id,
        'fields': {
            'ARTIKUL': sale.ARTIKUL,
            'TOVAR': sale.TOVAR,
            'GRUPPA': sale.GRUPPA,
            'NOMENCLATURA': sale.NOMENCLATURA,
            'CVET': sale.CVET,
            'RAZMER': sale.RAZMER,
            'PROFIL': sale.PROFIL,
            'KLIENT': sale.KLIENT,
            'DATA': sale.DATA.isoformat() if sale.DATA else None,
            'DOPOLN__KOL_VO': str(sale.DOPOLN__KOL_VO) if sale.DOPOLN__KOL_VO else None,
            'obshchaya_summa': str(sale.obshchaya_summa) if sale.obshchaya_summa else None,
            'dokhod': str(sale.dokhod) if sale.dokhod else None,
            'sheet_name': sale.sheet_name,
        }
    })
    count += 1
    if count % 100000 == 0:
        print(f"Обработано {count} записей...")

print(f"Сохранение {len(data)} записей в backup_readysale.json...")
with open('backup_readysale.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Резервная копия создана!")
