from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from authentication.permissions import CanUpload
from .models import TovaryMapping, Sale

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
            for obj in qs[:500]  # максимум 500 за раз
        ]

        return Response({
            'results': data,
            'total':   TovaryMapping.objects.count(),
            'uncoded': TovaryMapping.objects.filter(is_coded=False).count(),
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
    Проходит по всем Sale записям где КОД_ТОВАРА=NULL (или ГРУППА=NULL)
    и подставляет данные из справочника.
    """
    permission_classes = [CanUpload]

    def post(self, request):
        # Загружаем весь справочник в память для быстрого поиска
        mapping = {
            m.tovary: m
            for m in TovaryMapping.objects.filter(is_coded=True)
        }

        # Находим записи Sale где товары есть, но коды не заполнены
        sales_to_fix = Sale.objects.filter(
            Q(kod_tovara__isnull=True) | Q(kod_tovara='') |
            Q(gruppa_tovara__isnull=True) | Q(gruppa_tovara='')
        ).exclude(tovary__isnull=True).exclude(tovary='')

        total = sales_to_fix.count()
        fixed = 0
        skipped = 0

        for sale in sales_to_fix.iterator(chunk_size=1000):
            m = mapping.get(sale.tovary)
            if not m:
                skipped += 1
                continue

            sale.kod_tovara      = m.kod_tovara      or sale.kod_tovara
            sale.gruppa_tovara   = m.gruppa_tovara   or sale.gruppa_tovara
            sale.cvet            = m.cvet            or sale.cvet
            sale.profil_perechen = m.profil_perechen or sale.profil_perechen
            sale.save(update_fields=['kod_tovara', 'gruppa_tovara', 'cvet', 'profil_perechen'])
            fixed += 1

        return Response({
            'total':   total,
            'fixed':   fixed,
            'skipped': skipped,
            'message': f'Обновлено {fixed} из {total} записей',
        })
