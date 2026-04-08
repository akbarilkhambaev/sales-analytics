"""
Unit тесты для Sales Analytics API

Запуск:
    python manage.py test api
    python manage.py test api --verbosity=2
"""
import json
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import UserProfile
from .models import (
    Expense, ExpenseCategory,
    KanbanColumn, KanbanTask,
    SalesPlan,
)
from .planfact_views import _safe_pct, _parse_date, _period_dates, _ym_list


# ─────────────────────────────────────────────────────────────────────────────
# Вспомогательный миксин — создать пользователя с профилем и JWT
# ─────────────────────────────────────────────────────────────────────────────

class UserFactory:
    """Фабрика для создания тестовых пользователей."""

    @staticmethod
    def create(username, role=UserProfile.Role.MANAGER, password="testpass123"):
        user = User.objects.create_user(username=username, password=password)
        # Профиль создаётся автоматически через сигнал, просто обновляем роль
        user.profile.role = role
        user.profile.save()
        return user

    @staticmethod
    def get_tokens(user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Тесты моделей
# ─────────────────────────────────────────────────────────────────────────────

class SalePlanModelTest(TestCase):
    """Тесты модели SalesPlan."""

    def setUp(self):
        self.plan = SalesPlan.objects.create(
            kod_tovara="TEST-001",
            year=2026,
            month=3,
            plan_kg=100.0,
            region="Ташкент",
        )

    def test_plan_created(self):
        self.assertEqual(SalesPlan.objects.count(), 1)

    def test_plan_str_fields(self):
        self.assertEqual(self.plan.kod_tovara, "TEST-001")
        self.assertEqual(self.plan.year, 2026)
        self.assertEqual(self.plan.month, 3)

    def test_plan_kg_value(self):
        self.assertEqual(self.plan.plan_kg, 100.0)


class ExpenseCategoryModelTest(TestCase):
    """Тесты модели ExpenseCategory."""

    def setUp(self):
        self.category = ExpenseCategory.objects.create(name="Транспорт")

    def test_category_created(self):
        self.assertEqual(ExpenseCategory.objects.count(), 1)

    def test_category_name(self):
        self.assertEqual(self.category.name, "Транспорт")

    def test_category_str(self):
        self.assertIn("Транспорт", str(self.category))


class ExpenseModelTest(TestCase):
    """Тесты модели Expense."""

    def setUp(self):
        self.admin = UserFactory.create("admin_exp", role=UserProfile.Role.ADMIN)
        self.category = ExpenseCategory.objects.create(name="Офис")
        self.expense = Expense.objects.create(
            tema="Аренда офиса",
            amount=500.00,
            currency="USD",
            date=date.today(),
            category=self.category,
            created_by=self.admin,
        )

    def test_expense_created(self):
        self.assertEqual(Expense.objects.count(), 1)

    def test_expense_fields(self):
        self.assertEqual(self.expense.tema, "Аренда офиса")
        self.assertEqual(self.expense.amount, 500.00)
        self.assertEqual(self.expense.currency, "USD")

    def test_expense_category_relation(self):
        self.assertEqual(self.expense.category.name, "Офис")

    def test_expense_created_by(self):
        self.assertEqual(self.expense.created_by.username, "admin_exp")


class KanbanModelTest(TestCase):
    """Тесты моделей KanbanColumn и KanbanTask."""

    def setUp(self):
        self.admin = UserFactory.create("admin_kanban", role=UserProfile.Role.ADMIN)
        self.column = KanbanColumn.objects.create(title="В работе", order=0)
        self.task = KanbanTask.objects.create(
            title="Написать тесты",
            column=self.column,
            created_by=self.admin,
            order=0,
        )

    def test_column_created(self):
        self.assertEqual(KanbanColumn.objects.count(), 1)

    def test_task_created(self):
        self.assertEqual(KanbanTask.objects.count(), 1)

    def test_task_column_relation(self):
        self.assertEqual(self.task.column.title, "В работе")

    def test_task_str(self):
        self.assertIn("Написать тесты", str(self.task))


class UserProfileModelTest(TestCase):
    """Тесты модели UserProfile."""

    def test_profile_created_on_user_creation(self):
        user = User.objects.create_user(username="newuser", password="pass")
        self.assertTrue(hasattr(user, "profile"))

    def test_admin_role_property(self):
        admin = UserFactory.create("admin_role", role=UserProfile.Role.ADMIN)
        self.assertTrue(admin.profile.is_admin)
        self.assertFalse(admin.profile.is_manager)

    def test_manager_role_property(self):
        manager = UserFactory.create("manager_role", role=UserProfile.Role.MANAGER)
        self.assertTrue(manager.profile.is_manager)
        self.assertFalse(manager.profile.is_admin)

    def test_viewer_role_property(self):
        viewer = UserFactory.create("viewer_role", role=UserProfile.Role.VIEWER)
        self.assertFalse(viewer.profile.is_admin)
        self.assertFalse(viewer.profile.is_manager)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Тесты утилит (planfact_views)
# ─────────────────────────────────────────────────────────────────────────────

class SafePctTest(TestCase):
    """Тесты функции _safe_pct."""

    def test_positive_growth(self):
        # (120 - 100) / 100 * 100 = 20%
        self.assertEqual(_safe_pct(120, 100), 20.0)

    def test_negative_growth(self):
        # (80 - 100) / 100 * 100 = -20%
        self.assertEqual(_safe_pct(80, 100), -20.0)

    def test_zero_denominator_returns_none(self):
        self.assertIsNone(_safe_pct(100, 0))

    def test_none_denominator_returns_none(self):
        self.assertIsNone(_safe_pct(100, None))

    def test_none_numerator(self):
        # None числитель считается как 0
        result = _safe_pct(None, 100)
        self.assertEqual(result, -100.0)

    def test_equal_values_returns_zero(self):
        self.assertEqual(_safe_pct(100, 100), 0.0)


class ParseDateTest(TestCase):
    """Тесты функции _parse_date."""

    def test_full_date(self):
        result = _parse_date("2026-03-15")
        self.assertEqual(result, date(2026, 3, 15))

    def test_year_month_only(self):
        result = _parse_date("2026-03")
        self.assertEqual(result, date(2026, 3, 1))

    def test_invalid_returns_today(self):
        result = _parse_date("invalid")
        self.assertEqual(result, date.today())

    def test_none_returns_today(self):
        result = _parse_date(None)
        self.assertEqual(result, date.today())


class PeriodDatesTest(TestCase):
    """Тесты функции _period_dates."""

    def test_returns_tuple_of_dates(self):
        from_date, to_date = _period_dates("2026-01-01", "2026-03-31")
        self.assertEqual(from_date, date(2026, 1, 1))
        self.assertEqual(to_date, date(2026, 3, 31))


class YmListTest(TestCase):
    """Тесты функции _ym_list."""

    def test_single_month(self):
        result = _ym_list(date(2026, 3, 1), date(2026, 3, 31))
        self.assertEqual(result, [(2026, 3)])

    def test_multiple_months(self):
        result = _ym_list(date(2026, 1, 1), date(2026, 3, 31))
        self.assertEqual(result, [(2026, 1), (2026, 2), (2026, 3)])

    def test_year_boundary(self):
        result = _ym_list(date(2025, 11, 1), date(2026, 2, 28))
        self.assertEqual(result, [
            (2025, 11), (2025, 12),
            (2026, 1), (2026, 2),
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 3. Тесты аутентификации (JWT)
# ─────────────────────────────────────────────────────────────────────────────

class AuthAPITest(APITestCase):
    """Тесты JWT аутентификации."""

    def setUp(self):
        self.user = UserFactory.create("auth_user", role=UserProfile.Role.MANAGER)
        self.token_url = "/api/auth/token/"

    def test_login_valid_credentials(self):
        response = self.client.post(self.token_url, {
            "username": "auth_user",
            "password": "testpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_password(self):
        response = self.client.post(self.token_url, {
            "username": "auth_user",
            "password": "wrong_password",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        response = self.client.post(self.token_url, {
            "username": "nobody",
            "password": "testpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login = self.client.post(self.token_url, {
            "username": "auth_user",
            "password": "testpass123",
        }, format="json")
        refresh = login.data["refresh"]
        response = self.client.post("/api/auth/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_protected_endpoint_without_token(self):
        response = self.client.get("/api/expenses/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_token(self):
        token = UserFactory.get_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/expenses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Тесты API расходов (Expenses)
# ─────────────────────────────────────────────────────────────────────────────

class ExpenseCategoryAPITest(APITestCase):
    """Тесты API категорий расходов."""

    def setUp(self):
        self.admin = UserFactory.create("exp_admin", role=UserProfile.Role.ADMIN)
        self.manager = UserFactory.create("exp_manager", role=UserProfile.Role.MANAGER)
        self.category = ExpenseCategory.objects.create(name="Маркетинг")
        self.url = "/api/expense-categories/"

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {UserFactory.get_tokens(user)}")

    def test_manager_can_list_categories(self):
        self._auth(self.manager)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_create_category(self):
        self._auth(self.admin)
        response = self.client.post(self.url, {"name": "ИТ-расходы"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExpenseCategory.objects.count(), 2)

    def test_manager_cannot_create_category(self):
        self._auth(self.manager)
        response = self.client.post(self.url, {"name": "Новая категория"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_category(self):
        self._auth(self.admin)
        url = f"{self.url}{self.category.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ExpenseCategory.objects.count(), 0)

    def test_manager_cannot_delete_category(self):
        self._auth(self.manager)
        url = f"{self.url}{self.category.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ExpenseAPITest(APITestCase):
    """Тесты API расходов."""

    def setUp(self):
        self.admin = UserFactory.create("exp_admin2", role=UserProfile.Role.ADMIN)
        self.manager = UserFactory.create("exp_manager2", role=UserProfile.Role.MANAGER)
        self.category = ExpenseCategory.objects.create(name="Офис")
        self.expense = Expense.objects.create(
            tema="Канцтовары",
            amount=50.00,
            currency="USD",
            date=date.today(),
            category=self.category,
            created_by=self.admin,
        )
        self.url = "/api/expenses/"

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {UserFactory.get_tokens(user)}")

    def test_manager_can_list_expenses(self):
        self._auth(self.manager)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_admin_can_create_expense(self):
        self._auth(self.admin)
        response = self.client.post(self.url, {
            "tema": "Новый расход",
            "amount": 100.00,
            "currency": "USD",
            "date": str(date.today()),
            "category": self.category.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_cannot_create_expense(self):
        self._auth(self.manager)
        response = self.client.post(self.url, {
            "tema": "Попытка",
            "amount": 100.00,
            "currency": "USD",
            "date": str(date.today()),
            "category": self.category.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_expense_filter_by_date(self):
        self._auth(self.manager)
        today = str(date.today())
        response = self.client.get(self.url, {"start_date": today, "end_date": today})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_expense_not_found(self):
        self._auth(self.manager)
        response = self.client.get(f"{self.url}99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Тесты API Kanban
# ─────────────────────────────────────────────────────────────────────────────

class KanbanAPITest(APITestCase):
    """Тесты API Kanban-доски."""

    def setUp(self):
        self.admin = UserFactory.create("kanban_admin", role=UserProfile.Role.ADMIN)
        self.manager = UserFactory.create("kanban_manager", role=UserProfile.Role.MANAGER)
        self.column = KanbanColumn.objects.create(title="Сделать", order=0)
        self.task = KanbanTask.objects.create(
            title="Задача 1",
            column=self.column,
            created_by=self.admin,
            order=0,
        )
        self.col_url = "/api/kanban/columns/"
        self.task_url = "/api/kanban/tasks/"

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {UserFactory.get_tokens(user)}")

    def test_manager_can_list_columns(self):
        self._auth(self.manager)
        response = self.client.get(self.col_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_create_column(self):
        self._auth(self.admin)
        response = self.client.post(self.col_url, {"title": "В процессе", "order": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_cannot_create_column(self):
        self._auth(self.manager)
        response = self.client.post(self.col_url, {"title": "Новая", "order": 2}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_list_tasks(self):
        self._auth(self.manager)
        response = self.client.get(self.task_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_manager_can_create_task(self):
        self._auth(self.manager)
        response = self.client.post(self.task_url, {
            "title": "Новая задача",
            "column": self.column.id,
            "order": 1,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_can_filter_tasks_by_column(self):
        self._auth(self.manager)
        response = self.client.get(self.task_url, {"column": self.column.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for task in response.data:
            self.assertEqual(task["column"], self.column.id)

    def test_manager_cannot_delete_task(self):
        self._auth(self.manager)
        response = self.client.delete(f"{self.task_url}{self.task.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_task(self):
        self._auth(self.admin)
        response = self.client.delete(f"{self.task_url}{self.task.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_task_move_action(self):
        self._auth(self.manager)
        col2 = KanbanColumn.objects.create(title="Готово", order=1)
        response = self.client.post(f"{self.task_url}move/", {
            "task_id": self.task.id,
            "column_id": col2.id,
            "order": 0,
            "sibling_orders": [],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.column_id, col2.id)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Тесты безопасности
# ─────────────────────────────────────────────────────────────────────────────

class SecurityTest(APITestCase):
    """Тесты безопасности — анонимный доступ закрыт."""

    PROTECTED_ENDPOINTS = [
        "/api/expenses/",
        "/api/expense-categories/",
        "/api/kanban/columns/",
        "/api/kanban/tasks/",
        "/api/work-reports/",
        "/api/client-cards/",
        "/api/visit-reports/",
        "/api/auth/users/",
    ]

    def test_all_protected_endpoints_require_auth(self):
        for endpoint in self.PROTECTED_ENDPOINTS:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_401_UNAUTHORIZED,
                    msg=f"{endpoint} должен возвращать 401 без токена"
                )
