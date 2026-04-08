import os
import django
import pandas as pd
import sqlite3
import time

def continue_update_cvet():
    """Продолжить обновление ЦВЕТ с того места, где остановились"""
    
    print("Чтение Excel файла...")
    df = pd.read_excel('уникальные_товары.xlsx')
    
    print(f"Загружено {len(df)} строк")
    
    # Удаляем строки с пустыми значениями
    df_clean = df.dropna(subset=['ТОВАРЫ', 'ЦВЕТ_ПРОДУКЦИИ'])
    tovary_to_cvet = dict(zip(df_clean['ТОВАРЫ'], df_clean['ЦВЕТ_ПРОДУКЦИИ']))
    
    # Подключаемся к БД
    db_path = 'database.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Проверяем текущий статус
    cursor.execute('SELECT COUNT(*) FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    current_filled = cursor.fetchone()[0]
    print(f"\nТекущее состояние: {current_filled:,} записей уже имеют ЦВЕТ")
    
    # Получаем список товаров, которые уже обновлены
    cursor.execute('''
        SELECT DISTINCT "ТОВАРЫ" 
        FROM sales 
        WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""
    ''')
    updated_tovary = set(row[0] for row in cursor.fetchall())
    print(f"Уже обновлено уникальных товаров: {len(updated_tovary)}")
    
    # Фильтруем только те товары, которые еще не обновлены
    remaining_tovary = {k: v for k, v in tovary_to_cvet.items() if k not in updated_tovary}
    print(f"Осталось обновить товаров: {len(remaining_tovary)}")
    
    if len(remaining_tovary) == 0:
        print("\n✅ Все товары уже обновлены!")
        conn.close()
        return
    
    print(f"\nПримеры оставшихся товаров:")
    for i, (tovary, cvet) in enumerate(list(remaining_tovary.items())[:5], 1):
        print(f"  {i}. {tovary} -> {cvet}")
    
    print("\n" + "="*60)
    print("Продолжаем обновление базы данных...")
    print("="*60)
    
    updated_count = 0
    batch_num = 0
    start_time = time.time()
    
    for tovary, cvet in remaining_tovary.items():
        cursor.execute(
            'UPDATE sales SET "ЦВЕТ" = ? WHERE "ТОВАРЫ" = ?',
            (str(cvet), str(tovary))
        )
        updated_count += cursor.rowcount
        batch_num += 1
        
        if batch_num % 500 == 0:
            conn.commit()
            elapsed = time.time() - start_time
            progress = (batch_num / len(remaining_tovary)) * 100
            total_filled = current_filled + updated_count
            print(f"  Обработано: {batch_num}/{len(remaining_tovary)} ({progress:.1f}%) - Обновлено: {updated_count:,} - Всего с ЦВЕТ: {total_filled:,} - Время: {elapsed:.1f}с")
    
    # Финальный commit
    conn.commit()
    elapsed_time = time.time() - start_time
    
    # Итоговая статистика
    cursor.execute('SELECT COUNT(*) FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    final_filled = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM sales')
    total_records = cursor.fetchone()[0]
    
    print("\n" + "="*60)
    print(f"✅ Обновление завершено!")
    print(f"📊 В этой сессии обновлено записей: {updated_count:,}")
    print(f"📊 Всего записей с ЦВЕТ: {final_filled:,} из {total_records:,}")
    print(f"📊 Процент заполненности: {final_filled/total_records*100:.2f}%")
    print(f"⏱️  Время выполнения: {elapsed_time/60:.2f} минут")
    if elapsed_time > 0:
        print(f"⚡ Скорость: {updated_count/elapsed_time:.0f} записей/сек")
    print("="*60)
    
    conn.close()

if __name__ == '__main__':
    continue_update_cvet()
