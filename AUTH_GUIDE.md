# 🔐 Система авторизации AKFA SALES VISION

## Новые возможности

✅ **Страница входа** - `/login`
✅ **Защита маршрутов** - автоматическое перенаправление на логин
✅ **Header с информацией о пользователе** - на всех страницах
✅ **Кнопка выхода** - в правом верхнем углу

## Доступы для входа

### Демо доступ:
- **Логин:** `admin`
- **Пароль:** `admin`

## Как это работает

### 1. Страница входа (`/login`)
- Современный дизайн в стиле системы
- Валидация формы
- Сообщения об ошибках
- Автоматическое перенаправление после входа

### 2. Проверка авторизации
- При попытке доступа к любой странице без авторизации → редирект на `/login`
- При попытке доступа к `/login` с активной сессией → редирект на главную `/`
- Данные авторизации хранятся в `localStorage`

### 3. Header компонент
- Отображает имя текущего пользователя
- Кнопка выхода с подтверждением
- Адаптивный дизайн

### 4. Защищенные страницы
Все страницы требуют авторизации:
- `/` - Главная
- `/products` - Все продукты
- `/groups` - По группам
- `/hierarchy` - Перечень товаров
- `/colors` - Продукты по цветам
- `/clients` - Клиентская база

## Файлы системы авторизации

```
frontend/app/
├── login/
│   └── page.tsx                 # Страница входа
├── components/
│   ├── Header.tsx               # Header с кнопкой выхода
│   └── AuthProvider.tsx         # Provider проверки авторизации (опционально)
├── page.tsx                     # Главная (обновлена)
├── products/page.tsx            # Продукты (обновлена)
├── groups/page.tsx              # Группы (обновлена)
├── hierarchy/page.tsx           # Иерархия (обновлена)
├── colors/page.tsx              # Цвета (обновлена)
└── clients/page.tsx             # Клиенты (обновлена)
```

## Следующие шаги

### Backend интеграция (опционально)

Для полноценной авторизации можно добавить:

1. **Django REST Framework Simple JWT**
```bash
pip install djangorestframework-simplejwt
```

2. **API endpoints:**
- `POST /api/auth/login/` - вход
- `POST /api/auth/logout/` - выход
- `POST /api/auth/refresh/` - обновление токена

3. **Пример настройки:**
```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
```

4. **Обновление API клиента:**
```typescript
// lib/api.ts
async login(username: string, password: string) {
  const response = await fetch(`${this.baseUrl}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}
```

## Безопасность

**Текущая реализация:**
- ✅ Базовая защита маршрутов
- ✅ Локальное хранение сессии
- ⚠️ Демо режим (простая проверка)

**Рекомендации для продакшн:**
- 🔒 Использовать JWT токены
- 🔒 HTTPS обязателен
- 🔒 httpOnly cookies вместо localStorage
- 🔒 Refresh token механизм
- 🔒 Rate limiting на backend
- 🔒 CSRF защита

## Тестирование

1. Откройте [http://localhost:3000](http://localhost:3000)
2. Вы будете перенаправлены на `/login`
3. Введите `admin` / `admin`
4. После входа вы попадете на главную страницу
5. В правом верхнем углу появится ваше имя и кнопка выхода
6. Попробуйте выйти и войти снова

---

© 2026 AKFA SALES VISION
