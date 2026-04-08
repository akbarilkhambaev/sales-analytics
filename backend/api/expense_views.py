from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Expense, ExpenseCategory
from .serializers import (
    ExpenseSerializer,
    ExpenseCategorySerializer,
    ExpenseStatisticsSerializer
)
from authentication.permissions import IsAdmin


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet для категорий расходов"""
    
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Admin может создавать/редактировать/удалять категории"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAuthenticated()]


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet для расходов отдела"""
    
    queryset = Expense.objects.select_related(
        'category', 'created_by', 'updated_by'
    ).all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['category', 'currency', 'date']
    search_fields = ['tema', 'description', 'comment']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_permissions(self):
        """
        Admin - полный доступ (CRUD)
        Manager - только чтение
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAuthenticated()]
    
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
        
        # Фильтр по категории (множественный выбор)
        categories = self.request.query_params.getlist('categories[]')
        if categories:
            queryset = queryset.filter(category__id__in=categories)
        
        # Поиск по теме
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(tema__icontains=search) |
                Q(description__icontains=search) |
                Q(comment__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Статистика расходов за период
        GET /api/expenses/statistics/?start_date=2024-01-01&end_date=2024-12-31
        """
        queryset = self.get_queryset()
        
        # Общая сумма по валютам
        total_uzs = queryset.filter(currency='UZS').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        total_usd = queryset.filter(currency='USD').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Количество расходов
        count = queryset.count()
        
        # По категориям
        by_category = list(
            queryset.values('category__name', 'currency')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )
        
        # По месяцам
        by_month = list(
            queryset.annotate(month=TruncMonth('date'))
            .values('month', 'currency')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        
        data = {
            'total_uzs': total_uzs,
            'total_usd': total_usd,
            'count': count,
            'by_category': by_category,
            'by_month': by_month,
        }
        
        serializer = ExpenseStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download_attachment(self, request, pk=None):
        """Скачать прикреплённый файл"""
        expense = self.get_object()
        if not expense.attachment:
            return Response(
                {'error': 'Файл не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'url': request.build_absolute_uri(expense.attachment.url),
            'filename': expense.attachment.name.split('/')[-1]
        })
