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
from .models import User, AuditLog, UserLoginLog
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CreateUserSerializer,
    ChangePasswordSerializer,
    AuditLogSerializer,
    UserLoginLogSerializer,
)
from .permissions import IsAdmin, IsSuperAdmin


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомный view для получения JWT токенов с записью лога входа
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Получаем пользователя через сериализатор
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.user
                UserLoginLog.objects.create(
                    user=user,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                )
        return response


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
        Только администраторы могут создавать, обновлять и удалять пользователей.
        Управление ролью SUPER_ADMIN — только для SUPER_ADMIN (проверяется в update_role).
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
        Фильтрация по ролям. SUPER_ADMIN скрыт из списков.
        """
        queryset = super().get_queryset()

        # SUPER_ADMIN не отображается в списке пользователей
        queryset = queryset.exclude(profile__role='SUPER_ADMIN')

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
        Изменить роль пользователя.
        Назначить/снять SUPER_ADMIN может только сам SUPER_ADMIN.
        """
        user = self.get_object()
        new_role = request.data.get('role')

        if not new_role:
            return Response({'error': 'Укажите роль'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import UserProfile
        if new_role not in dict(UserProfile.Role.choices):
            return Response({'error': 'Неверная роль'}, status=status.HTTP_400_BAD_REQUEST)

        requester_profile = request.user.profile if hasattr(request.user, 'profile') else None

        # Защита: менять роль SUPER_ADMIN или назначать её может только SUPER_ADMIN
        if (new_role == UserProfile.Role.SUPER_ADMIN or
                (hasattr(user, 'profile') and user.profile.is_super_admin)):
            if not requester_profile or not requester_profile.is_super_admin:
                return Response(
                    {'error': 'Только главный администратор может управлять этой ролью'},
                    status=status.HTTP_403_FORBIDDEN
                )

        user.profile.role = new_role
        user.profile.save()

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


class UserLoginLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Логи входов: текущий пользователь видит свои,
    супер-админ видит всех пользователей.
    """
    serializer_class = UserLoginLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = UserLoginLog.objects.select_related('user', 'user__profile')
        if hasattr(user, 'profile') and user.profile.is_super_admin:
            # Супер-админ: опционально фильтр по user_id
            user_id = self.request.query_params.get('user_id')
            if user_id:
                qs = qs.filter(user_id=user_id)
        else:
            qs = qs.filter(user=user)
        return qs.order_by('-timestamp')


def _noop():
    pass  # placeholder, get_client_ip defined at top of file
