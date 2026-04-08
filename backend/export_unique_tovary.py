import os
import django
import pandas as pd
from pathlib import Path

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale

def export_unique_tovary():
    """Экспортировать уникальные значения из колонки ТОВАРЫ в Excel"""
    
    print("Получение уникальных значений из колонки ТОВАРЫ...")
    
    # Получаем уникальные значения ТОВАРЫ (исключая NULL и пустые)
    unique_tovary = Sale.objects.filter(
        tovary__isnull=False
    ).exclude(
        tovary=''
    ).values_list('tovary', flat=True).distinct().order_by('tovary')
    
    # Преобразуем в список
    tovary_list = list(unique_tovary)
    
    print(f"Найдено уникальных товаров: {len(tovary_list)}")
    
    # Создаем DataFrame
    df = pd.DataFrame({
        'ТОВАРЫ': tovary_list
    })
    
    # Экспортируем в Excel
    output_file = 'уникальные_товары.xlsx'
    df.to_excel(output_file, index=False, engine='openpyxl')
    
    print(f"\n✅ Файл успешно создан: {output_file}")
    print(f"📊 Всего уникальных товаров: {len(tovary_list)}")
    
    # Показываем первые 10 для примера
    if len(tovary_list) > 0:
        print(f"\nПервые 10 товаров:")
        for i, tovary in enumerate(tovary_list[:10], 1):
            print(f"  {i}. {tovary}")
    
    return output_file

if __name__ == '__main__':
    export_unique_tovary()
