from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile, AuditLog


class UserProfileInline(admin.StackedInline):
    """Инлайн для профиля пользователя"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Профиль'
    fields = ['role', 'phone', 'department', 'last_login_ip']


class CustomUserAdmin(BaseUserAdmin):
    """Админ панель для пользователей с профилем"""
    
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'get_role', 'is_active', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    def get_role(self, obj):
        return obj.profile.get_role_display() if hasattr(obj, 'profile') else 'Не указано'
    get_role.short_description = 'Роль'


# Отменяем регистрацию стандартного User и регистрируем свой
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Админ панель для логов аудита"""
    
    list_display = ('user', 'action', 'resource', 'timestamp', 'success', 'ip_address')
    list_filter = ('action', 'success', 'timestamp', 'resource')
    search_fields = ('user__username', 'resource', 'details', 'ip_address')
    ordering = ('-timestamp',)
    readonly_fields = ('user', 'action', 'resource', 'details', 'ip_address', 'user_agent', 'timestamp', 'success', 'error_message')
    
    def has_add_permission(self, request):
        """Запретить добавление логов через админку"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Запретить изменение логов"""
        return False
