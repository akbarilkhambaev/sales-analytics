import os
import django
import pandas as pd
import sqlite3
import time

def update_cvet_from_excel_direct():
    """Обновить колонку ЦВЕТ напрямую через sqlite3"""
    
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
    
    # Подключаемся к SQLite напрямую
    print("\n" + "="*60)
    print("Подключение к базе данных...")
    print("="*60)
    
    db_path = 'database.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("Начинаем обновление базы данных...")
    print("="*60)
    
    updated_count = 0
    batch_num = 0
    start_time = time.time()
    
    for tovary, cvet in tovary_to_cvet.items():
        cursor.execute(
            'UPDATE sales SET "ЦВЕТ" = ? WHERE "ТОВАРЫ" = ?',
            (str(cvet), str(tovary))
        )
        updated_count += cursor.rowcount
        batch_num += 1
        
        if batch_num % 500 == 0:
            conn.commit()  # Commit каждые 500 товаров
            elapsed = time.time() - start_time
            progress = (batch_num / len(tovary_to_cvet)) * 100
            print(f"  Обработано: {batch_num}/{len(tovary_to_cvet)} ({progress:.1f}%) - Обновлено записей: {updated_count:,} - Время: {elapsed:.1f}с")
    
    # Финальный commit
    conn.commit()
    elapsed_time = time.time() - start_time
    
    print("\n" + "="*60)
    print(f"✅ Обновление завершено!")
    print(f"📊 Всего обработано товаров: {len(tovary_to_cvet):,}")
    print(f"📊 Всего обновлено записей: {updated_count:,}")
    print(f"⏱️  Время выполнения: {elapsed_time/60:.2f} минут")
    print(f"⚡ Скорость: {updated_count/elapsed_time:.0f} записей/сек")
    print("="*60)
    
    # Проверяем результат
    cursor.execute('SELECT COUNT(*) FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    records_with_cvet = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM sales')
    total_records = cursor.fetchone()[0]
    
    print(f"\nПроверка результата:")
    print(f"  Всего записей в БД: {total_records:,}")
    print(f"  Записей с заполненным ЦВЕТ: {records_with_cvet:,}")
    print(f"  Процент заполненности: {records_with_cvet/total_records*100:.2f}%")
    
    # Примеры обновленных данных
    print(f"\nПримеры обновленных записей:")
    sample_tovary = list(tovary_to_cvet.keys())[:3]
    for tovary in sample_tovary:
        cursor.execute('SELECT "ТОВАРЫ", "ЦВЕТ" FROM sales WHERE "ТОВАРЫ" = ? LIMIT 1', (tovary,))
        result = cursor.fetchone()
        if result:
            print(f"  ТОВАРЫ: {result[0]}")
            print(f"  ЦВЕТ: {result[1]}")
            print()
    
    conn.close()

if __name__ == '__main__':
    update_cvet_from_excel_direct()
