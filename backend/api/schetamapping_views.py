from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.paginator import Paginator
from authentication.permissions import CanUpload
from .models import SchetaMapping, Sale

# Все уникальные регионы из Sale для подсказок
KNOWN_REGIONS = [
    'Андижон', 'Бухоро', 'Жиззах', 'Кашкадарё', 'Кораколпокистон',
    'Кукон', 'Навоий', 'Наманган', 'Самарканд', 'Сурхандарё',
    'Тошкент', 'Тошкент обл', 'Фаргона', 'Хоразм',
]


class SchetaMappingListView(APIView):
    """
    GET  /api/scheta-mapping/  — список счетов
    """
    permission_classes = [CanUpload]

    def get(self, request):
        search  = request.query_params.get('search', '').strip()
        mapped  = request.query_params.get('mapped', '')  # 'true' | 'false' | ''

        qs = SchetaMapping.objects.all()

        if search:
            qs = qs.filter(
                Q(scheta__icontains=search) |
                Q(region__icontains=search)
            )

        if mapped == 'true':
            qs = qs.filter(is_mapped=True)
        elif mapped == 'false':
            qs = qs.filter(is_mapped=False)

        qs = qs.order_by('is_mapped', 'scheta')  # несопоставленные сверху

        page     = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 50))
        per_page = min(per_page, 200)

        paginator = Paginator(qs, per_page)
        page_obj  = paginator.get_page(page)

        data = [
            {
                'id':        obj.id,
                'scheta':    obj.scheta,
                'region':    obj.region,
                'is_mapped': obj.is_mapped,
                'updated_at': obj.updated_at.strftime('%Y-%m-%d %H:%M') if obj.updated_at else None,
            }
            for obj in page_obj
        ]

        return Response({
            'results':   data,
            'total':     SchetaMapping.objects.count(),
            'unmapped':  SchetaMapping.objects.filter(is_mapped=False).count(),
            'page':      page,
            'per_page':  per_page,
            'pages':     paginator.num_pages,
            'count':     paginator.count,
            'regions':   KNOWN_REGIONS,
        })


class SchetaMappingDetailView(APIView):
    """
    PATCH /api/scheta-mapping/<id>/  — обновить регион
    """
    permission_classes = [CanUpload]

    def patch(self, request, pk):
        try:
            obj = SchetaMapping.objects.get(pk=pk)
        except SchetaMapping.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)

        if 'region' in request.data:
            obj.region = request.data['region'] or None
        obj.save()

        return Response({
            'id':        obj.id,
            'scheta':    obj.scheta,
            'region':    obj.region,
            'is_mapped': obj.is_mapped,
        })


class SchetaMappingApplyView(APIView):
    """
    POST /api/scheta-mapping/apply/
    Проставляет Sale.region на основе справочника счетов.
    """
    permission_classes = [CanUpload]

    def post(self, request):
        from django.db.models import Case, When, Value, CharField

        mappings = list(SchetaMapping.objects.filter(is_mapped=True).values('scheta', 'region'))
        if not mappings:
            return Response({'fixed': 0, 'message': 'Нет маппингов'})

        # Один SQL UPDATE с CASE WHEN — без загрузки данных в память
        whens = [
            When(scheta=m['scheta'], then=Value(m['region']))
            for m in mappings
        ]
        schetas = [m['scheta'] for m in mappings]

        fixed = Sale.objects.filter(scheta__in=schetas).update(
            region=Case(*whens, output_field=CharField())
        )

        return Response({
            'fixed':   fixed,
            'message': f'Обновлено {fixed} записей',
        })


class SchetaMappingSyncView(APIView):
    """
    POST /api/scheta-mapping/sync/
    Добавляет в справочник все новые значения СЧЕТЫ из таблицы Sale.
    """
    permission_classes = [CanUpload]

    def post(self, request):
        existing = set(SchetaMapping.objects.values_list('scheta', flat=True))

        # Для каждого счёта берём наиболее частый регион из продаж
        from django.db.models import Count
        scheta_region = {}
        rows = (
            Sale.objects.exclude(scheta__isnull=True).exclude(scheta='')
            .exclude(region__isnull=True).exclude(region='')
            .values('scheta', 'region')
            .annotate(cnt=Count('id'))
            .order_by('scheta', '-cnt')
        )
        for row in rows:
            if row['scheta'] not in scheta_region:
                scheta_region[row['scheta']] = row['region']

        # Все уникальные счета (даже без региона)
        all_schetas = (
            Sale.objects.exclude(scheta__isnull=True).exclude(scheta='')
            .values_list('scheta', flat=True)
            .distinct()
        )

        to_create = [
            SchetaMapping(scheta=s, region=scheta_region.get(s))
            for s in all_schetas
            if s not in existing
        ]

        SchetaMapping.objects.bulk_create(to_create, ignore_conflicts=True)

        # Также обновим регион у уже существующих записей без региона
        updated = 0
        for obj in SchetaMapping.objects.filter(is_mapped=False, scheta__in=scheta_region):
            obj.region = scheta_region[obj.scheta]
            obj.save(update_fields=['region', 'is_mapped'])
            updated += 1

        return Response({
            'added':   len(to_create),
            'updated': updated,
            'message': f'Добавлено {len(to_create)}, обновлено {updated} счетов',
        })
