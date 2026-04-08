#!/bin/bash
# =============================================================
# Шаг 2: Импорт данных в PostgreSQL (запускать на сервере)
# Запускать ПОСЛЕ deploy.sh и после копирования data_backup.json
#
# Использование:
#   bash /var/www/sales-analytics/deploy/import_to_postgres.sh
# =============================================================

set -e

APP_DIR="/var/www/sales-analytics"
BACKEND_DIR="$APP_DIR/backend"
PYTHON="$BACKEND_DIR/venv/bin/python"
MANAGE="$BACKEND_DIR/manage.py"
BACKUP_FILE="$APP_DIR/deploy/data_backup.json"

echo "========================================"
echo "  Импорт данных в PostgreSQL"
echo "========================================"

# Проверяем наличие файла резервной копии
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл данных не найден: $BACKUP_FILE"
    echo ""
    echo "   Скопируйте data_backup.json на сервер:"
    echo "   scp data_backup.json user@$(hostname -I | awk '{print $1}'):$BACKUP_FILE"
    exit 1
fi

echo "✅ Файл данных найден: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"
echo ""

# Загружаем .env для получения настроек PostgreSQL
if [ -f "$BACKEND_DIR/.env" ]; then
    source "$BACKEND_DIR/.env"
    echo "✅ Загружен .env файл"
else
    echo "❌ Файл .env не найден в $BACKEND_DIR"
    echo "   Создайте его из .env.example и настройте"
    exit 1
fi

# Проверяем, что настроена PostgreSQL (не SQLite)
if [ -z "$DB_NAME" ] && [ -z "$DATABASE_URL" ]; then
    echo "❌ В .env не задан DB_NAME или DATABASE_URL"
    echo "   Настройте PostgreSQL в $BACKEND_DIR/.env"
    exit 1
fi

echo "🗄️  База данных: ${DB_NAME:-из DATABASE_URL}"
echo ""

# Применяем миграции к PostgreSQL (создаём все таблицы)
echo "📋 Применяем миграции..."
cd "$BACKEND_DIR"
$PYTHON $MANAGE migrate

echo ""
echo "📥 Загружаем данные..."
$PYTHON $MANAGE loaddata "$BACKUP_FILE"

echo ""
echo "🔑 Проверка суперпользователей..."
$PYTHON $MANAGE shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
admins = User.objects.filter(is_superuser=True)
if admins.exists():
    print('  Суперпользователи:', ', '.join(u.username for u in admins))
else:
    print('  ⚠️  Суперпользователи не найдены. Создайте: python manage.py createsuperuser')
"

echo ""
echo "========================================"
echo "  ✅ Импорт завершён успешно!"
echo "========================================"
echo ""
echo "Резервная копия: $BACKUP_FILE"
echo "Сохраните её в надёжное место:"
echo "  cp $BACKUP_FILE $APP_DIR/data_backup_$(date +%Y%m%d_%H%M).json"
