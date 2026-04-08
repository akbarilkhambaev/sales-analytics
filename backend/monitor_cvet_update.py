import os
import django
import time

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Sale

def monitor_progress():
    """Мониторинг прогресса обновления колонки ЦВЕТ"""
    
    print("="*60)
    print("МОНИТОРИНГ ОБНОВЛЕНИЯ КОЛОНКИ ЦВЕТ")
    print("="*60)
    print("Нажмите Ctrl+C для остановки мониторинга\n")
    
    prev_count = 0
    start_time = time.time()
    
    try:
        while True:
            # Получаем текущее количество
            total_records = Sale.objects.count()
            records_with_cvet = Sale.objects.filter(
                cvet__isnull=False
            ).exclude(
                cvet=''
            ).count()
            
            # Вычисляем прогресс
            progress = (records_with_cvet / total_records) * 100
            
            # Вычисляем скорость
            elapsed = time.time() - start_time
            if prev_count > 0 and elapsed > 0:
                records_per_sec = (records_with_cvet - prev_count) / 10  # за последние 10 сек
            else:
                records_per_sec = 0
            
            # Оценка оставшегося времени
            remaining_records = total_records - records_with_cvet
            if records_per_sec > 0:
                eta_seconds = remaining_records / records_per_sec
                eta_minutes = eta_seconds / 60
            else:
                eta_minutes = 0
            
            # Очищаем экран и выводим информацию
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print("="*60)
            print("МОНИТОРИНГ ОБНОВЛЕНИЯ КОЛОНКИ ЦВЕТ")
            print("="*60)
            print(f"Время работы: {elapsed/60:.1f} минут\n")
            
            print(f"📊 Всего записей в БД: {total_records:,}")
            print(f"✅ Записей с ЦВЕТ: {records_with_cvet:,}")
            print(f"⏳ Осталось обновить: {remaining_records:,}")
            print(f"\n🔄 Прогресс: {progress:.2f}%")
            
            # Прогресс-бар
            bar_length = 40
            filled = int(bar_length * progress / 100)
            bar = '█' * filled + '░' * (bar_length - filled)
            print(f"[{bar}] {progress:.1f}%")
            
            if records_per_sec > 0:
                print(f"\n⚡ Скорость: {records_per_sec:.0f} записей/сек")
                print(f"⏱️  Осталось примерно: {eta_minutes:.1f} минут")
            
            # Получаем количество уникальных цветов
            unique_colors = Sale.objects.filter(
                cvet__isnull=False
            ).exclude(
                cvet=''
            ).values_list('cvet', flat=True).distinct().count()
            
            print(f"\n🎨 Уникальных цветов: {unique_colors}")
            
            print(f"\n{'='*60}")
            print("Обновление каждые 10 секунд... (Ctrl+C для остановки)")
            
            prev_count = records_with_cvet
            
            # Проверяем, завершено ли обновление
            if records_with_cvet >= total_records * 0.99:  # Почти все записи обновлены
                print("\n✅ ОБНОВЛЕНИЕ ПРАКТИЧЕСКИ ЗАВЕРШЕНО!")
                break
            
            # Ждем 10 секунд
            time.sleep(10)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Мониторинг остановлен пользователем")
        print(f"\nФинальная статистика:")
        print(f"  Записей с ЦВЕТ: {records_with_cvet:,} из {total_records:,}")
        print(f"  Прогресс: {progress:.2f}%")

if __name__ == '__main__':
    monitor_progress()
