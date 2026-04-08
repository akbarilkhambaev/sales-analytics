# AKFA SALES VISION - Django Backend

Django REST фреймворк API для аналитики продаж.

## 🚀 Установка и запуск

### 1. Активировать виртуальное окружение:
```bash
cd backend
.\venv\Scripts\Activate.ps1
```

### 2. Установить зависимости:
```bash
pip install -r requirements.txt
```

### 3. Запустить сервер:
```bash
python manage.py runserver 8000
```

## 📝 API Endpoints

### Основные эндпоинты:
- `GET /admin/` - Django Admin панель
- `GET /api/` - API Root
- `GET /api/docs/` - Swagger UI документация
- `GET /api/schema/` - OpenAPI схема

### Sales API:
- `GET /api/sales/` - Список всех продаж
- `GET /api/sales/warehouses/` - Список складов
- `GET /api/sales/regions/` - Список регионов
- `GET /api/sales/products-by-years/` - Данные по продуктам по годам
- `GET /api/sales/groups-by-years/` - Данные по группам по годам

### Фильтры (query params):
- `month` - Месяц (01-12)
- `warehouse` - Склад
- `region` - Регион

## 👤 Admin панель

- **URL**: http://localhost:8000/admin/
- **Username**: `admin`
- **Password**: `admin123`

## 📊 База данных

- SQLite: `db.sqlite3`
- Таблица `sales` (исходные данные, ~1,000,000+ записей)
- Таблица `ready_sales` (готовые данные 2024-2025, миллионы записей)

## 📥 Загрузка данных из Excel

### Для загрузки новых годов (2024, 2025, 2026 и т.д.):

```powershell
# 1. Положите Excel файл(ы) вида "XXXX ГОТОВЫЙ.xlsx" в папку backend/

# 2. Экспорт Excel → JSON (делается один раз)
python export_excel_to_json.py

# 3. Загрузка JSON → БД (быстрая загрузка)
python load_from_json.py
```

**📖 Подробная инструкция:** См. файл [`ИНСТРУКЦИЯ_ЗАГРУЗКА_ДАННЫХ.md`](ИНСТРУКЦИЯ_ЗАГРУЗКА_ДАННЫХ.md)

**⚡ Шпаргалка:** См. файл [`ЗАГРУЗКА_ШПАРГАЛКА.txt`](ЗАГРУЗКА_ШПАРГАЛКА.txt)

### Доступные скрипты для работы с данными:
- `export_excel_to_json.py` - Экспорт всех листов Excel в JSON
- `load_from_json.py` - Загрузка JSON в таблицу ready_sales
- `check_excel_sheets.py` - Проверка структуры Excel файлов
- `analyze_ready_files.py` - Анализ данных в Excel

## 🛠 Технологии

- Django 5.0.2
- Django REST Framework 3.14.0
- drf-spectacular (OpenAPI/Swagger)
- django-cors-headers
- django-filter
