from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile, AuditLog, TelegramLink, TelegramLinkCode


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


@admin.register(TelegramLink)
class TelegramLinkAdmin(admin.ModelAdmin):
    list_display = ('user', 'telegram_chat_id', 'telegram_username', 'is_active', 'linked_at', 'last_seen_at')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'telegram_username', 'telegram_chat_id')
    readonly_fields = ('linked_at', 'last_seen_at')


@admin.register(TelegramLinkCode)
class TelegramLinkCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'expires_at', 'used_at', 'created_at')
    list_filter = ('used_at',)
    search_fields = ('user__username', 'code')
    readonly_fields = ('created_at',)
