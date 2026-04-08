import os
import django
import pandas as pd
import time
from django.db import connection

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale

def update_cvet_from_excel():
    """Обновить колонку ЦВЕТ из Excel файла на основе ТОВАРЫ"""
    
    print("Чтение Excel файла...")
    df = pd.read_excel('уникальные_товары.xlsx')
    
    print(f"Загружено {len(df)} строк")
    print(f"Колонки: {list(df.columns)}")
    
    # Проверяем наличие нужных колонок
    if 'ТОВАРЫ' not in df.columns or 'ЦВЕТ_ПРОДУКЦИИ' not in df.columns:
        print("❌ Ошибка: В файле должны быть колонки 'ТОВАРЫ' и 'ЦВЕТ_ПРОДУКЦИИ'")
        return
    
    # Удаляем строки с пустыми значениями
    df_clean = df.dropna(subset=['ТОВАРЫ', 'ЦВЕТ_ПРОДУКЦИИ'])
    print(f"\nСтрок после удаления пустых значений: {len(df_clean)}")
    
    # Создаем словарь товар -> цвет для быстрого поиска
    tovary_to_cvet = dict(zip(df_clean['ТОВАРЫ'], df_clean['ЦВЕТ_ПРОДУКЦИИ']))
    
    print(f"\nУникальных товаров для обновления: {len(tovary_to_cvet)}")
    print(f"\nПримеры данных:")
    for i, (tovary, cvet) in enumerate(list(tovary_to_cvet.items())[:5], 1):
        print(f"  {i}. {tovary} -> {cvet}")
    
    # Используем batch update с raw SQL для максимальной производительности
    print("\n" + "="*60)
    print("Начинаем обновление базы данных (batch mode)...")
    print("="*60)
    
    updated_count = 0
    start_time = time.time()
    
    # Группируем товары в батчи по 100
    items = list(tovary_to_cvet.items())
    batch_size = 100
    total_batches = (len(items) + batch_size - 1) // batch_size
    
    with connection.cursor() as cursor:
        for batch_idx in range(0, len(items), batch_size):
            batch = items[batch_idx:batch_idx + batch_size]
            
            # Создаем CASE WHEN выражение для batch update
            case_sql = "UPDATE sales SET ЦВЕТ = CASE ТОВАРЫ\n"
            params = []
            tovary_list = []
            
            for tovary, cvet in batch:
                case_sql += "  WHEN ? THEN ?\n"
                params.extend([str(tovary), str(cvet)])
                tovary_list.append(f"'{str(tovary).replace(chr(39), chr(39)+chr(39))}'")
            
            case_sql += "END\n"
            case_sql += f"WHERE ТОВАРЫ IN ({','.join(['?' for _ in batch])})"
            params.extend([str(tovary) for tovary, _ in batch])
            
            cursor.execute(case_sql, params)
            updated_count += cursor.rowcount
            
            current_batch = batch_idx // batch_size + 1
            if current_batch % 10 == 0 or current_batch == total_batches:
                elapsed = time.time() - start_time
                progress = (current_batch / total_batches) * 100
                print(f"  Батч {current_batch}/{total_batches} ({progress:.1f}%) - Обновлено: {updated_count:,} записей - Время: {elapsed:.1f}с")
        
        # Commit изменений
        connection.commit()
    
    elapsed_time = time.time() - start_time
    
    print("\n" + "="*60)
    print(f"✅ Обновление завершено!")
    print(f"📊 Всего обновлено записей: {updated_count:,}")
    print(f"⏱️  Время выполнения: {elapsed_time/60:.1f} минут")
    print(f"⚡ Скорость: {updated_count/elapsed_time:.0f} записей/сек")
    print("="*60)
    
    # Проверяем результат
    print("\nПроверка результата...")
    total_records = Sale.objects.count()
    records_with_cvet = Sale.objects.filter(cvet__isnull=False).exclude(cvet='').count()
    
    print(f"  Всего записей в БД: {total_records:,}")
    print(f"  Записей с заполненным ЦВЕТ: {records_with_cvet:,}")
    print(f"  Процент заполненности: {records_with_cvet/total_records*100:.2f}%")
    
    # Показываем примеры обновленных данных
    print("\nПримеры обновленных записей:")
    sample_tovary = list(tovary_to_cvet.keys())[:3]
    for tovary in sample_tovary:
        sample = Sale.objects.filter(tovary=tovary).first()
        if sample:
            print(f"  ТОВАРЫ: {sample.tovary}")
            print(f"  ЦВЕТ: {sample.cvet}")
            print()

if __name__ == '__main__':
    update_cvet_from_excel()
