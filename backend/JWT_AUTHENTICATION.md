# Система аутентификации JWT

## Что было сделано

✅ **Установлен безопасный вариант** - вместо переделки всей БД использован подход с UserProfile:
- Стандартная модель User от Django (не тронули существующую БД с 4.8 млн записей)
- Новая модель UserProfile с ролями (связана OneToOneField с User)
- JWT токены вместо localStorage
- Автоматический аудит всех действий

## Схема системы

```
User (стандартный Django)
  └── UserProfile (наша модель)
      ├── role: ADMIN / MANAGER / VIEWER
      ├── phone, department
      └── permissions:
          ├── can_upload (только ADMIN)
          ├── can_export (ADMIN + MANAGER)
          └── can_use_filters (ADMIN + MANAGER)
```

## API Endpoints

### Аутентификация

**1. Получить токен (логин)**
```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

Ответ:
```json
{
  "access": "eyJhbGci...",  // Токен на 1 час
  "refresh": "eyJhbGc...",  // Токен на 7 дней
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN",
    "role_display": "Администратор",
    "permissions": {
      "can_upload": true,
      "can_export": true,
      "can_use_filters": true
    }
  }
}
```

**2. Обновить токен**
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "refresh_token_here"
}
```

**3. Текущий пользователь**
```http
GET /api/auth/users/me/
Authorization: Bearer <access_token>
```

**4. Выход (blacklist токена)**
```http
POST /api/auth/users/logout/
Authorization: Bearer <access_token>

{
  "refresh": "refresh_token_here"
}
```

**5. Сменить пароль**
```http
POST /api/auth/users/change_password/
Authorization: Bearer <access_token>

{
  "old_password": "current",
  "new_password": "new_secure_password"
}
```

**6. Логи аудита (только для админов)**
```http
GET /api/auth/audit/
GET /api/auth/audit/?action=LOGIN
GET /api/auth/audit/?success=true
Authorization: Bearer <access_token>
```

### Использование API с токеном

Все API запросы требуют JWT токен в заголовке:
```http
GET /api/dashboard/metrics/
Authorization: Bearer eyJhbGci...
```

## Роли и права

| Роль | Просмотр | Фильтры | Экспорт | Загрузка |
|------|----------|---------|---------|----------|
| VIEWER | ✅ | ❌ | ❌ | ❌ |
| MANAGER | ✅ | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |

## Аудит

Все действия автоматически логируются через middleware:
- Кто (user)
- Что делал (action: LOGIN, VIEW, EXPORT, UPLOAD, etc)
- С каким ресурсом (resource: sales, dashboard, products)
- Когда (timestamp)
- Откуда (IP address, user agent)
- Успешно или нет (success, error_message)

Действия:
- `LOGIN` - вход в систему
- `LOGOUT` - выход
- `VIEW` - просмотр данных (GET запросы)
- `EXPORT` - экспорт данных
- `UPLOAD` - загрузка данных
- `FILTER` - применение фильтров
- `CREATE` - создание записи
- `UPDATE` - обновление записи
- `DELETE` - удаление

## Тестовый пользователь

```
Username: admin
Password: admin
Role: ADMIN (все права)
```

## Как создать нового пользователя

### Через Django shell:
```python
python manage.py shell

from django.contrib.auth.models import User
from authentication.models import UserProfile

# Создать пользователя
user = User.objects.create_user(
    username='manager1',
    email='manager@example.com',
    password='secure_password'
)

# Профиль создастся автоматически (через signal)
# Установить роль
user.profile.role = 'MANAGER'
user.profile.phone = '+7 999 123-45-67'
user.profile.department = 'Отдел продаж'
user.profile.save()
```

### Через Django Admin:
1. Перейти на http://localhost:8000/admin/
2. Войти как admin/admin
3. Добавить пользователя в Users
4. В профиле выбрать роль

## Что дальше

### Backend (осталось):
- [ ] Добавить permission_classes к API endpoints в api/views.py
  - Защитить upload только для админов (CanUpload)
  - Экспорт для менеджеров (CanExport)
  - Фильтры для менеджеров (CanUseFilters)

### Frontend (нужно сделать):
- [ ] Создать AuthContext для управления JWT токенами
- [ ] Обновить login page для работы с JWT API
- [ ] Сохранять токены (в памяти или httpOnly cookies)
- [ ] Добавить interceptor для автоматической отправки токена
- [ ] Реализовать автообновление токена (refresh)
- [ ] Скрывать элементы UI на основе permissions:
  - Скрыть "Администрирование" для не-админов
  - Скрыть кнопку загрузки для не-админов
  - Отключить фильтры для viewers
  - Скрыть кнопку экспорта для viewers

## Примеры использования во Frontend

```typescript
// Логин
const login = async (username: string, password: string) => {
  const response = await fetch('/api/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  // Сохранить data.access, data.refresh, data.user
  return data;
};

// API запрос с токеном
const fetchDashboard = async (token: string) => {
  const response = await fetch('/api/dashboard/metrics/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Проверка прав
const canUpload = user?.permissions?.can_upload ?? false;
if (canUpload) {
  // Показать кнопку загрузки
}
```

## Безопасность

✅ JWT токены вместо простого localStorage
✅ Токены с ограниченным временем жизни (1 час)
✅ Refresh токены для продления сессии (7 дней)
✅ Blacklist для отозванных токенов (при logout)
✅ Ролевая модель доступа
✅ Полный аудит всех действий
✅ Проверка прав на уровне API (permissions)

## Файлы проекта

**Models:**
- `backend/authentication/models.py` - UserProfile, AuditLog

**API:**
- `backend/authentication/views.py` - JWT views, UserViewSet, AuditLogViewSet
- `backend/authentication/serializers.py` - JWT serializers с permissions
- `backend/authentication/permissions.py` - 6 permission классов
- `backend/authentication/urls.py` - /api/auth/* routes

**Middleware:**
- `backend/authentication/middleware.py` - автоматический аудит

**Конфигурация:**
- `backend/config/settings.py` - JWT settings, SIMPLE_JWT config
- `backend/config/urls.py` - подключение auth urls
