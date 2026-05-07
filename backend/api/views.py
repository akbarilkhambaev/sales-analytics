from django.db.models import Sum, Q, F
from django.db.models.functions import Substr
from .utils import safe_kol_vo_sum, safe_uch_kol_vo_sum, get_sale_sector_q
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from authentication.permissions import CanUseFilters
from .models import Sale, ReadySale
from .serializers import (
    SaleSerializer,
    ProductYearData,
    GroupYearData,
    ProductHierarchy,
    ColorHierarchy,
    ClientPurchaseHistory,
    TopClient,
    TopProduct,
)


class SalesViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для работы с продажами"""
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]  # Все аутентифицированные пользователи

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(get_sale_sector_q(self.request.user))
    
    def get_permissions(self):
        """Разные права для разных действий"""
        # Для действий с фильтрами требуются права менеджера или выше
        if self.action in ['products_by_years', 'groups_by_years', 'products_hierarchy', 
                          'colors_hierarchy', 'products_colors_hierarchy']:
            return [CanUseFilters()]
        return super().get_permissions()

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        responses={200: list[str]}
    )
    @action(detail=False, methods=['get'])
    def warehouses(self, request):
        """Получить список складов"""
        warehouses = self.get_queryset().filter(
            sklad__isnull=False
        ).exclude(sklad='').values_list('sklad', flat=True).distinct().order_by('sklad')
        return Response(list(warehouses))

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        responses={200: list[str]}
    )
    @action(detail=False, methods=['get'])
    def regions(self, request):
        """Получить список регионов"""
        regions = self.get_queryset().filter(
            region__isnull=False
        ).exclude(region='').values_list('region', flat=True).distinct().order_by('region')
        return Response(list(regions))

    def _calculate_total(self, queryset):
        """Вспомогательный метод для подсчета суммы"""
        total = 0
        for item in queryset:
            try:
                total += float(item.dopoln_kol_vo) if item.dopoln_kol_vo else 0
            except (ValueError, TypeError):
                pass
        return total

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        responses={200: ProductYearData(many=True)}
    )
    @method_decorator(cache_page(300))  # Кеш на 5 минут
    @action(detail=False, methods=['get'], url_path='products-by-years')
    def products_by_years(self, request):
        """Получить данные по продуктам по годам (оптимизированная версия)"""
        month = request.query_params.get('month', '')
        warehouse = request.query_params.get('warehouse', '')
        region = request.query_params.get('region', '')

        # Базовый queryset
        queryset = self.get_queryset().filter(kod_tovara__isnull=False).exclude(kod_tovara='')

        # Применяем фильтры
        if month:
            queryset = queryset.filter(data__contains=f'-{month}-')
        if warehouse:
            queryset = queryset.filter(sklad=warehouse)
        if region:
            queryset = queryset.filter(region=region)

        # Делаем ОДИН запрос с агрегацией по коду товара и году
        aggregated = queryset.annotate(
            year=Substr('data', 1, 4)
        ).values('kod_tovara', 'year').annotate(
            total=safe_kol_vo_sum()
        ).order_by('kod_tovara', 'year')

        # Организуем данные
        products = {}
        years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026']
        
        for item in aggregated:
            code = item['kod_tovara']
            year = item['year']
            total = item['total'] or 0
            
            if year not in years:
                continue
                
            if code not in products:
                products[code] = {
                    'code': code,
                    'years': {},
                    'growth': {}
                }
            
            if total > 0:
                products[code]['years'][year] = {'value': round(total, 2)}

        # Вычисляем проценты роста
        for code, data in products.items():
            for i in range(1, len(years)):
                current_year = years[i]
                prev_year = years[i - 1]

                current_value = data['years'].get(current_year, {}).get('value', 0)
                prev_value = data['years'].get(prev_year, {}).get('value', 0)

                if prev_value > 0 and current_value > 0:
                    growth = round(((current_value - prev_value) / prev_value) * 100)
                    data['growth'][current_year] = growth
                else:
                    data['growth'][current_year] = None

        result = sorted(products.values(), key=lambda x: x['code'])
        return Response(result)

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        responses={200: GroupYearData(many=True)}
    )
    @method_decorator(cache_page(300))  # Кеш на 5 минут
    @action(detail=False, methods=['get'], url_path='groups-by-years')
    def groups_by_years(self, request):
        """Получить данные по группам товаров по годам (оптимизированная версия)"""
        month = request.query_params.get('month', '')
        warehouse = request.query_params.get('warehouse', '')
        region = request.query_params.get('region', '')

        # Базовый queryset
        queryset = self.get_queryset().filter(
            gruppa_tovara__isnull=False
        ).exclude(gruppa_tovara='')

        # Применяем фильтры
        if month:
            queryset = queryset.filter(data__contains=f'-{month}-')
        if warehouse:
            queryset = queryset.filter(sklad=warehouse)
        if region:
            queryset = queryset.filter(region=region)

        # Делаем ОДИН запрос с агрегацией по группе товара и году
        aggregated = queryset.annotate(
            year=Substr('data', 1, 4)
        ).values('gruppa_tovara', 'year').annotate(
            total=safe_kol_vo_sum()
        ).order_by('gruppa_tovara', 'year')

        # Организуем данные
        groups = {}
        years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026']
        
        for item in aggregated:
            group = item['gruppa_tovara']
            year = item['year']
            total = item['total'] or 0
            
            if year not in years:
                continue
                
            if group not in groups:
                groups[group] = {
                    'group': group,
                    'years': {},
                    'growth': {}
                }
            
            if total > 0:
                groups[group]['years'][year] = {'value': round(total, 2)}

        # Вычисляем проценты роста
        for group, data in groups.items():
            for i in range(1, len(years)):
                current_year = years[i]
                prev_year = years[i - 1]

                current_value = data['years'].get(current_year, {}).get('value', 0)
                prev_value = data['years'].get(prev_year, {}).get('value', 0)

                if prev_value > 0 and current_value > 0:
                    growth = round(((current_value - prev_value) / prev_value) * 100)
                    data['growth'][current_year] = growth
                else:
                    data['growth'][current_year] = None

        result = sorted(groups.values(), key=lambda x: x['group'])
        return Response(result)

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        responses={200: ProductHierarchy(many=True)},
        description='Получить иерархическую структуру: Продукция (КОД_ТОВАРА) -> Профили'
    )
    @method_decorator(cache_page(300))
    @action(detail=False, methods=['get'], url_path='products-hierarchy')
    def products_hierarchy(self, request):
        """Получить иерархию продукций и профилей"""
        from collections import defaultdict
        
        # Получаем параметры фильтрации
        month = request.query_params.get('month', '')
        warehouse = request.query_params.get('warehouse', '')
        region = request.query_params.get('region', '')
        
        # Получаем данные с агрегацией по КОД_ТОВАРА, профиль_перечень и годам
        queryset = self.get_queryset().filter(
            kod_tovara__isnull=False,
            profil_perechen__isnull=False
        ).exclude(
            kod_tovara='',
            profil_perechen=''
        )
        
        # Применяем фильтры
        if month:
            queryset = queryset.filter(data__contains=f'-{month}-')
        if warehouse:
            queryset = queryset.filter(sklad=warehouse)
        if region:
            queryset = queryset.filter(region=region)
        
        queryset = queryset.annotate(
            year=Substr('data', 1, 4)
        ).values(
            'kod_tovara', 'profil_perechen', 'year'
        ).annotate(
            total=safe_kol_vo_sum(),
            pieces=safe_uch_kol_vo_sum()
        ).order_by('kod_tovara', 'profil_perechen', 'year')

        # Структурируем данные
        products = defaultdict(lambda: {
            'kod_tovara': '',
            'total_sales': 0,
            'profiles': defaultdict(lambda: {
                'name': '',
                'total': 0,
                'years': {},
            })
        })

        for row in queryset:
            kod = row['kod_tovara']
            profil = row['profil_perechen']
            year = row['year']
            total = row['total'] or 0
            pieces = row['pieces'] or 0

            products[kod]['kod_tovara'] = kod
            products[kod]['total_sales'] += total
            
            products[kod]['profiles'][profil]['name'] = profil
            products[kod]['profiles'][profil]['total'] += total
            products[kod]['profiles'][profil]['years'][year] = {
                'value': round(total, 2),
                'pieces': round(pieces, 0),
            }

        # Конвертируем profiles из dict в list
        for product in products.values():
            product['profiles'] = sorted(
                product['profiles'].values(),
                key=lambda x: x['total'],
                reverse=True
            )

        # Сортируем продукции по общему объему
        result = sorted(
            products.values(),
            key=lambda x: x['total_sales'],
            reverse=True
        )
        
        return Response(result)

    @extend_schema(
        summary="Получить иерархию цветов и продуктов",
        description="Возвращает данные по цветам с вложенными продуктами и данными по годам",
        responses={200: 'ColorHierarchy'}
    )
    @method_decorator(cache_page(300))
    @action(detail=False, methods=['get'], url_path='colors-hierarchy')
    def colors_hierarchy(self, request):
        """Получить иерархию цветов и продуктов"""
        from collections import defaultdict
        
        # Получаем данные с агрегацией по ЦВЕТ, КОД_ТОВАРА и годам
        queryset = self.get_queryset().filter(
            cvet__isnull=False,
            kod_tovara__isnull=False
        ).exclude(
            cvet='',
            kod_tovara=''
        ).annotate(
            year=Substr('data', 1, 4)
        ).values(
            'cvet', 'kod_tovara', 'year'
        ).annotate(
            total=safe_kol_vo_sum()
        ).order_by('cvet', 'kod_tovara', 'year')

        # Структурируем данные
        colors = defaultdict(lambda: {
            'color': '',
            'total_sales': 0,
            'products': defaultdict(lambda: {
                'name': '',
                'total': 0,
                'years': {},
                'growth': {}
            })
        })

        for row in queryset:
            color = row['cvet']
            product = row['kod_tovara']
            year = row['year']
            total = row['total'] or 0

            colors[color]['color'] = color
            colors[color]['total_sales'] += total
            
            colors[color]['products'][product]['name'] = product
            colors[color]['products'][product]['total'] += total
            colors[color]['products'][product]['years'][year] = {
                'value': total
            }

        # Вычисляем growth для каждого продукта
        for color_data in colors.values():
            for product_data in color_data['products'].values():
                years = sorted(product_data['years'].keys())
                
                for i in range(1, len(years)):
                    current_year = years[i]
                    prev_year = years[i - 1]

                    current_value = product_data['years'].get(current_year, {}).get('value', 0)
                    prev_value = product_data['years'].get(prev_year, {}).get('value', 0)

                    if prev_value > 0 and current_value > 0:
                        growth = round(((current_value - prev_value) / prev_value) * 100)
                        product_data['growth'][current_year] = growth
                    else:
                        product_data['growth'][current_year] = None
            
            # Конвертируем products из dict в list
            color_data['products'] = sorted(
                color_data['products'].values(),
                key=lambda x: x['total'],
                reverse=True
            )

        # Сортируем цвета по общему объему
        result = sorted(
            colors.values(),
            key=lambda x: x['total_sales'],
            reverse=True
        )
        
        return Response(result)

    @extend_schema(
        parameters=[
            OpenApiParameter('month', str, description='Месяц (01-12)'),
            OpenApiParameter('warehouse', str, description='Склад'),
            OpenApiParameter('region', str, description='Регион'),
        ],
        summary="Получить иерархию продуктов и цветов",
        description="Возвращает данные по продуктам с вложенными цветами и данными по годам",
        responses={200: 'ProductColorsHierarchy'}
    )
    @method_decorator(cache_page(300))
    @action(detail=False, methods=['get'], url_path='products-colors-hierarchy')
    def products_colors_hierarchy(self, request):
        """Получить иерархию продуктов и цветов"""
        from collections import defaultdict
        
        # Получаем параметры фильтрации
        month = request.query_params.get('month', '')
        warehouse = request.query_params.get('warehouse', '')
        region = request.query_params.get('region', '')
        
        # Получаем данные с агрегацией по КОД_ТОВАРА, ЦВЕТ и годам
        queryset = self.get_queryset().filter(
            kod_tovara__isnull=False,
            cvet__isnull=False
        ).exclude(
            kod_tovara='',
            cvet=''
        )
        
        # Применяем фильтры
        if month:
            queryset = queryset.filter(data__contains=f'-{month}-')
        if warehouse:
            queryset = queryset.filter(sklad=warehouse)
        if region:
            queryset = queryset.filter(region=region)
        
        queryset = queryset.annotate(
            year=Substr('data', 1, 4)
        ).values(
            'kod_tovara', 'cvet', 'year'
        ).annotate(
            total=safe_kol_vo_sum(),
            pieces=safe_uch_kol_vo_sum()
        ).order_by('kod_tovara', 'cvet', 'year')

        # Структурируем данные
        products = defaultdict(lambda: {
            'product': '',
            'total_sales': 0,
            'colors': defaultdict(lambda: {
                'name': '',
                'total': 0,
                'years': {},
            })
        })

        for row in queryset:
            product = row['kod_tovara']
            color = row['cvet']
            year = row['year']
            total = row['total'] or 0
            pieces = row['pieces'] or 0

            products[product]['product'] = product
            products[product]['total_sales'] += total
            
            products[product]['colors'][color]['name'] = color
            products[product]['colors'][color]['total'] += total
            products[product]['colors'][color]['years'][year] = {
                'value': round(total, 2),
                'pieces': round(pieces, 0),
            }

        # Конвертируем colors из dict в list
        for product_data in products.values():
            product_data['colors'] = sorted(
                product_data['colors'].values(),
                key=lambda x: x['total'],
                reverse=True
            )

        # Сортируем продукты по общему объему
        result = sorted(
            products.values(),
            key=lambda x: x['total_sales'],
            reverse=True
        )
        
        return Response(result)


class ClientsViewSet(viewsets.ViewSet):
    """ViewSet для работы с клиентской базой"""
    permission_classes = [IsAuthenticated]  # Все аутентифицированные пользователи
    
    @extend_schema(
        parameters=[
            OpenApiParameter('client', str, description='Название клиента', required=True),
            OpenApiParameter('start_date', str, description='Дата начала (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='Дата окончания (YYYY-MM-DD)'),
            OpenApiParameter('product', str, description='Фильтр по товару'),
        ],
        responses={200: ClientPurchaseHistory(many=True)}
    )
    @action(detail=False, methods=['get'])
    def purchase_history(self, request):
        """История покупок клиента по весу за определенный период"""
        client = request.query_params.get('client')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        product = request.query_params.get('product')
        region = request.query_params.get('region', '')
        
        if not client:
            return Response(
                {'error': 'Параметр client обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Базовый фильтр
        sector_q = get_sale_sector_q(request.user)
        queryset = ReadySale.objects.filter(sector_q, klient__icontains=client)
        
        # Фильтр по датам
        if start_date:
            queryset = queryset.filter(data__gte=start_date)
        if end_date:
            queryset = queryset.filter(data__lte=end_date)
        
        # Фильтр по товару
        if product:
            queryset = queryset.filter(tovary__icontains=product)
        
        # Фильтр по региону
        if region:
            queryset = queryset.filter(region=region)
        
        # Получаем данные
        history = queryset.values(
            'data',
            'tovary',
            'ves_kg',
            'kolichestvo',
            'dokhod',
            'diler'
        ).order_by('-data')
        
        # Форматируем результат
        result = [
            {
                'date': item['data'],
                'product': item['tovary'],
                'weight': item['ves_kg'] or 0,
                'quantity': item['kolichestvo'] or 0,
                'revenue': item['dokhod'] or 0,
                'dealer': item['diler']
            }
            for item in history
        ]
        
        return Response(result)
    
    @extend_schema(
        parameters=[
            OpenApiParameter('limit', int, description='Количество клиентов (по умолчанию 10)'),
            OpenApiParameter('start_date', str, description='Дата начала (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='Дата окончания (YYYY-MM-DD)'),
            OpenApiParameter('products', str, description='Список товаров через запятую (колонки таблицы)'),
            OpenApiParameter('region', str, description='Фильтр по региону'),
        ],
        responses={200: TopClient(many=True)}
    )
    @method_decorator(cache_page(300))  # Кеш на 5 минут
    @action(detail=False, methods=['get'])
    def top_clients(self, request):
        """ТОП-N клиентов по весу с разбивкой по товарам"""
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        products_param = request.query_params.get('products', '')
        region = request.query_params.get('region', '')
        
        # Парсим список товаров
        selected_products = [p.strip() for p in products_param.split(',') if p.strip()] if products_param else []
        
        # Базовый запрос
        sector_q = get_sale_sector_q(request.user)
        queryset = ReadySale.objects.filter(sector_q)

        # Фильтр по датам
        if start_date:
            queryset = queryset.filter(data__gte=start_date)
        if end_date:
            queryset = queryset.filter(data__lte=end_date)

        # Фильтр по региону
        if region:
            queryset = queryset.filter(region=region)

        # ВАЖНО: Фильтруем по товарам ДО группировки, чтобы топ считался только по выбранным товарам
        if selected_products:
            queryset = queryset.filter(tovary__in=selected_products)

        # Группировка по клиентам
        clients = queryset.values('klient').annotate(
            total_weight=Sum('ves_kg')
        ).order_by('-total_weight')[:limit]
        
        # Получаем список имен клиентов
        client_names = [c['klient'] for c in clients]
        
        # Получаем дилера для каждого клиента (берем первого встречного дилера)
        dealers_query = queryset.filter(klient__in=client_names).values('klient').annotate(
            dealer=F('diler')
        ).distinct()
        
        # Создаем словарь клиент -> дилер
        dealer_by_client = {}
        for item in queryset.filter(klient__in=client_names).values('klient', 'diler').distinct():
            if item['klient'] not in dealer_by_client:
                dealer_by_client[item['klient']] = item['diler'] or ''
        
        # Получаем товары для ВСЕХ клиентов одним запросом
        from collections import defaultdict
        
        # Группируем товары по клиентам (используем тот же отфильтрованный queryset)
        products_query = queryset.filter(klient__in=client_names)
        
        all_products = products_query.values('klient', 'tovary').annotate(
            weight=Sum('ves_kg')
        ).order_by('klient', '-weight')
        
        # Организуем товары по клиентам
        products_by_client = defaultdict(dict)
        for product in all_products:
            products_by_client[product['klient']][product['tovary']] = product['weight'] or 0
        
        # Формируем результат
        result = []
        for client_data in clients:
            client_name = client_data['klient']
            
            result.append({
                'client': client_name,
                'dealer': dealer_by_client.get(client_name, ''),
                'total_weight': client_data['total_weight'] or 0,
                'products': products_by_client.get(client_name, {})
            })
        
        return Response(result)
    
    @extend_schema(
        parameters=[
            OpenApiParameter('limit', int, description='Количество товаров (по умолчанию 10)'),
            OpenApiParameter('start_date', str, description='Дата начала (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='Дата окончания (YYYY-MM-DD)'),
            OpenApiParameter('clients', str, description='Список клиентов через запятую (колонки таблицы)'),
            OpenApiParameter('region', str, description='Фильтр по региону'),
        ],
        responses={200: TopProduct(many=True)}
    )
    @method_decorator(cache_page(300))  # Кеш на 5 минут
    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """ТОП-N товаров по весу с разбивкой по клиентам"""
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        clients_param = request.query_params.get('clients', '')
        region = request.query_params.get('region', '')
        
        # Парсим список клиентов
        selected_clients = [c.strip() for c in clients_param.split(',') if c.strip()] if clients_param else []
        
        # Базовый запрос
        sector_q = get_sale_sector_q(request.user)
        queryset = ReadySale.objects.filter(sector_q)

        # Фильтр по датам
        if start_date:
            queryset = queryset.filter(data__gte=start_date)
        if end_date:
            queryset = queryset.filter(data__lte=end_date)

        # Фильтр по региону
        if region:
            queryset = queryset.filter(region=region)

        # Группировка по товарам
        products = queryset.values('tovary').annotate(
            total_weight=Sum('ves_kg')
        ).order_by('-total_weight')[:limit]
        
        # Получаем список товаров
        product_names = [p['tovary'] for p in products]
        
        # Получаем клиентов для ВСЕХ товаров одним запросом
        from collections import defaultdict
        
        # Группируем клиентов по товарам
        clients_query = queryset.filter(tovary__in=product_names)
        
        # Если указаны конкретные клиенты, фильтруем
        if selected_clients:
            clients_query = clients_query.filter(klient__in=selected_clients)
        
        all_clients = clients_query.values('tovary', 'klient').annotate(
            weight=Sum('ves_kg')
        ).order_by('tovary', '-weight')
        
        # Организуем клиентов по товарам
        clients_by_product = defaultdict(dict)
        for client in all_clients:
            clients_by_product[client['tovary']][client['klient']] = client['weight'] or 0
        
        # Формируем результат
        result = []
        for product_data in products:
            product_name = product_data['tovary']
            
            result.append({
                'product': product_name,
                'total_weight': product_data['total_weight'] or 0,
                'clients': clients_by_product.get(product_name, {})
            })
        
        return Response(result)
    
    @extend_schema(
        responses={200: dict}
    )
    @method_decorator(cache_page(600))  # Кеш на 10 минут
    @action(detail=False, methods=['get'])
    def products_list(self, request):
        """Список всех товаров"""
        sector_q = get_sale_sector_q(request.user)
        products = ReadySale.objects.filter(sector_q).filter(
            tovary__isnull=False
        ).exclude(
            tovary=''
        ).values('tovary').distinct().order_by('tovary')
        
        return Response({'products': [p['tovary'] for p in products]})
    
    @extend_schema(
        responses={200: dict}
    )
    @method_decorator(cache_page(600))  # Кеш на 10 минут
    @action(detail=False, methods=['get'])
    def clients_list(self, request):
        """Список всех клиентов"""
        sector_q = get_sale_sector_q(request.user)
        clients = ReadySale.objects.filter(sector_q).filter(
            klient__isnull=False
        ).exclude(
            klient=''
        ).values('klient').distinct().order_by('klient')
        
        return Response({'clients': [c['klient'] for c in clients]})

    @extend_schema(
        responses={200: dict}
    )
    @method_decorator(cache_page(600))  # Кеш на 10 минут
    @action(detail=False, methods=['get'])
    def regions_list(self, request):
        """Список всех регионов из таблицы ready_sales"""
        sector_q = get_sale_sector_q(request.user)
        regions = ReadySale.objects.filter(sector_q).filter(
            region__isnull=False
        ).exclude(
            region=''
        ).values('region').distinct().order_by('region')
        
        return Response({'regions': [r['region'] for r in regions]})
