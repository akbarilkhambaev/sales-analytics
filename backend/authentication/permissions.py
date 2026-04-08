"""
Custom permissions для проверки ролей пользователей
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Доступ только для администраторов
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.is_admin
        )


class IsManagerOrAdmin(permissions.BasePermission):
    """
    Доступ для менеджеров и администраторов
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role in ['ADMIN', 'MANAGER']
        )


class CanUpload(permissions.BasePermission):
    """
    Может загружать данные (только админы)
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.can_upload
        )


class CanExport(permissions.BasePermission):
    """
    Может экспортировать данные (админы и менеджеры)
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.can_export
        )


class CanUseFilters(permissions.BasePermission):
    """
    Может использовать фильтры (админы и менеджеры)
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.can_use_filters
        )


class ReadOnly(permissions.BasePermission):
    """
    Только чтение для всех аутентифицированных пользователей
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.method in permissions.SAFE_METHODS
        )
