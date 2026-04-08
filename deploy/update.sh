#!/bin/bash
# =============================================================================
#  update.sh — обновление уже задеплоенного приложения
#  Запускать из корня проекта: bash deploy/update.sh
# =============================================================================
set -e
APP_DIR="/var/www/sales-analytics"

echo "▸ Backend: миграции + collectstatic"
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt -q
python manage.py migrate --noinput
python manage.py collectstatic --noinput
deactivate

echo "▸ Frontend: сборка"
cd "$APP_DIR/frontend"
npm ci --silent
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

echo "▸ Перезапуск сервисов"
systemctl restart sales-gunicorn sales-nextjs

echo "✅ Обновление завершено"
