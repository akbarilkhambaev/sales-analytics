"""
Views для аутентификации и управления пользователями
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from .models import User, AuditLog
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CreateUserSerializer,
    ChangePasswordSerializer,
    AuditLogSerializer
)
from .permissions import IsAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомный view для получения JWT токенов
    """
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления пользователями
    """
    queryset = User.objects.select_related('profile').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'last_login']
    ordering = ['-date_joined']
    
    def get_permissions(self):
        """
        Только администраторы могут создавать, обновлять и удалять пользователей
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_role']:
            return [IsAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """
        Используем CreateUserSerializer для создания пользователей
        """
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer
    
    def get_queryset(self):
        """
        Фильтрация по ролям
        """
        queryset = super().get_queryset()
        
        # Фильтр по роли
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(profile__role=role)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Получить информацию о текущем пользователе
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        """
        Изменить роль пользователя (только админы)
        """
        user = self.get_object()
        new_role = request.data.get('role')
        
        if not new_role:
            return Response(
                {'error': 'Укажите роль'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем валидность роли
        from .models import UserProfile
        if new_role not in dict(UserProfile.Role.choices):
            return Response(
                {'error': 'Неверная роль'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем роль
        user.profile.role = new_role
        user.profile.save()
        
        # Логируем изменение
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource='user_role',
            details=f'Changed role for {user.username} to {new_role}',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True
        )
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Сменить пароль текущего пользователя
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            # Логируем смену пароля
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                resource='password',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            return Response({
                'message': 'Пароль успешно изменен'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Выход из системы (blacklist refresh token)
        """
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Логируем выход
            AuditLog.objects.create(
                user=request.user,
                action='LOGOUT',
                resource='auth',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            logout(request)
            return Response({'message': 'Успешный выход'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра логов аудита (только чтение)
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        """
        Фильтрация по пользователю, действию, ресурсу
        """
        queryset = super().get_queryset()
        
        user_id = self.request.query_params.get('user_id')
        action = self.request.query_params.get('action')
        resource = self.request.query_params.get('resource')
        success = self.request.query_params.get('success')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if resource:
            queryset = queryset.filter(resource=resource)
        if success is not None:
            queryset = queryset.filter(success=success.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_logs(self, request):
        """
        Получить логи текущего пользователя
        """
        logs = self.get_queryset().filter(user=request.user)
        page = self.paginate_queryset(logs)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)


def get_client_ip(request):
    """
    Получить IP адрес клиента
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
