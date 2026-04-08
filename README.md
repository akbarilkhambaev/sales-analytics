# 📊 AKFA SALES VISION

Полноценная система аналитики продаж с Django REST API и Next.js фронтендом.

## 🎯 Описание

Современный dashboard для анализа продаж по товарам и группам за период 2020-2025 с фильтрацией по месяцам, складам и регионам.

## 🏗 Архитектура

```
sales-analytics/
├── backend/          # Django + Django REST Framework
│   ├── api/         # REST API эндпоинты
│   ├── config/      # Django настройки
│   └── database.db  # SQLite (1,000,000+ записей)
│
└── frontend/        # Next.js 14 + shadcn/ui
    ├── app/        # App Router страницы
    ├── components/ # React компоненты
    └── lib/        # API клиент и утилиты
```

## 🚀 Быстрый старт

### Backend (Django)

```bash
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py runserver 8000
```

**Django Admin**: http://localhost:8000/admin/
- Username: `admin`
- Password: `admin123`

**API Docs**: http://localhost:8000/api/docs/

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

**Приложение**: http://localhost:3000

## 📡 API Endpoints

### Sales Analytics:
- `GET /api/sales/warehouses/` - Список складов
- `GET /api/sales/regions/` - Список регионов
- `GET /api/sales/products-by-years/?month=01&warehouse=СКЛАД&region=РЕГИОН`
- `GET /api/sales/groups-by-years/?month=01&warehouse=СКЛАД&region=РЕГИОН`

## 🎨 Технологический стек

### Backend:
- ⚡ Django 5.0 + Django REST Framework
- 📊 SQLite (existing database)
- 📝 drf-spectacular (OpenAPI/Swagger)
- 🔄 django-cors-headers
- 🔍 django-filter

### Frontend:
- ⚡ Next.js 14 (App Router)
- 🔷 TypeScript
- 🎨 Tailwind CSS
- 🧩 shadcn/ui компоненты
- 🎯 React Server Components

## 📦 Основные фичи

### ✅ Реализовано:
- ✅ Django ORM модели для продаж
- ✅ REST API для фильтрации и агрегации
- ✅ Admin панель для управления данными
- ✅ OpenAPI/Swagger документация
- ✅ CORS настройка для Next.js

### 🚧 В разработке (Frontend):
- 🔲 Next.js страницы (главная, продукты, группы)
- 🔲 shadcn/ui таблицы с сортировкой
- 🔲 Фильтры (месяц, склад, регион)
- 🔲 Графики процента роста
- 🔲 Адаптивный дизайн

## 📊 Данные

- **Записей в БД**: 1,000,521
- **Продуктов**: 26 (UPPERCASE коды)
- **Групп товаров**: 5 (ALDOKS, TERMO, FASAD, ALUM.BOSHQALAR, MEBEL)
- **Регионов**: 14
- **Складов**: 5  
- **Период**: 2020-2025

## 🔧 Разработка

### Backend:
```bash
cd backend
python manage.py makemigrations  # Создать миграции
python manage.py migrate         # Применить миграции
python manage.py createsuperuser # Создать admin
python manage.py shell           # Django shell
```

### Frontend:
```bash
cd frontend
npm run dev     # Development
npm run build   # Production build
npm run lint    # Lint check
```

## 📝 Примечания

- Backend использует существующую БД из проекта `D:\2026\БД\`
- Модель Sale использует `managed=False` (не управляет таблицей)
- Колонки маппятся через `db_column` (КОД_ТОВАРА, РЕГИОН и т.д.)
- ДОПОЛН__КОЛ-ВО хранится как TEXT, конвертируется в float

## 👥 Авторы

Разработка: 2026

## 📄 Лицензия

MIT
