from django.db import models as db_models
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import KPITemplate, KPITemplateItem, KPIRecord, KPIRecordItem, ReadySale
from .serializers import (
    KPITemplateSerializer, KPITemplateItemSerializer,
    KPIRecordSerializer, KPIRecordListSerializer, KPIRecordItemSerializer,
)


def _is_admin(user):
    """True если у пользователя есть профиль с ролью ADMIN."""
    try:
        return user.profile.role == 'ADMIN'
    except Exception:
        return user.is_superuser


# ─── Templates ────────────────────────────────────────────────────────────────

class KPITemplateViewSet(viewsets.ModelViewSet):
    """CRUD шаблонов KPI (создание/редактирование — только admin/manager)"""
    permission_classes = [IsAuthenticated]
    serializer_class = KPITemplateSerializer

    def get_queryset(self):
        return KPITemplate.objects.prefetch_related('items').order_by('name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class KPITemplateItemViewSet(viewsets.ModelViewSet):
    """CRUD пунктов шаблона KPI"""
    permission_classes = [IsAuthenticated]
    serializer_class = KPITemplateItemSerializer

    def get_queryset(self):
        qs = KPITemplateItem.objects.select_related('template')
        template_id = self.request.query_params.get('template')
        if template_id:
            qs = qs.filter(template_id=template_id)
        return qs.order_by('order')


# ─── Records ──────────────────────────────────────────────────────────────────

class KPIRecordViewSet(viewsets.ModelViewSet):
    """CRUD записей KPI"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return KPIRecordListSerializer
        return KPIRecordSerializer

    def get_queryset(self):
        qs = KPIRecord.objects.select_related(
            'manager', 'template', 'created_by'
        ).prefetch_related(
            'record_items__template_item'
        )
        # Не-админ видит только свои записи
        if not _is_admin(self.request.user):
            qs = qs.filter(manager=self.request.user)
        # Filters
        manager_id   = self.request.query_params.get('manager')
        period_type  = self.request.query_params.get('period_type')
        period_year  = self.request.query_params.get('period_year')
        period_num   = self.request.query_params.get('period_number')
        rec_status   = self.request.query_params.get('status')

        if manager_id:
            qs = qs.filter(manager_id=manager_id)
        if period_type:
            qs = qs.filter(period_type=period_type)
        if period_year:
            qs = qs.filter(period_year=period_year)
        if period_num:
            qs = qs.filter(period_number=period_num)
        if rec_status:
            qs = qs.filter(status=rec_status)

        return qs.order_by('-period_year', '-period_number', 'manager__username')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ── Update a single record item's fact ────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='update-item')
    def update_item(self, request, pk=None):
        """PATCH /kpi/records/{id}/update-item/  { item_id, fact_manual, notes }"""
        record = self.get_object()
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'error': 'item_id is required'}, status=400)
        try:
            item = record.record_items.get(id=item_id)
        except KPIRecordItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)

        if 'fact_manual' in request.data:
            val = request.data['fact_manual']
            item.fact_manual = float(val) if val not in (None, '', 'null') else None
        if 'notes' in request.data:
            item.notes = request.data['notes']
        item.save()

        record.refresh_from_db()
        serializer = KPIRecordSerializer(record, context={'request': request})
        return Response(serializer.data)

    # ── Auto-fill facts from sales data ───────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='auto-fill')
    def auto_fill(self, request, pk=None):
        """
        POST /kpi/records/{id}/auto-fill/
        Автоматически заполняет fact_auto из таблицы ReadySale по менеджеру + период.
        Логика: суммирует ves_kg (кг) / kolichestvo (шт) / summa (сум)
        в зависимости от unit пункта шаблона.
        """
        record = self.get_object()
        manager = record.manager

        # Build date filter for the period
        year = record.period_year
        ptype = record.period_type
        pnum = record.period_number

        if ptype == 'month':
            month_str = str(pnum).zfill(2)
            sales = ReadySale.objects.filter(
                diler__icontains=manager.get_full_name() or manager.username,
                data__year=year,
                data__month=pnum,
            )
        elif ptype == 'quarter':
            months = range((pnum - 1) * 3 + 1, (pnum - 1) * 3 + 4)
            sales = ReadySale.objects.filter(
                diler__icontains=manager.get_full_name() or manager.username,
                data__year=year,
                data__month__in=months,
            )
        else:  # year
            sales = ReadySale.objects.filter(
                diler__icontains=manager.get_full_name() or manager.username,
                data__year=year,
            )

        totals = sales.aggregate(
            total_kg=db_models.Sum('ves_kg'),
            total_pcs=db_models.Sum('kolichestvo'),
            total_sum=db_models.Sum('summa'),
        )

        updated = []
        for item in record.record_items.select_related('template_item'):
            unit = item.template_item.unit
            if unit == 'kg':
                val = totals.get('total_kg') or 0
            elif unit == 'pcs':
                val = totals.get('total_pcs') or 0
            elif unit in ('sum', 'usd'):
                val = totals.get('total_sum') or 0
            else:
                continue
            item.fact_auto = round(float(val), 2)
            item.save()
            updated.append(item.id)

        record.refresh_from_db()
        serializer = KPIRecordSerializer(record, context={'request': request})
        return Response({'updated_items': updated, 'record': serializer.data})

    # ── Bulk create record + items from template ───────────────────────────────
    @action(detail=False, methods=['post'], url_path='create-from-template')
    def create_from_template(self, request):
        """
        POST /kpi/records/create-from-template/
        Body: { manager_id, template_id, period_type, period_year, period_number,
                base_salary, targets: {item_id: value, ...} }
        """
        data = request.data
        required = ['manager_id', 'template_id', 'period_type',
                    'period_year', 'period_number', 'base_salary']
        for f in required:
            if f not in data:
                return Response({'error': f'{f} is required'}, status=400)

        # Check uniqueness
        if KPIRecord.objects.filter(
            manager_id=data['manager_id'],
            period_type=data['period_type'],
            period_year=data['period_year'],
            period_number=data['period_number'],
        ).exists():
            return Response(
                {'error': 'KPI запись для этого менеджера и периода уже существует.'},
                status=400,
            )

        record = KPIRecord.objects.create(
            manager_id=data['manager_id'],
            template_id=data['template_id'],
            period_type=data['period_type'],
            period_year=int(data['period_year']),
            period_number=int(data['period_number']),
            base_salary=data['base_salary'],
            fix_ratio=data.get('fix_ratio', 0.60),
            status=data.get('status', 'active'),
            notes=data.get('notes', ''),
            created_by=request.user,
        )

        targets = data.get('targets', {})
        template_items = KPITemplateItem.objects.filter(template_id=data['template_id'])
        for ti in template_items:
            KPIRecordItem.objects.create(
                record=record,
                template_item=ti,
                target=targets.get(str(ti.id), 0),
            )

        serializer = KPIRecordSerializer(record, context={'request': request})
        return Response(serializer.data, status=201)


# ─── Summary dashboard ────────────────────────────────────────────────────────

class KPISummaryView(APIView):
    """
    GET /kpi/summary/?period_type=month&period_year=2026&period_number=3
    Сводка KPI всех менеджеров за период.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period_type = request.query_params.get('period_type', 'month')
        period_year = request.query_params.get('period_year')
        period_number = request.query_params.get('period_number')

        qs = KPIRecord.objects.select_related(
            'manager', 'template'
        ).prefetch_related('record_items__template_item')

        # Не-админ видит только свой KPI
        if not _is_admin(request.user):
            qs = qs.filter(manager=request.user)

        if period_type:
            qs = qs.filter(period_type=period_type)
        if period_year:
            qs = qs.filter(period_year=period_year)
        if period_number:
            qs = qs.filter(period_number=period_number)

        result = []
        for rec in qs.order_by('manager__username'):
            items_data = []
            for ri in rec.record_items.all():
                items_data.append({
                    'id':                   ri.id,
                    'name':                 ri.template_item.name,
                    'unit':                 ri.template_item.unit,
                    'unit_display':         ri.template_item.get_unit_display(),
                    'weight':               float(ri.template_item.weight),
                    'target':               float(ri.target),
                    'fact':                 ri.fact,
                    'fact_auto':            float(ri.fact_auto) if ri.fact_auto is not None else None,
                    'fact_manual':          float(ri.fact_manual) if ri.fact_manual is not None else None,
                    'completion_pct':       round(ri.completion_pct * 100, 1),
                    'capped_completion':    round(ri.capped_completion * 100, 1),
                    'is_valid':             ri.is_valid,
                    'payout_amount':        ri.payout_amount,
                    'min_threshold_pct':    round(float(ri.template_item.min_threshold) * 100),
                    'max_threshold_pct':    round(float(ri.template_item.max_threshold) * 100),
                    'notes':                ri.notes,
                })
            result.append({
                'id':              rec.id,
                'manager_id':      rec.manager.id,
                'manager_name':    rec.manager.get_full_name() or rec.manager.username,
                'template_name':   rec.template.name,
                'base_salary':     float(rec.base_salary),
                'fix_ratio':       float(rec.fix_ratio),
                'fix_payout':      rec.fix_payout,
                'bonus_payout':    rec.bonus_payout,
                'status':          rec.status,
                'status_display':  rec.get_status_display(),
                'total_weighted_pct': round(rec.total_weighted * 100, 1),
                'total_payout':    rec.total_payout,
                'items':           items_data,
            })

        return Response(result)


# ─── Managers list for KPI ────────────────────────────────────────────────────

class KPIManagersView(APIView):
    """GET /kpi/managers/ — список пользователей для назначения KPI"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True).order_by('username')
        return Response([
            {
                'id':        u.id,
                'username':  u.username,
                'full_name': u.get_full_name() or u.username,
            }
            for u in users
        ])
