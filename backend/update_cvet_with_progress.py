import pandas as pd
import sqlite3
import time
import sys

def update_with_progress():
    """Обновить ЦВЕТ с показом прогресса в реальном времени"""
    
    print("Чтение Excel файла...")
    df = pd.read_excel('уникальные_товары.xlsx')
    
    df_clean = df.dropna(subset=['ТОВАРЫ', 'ЦВЕТ_ПРОДУКЦИИ'])
    tovary_to_cvet = dict(zip(df_clean['ТОВАРЫ'], df_clean['ЦВЕТ_ПРОДУКЦИИ']))
    
    # Подключаемся к БД
    db_path = 'database.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Проверяем текущий статус
    cursor.execute('SELECT COUNT(*) FROM sales')
    total_records = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    current_filled = cursor.fetchone()[0]
    
    print(f"\nТекущее состояние: {current_filled:,} из {total_records:,} ({current_filled/total_records*100:.1f}%)")
    
    # Получаем список уже обновленных товаров
    cursor.execute('SELECT DISTINCT "ТОВАРЫ" FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    updated_tovary = set(row[0] for row in cursor.fetchall())
    
    # Фильтруем оставшиеся товары
    remaining_tovary = {k: v for k, v in tovary_to_cvet.items() if k not in updated_tovary}
    
    if len(remaining_tovary) == 0:
        print("\n✅ Все товары уже обновлены!")
        conn.close()
        return
    
    print(f"Осталось обновить товаров: {len(remaining_tovary)}\n")
    
    print("="*70)
    print("ОБНОВЛЕНИЕ БАЗЫ ДАННЫХ")
    print("="*70)
    
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
        
        # Показываем прогресс каждые 50 товаров
        if batch_num % 50 == 0:
            elapsed = time.time() - start_time
            progress = (batch_num / len(remaining_tovary)) * 100
            total_filled = current_filled + updated_count
            total_progress = (total_filled / total_records) * 100
            
            # Оценка оставшегося времени
            if elapsed > 0:
                tovary_per_sec = batch_num / elapsed
                remaining_tovary_count = len(remaining_tovary) - batch_num
                eta_seconds = remaining_tovary_count / tovary_per_sec if tovary_per_sec > 0 else 0
                eta_minutes = eta_seconds / 60
            else:
                eta_minutes = 0
            
            # Прогресс бар
            bar_length = 40
            filled_bar = int(bar_length * progress / 100)
            bar = '█' * filled_bar + '░' * (bar_length - filled_bar)
            
            # Очищаем строку и выводим прогресс
            print(f"\r[{bar}] {progress:.1f}% | Товаров: {batch_num}/{len(remaining_tovary)} | "
                  f"Записей: {updated_count:,} | Всего: {total_progress:.1f}% | "
                  f"ETA: {eta_minutes:.1f}м", end='', flush=True)
        
        # Commit каждые 500 товаров
        if batch_num % 500 == 0:
            conn.commit()
    
    # Финальный commit
    conn.commit()
    elapsed_time = time.time() - start_time
    
    # Финальная статистика
    cursor.execute('SELECT COUNT(*) FROM sales WHERE "ЦВЕТ" IS NOT NULL AND "ЦВЕТ" != ""')
    final_filled = cursor.fetchone()[0]
    
    print(f"\n\n{'='*70}")
    print(f"✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!")
    print(f"{'='*70}")
    print(f"📊 В этой сессии:")
    print(f"   - Обработано товаров: {batch_num:,}")
    print(f"   - Обновлено записей: {updated_count:,}")
    print(f"   - Время: {elapsed_time/60:.2f} минут")
    print(f"\n📊 Общая статистика:")
    print(f"   - Записей с ЦВЕТ: {final_filled:,} из {total_records:,}")
    print(f"   - Процент заполненности: {final_filled/total_records*100:.2f}%")
    print(f"{'='*70}")
    
    conn.close()

if __name__ == '__main__':
    try:
        update_with_progress()
    except KeyboardInterrupt:
        print("\n\n⚠️  Обновление прервано пользователем")
        sys.exit(0)
