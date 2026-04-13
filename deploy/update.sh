#!/bin/bash
# =============================================================================
#  update.sh — обновление уже задеплоенного приложения
#  Запускать из корня проекта: bash deploy/update.sh
# =============================================================================
set -e
APP_DIR="/var/www/sales-analytics"

echo "▸ Обновление systemd и nginx конфигов"
cp "$APP_DIR/deploy/gunicorn.service" /etc/systemd/system/sales-gunicorn.service
cp "$APP_DIR/deploy/nextjs.service" /etc/systemd/system/sales-nextjs.service
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sales-analytics
systemctl daemon-reload

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

echo "▸ Frontend: синхронизация standalone-статики"
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

if [ -d public ]; then
	rm -rf .next/standalone/public
	mkdir -p .next/standalone/public
	cp -r public/. .next/standalone/public/
fi

echo "▸ Перезапуск сервисов"
systemctl restart sales-gunicorn sales-nextjs
nginx -t
systemctl restart nginx

echo "✅ Обновление завершено"
