import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from authentication.models import UserProfile

# Создаем администратора
username = 'admin'
email = 'admin@localhost'
password = 'admin'

if User.objects.filter(username=username).exists():
    print(f"Пользователь {username} уже существует!")
    user = User.objects.get(username=username)
    # Убедимся что у него есть профиль
    if not hasattr(user, 'profile'):
        profile = UserProfile.objects.create(user=user, role='ADMIN')
        print(f"  Создан профиль с ролью: {profile.get_role_display()}")
    else:
        user.profile.role = 'ADMIN'
        user.profile.save()
        print(f"  Роль обновлена на: {user.profile.get_role_display()}")
else:
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_staff=True,
        is_superuser=True
    )
    # Профиль создастся автоматически через сигнал
    user.profile.role = 'ADMIN'
    user.profile.save()
    print(f"Создан пользователь: {username}")
    print(f"Email: {email}")
    print(f"Пароль: {password}")
    print(f"Роль: {user.profile.get_role_display()}")
    print(f"Права:")
    print(f"  - Загрузка данных: {user.profile.can_upload}")
    print(f"  - Экспорт: {user.profile.can_export}")
    print(f"  - Фильтры: {user.profile.can_use_filters}")

print("\n✓ Готово!")
