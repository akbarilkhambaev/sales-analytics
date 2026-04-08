from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import WorkReport, WorkReportPhoto
from .serializers import WorkReportSerializer, WorkReportPhotoSerializer
from authentication.permissions import IsAdmin


class IsAdminOrOwner(IsAuthenticated):
    """
    Разрешение: Admin имеет полный доступ, Manager может редактировать только свои записи
    """
    def has_object_permission(self, request, view, obj):
        # Admin имеет полный доступ
        if hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN':
            return True
        
        # Владелец может редактировать свои записи
        return obj.created_by == request.user


class WorkReportViewSet(viewsets.ModelViewSet):
    """ViewSet для отчётов по выполненным работам"""
    
    queryset = WorkReport.objects.select_related(
        'created_by', 'updated_by'
    ).prefetch_related('photos', 'assigned_employees', 'assigned_employees__profile').all()
    serializer_class = WorkReportSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['status', 'date']
    search_fields = ['description']
    ordering_fields = ['date', 'budget', 'created_at', 'status']
    ordering = ['-date', '-created_at']
    
    def get_permissions(self):
        """
        - Все могут просматривать (list, retrieve)
        - Создавать могут Admin и Manager
        - Редактировать/удалять: Admin - любые, Manager - только свои
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action == 'create':
            return [IsAuthenticated()]
        else:  # update, partial_update, destroy
            return [IsAdminOrOwner()]
    
    def get_queryset(self):
        """Фильтрация с возможностью указания периода"""
        queryset = super().get_queryset()
        
        # Фильтр по дате (от-до)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Фильтр по статусу (множественный выбор)
        statuses = self.request.query_params.getlist('statuses[]')
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        
        # Фильтр "только мои" для менеджеров
        only_mine = self.request.query_params.get('only_mine')
        if only_mine == 'true':
            queryset = queryset.filter(created_by=self.request.user)
        
        # Поиск
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(assigned_employees__username__icontains=search) |
                Q(assigned_employees__first_name__icontains=search) |
                Q(assigned_employees__last_name__icontains=search)
            ).distinct()
        
        return queryset
    
    def perform_create(self, serializer):
        """При создании автоматически устанавливаем created_by"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """При обновлении автоматически устанавливаем updated_by"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        """
        Загрузить фотографию к отчёту
        POST /api/work-reports/{id}/upload_photo/
        Form data: image, caption (optional)
        """
        work_report = self.get_object()
        
        # Проверка прав: только создатель или админ может загружать фото
        if not (request.user == work_report.created_by or 
                (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN')):
            return Response(
                {'error': 'Нет прав для загрузки фотографий'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        image = request.FILES.get('image')
        if not image:
            return Response(
                {'error': 'Файл изображения не найден'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        caption = request.data.get('caption', '')
        
        photo = WorkReportPhoto.objects.create(
            work_report=work_report,
            image=image,
            caption=caption
        )
        
        serializer = WorkReportPhotoSerializer(photo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def delete_photo(self, request, pk=None):
        """
        Удалить фотографию
        DELETE /api/work-reports/{id}/delete_photo/?photo_id=123
        """
        work_report = self.get_object()
        photo_id = request.query_params.get('photo_id')
        
        if not photo_id:
            return Response(
                {'error': 'Не указан ID фотографии'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            photo = WorkReportPhoto.objects.get(id=photo_id, work_report=work_report)
        except WorkReportPhoto.DoesNotExist:
            return Response(
                {'error': 'Фотография не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка прав
        if not (request.user == work_report.created_by or 
                (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN')):
            return Response(
                {'error': 'Нет прав для удаления фотографий'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """
        Получить только свои отчёты
        GET /api/work-reports/my_reports/
        """
        queryset = self.get_queryset().filter(created_by=request.user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_employees(self, request):
        """
        Получить список доступных сотрудников (менеджеры и администраторы)
        GET /api/work-reports/available_employees/
        """
        from authentication.models import UserProfile
        
        # Получаем пользователей с ролью ADMIN или MANAGER
        employees = User.objects.filter(
            profile__role__in=['ADMIN', 'MANAGER'],
            is_active=True
        ).select_related('profile').order_by('first_name', 'last_name', 'username')
        
        data = [
            {
                'id': emp.id,
                'username': emp.username,
                'full_name': f"{emp.first_name} {emp.last_name}" if emp.first_name and emp.last_name else emp.username,
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'role': emp.profile.role if hasattr(emp, 'profile') else 'VIEWER',
                'role_display': emp.profile.get_role_display() if hasattr(emp, 'profile') else 'Просмотр',
            }
            for emp in employees
        ]
        
        return Response(data)


class WorkReportPhotoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра фотографий (только чтение через API)"""
    
    queryset = WorkReportPhoto.objects.all()
    serializer_class = WorkReportPhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['work_report']
