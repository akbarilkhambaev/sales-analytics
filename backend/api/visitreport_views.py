from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import ClientVisitReport, VisitReportPhoto
from .serializers import ClientVisitReportSerializer, VisitReportPhotoSerializer
from authentication.permissions import IsManagerOrAdmin


class ClientVisitReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet для отчетов о посещении клиентов.
    Менеджеры могут создавать и редактировать отчеты.
    """
    queryset = ClientVisitReport.objects.all()
    serializer_class = ClientVisitReportSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    
    def get_permissions(self):
        """
        Чтение доступно всем авторизованным.
        Создание, изменение, удаление - только менеджеры и админы.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'upload_photos']:
            permission_classes = [IsManagerOrAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Фильтрация по клиенту если указан параметр client_card"""
        queryset = ClientVisitReport.objects.select_related(
            'client_card', 'assigned_manager', 'created_by', 'updated_by'
        ).prefetch_related('photos')
        
        client_card_id = self.request.query_params.get('client_card')
        if client_card_id:
            queryset = queryset.filter(client_card_id=client_card_id)
        
        return queryset
    
    @action(detail=True, methods=['post'], url_path='upload-photos')
    def upload_photos(self, request, pk=None):
        """
        Загрузка фотографий к отчету.
        Принимает multiple files в поле 'photos'
        """
        visit_report = self.get_object()
        
        files = request.FILES.getlist('photos')
        if not files:
            return Response(
                {'error': 'Не загружено ни одного файла'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_photos = []
        
        with transaction.atomic():
            for file in files:
                description = request.data.get(f'description_{files.index(file)}', '')
                
                photo = VisitReportPhoto.objects.create(
                    visit_report=visit_report,
                    photo=file,
                    description=description
                )
                uploaded_photos.append(photo)
        
        serializer = VisitReportPhotoSerializer(
            uploaded_photos,
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='delete-photo/(?P<photo_id>[^/.]+)')
    def delete_photo(self, request, pk=None, photo_id=None):
        """Удаление фотографии из отчета"""
        visit_report = self.get_object()
        
        try:
            photo = VisitReportPhoto.objects.get(
                id=photo_id,
                visit_report=visit_report
            )
            photo.photo.delete()  # Удаляем файл
            photo.delete()  # Удаляем запись
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except VisitReportPhoto.DoesNotExist:
            return Response(
                {'error': 'Фотография не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
