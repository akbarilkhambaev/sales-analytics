from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Sum
from .models import ClientCard, ReadySale
from .serializers import ClientCardSerializer
from authentication.permissions import IsManagerOrAdmin


class ClientCardViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления карточками клиентов.
    
    - GET /api/client-cards/ - получить список всех карточек (доступно всем)
    - POST /api/client-cards/ - создать карточку (только ADMIN и MANAGER)
    - GET /api/client-cards/{id}/ - получить конкретную карточку
    - PUT/PATCH /api/client-cards/{id}/ - изменить карточку (только ADMIN и MANAGER)
    - DELETE /api/client-cards/{id}/ - удалить карточку (только ADMIN и MANAGER)
    """
    queryset = ClientCard.objects.all()
    serializer_class = ClientCardSerializer
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
        """Сохраняем карточку с текущим пользователем как создателем"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Сохраняем изменения с текущим пользователем как редактором"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_region(self, request):
        """Получить карточки по региону"""
        region = request.query_params.get('region')
        
        if region:
            cards = self.queryset.filter(region=region)
        else:
            cards = self.queryset.all()
        
        serializer = self.get_serializer(cards, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_client(self, request):
        """Получить карточки по клиентскому названию"""
        client_name = request.query_params.get('client_name')
        
        if client_name:
            cards = self.queryset.filter(client_name=client_name)
        else:
            cards = self.queryset.all()
        
        serializer = self.get_serializer(cards, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def purchases(self, request, pk=None):
        """Получить статистику закупок клиента по продуктам и годам"""
        client_card = self.get_object()
        
        # Получаем все закупки этого клиента
        sales = ReadySale.objects.filter(klient=client_card.client_name)
        
        # Группируем по ТОВАРЫ и годам
        tovary_data = {}
        years = [2024, 2025]
        
        for sale in sales:
            tovar = sale.tovary or 'Без названия'
            
            if tovar not in tovary_data:
                tovary_data[tovar] = {
                    'tovar_name': tovar,
                    'years': {}
                }
            
            year = sale.year
            if year not in tovary_data[tovar]['years']:
                tovary_data[tovar]['years'][year] = 0
            
            # Суммируем вес
            tovary_data[tovar]['years'][year] += sale.ves_kg or 0
        
        # Преобразуем в список и сортируем
        result = []
        for tovar_name, data in tovary_data.items():
            row = {
                'tovar_name': tovar_name,
                **{str(year): data['years'].get(year, 0) for year in years}
            }
            result.append(row)
        
        # Сортируем по названию товара
        result.sort(key=lambda x: x['tovar_name'])
        
        return Response({
            'client_name': client_card.client_name,
            'full_name': client_card.full_name,
            'years': years,
            'tovary': result
        })
