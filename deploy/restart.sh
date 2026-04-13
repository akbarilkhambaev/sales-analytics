#!/bin/bash
# =============================================================================
#  restart.sh — быстрый перезапуск сервисов на сервере
#  Запускать на сервере: bash deploy/restart.sh
# =============================================================================
set -e

echo "▸ Перезагрузка systemd"
sudo systemctl daemon-reload

echo "▸ Перезапуск backend и frontend"
sudo systemctl restart sales-gunicorn
sudo systemctl restart sales-nextjs

echo "▸ Проверка и перезапуск nginx"
sudo nginx -t
sudo systemctl restart nginx

echo "▸ Статус сервисов"
sudo systemctl --no-pager --full status sales-gunicorn sales-nextjs nginx

echo "✅ Сервер перезапущен"