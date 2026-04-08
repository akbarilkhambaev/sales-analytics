from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ProductCatalog
from .serializers import ProductCatalogSerializer
from authentication.permissions import IsManagerOrAdmin


class ProductCatalogViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления каталогами продукции.
    
    - GET /api/catalogs/ - получить список всех каталогов (доступно всем)
    - POST /api/catalogs/ - создать каталог (только ADMIN и MANAGER)
    - GET /api/catalogs/{id}/ - получить конкретный каталог
    - PUT/PATCH /api/catalogs/{id}/ - изменить каталог (только ADMIN и MANAGER)
    - DELETE /api/catalogs/{id}/ - удалить каталог (только ADMIN и MANAGER)
    """
    queryset = ProductCatalog.objects.all()
    serializer_class = ProductCatalogSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_permissions(self):
        """
        Разрешения:
        - Просмотр (list, retrieve) - все авторизованные пользователи
        - Создание, изменение, удаление - только ADMIN и MANAGER
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Сохраняем каталог с текущим пользователем как создателем"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Сохраняем изменения с текущим пользователем как редактором"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Получить каталоги по типу (холодная/теплая серия)"""
        catalog_type = request.query_params.get('type')
        
        if catalog_type:
            catalogs = self.queryset.filter(catalog_type=catalog_type)
        else:
            catalogs = self.queryset.all()
        
        serializer = self.get_serializer(catalogs, many=True)
        return Response(serializer.data)
