"""
Views для дашборда с метриками и аналитикой
"""

from django.db.models import Sum, Count, Q, F, FloatField
from django.db.models.functions import Cast, Substr, TruncMonth, TruncDate
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from .models import Sale, ReadySale


class DashboardMetricsView(APIView):
    """
    API endpoint для получения метрик дашборда
    """
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 300  # 5 минут

    def get(self, request):
        """
        Возвращает ключевые метрики для дашборда:
        - Общий объем продаж (ДОПОЛН__КОЛ-ВО)
        - Количество продуктов
        - Динамика продаж
        - Топ продукты
        - Топ регионы
        """
        try:
            # Параметры фильтрации
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Ключ кеша зависит от параметров запроса
            cache_key = f'dashboard_metrics_{start_date}_{end_date}'
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

            # Базовый queryset
            sales_qs = Sale.objects.all()

            # Применяем фильтры по датам
            if start_date:
                sales_qs = sales_qs.filter(data__gte=start_date)
            if end_date:
                sales_qs = sales_qs.filter(data__lte=end_date)
            
            # 1. Общий объем продаж (из Sale.dopoln_kol_vo)
            total_sales = sales_qs.aggregate(
                total=Sum(Cast('dopoln_kol_vo', FloatField()))
            )['total'] or 0
            
            # 2. Количество уникальных продуктов
            unique_products = sales_qs.filter(
                kod_tovara__isnull=False
            ).values('kod_tovara').distinct().count()
            
            # 3. Динамика продаж по месяцам
            sales_trend = self._get_sales_trend(sales_qs)
            
            # 4. Топ 5 продуктов по объему
            top_products = self._get_top_products(sales_qs, limit=5)
            
            # 5. Топ 5 регионов по объему
            top_regions = self._get_top_regions(sales_qs, limit=5)
            
            # 6. Распределение продаж по группам товаров
            sales_by_group = self._get_sales_by_group(sales_qs)
            
            result = {
                'summary': {
                    'total_sales_volume': round(total_sales, 2),
                    'unique_products': unique_products,
                },
                'sales_trend': sales_trend,
                'top_products': top_products,
                'top_regions': top_regions,
                'sales_by_group': sales_by_group,
            }
            cache.set(cache_key, result, self.CACHE_TTL)
            return Response(result)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sales_trend(self, queryset):
        """Получить динамику продаж по месяцам"""
        try:
            # Группируем по месяцам и считаем сумму
            trend = queryset.annotate(
                year_month=Substr('data', 1, 7)  # YYYY-MM
            ).values('year_month').annotate(
                volume=Sum(Cast('dopoln_kol_vo', FloatField()))
            ).order_by('year_month')
            
            return [
                {
                    'month': item['year_month'],
                    'volume': round(float(item['volume'] or 0), 2)
                }
                for item in trend
            ]
        except Exception:
            return []
    
    def _get_revenue_trend(self, queryset):
        """Получить динамику выручки по месяцам"""
        try:
            # Группируем по месяцам и считаем сумму
            trend = queryset.annotate(
                year_month=Substr('data', 1, 7)  # YYYY-MM
            ).values('year_month').annotate(
                revenue=Sum('obshchaya_summa'),
                profit=Sum('dokhod')
            ).order_by('year_month')
            
            return [
                {
                    'month': item['year_month'],
                    'revenue': round(float(item['revenue'] or 0), 2),
                    'profit': round(float(item['profit'] or 0), 2)
                }
                for item in trend
            ]
        except Exception:
            return []
    
    def _get_top_products(self, queryset, limit=5):
        """Получить топ продуктов по объему"""
        try:
            top = queryset.filter(
                kod_tovara__isnull=False
            ).exclude(kod_tovara='').values('kod_tovara', 'tovary').annotate(
                volume=Sum(Cast('dopoln_kol_vo', FloatField()))
            ).order_by('-volume')[:limit]
            
            return [
                {
                    'code': item['kod_tovara'],
                    'name': item['tovary'] or item['kod_tovara'],
                    'volume': round(float(item['volume'] or 0), 2)
                }
                for item in top
            ]
        except Exception:
            return []
    
    def _get_top_regions(self, queryset, limit=5):
        """Получить топ регионов по объему"""
        try:
            top = queryset.filter(
                region__isnull=False
            ).exclude(region='').values('region').annotate(
                volume=Sum(Cast('dopoln_kol_vo', FloatField()))
            ).order_by('-volume')[:limit]
            
            return [
                {
                    'region': item['region'],
                    'volume': round(float(item['volume'] or 0), 2)
                }
                for item in top
            ]
        except Exception:
            return []
    
    def _get_sales_by_group(self, queryset):
        """Получить распределение продаж по группам товаров"""
        try:
            groups = queryset.filter(
                gruppa_tovara__isnull=False
            ).exclude(gruppa_tovara='').values('gruppa_tovara').annotate(
                volume=Sum(Cast('dopoln_kol_vo', FloatField()))
            ).order_by('-volume')
            
            return [
                {
                    'group': item['gruppa_tovara'],
                    'volume': round(float(item['volume'] or 0), 2)
                }
                for item in groups
            ]
        except Exception:
            return []


class SalesComparisonView(APIView):
    """
    API endpoint для сравнения периодов
    """
    permission_classes = [IsAuthenticated]  # Все аутентифицированные пользователи
    
    def get(self, request):
        """
        Сравнивает два периода продаж
        Параметры:
        - period1_start, period1_end
        - period2_start, period2_end
        """
        try:
            period1_start = request.query_params.get('period1_start')
            period1_end = request.query_params.get('period1_end')
            period2_start = request.query_params.get('period2_start')
            period2_end = request.query_params.get('period2_end')
            
            if not all([period1_start, period1_end, period2_start, period2_end]):
                return Response({
                    'error': 'Все параметры периодов обязательны'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Данные первого периода
            period1_data = self._get_period_data(period1_start, period1_end)
            
            # Данные второго периода
            period2_data = self._get_period_data(period2_start, period2_end)
            
            # Расчет изменений
            changes = {
                'sales_volume': self._calculate_change(
                    period1_data['sales_volume'],
                    period2_data['sales_volume']
                ),
            }
            
            return Response({
                'period1': {
                    'start': period1_start,
                    'end': period1_end,
                    'data': period1_data
                },
                'period2': {
                    'start': period2_start,
                    'end': period2_end,
                    'data': period2_data
                },
                'changes': changes
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_period_data(self, start_date, end_date):
        """Получить данные за период"""
        sales_qs = Sale.objects.filter(data__gte=start_date, data__lte=end_date)
        
        sales_volume = sales_qs.aggregate(
            total=Sum(Cast('dopoln_kol_vo', FloatField()))
        )['total'] or 0
        
        return {
            'sales_volume': round(float(sales_volume), 2),
        }
    
    def _calculate_change(self, old_value, new_value):
        """Рассчитать процент изменения"""
        if old_value == 0:
            return {
                'absolute': round(new_value - old_value, 2),
                'percentage': 100.0 if new_value > 0 else 0.0
            }
        
        absolute_change = new_value - old_value
        percentage_change = (absolute_change / old_value) * 100
        
        return {
            'absolute': round(absolute_change, 2),
            'percentage': round(percentage_change, 2)
        }
