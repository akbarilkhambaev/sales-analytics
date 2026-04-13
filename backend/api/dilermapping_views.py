from django.core.paginator import Paginator
from django.db import connection
from django.db.models import Case, CharField, Count, Q, Value, When
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import CanUpload
from .models import DilerMapping, ReadySale
from .schetamapping_views import KNOWN_REGIONS


class DilerMappingListView(APIView):
    permission_classes = [CanUpload]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        mapped = request.query_params.get('mapped', '')

        qs = DilerMapping.objects.all()

        if search:
            qs = qs.filter(Q(diler__icontains=search) | Q(region__icontains=search))

        if mapped == 'true':
            qs = qs.filter(is_mapped=True)
        elif mapped == 'false':
            qs = qs.filter(is_mapped=False)

        qs = qs.order_by('is_mapped', 'diler')

        page = int(request.query_params.get('page', 1))
        per_page = min(int(request.query_params.get('per_page', 50)), 200)
        paginator = Paginator(qs, per_page)
        page_obj = paginator.get_page(page)

        data = [
            {
                'id': obj.id,
                'diler': obj.diler,
                'region': obj.region,
                'is_mapped': obj.is_mapped,
                'updated_at': obj.updated_at.strftime('%Y-%m-%d %H:%M') if obj.updated_at else None,
            }
            for obj in page_obj
        ]

        return Response({
            'results': data,
            'total': DilerMapping.objects.count(),
            'unmapped': DilerMapping.objects.filter(is_mapped=False).count(),
            'page': page,
            'per_page': per_page,
            'pages': paginator.num_pages,
            'count': paginator.count,
            'regions': KNOWN_REGIONS,
        })


class DilerMappingDetailView(APIView):
    permission_classes = [CanUpload]

    def patch(self, request, pk):
        try:
            obj = DilerMapping.objects.get(pk=pk)
        except DilerMapping.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)

        if 'region' in request.data:
            obj.region = request.data['region'] or None
        obj.save()

        return Response({
            'id': obj.id,
            'diler': obj.diler,
            'region': obj.region,
            'is_mapped': obj.is_mapped,
            'updated_at': obj.updated_at.strftime('%Y-%m-%d %H:%M') if obj.updated_at else None,
        })


class DilerMappingApplyView(APIView):
    permission_classes = [CanUpload]

    def post(self, request):
        if not DilerMapping.objects.filter(is_mapped=True).exists():
            return Response({'fixed': 0, 'message': 'Нет маппингов'})

        qn = connection.ops.quote_name
        ready_table = qn(ReadySale._meta.db_table)
        ready_diler = qn(ReadySale._meta.get_field('diler').db_column)
        ready_region = qn(ReadySale._meta.get_field('region').db_column)
        mapping_table = qn(DilerMapping._meta.db_table)
        mapping_diler = qn(DilerMapping._meta.get_field('diler').column)
        mapping_region = qn(DilerMapping._meta.get_field('region').column)
        mapping_is_mapped = qn(DilerMapping._meta.get_field('is_mapped').column)

        if connection.vendor == 'postgresql':
            sql = f'''
                UPDATE {ready_table} AS rs
                SET {ready_region} = dm.{mapping_region}
                FROM {mapping_table} AS dm
                WHERE dm.{mapping_is_mapped} = TRUE
                  AND rs.{ready_diler} = dm.{mapping_diler}
                  AND COALESCE(rs.{ready_region}, '') <> COALESCE(dm.{mapping_region}, '')
            '''
            with connection.cursor() as cursor:
                cursor.execute(sql)
                fixed = cursor.rowcount
        else:
            mappings = list(DilerMapping.objects.filter(is_mapped=True).values('diler', 'region'))
            whens = [When(diler=m['diler'], then=Value(m['region'])) for m in mappings]
            dilers = [m['diler'] for m in mappings]

            fixed = ReadySale.objects.filter(diler__in=dilers).update(
                region=Case(*whens, output_field=CharField())
            )

        return Response({
            'fixed': fixed,
            'message': f'Обновлено {fixed} записей ready_sales',
        })


class DilerMappingSyncView(APIView):
    permission_classes = [CanUpload]

    def post(self, request):
        existing = set(DilerMapping.objects.values_list('diler', flat=True))

        diler_region = {}
        rows = (
            ReadySale.objects.exclude(diler__isnull=True).exclude(diler='')
            .exclude(region__isnull=True).exclude(region='')
            .values('diler', 'region')
            .annotate(cnt=Count('id'))
            .order_by('diler', '-cnt')
        )
        for row in rows:
            if row['diler'] not in diler_region:
                diler_region[row['diler']] = row['region']

        all_dilers = (
            ReadySale.objects.exclude(diler__isnull=True).exclude(diler='')
            .values_list('diler', flat=True)
            .distinct()
        )

        to_create = [
            DilerMapping(diler=diler, region=diler_region.get(diler))
            for diler in all_dilers
            if diler not in existing
        ]
        DilerMapping.objects.bulk_create(to_create, ignore_conflicts=True)

        updated = 0
        for obj in DilerMapping.objects.filter(is_mapped=False, diler__in=diler_region):
            obj.region = diler_region[obj.diler]
            obj.save(update_fields=['region', 'is_mapped'])
            updated += 1

        return Response({
            'added': len(to_create),
            'updated': updated,
            'message': f'Добавлено {len(to_create)}, обновлено {updated} дилеров',
        })