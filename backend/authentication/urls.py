"""
URL routes для аутентификации
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserViewSet,
    AuditLogViewSet,
    UserLoginLogViewSet,
)
from .telegram_views import (
    TelegramLinkStatusView,
    TelegramGenerateLinkCodeView,
    TelegramUnlinkView,
    BotConfirmLinkView,
    BotResolveUserView,
    BotCreateWorkReportView,
    BotUploadPhotoView,
    BotMyReportsView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'audit', AuditLogViewSet, basename='audit')
router.register(r'login-logs', UserLoginLogViewSet, basename='login-logs')

urlpatterns = [
    # JWT token endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Telegram — пользовательские
    path('telegram/status/', TelegramLinkStatusView.as_view(), name='telegram-status'),
    path('telegram/generate-code/', TelegramGenerateLinkCodeView.as_view(), name='telegram-generate-code'),
    path('telegram/unlink/', TelegramUnlinkView.as_view(), name='telegram-unlink'),

    # Telegram — bot-only
    path('telegram/bot/confirm-link/', BotConfirmLinkView.as_view(), name='telegram-bot-confirm'),
    path('telegram/bot/resolve/', BotResolveUserView.as_view(), name='telegram-bot-resolve'),
    path('telegram/bot/work-reports/create/', BotCreateWorkReportView.as_view(), name='telegram-bot-create-report'),
    path('telegram/bot/work-reports/<int:report_id>/upload-photo/', BotUploadPhotoView.as_view(), name='telegram-bot-upload-photo'),
    path('telegram/bot/work-reports/my/', BotMyReportsView.as_view(), name='telegram-bot-my-reports'),

    # Router URLs
    path('', include(router.urls)),
]
