"""
URL routes для аутентификации
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserViewSet,
    AuditLogViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'audit', AuditLogViewSet, basename='audit')

urlpatterns = [
    # JWT token endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Router URLs
    path('', include(router.urls)),
]
