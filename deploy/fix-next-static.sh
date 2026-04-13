#!/bin/bash
# =============================================================================
#  fix-next-static.sh — восстановление Next standalone static/public на сервере
#  Запускать на сервере: bash deploy/fix-next-static.sh
# =============================================================================
set -e

APP_DIR="/var/www/sales-analytics"
FRONTEND_DIR="$APP_DIR/frontend"

echo "▸ Проверка frontend директории"
cd "$FRONTEND_DIR"

if [ ! -d .next/standalone ]; then
  echo "Ошибка: .next/standalone не найден. Сначала выполните сборку frontend: npm run build"
  exit 1
fi

if [ ! -d .next/static ]; then
  echo "Ошибка: .next/static не найден. Сначала выполните сборку frontend: npm run build"
  exit 1
fi

echo "▸ Восстановление .next/static в standalone"
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

if [ -d public ]; then
  echo "▸ Восстановление public в standalone"
  rm -rf .next/standalone/public
  mkdir -p .next/standalone/public
  cp -r public/. .next/standalone/public/
fi

echo "▸ Перезапуск Next.js"
sudo systemctl restart sales-nextjs
sudo systemctl --no-pager --full status sales-nextjs

echo "✅ Next static восстановлена"