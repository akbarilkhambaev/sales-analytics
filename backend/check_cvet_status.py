import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale

def check_cvet_status():
    """Проверить статус заполнения колонки ЦВЕТ"""
    
    print("="*60)
    print("Проверка статуса колонки ЦВЕТ")
    print("="*60)
    
    total_records = Sale.objects.count()
    records_with_cvet = Sale.objects.filter(cvet__isnull=False).exclude(cvet='').count()
    
    print(f"\n📊 Статистика:")
    print(f"  Всего записей в БД: {total_records:,}")
    print(f"  Записей с заполненным ЦВЕТ: {records_with_cvet:,}")
    print(f"  Процент заполненности: {records_with_cvet/total_records*100:.2f}%")
    
    # Примеры данных
    print(f"\n📋 Примеры записей с ЦВЕТ:")
    samples = Sale.objects.filter(cvet__isnull=False).exclude(cvet='')[:5]
    for i, sample in enumerate(samples, 1):
        print(f"  {i}. ТОВАРЫ: {sample.tovary[:50]}")
        print(f"     ЦВЕТ: {sample.cvet}")
        print()
    
    # Уникальные цвета
    unique_colors = Sale.objects.filter(
        cvet__isnull=False
    ).exclude(
        cvet=''
    ).values_list('cvet', flat=True).distinct().order_by('cvet')
    
    unique_colors_list = list(unique_colors)
    print(f"\n🎨 Уникальных цветов: {len(unique_colors_list)}")
    if len(unique_colors_list) > 0:
        print(f"  Первые 20 цветов: {', '.join(map(str, unique_colors_list[:20]))}")

if __name__ == '__main__':
    check_cvet_status()
