import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from datetime import datetime

print('=== ОЧИСТКА КОЛОНКИ профиль_перечень ===\n')
start_time = datetime.now()

with connection.cursor() as cursor:
    # Проверяем текущее состояние
    cursor.execute("SELECT COUNT(*) FROM sales WHERE профиль_перечень IS NOT NULL AND профиль_перечень != ''")
    before_count = cursor.fetchone()[0]
    
    print(f'До очистки: {before_count:,} записей с заполненным профилем')
    print()
    print('Очищаем колонку...')
    
    # Очищаем колонку
    cursor.execute("UPDATE sales SET профиль_перечень = NULL")
    
    # Проверяем результат
    cursor.execute("SELECT COUNT(*) FROM sales WHERE профиль_перечень IS NOT NULL AND профиль_перечень != ''")
    after_count = cursor.fetchone()[0]
    
    print(f'После очистки: {after_count:,} записей с заполненным профилем')
    print()
    print('✓ Колонка профиль_перечень успешно очищена!')

end_time = datetime.now()
print(f'\nВремя выполнения: {end_time - start_time}')
