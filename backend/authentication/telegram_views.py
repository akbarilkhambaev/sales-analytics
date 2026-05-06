"""
Telegram-интеграция: привязка аккаунта и bot-only эндпоинты.
"""

import secrets
import string
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from .models import TelegramLink, TelegramLinkCode, AuditLog


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _generate_code(length: int = 8) -> str:
    """Генерирует случайный буквенно-цифровой код."""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


# ──────────────────────────────────────────────────────────────────────────────
# Пользовательские endpoint-ы (JWT-авторизация через сайт)
# ──────────────────────────────────────────────────────────────────────────────

class TelegramLinkStatusView(APIView):
    """
    GET /api/auth/telegram/status/
    Возвращает статус привязки Telegram для текущего пользователя.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            link = request.user.telegram_link
            return Response({
                'linked': link.is_active,
                'telegram_username': link.telegram_username,
                'telegram_first_name': link.telegram_first_name,
                'telegram_last_name': link.telegram_last_name,
                'linked_at': link.linked_at,
                'last_seen_at': link.last_seen_at,
            })
        except TelegramLink.DoesNotExist:
            return Response({'linked': False})


class TelegramGenerateLinkCodeView(APIView):
    """
    POST /api/auth/telegram/generate-code/
    Создаёт одноразовый код привязки. Инвалидирует старые неиспользованные коды.
    Код живёт 5 минут.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Инвалидируем старые активные коды (помечаем как использованные)
        TelegramLinkCode.objects.filter(
            user=request.user,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).update(used_at=timezone.now())

        # Генерируем уникальный код
        for _ in range(10):
            code = _generate_code(8)
            if not TelegramLinkCode.objects.filter(code=code).exists():
                break

        link_code = TelegramLinkCode.objects.create(
            user=request.user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        AuditLog.objects.create(
            user=request.user,
            action='CREATE',
            resource='telegram_link_code',
            details={'code_created': True},
            ip_address=_get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True,
        )

        return Response({
            'code': link_code.code,
            'expires_at': link_code.expires_at,
        })


class TelegramUnlinkView(APIView):
    """
    POST /api/auth/telegram/unlink/
    Отвязывает Telegram от текущего пользователя.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            link = request.user.telegram_link
            link.delete()
            AuditLog.objects.create(
                user=request.user,
                action='DELETE',
                resource='telegram_link',
                ip_address=_get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
            )
            return Response({'success': True, 'message': 'Telegram отвязан'})
        except TelegramLink.DoesNotExist:
            return Response(
                {'error': 'Telegram не был привязан'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ──────────────────────────────────────────────────────────────────────────────
# Bot-only endpoint-ы (аутентификация по BOT_TOKEN из заголовка)
# ──────────────────────────────────────────────────────────────────────────────

class BotTokenPermission(AllowAny):
    """Проверяет X-Bot-Token заголовок."""

    def has_permission(self, request, view):
        from django.conf import settings
        bot_token = getattr(settings, 'TELEGRAM_BOT_API_TOKEN', None)
        if not bot_token:
            return False
        header_token = request.META.get('HTTP_X_BOT_TOKEN', '')
        return secrets.compare_digest(header_token, bot_token)


class BotConfirmLinkView(APIView):
    """
    POST /api/auth/telegram/bot/confirm-link/
    Бот передаёт code и chat_id. Backend привязывает аккаунт.
    """
    permission_classes = [BotTokenPermission]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        chat_id = request.data.get('chat_id')
        tg_username = request.data.get('username', '')
        tg_first_name = request.data.get('first_name', '')
        tg_last_name = request.data.get('last_name', '')

        if not code or not chat_id:
            return Response(
                {'error': 'code и chat_id обязательны'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ищем валидный код
        try:
            link_code = TelegramLinkCode.objects.select_related('user').get(code=code)
        except TelegramLinkCode.DoesNotExist:
            return Response({'error': 'Неверный код'}, status=status.HTTP_400_BAD_REQUEST)

        if not link_code.is_valid:
            return Response(
                {'error': 'Код истёк или уже использован'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = link_code.user

        if not user.is_active:
            return Response(
                {'error': 'Пользователь неактивен'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Если этот chat_id уже привязан к другому — отвязываем
        TelegramLink.objects.filter(
            telegram_chat_id=chat_id,
        ).exclude(user=user).delete()

        # Создаём или обновляем привязку
        TelegramLink.objects.update_or_create(
            user=user,
            defaults={
                'telegram_chat_id': chat_id,
                'telegram_username': tg_username,
                'telegram_first_name': tg_first_name,
                'telegram_last_name': tg_last_name,
                'is_active': True,
                'last_seen_at': timezone.now(),
            },
        )

        # Помечаем код использованным
        link_code.used_at = timezone.now()
        link_code.save(update_fields=['used_at'])

        AuditLog.objects.create(
            user=user,
            action='CREATE',
            resource='telegram_link',
            details={'chat_id': str(chat_id), 'tg_username': tg_username},
            success=True,
        )

        profile = user.profile if hasattr(user, 'profile') else None
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': profile.role if profile else 'VIEWER',
                'role_display': profile.get_role_display() if profile else 'Просмотр',
            },
        })


class BotResolveUserView(APIView):
    """
    POST /api/auth/telegram/bot/resolve/
    Бот передаёт chat_id, получает связанного пользователя.
    """
    permission_classes = [BotTokenPermission]

    def post(self, request):
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({'error': 'chat_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            link = TelegramLink.objects.select_related(
                'user', 'user__profile'
            ).get(telegram_chat_id=chat_id, is_active=True)
        except TelegramLink.DoesNotExist:
            return Response({'linked': False})

        user = link.user
        if not user.is_active:
            return Response({'linked': False, 'reason': 'user_inactive'})

        # Обновляем last_seen_at
        TelegramLink.objects.filter(pk=link.pk).update(last_seen_at=timezone.now())

        profile = user.profile if hasattr(user, 'profile') else None
        return Response({
            'linked': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': profile.role if profile else 'VIEWER',
                'role_display': profile.get_role_display() if profile else 'Просмотр',
            },
        })


class BotCreateWorkReportView(APIView):
    """
    POST /api/auth/telegram/bot/work-reports/create/
    Создаёт отчёт от имени пользователя, привязанного к chat_id.
    """
    permission_classes = [BotTokenPermission]

    def post(self, request):
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({'error': 'chat_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            link = TelegramLink.objects.select_related('user').get(
                telegram_chat_id=chat_id, is_active=True,
            )
        except TelegramLink.DoesNotExist:
            return Response({'error': 'Аккаунт не привязан'}, status=status.HTTP_403_FORBIDDEN)

        user = link.user
        if not user.is_active:
            return Response({'error': 'Пользователь неактивен'}, status=status.HTTP_403_FORBIDDEN)

        from api.models import WorkReport
        from api.serializers import WorkReportSerializer
        from rest_framework.request import Request as DRFRequest

        payload = {
            'date': request.data.get('date'),
            'description': request.data.get('description', '').strip(),
            'budget': request.data.get('budget', '0') or '0',
            'status': request.data.get('report_status', 'COMPLETED'),
            'assigned_employees': [],
        }

        if not payload['date'] or not payload['description']:
            return Response(
                {'error': 'date и description обязательны'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Создаём "поддельный" request с нужным user для сериализатора
        fake_request = type('FakeRequest', (), {
            'user': user,
            'data': payload,
            'FILES': {},
            'method': 'POST',
        })()

        serializer = WorkReportSerializer(
            data=payload,
            context={'request': fake_request},
        )
        if serializer.is_valid():
            report = serializer.save(created_by=user)
            AuditLog.objects.create(
                user=user,
                action='CREATE',
                resource='work_report',
                details={'via': 'telegram', 'report_id': report.id},
                success=True,
            )
            return Response({
                'success': True,
                'report_id': report.id,
                'date': str(report.date),
                'description': report.description,
                'status': report.status,
                'status_display': report.get_status_display(),
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class BotUploadPhotoView(APIView):
    """
    POST /api/auth/telegram/bot/work-reports/{report_id}/upload-photo/
    Загружает фото к отчёту от имени привязанного пользователя.
    """
    permission_classes = [BotTokenPermission]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, report_id):
        from rest_framework.parsers import MultiPartParser
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({'error': 'chat_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            link = TelegramLink.objects.select_related('user').get(
                telegram_chat_id=chat_id, is_active=True,
            )
        except TelegramLink.DoesNotExist:
            return Response({'error': 'Аккаунт не привязан'}, status=status.HTTP_403_FORBIDDEN)

        user = link.user
        if not user.is_active:
            return Response({'error': 'Пользователь неактивен'}, status=status.HTTP_403_FORBIDDEN)

        from api.models import WorkReport, WorkReportPhoto
        from api.serializers import WorkReportPhotoSerializer

        try:
            report = WorkReport.objects.get(pk=report_id, created_by=user)
        except WorkReport.DoesNotExist:
            return Response({'error': 'Отчёт не найден'}, status=status.HTTP_404_NOT_FOUND)

        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Файл не найден'}, status=status.HTTP_400_BAD_REQUEST)

        caption = request.data.get('caption', '')
        photo = WorkReportPhoto.objects.create(
            work_report=report,
            image=image,
            caption=caption,
        )
        serializer = WorkReportPhotoSerializer(photo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BotMyReportsView(APIView):
    """
    POST /api/auth/telegram/bot/work-reports/my/
    Возвращает последние 10 отчётов пользователя.
    """
    permission_classes = [BotTokenPermission]

    def post(self, request):
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({'error': 'chat_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            link = TelegramLink.objects.select_related('user').get(
                telegram_chat_id=chat_id, is_active=True,
            )
        except TelegramLink.DoesNotExist:
            return Response({'error': 'Аккаунт не привязан'}, status=status.HTTP_403_FORBIDDEN)

        user = link.user
        if not user.is_active:
            return Response({'error': 'Пользователь неактивен'}, status=status.HTTP_403_FORBIDDEN)

        from api.models import WorkReport

        reports = WorkReport.objects.filter(
            created_by=user,
        ).order_by('-date', '-created_at').values(
            'id', 'date', 'description', 'status', 'created_at',
        )[:10]

        STATUS_DISPLAY = {
            'PLANNED': 'Запланировано',
            'IN_PROGRESS': 'В процессе',
            'ON_HOLD': 'На паузе',
            'COMPLETED': 'Завершено',
            'CANCELLED': 'Отменено',
        }

        return Response({
            'reports': [
                {
                    'id': r['id'],
                    'date': str(r['date']),
                    'description': r['description'][:100] + ('...' if len(r['description']) > 100 else ''),
                    'status': r['status'],
                    'status_display': STATUS_DISPLAY.get(r['status'], r['status']),
                }
                for r in reports
            ]
        })
