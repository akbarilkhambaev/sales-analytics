"""
Serializers для аутентификации
"""

from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile, AuditLog


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный serializer для JWT токенов с дополнительными данными
    """

    @staticmethod
    def _get_or_create_profile(user):
        profile = getattr(user, 'profile', None)
        if profile is None:
            profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Добавляем кастомные claims
        profile = cls._get_or_create_profile(user)
        token['username'] = user.username
        token['role'] = profile.role
        token['email'] = user.email
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Добавляем информацию о пользователе в ответ
        profile = self._get_or_create_profile(self.user)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': profile.role,
            'role_display': profile.get_role_display(),
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'permissions': {
                'can_upload': profile.can_upload,
                'can_export': profile.can_export,
                'can_use_filters': profile.can_use_filters,
            }
        }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """Serializer для пользователя с профилем"""
    
    role = serializers.CharField(source='profile.role')
    role_display = serializers.CharField(source='profile.get_role_display', read_only=True)
    phone = serializers.CharField(source='profile.phone', allow_blank=True, required=False)
    department = serializers.CharField(source='profile.department', allow_blank=True, required=False)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'phone', 'department',
            'is_active', 'last_login', 'date_joined', 'permissions'
        ]
        read_only_fields = ['id', 'last_login', 'date_joined']
    
    def get_permissions(self, obj):
        profile = obj.profile if hasattr(obj, 'profile') else None
        if not profile:
            return {'can_upload': False, 'can_export': False, 'can_use_filters': False}
        return {
            'can_upload': profile.can_upload,
            'can_export': profile.can_export,
            'can_use_filters': profile.can_use_filters,
        }
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        # Обновляем User
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем Profile
        if hasattr(instance, 'profile'):
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class CreateUserSerializer(serializers.ModelSerializer):
    """Serializer для создания пользователя"""
    
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, default=UserProfile.Role.VIEWER)
    phone = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'role', 'phone', 'department'
        ]
    
    def create(self, validated_data):
        # Извлекаем данные профиля
        role = validated_data.pop('role', UserProfile.Role.VIEWER)
        phone = validated_data.pop('phone', '')
        department = validated_data.pop('department', '')
        password = validated_data.pop('password')
        
        # Создаем пользователя
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Обновляем профиль (он создается автоматически через signal)
        profile = user.profile
        profile.role = role
        profile.phone = phone
        profile.department = department
        profile.save()
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer для смены пароля"""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль')
        return value


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer для логов аудита"""
    
    user_username = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_username', 'action', 'action_display',
            'resource', 'details', 'ip_address', 'user_agent',
            'timestamp', 'success', 'error_message'
        ]
        read_only_fields = fields
