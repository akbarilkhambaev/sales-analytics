from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.paginator import Paginator
from authentication.permissions import CanUpload
from .models import TovaryMapping, Sale, ReadySale

FIELD_MAP = {
    'kod_tovara':     'kod_tovara',
    'gruppa_tovara':  'gruppa_tovara',
    'cvet':           'cvet',
    'profil_perechen': 'profil_perechen',
}


class TovaryMappingSuggestionsView(APIView):
    """
    GET /api/tovary-mapping/suggestions/?field=kod_tovara&q=ABC
    Возвращает уникальные значения поля из таблицы Sales.
    """
    permission_classes = [CanUpload]

    def get(self, request):
        field = request.query_params.get('field', '')
        q     = request.query_params.get('q', '').strip()

        if field not in FIELD_MAP:
            return Response({'error': f'Неизвестное поле: {field}'}, status=status.HTTP_400_BAD_REQUEST)

        db_field = FIELD_MAP[field]
        qs = Sale.objects.exclude(**{f'{db_field}__isnull': True}).exclude(**{f'{db_field}': ''})

        if q:
            qs = qs.filter(**{f'{db_field}__icontains': q})

        values = (
            qs.values_list(db_field, flat=True)
            .distinct()
            .order_by(db_field)[:50]
        )
        return Response({'values': list(values)})


class TovaryMappingListView(APIView):
    """
    GET  /api/tovary-mapping/        — список всех товаров (с поиском)
    GET  /api/tovary-mapping/uncoded/ — только незакодированные
    POST /api/tovary-mapping/apply/   — применить справочник к записям Sale с NULL полями
    """
    permission_classes = [CanUpload]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        coded  = request.query_params.get('coded', '')   # 'true' | 'false' | ''

        qs = TovaryMapping.objects.all()

        if search:
            qs = qs.filter(
                Q(tovary__icontains=search) |
                Q(kod_tovara__icontains=search) |
                Q(gruppa_tovara__icontains=search)
            )

        if coded == 'true':
            qs = qs.filter(is_coded=True)
        elif coded == 'false':
            qs = qs.filter(is_coded=False)

        qs = qs.order_by('is_coded', 'tovary')  # незакодированные сверху

        page     = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 50))
        per_page = min(per_page, 200)  # не больше 200 за раз

        paginator   = Paginator(qs, per_page)
        page_obj    = paginator.get_page(page)

        data = [
            {
                'id':              obj.id,
                'tovary':          obj.tovary,
                'kod_tovara':      obj.kod_tovara,
                'gruppa_tovara':   obj.gruppa_tovara,
                'cvet':            obj.cvet,
                'profil_perechen': obj.profil_perechen,
                'is_coded':        obj.is_coded,
                'updated_at':      obj.updated_at.strftime('%Y-%m-%d %H:%M') if obj.updated_at else None,
            }
            for obj in page_obj
        ]

        return Response({
            'results':    data,
            'total':      TovaryMapping.objects.count(),
            'uncoded':    TovaryMapping.objects.filter(is_coded=False).count(),
            'page':       page,
            'per_page':   per_page,
            'pages':      paginator.num_pages,
            'count':      paginator.count,
        })


class TovaryMappingDetailView(APIView):
    """
    PATCH /api/tovary-mapping/<id>/ — обновить запись
    """
    permission_classes = [CanUpload]

    def patch(self, request, pk):
        try:
            obj = TovaryMapping.objects.get(pk=pk)
        except TovaryMapping.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)

        allowed = ('kod_tovara', 'gruppa_tovara', 'cvet', 'profil_perechen')
        for field in allowed:
            if field in request.data:
                setattr(obj, field, request.data[field] or None)

        obj.save()

        return Response({
            'id':              obj.id,
            'tovary':          obj.tovary,
            'kod_tovara':      obj.kod_tovara,
            'gruppa_tovara':   obj.gruppa_tovara,
            'cvet':            obj.cvet,
            'profil_perechen': obj.profil_perechen,
            'is_coded':        obj.is_coded,
        })


class TovaryMappingApplyView(APIView):
    """
    POST /api/tovary-mapping/apply/
    Проходит по записям Sale и ReadySale, где поля товарного маппинга пустые,
    и подставляет данные из справочника.
    """
    permission_classes = [CanUpload]

    def post(self, request):
        mapping = {
            m.tovary: m
            for m in TovaryMapping.objects.filter(is_coded=True)
        }

        def apply_mapping(queryset, fields_to_update):
            total = queryset.count()
            fixed = 0
            skipped = 0

            for obj in queryset.iterator(chunk_size=1000):
                m = mapping.get(obj.tovary)
                if not m:
                    skipped += 1
                    continue

                if hasattr(obj, 'kod_tovara'):
                    obj.kod_tovara = m.kod_tovara or obj.kod_tovara
                obj.gruppa_tovara = m.gruppa_tovara or obj.gruppa_tovara
                if hasattr(obj, 'cvet'):
                    obj.cvet = m.cvet or obj.cvet
                if hasattr(obj, 'profil_perechen'):
                    obj.profil_perechen = m.profil_perechen or obj.profil_perechen
                obj.save(update_fields=fields_to_update)
                fixed += 1

            return total, fixed, skipped

        sales_to_fix = Sale.objects.filter(
            Q(kod_tovara__isnull=True) | Q(kod_tovara='') |
            Q(gruppa_tovara__isnull=True) | Q(gruppa_tovara='')
        ).exclude(tovary__isnull=True).exclude(tovary='')

        ready_sales_to_fix = ReadySale.objects.filter(
            Q(kod_tovara__isnull=True) | Q(kod_tovara='') |
            Q(gruppa_tovara__isnull=True) | Q(gruppa_tovara='')
        ).exclude(tovary__isnull=True).exclude(tovary='')

        sale_total, sale_fixed, sale_skipped = apply_mapping(
            sales_to_fix,
            ['kod_tovara', 'gruppa_tovara', 'cvet', 'profil_perechen']
        )
        ready_total, ready_fixed, ready_skipped = apply_mapping(
            ready_sales_to_fix,
            ['kod_tovara', 'gruppa_tovara', 'cvet', 'profil_perechen']
        )

        return Response({
            'sale': {
                'total': sale_total,
                'fixed': sale_fixed,
                'skipped': sale_skipped,
            },
            'ready_sale': {
                'total': ready_total,
                'fixed': ready_fixed,
                'skipped': ready_skipped,
            },
            'total': sale_total + ready_total,
            'fixed': sale_fixed + ready_fixed,
            'skipped': sale_skipped + ready_skipped,
            'message': f'Обновлено {sale_fixed + ready_fixed} из {sale_total + ready_total} записей',
        })
