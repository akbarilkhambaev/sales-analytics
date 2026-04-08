import os
import django
from django.db import connection

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale

def clear_cvet_column():
    """Очистить колонку ЦВЕТ (установить NULL для всех записей)"""
    
    print("="*60)
    print("Очистка колонки ЦВЕТ...")
    print("="*60)
    
    # Проверяем текущее состояние
    total_records = Sale.objects.count()
    records_with_cvet = Sale.objects.filter(cvet__isnull=False).exclude(cvet='').count()
    
    print(f"\nТекущее состояние:")
    print(f"  Всего записей: {total_records:,}")
    print(f"  Записей с заполненным ЦВЕТ: {records_with_cvet:,}")
    
    print(f"\n{'='*60}")
    print("Начинаем очистку...")
    print(f"{'='*60}\n")
    
    # Очищаем колонку
    with connection.cursor() as cursor:
        cursor.execute('UPDATE sales SET "ЦВЕТ" = NULL')
        print(f"✅ Колонка ЦВЕТ очищена!")
    
    # Проверяем результат
    records_with_cvet_after = Sale.objects.filter(cvet__isnull=False).exclude(cvet='').count()
    
    print(f"\nРезультат:")
    print(f"  Записей с заполненным ЦВЕТ после очистки: {records_with_cvet_after:,}")
    print(f"  Очищено записей: {records_with_cvet:,}")
    
    print(f"\n{'='*60}")
    print("✅ Очистка завершена!")
    print(f"{'='*60}")

if __name__ == '__main__':
    clear_cvet_column()
