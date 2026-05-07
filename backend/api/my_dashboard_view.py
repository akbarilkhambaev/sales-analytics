from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import KPIRecord, KanbanTask, WorkReport


class MyDashboardView(APIView):
    """
    GET /api/my/dashboard/
    Личный кабинет текущего пользователя:
      - KPI текущего месяца
      - Задачи назначенные на меня
      - Рабочие отчёты этого месяца
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        year = today.year
        month = today.month
        start_of_month = date(year, month, 1)

        # ── KPI текущего месяца ────────────────────────────────────────────────
        kpi_record = (
            KPIRecord.objects
            .filter(manager=user, period_type='month', period_year=year, period_number=month)
            .prefetch_related('record_items__template_item')
            .first()
        )

        kpi_data = None
        if kpi_record:
            items_data = []
            for ri in kpi_record.record_items.all():
                items_data.append({
                    'id':               ri.id,
                    'name':             ri.template_item.name,
                    'unit_display':     ri.template_item.get_unit_display(),
                    'weight':           float(ri.template_item.weight),
                    'target':           float(ri.target),
                    'fact':             float(ri.fact),
                    'completion_pct':   round(ri.completion_pct * 100, 1),
                    'capped_completion': round(ri.capped_completion * 100, 1),
                    'is_valid':         ri.is_valid,
                    'payout_amount':    float(ri.payout_amount),
                    'notes':            ri.notes or '',
                })

            fix_payout = float(kpi_record.base_salary) * float(kpi_record.fix_ratio)
            bonus_payout = sum(
                i['payout_amount'] for i in items_data if i['is_valid']
            )
            total_payout = fix_payout + bonus_payout

            # Weighted completion (0–100 scale)
            total_weight = sum(i['weight'] for i in items_data) or 1
            total_weighted_pct = sum(
                i['capped_completion'] * i['weight'] for i in items_data
            ) / total_weight

            kpi_data = {
                'record_id':        kpi_record.id,
                'period':           f'{month:02d}.{year}',
                'template_name':    kpi_record.template.name,
                'base_salary':      float(kpi_record.base_salary),
                'fix_ratio':        float(kpi_record.fix_ratio),
                'fix_payout':       round(fix_payout, 2),
                'bonus_payout':     round(bonus_payout, 2),
                'total_payout':     round(total_payout, 2),
                'total_weighted_pct': round(total_weighted_pct, 1),
                'status':           kpi_record.status,
                'items':            items_data,
            }

        # ── Задачи назначенные на меня ─────────────────────────────────────────
        my_tasks = (
            KanbanTask.objects
            .filter(assignee=user)
            .select_related('column')
            .order_by('column__order', 'order')
        )

        tasks_list = []
        for t in my_tasks:
            is_overdue = bool(t.due_date and t.due_date < today and t.progress < 100)
            tasks_list.append({
                'id':        t.id,
                'title':     t.title,
                'priority':  t.priority,
                'progress':  t.progress,
                'due_date':  t.due_date.isoformat() if t.due_date else None,
                'column':    t.column.title if t.column else None,
                'is_overdue': is_overdue,
            })

        tasks_summary = {
            'total':    len(tasks_list),
            'overdue':  sum(1 for t in tasks_list if t['is_overdue']),
            'by_priority': {
                'critical': sum(1 for t in tasks_list if t['priority'] == 'critical'),
                'high':     sum(1 for t in tasks_list if t['priority'] == 'high'),
                'medium':   sum(1 for t in tasks_list if t['priority'] == 'medium'),
                'low':      sum(1 for t in tasks_list if t['priority'] == 'low'),
            },
            'items': tasks_list,
        }

        # ── Рабочие отчёты этого месяца ───────────────────────────────────────
        wr_qs = WorkReport.objects.filter(
            created_by=user,
            date__gte=start_of_month,
        ).order_by('-date')

        last_report = wr_qs.first()
        work_reports_data = {
            'this_month':       wr_qs.count(),
            'last_report_date': last_report.date.isoformat() if last_report else None,
        }

        return Response({
            'kpi':          kpi_data,
            'tasks':        tasks_summary,
            'work_reports': work_reports_data,
        })
