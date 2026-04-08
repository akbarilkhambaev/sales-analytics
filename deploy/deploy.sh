#!/bin/bash
# =============================================================================
#  deploy.sh — первоначальная установка на Ubuntu 22.04 / 24.04 VPS
#  Запускать от root или через sudo
#  Использование: bash deploy.sh
# =============================================================================
set -e

APP_DIR="/var/www/sales-analytics"
REPO_DIR="$APP_DIR"          # папка, куда скопирован проект

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 1. Обновление системы и установка зависимостей"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
apt update && apt upgrade -y
apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib \
               nginx nodejs curl git redis-server

systemctl enable redis-server
systemctl start redis-server

# Node.js 20 LTS (если старее)
if ! node -e "process.exit(parseInt(process.version.slice(1)) >= 20 ? 0 : 1)" 2>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 2. PostgreSQL — создание БД и пользователя"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Читаем из .env
source "$REPO_DIR/backend/.env"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 3. Backend (Django)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$REPO_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate --noinput
python manage.py collectstatic --noinput
deactivate

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 4. Frontend (Next.js)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$REPO_DIR/frontend"
npm ci
npm run build

# Копируем статику standalone-сборки
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 5. Media папка (вне проекта — не сбрасывается при обновлении)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p /var/www/sales-media
chown www-data:www-data /var/www/sales-media
chmod 755 /var/www/sales-media

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 6. Systemd сервисы"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p /var/log/gunicorn
chown www-data:www-data /var/log/gunicorn

cp "$REPO_DIR/deploy/gunicorn.service" /etc/systemd/system/sales-gunicorn.service
cp "$REPO_DIR/deploy/nextjs.service"   /etc/systemd/system/sales-nextjs.service

systemctl daemon-reload
systemctl enable  sales-gunicorn sales-nextjs
systemctl restart sales-gunicorn sales-nextjs

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 6. Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sales-analytics
ln -sf /etc/nginx/sites-available/sales-analytics /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

echo ""
echo "✅ Деплой завершён!"
echo "   Django admin: http://$(curl -s ifconfig.me)/admin/"
echo ""
echo "   Если нужен суперпользователь:"
echo "   cd $REPO_DIR/backend && source venv/bin/activate"
echo "   python manage.py createsuperuser"
