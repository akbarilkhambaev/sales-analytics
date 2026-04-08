import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from authentication.models import UserProfile

# Создаем менеджера
username = 'manager'
if not User.objects.filter(username=username).exists():
    user = User.objects.create_user(
        username=username,
        email='manager@localhost',
        password='manager'
    )
    user.profile.role = 'MANAGER'
    user.profile.phone = '+7 999 111-22-33'
    user.profile.department = 'Отдел продаж'
    user.profile.save()
    print(f"✓ Создан пользователь: {username}")
    print(f"  Роль: {user.profile.get_role_display()}")
    print(f"  Права:")
    print(f"    - Загрузка: {user.profile.can_upload}")
    print(f"    - Экспорт: {user.profile.can_export}")
    print(f"    - Фильтры: {user.profile.can_use_filters}")
else:
    print(f"Пользователь {username} уже существует")

# Создаем viewer
username = 'viewer'
if not User.objects.filter(username=username).exists():
    user = User.objects.create_user(
        username=username,
        email='viewer@localhost',
        password='viewer'
    )
    user.profile.role = 'VIEWER'
    user.profile.save()
    print(f"\n✓ Создан пользователь: {username}")
    print(f"  Роль: {user.profile.get_role_display()}")
    print(f"  Права:")
    print(f"    - Загрузка: {user.profile.can_upload}")
    print(f"    - Экспорт: {user.profile.can_export}")
    print(f"    - Фильтры: {user.profile.can_use_filters}")
else:
    print(f"Пользователь {username} уже существует")

print("\n✓ Готово! Тестовые пользователи:")
print("  admin/admin - ADMIN (все права)")
print("  manager/manager - MANAGER (просмотр + фильтры + экспорт)")
print("  viewer/viewer - VIEWER (только просмотр)")
