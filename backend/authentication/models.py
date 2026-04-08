"""
Модели для аутентификации и аудита
"""

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class UserProfile(models.Model):
    """
    Профиль пользователя с ролями и дополнительной информацией
    """
    
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Администратор'
        MANAGER = 'MANAGER', 'Менеджер'
        VIEWER = 'VIEWER', 'Просмотр'
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь'
    )
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.VIEWER,
        verbose_name='Роль'
    )
    
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Телефон'
    )
    
    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Отдел'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP последнего входа'
    )
    
    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        """Проверка, является ли пользователь администратором"""
        return self.role == self.Role.ADMIN
    
    @property
    def is_manager(self):
        """Проверка, является ли пользователь менеджером"""
        return self.role == self.Role.MANAGER
    
    @property
    def is_viewer(self):
        """Проверка, может ли пользователь только просматривать"""
        return self.role == self.Role.VIEWER
    
    @property
    def can_upload(self):
        """Может ли пользователь загружать данные"""
        return self.role == self.Role.ADMIN
    
    @property
    def can_export(self):
        """Может ли пользователь экспортировать данные"""
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]
    
    @property
    def can_use_filters(self):
        """Может ли пользователь использовать фильтры"""
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Автоматически создает профиль при создании пользователя"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Сохраняет профиль при сохранении пользователя"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


class AuditLog(models.Model):
    """
    Модель для аудита действий пользователей
    """
    
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Вход в систему'
        LOGOUT = 'LOGOUT', 'Выход из системы'
        VIEW = 'VIEW', 'Просмотр'
        EXPORT = 'EXPORT', 'Экспорт данных'
        UPLOAD = 'UPLOAD', 'Загрузка данных'
        FILTER = 'FILTER', 'Применение фильтров'
        CREATE = 'CREATE', 'Создание'
        UPDATE = 'UPDATE', 'Обновление'
        DELETE = 'DELETE', 'Удаление'
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        verbose_name='Пользователь'
    )
    
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name='Действие'
    )
    
    resource = models.CharField(
        max_length=100,
        verbose_name='Ресурс',
        help_text='Например: products, dashboard, sales'
    )
    
    details = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Детали',
        help_text='Дополнительная информация о действии'
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP адрес'
    )
    
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='User Agent'
    )
    
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name='Время',
        db_index=True
    )
    
    success = models.BooleanField(
        default=True,
        verbose_name='Успешно'
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='Сообщение об ошибке'
    )
    
    class Meta:
        verbose_name = 'Запись аудита'
        verbose_name_plural = 'Записи аудита'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource', '-timestamp']),
        ]
    
    def __str__(self):
        username = self.user.username if self.user else 'Anonymous'
        return f"{username} - {self.get_action_display()} - {self.resource} - {self.timestamp}"
