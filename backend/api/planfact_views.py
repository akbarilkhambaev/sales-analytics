"""
Представление для раздела ПЛАН-ФАКТ.

Каждая группа данных имеет собственный диапазон дат (YYYY-MM-DD):
  - Продажи (prev год)  : sales_prev_from  / sales_prev_to
  - Продажи (curr год)  : sales_curr_from  / sales_curr_to
  - ПЛАН                : plan_from        / plan_to
  - SELLOUT (prev год)  : sellout_prev_from / sellout_prev_to
  - SELLOUT (curr год)  : sellout_curr_from / sellout_curr_to
"""
import calendar
from collections import defaultdict
from datetime import date

from django.core.cache import cache
from django.db.models import Sum, Q
from .utils import safe_kol_vo_sum, get_sale_sector_q, get_sector_cache_prefix
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Sale, ReadySale, SalesPlan


def _safe_pct(numerator, denominator) -> float | None:
    try:
        if denominator and float(denominator) != 0:
            return round(
                (float(numerator or 0) - float(denominator)) / float(denominator) * 100, 1
            )
    except (TypeError, ZeroDivisionError):
        pass
    return None


def _parse_date(s: str) -> date:
    """Парсинг YYYY-MM-DD или YYYY-MM в date."""
    if not s:
        return date.today()
    try:
        if len(s) == 7:
            return date(int(s[:4]), int(s[5:7]), 1)
        return date.fromisoformat(s[:10])
    except (ValueError, AttributeError):
        return date.today()


def _period_dates(from_str: str, to_str: str) -> tuple[date, date]:
    """Возвращает (from_date, to_date) из строк дат."""
    return _parse_date(from_str), _parse_date(to_str)


def _ym_list(from_date: date, to_date: date) -> list[tuple[int, int]]:
    """Список (year, month) пар для фильтрации SalesPlan."""
    result = []
    d = date(from_date.year, from_date.month, 1)
    while d <= to_date:
        result.append((d.year, d.month))
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    return result


_MONTHS_SHORT = {
    1: 'янв', 2: 'фев', 3: 'мар', 4: 'апр', 5: 'май', 6: 'июн',
    7: 'июл', 8: 'авг', 9: 'сен', 10: 'окт', 11: 'ноя', 12: 'дек',
}


def _label(from_str: str, to_str: str) -> str:
    try:
        fd = _parse_date(from_str)
        td = _parse_date(to_str)
        if fd == td:
            return f"{fd.day} {_MONTHS_SHORT[fd.month]} {fd.year}"
        if fd.year == td.year and fd.month == td.month:
            return f"{fd.day}–{td.day} {_MONTHS_SHORT[fd.month]} {fd.year}"
        if fd.year == td.year:
            return f"{fd.day} {_MONTHS_SHORT[fd.month]} – {td.day} {_MONTHS_SHORT[td.month]} {fd.year}"
        return f"{fd.day} {_MONTHS_SHORT[fd.month]} {fd.year} – {td.day} {_MONTHS_SHORT[td.month]} {td.year}"
    except Exception:
        return f"{from_str}–{to_str}"


class PlanFactViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 300  # 5 минут

    @action(detail=False, methods=['get'], url_path='table')
    def table(self, request):
        """
        Сводная таблица с независимыми диапазонами дат для каждого столбца.

        Query params (формат YYYY-MM-DD):
          sales_prev_from / sales_prev_to      — продажи прошлый год
          sales_curr_from / sales_curr_to      — продажи текущий год
          plan_from       / plan_to            — план
          sellout_prev_from / sellout_prev_to  — SELLOUT прошлый год
          sellout_curr_from / sellout_curr_to  — SELLOUT текущий год
        """
        p = request.query_params

        sales_prev_from   = p.get('sales_prev_from',   '2025-01-01')
        sales_prev_to     = p.get('sales_prev_to',     '2025-12-31')
        sales_curr_from   = p.get('sales_curr_from',   '2026-01-01')
        sales_curr_to     = p.get('sales_curr_to',     '2026-12-31')
        plan_from         = p.get('plan_from',         '2026-01-01')
        plan_to           = p.get('plan_to',           '2026-12-31')
        sellout_prev_from = p.get('sellout_prev_from', '2025-01-01')
        sellout_prev_to   = p.get('sellout_prev_to',   '2025-12-31')
        sellout_curr_from = p.get('sellout_curr_from', '2026-01-01')
        sellout_curr_to   = p.get('sellout_curr_to',   '2026-12-31')

        # Кеш по всем параметрам + сектор
        sector_prefix = get_sector_cache_prefix(request.user)
        sector_q = get_sale_sector_q(request.user)
        cache_key = (
            f'planfact_{sector_prefix}_{sales_prev_from}_{sales_prev_to}'
            f'_{sales_curr_from}_{sales_curr_to}'
            f'_{plan_from}_{plan_to}'
            f'_{sellout_prev_from}_{sellout_prev_to}'
            f'_{sellout_curr_from}_{sellout_curr_to}'
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        sp_from, sp_to   = _period_dates(sales_prev_from,   sales_prev_to)
        sc_from, sc_to   = _period_dates(sales_curr_from,   sales_curr_to)
        pl_from, pl_to   = _period_dates(plan_from,         plan_to)
        sop_from, sop_to = _period_dates(sellout_prev_from, sellout_prev_to)
        soc_from, soc_to = _period_dates(sellout_curr_from, sellout_curr_to)

        # ── 1. Продажи из `sales` (data — строка 'YYYY-MM-DD') ──────────────
        base_sales = (
            Sale.objects            .filter(sector_q)            .filter(kod_tovara__isnull=False)
            .exclude(kod_tovara='')
        )

        def _sales_sum(from_d: date, to_d: date) -> dict[str, float]:
            rows = (
                base_sales
                .filter(data__gte=from_d.isoformat(), data__lte=to_d.isoformat())
                .values('kod_tovara')
                .annotate(total=safe_kol_vo_sum())
            )
            return {r['kod_tovara']: float(r['total'] or 0) for r in rows}

        sales_prev = _sales_sum(sp_from, sp_to)
        sales_curr = _sales_sum(sc_from, sc_to)

        # ── 2. SELLOUT из `ready_sales` (data — DateField) ──────────────────
        base_sellout = (
            ReadySale.objects.filter(sector_q).filter(kod_tovara__isnull=False).exclude(kod_tovara='')
        )

        def _sellout_sum(from_d: date, to_d: date) -> dict[str, float]:
            rows = (
                base_sellout
                .filter(data__gte=from_d, data__lte=to_d)
                .values('kod_tovara')
                .annotate(total=Sum('ves_kg'))
            )
            return {r['kod_tovara']: float(r['total'] or 0) for r in rows}

        sellout_prev = _sellout_sum(sop_from, sop_to)
        sellout_curr = _sellout_sum(soc_from, soc_to)

        # ── 3. ПЛАН из `sales_plan` (year + month) ──────────────────────────
        pl_ym = _ym_list(pl_from, pl_to)
        pl_q = Q()
        for y, m in pl_ym:
            pl_q |= Q(year=y, month=m)

        # Запрашиваем план по каждому месяцу отдельно для пропорционального расчёта
        plan_qs = (
            SalesPlan.objects
            .filter(sector_q)
            .filter(pl_q)
            .values('kod_tovara', 'year', 'month')
            .annotate(total=Sum('plan_kg'))
        )

        # Считаем коэффициент для каждого (year, month): выбранные дни / дней в месяце
        def _day_ratio(year: int, month: int) -> float:
            days_in_month = calendar.monthrange(year, month)[1]
            # первый выбранный день этого месяца
            if year == pl_from.year and month == pl_from.month:
                day_start = pl_from.day
            else:
                day_start = 1
            # последний выбранный день этого месяца
            if year == pl_to.year and month == pl_to.month:
                day_end = pl_to.day
            else:
                day_end = days_in_month
            selected = day_end - day_start + 1
            return selected / days_in_month

        plan_period: dict[str, float] = defaultdict(float)
        for r in plan_qs:
            ratio = _day_ratio(r['year'], r['month'])
            plan_period[r['kod_tovara']] += float(r['total'] or 0) * ratio

        # Округляем до 2 знаков
        plan_period = {k: round(v, 2) for k, v in plan_period.items()}

        # ПЛАН (мес.) — всегда полный план за месяц pl_to (весь февраль целиком и т.д.)
        full_month_qs = (
            SalesPlan.objects
            .filter(sector_q)
            .filter(year=pl_to.year, month=pl_to.month)
            .values('kod_tovara')
            .annotate(total=Sum('plan_kg'))
        )
        plan_monthly: dict[str, float] = {
            r['kod_tovara']: float(r['total'] or 0) for r in full_month_qs
        }


        # ── 4. Маппинг товар → группа (из SalesPlan + Sale) ─────────────────
        kod_to_group: dict[str, str] = {}
        for r in SalesPlan.objects.filter(sector_q).filter(gruppa_tovara__isnull=False).exclude(gruppa_tovara='').values('kod_tovara', 'gruppa_tovara').distinct():
            kod_to_group[r['kod_tovara']] = r['gruppa_tovara']
        # дополняем из Sale для товаров не в плане
        for r in Sale.objects.filter(sector_q).filter(gruppa_tovara__isnull=False).exclude(gruppa_tovara='').values('kod_tovara', 'gruppa_tovara').distinct():
            if r['kod_tovara'] not in kod_to_group:
                kod_to_group[r['kod_tovara']] = r['gruppa_tovara']

        # ── 5. Сборка ─────────────────────────────────────────────────────────
        all_products = sorted(
            set(sales_prev) | set(sales_curr) |
            set(sellout_prev) | set(sellout_curr) |
            set(plan_period)
        )

        rows_out = []
        for kod in all_products:
            sp  = sales_prev.get(kod, 0)
            sc  = sales_curr.get(kod, 0)
            sop = sellout_prev.get(kod, 0)
            soc = sellout_curr.get(kod, 0)
            pp  = plan_period.get(kod, 0)
            pm  = plan_monthly.get(kod, 0)
            rows_out.append({
                'product':              kod,
                'gruppa_tovara':        kod_to_group.get(kod, ''),
                'sales_prev':           round(sp, 2),
                'sales_curr':           round(sc, 2),
                'diff_pct_sales':       _safe_pct(sc, sp),
                'diff_pct_plan':        _safe_pct(sc, pp) if pp else None,
                'plan_period':          round(pp, 2),
                'plan_monthly':         round(pm, 2),
                'sellout_prev':         round(sop, 2),
                'diff_pct_sellout_prev': _safe_pct(sop, sp) if sp else None,
                'sellout_curr':         round(soc, 2),
                'diff_pct_sellout_curr': _safe_pct(soc, sc) if sc else None,
            })

        def _s(key: str, subset=None) -> float:
            src = subset if subset is not None else rows_out
            return round(sum(r.get(key, 0) or 0 for r in src), 2)

        # ── 6. Итоги по группам ───────────────────────────────────────────────
        groups_order: list[str] = []
        groups_map: dict[str, list] = defaultdict(list)
        for r in rows_out:
            g = r['gruppa_tovara'] or 'A (Без группы)'
            if g not in groups_map:
                groups_order.append(g)
            groups_map[g].append(r)

        group_totals: dict[str, dict] = {}
        for g, grp_rows in groups_map.items():
            sp_g  = _s('sales_prev',  grp_rows)
            sc_g  = _s('sales_curr',  grp_rows)
            sop_g = _s('sellout_prev', grp_rows)
            soc_g = _s('sellout_curr', grp_rows)
            pp_g  = _s('plan_period', grp_rows)
            pm_g  = _s('plan_monthly', grp_rows)
            group_totals[g] = {
                'product':               f'ИТОГО {g}',
                'gruppa_tovara':         g,
                'sales_prev':            sp_g,
                'sales_curr':            sc_g,
                'diff_pct_sales':        _safe_pct(sc_g, sp_g),
                'diff_pct_plan':         _safe_pct(sc_g, pp_g) if pp_g else None,
                'plan_period':           pp_g,
                'plan_monthly':          pm_g,
                'sellout_prev':          sop_g,
                'diff_pct_sellout_prev': _safe_pct(sop_g, sp_g) if sp_g else None,
                'sellout_curr':          soc_g,
                'diff_pct_sellout_curr': _safe_pct(soc_g, sc_g) if sc_g else None,
            }

        totals = {
            'product':               'ИТОГО',
            'gruppa_tovara':         '',
            'sales_prev':            _s('sales_prev'),
            'sales_curr':            _s('sales_curr'),
            'diff_pct_sales':        _safe_pct(_s('sales_curr'), _s('sales_prev')),
            'diff_pct_plan':         _safe_pct(_s('sales_curr'), _s('plan_period'))
                                     if _s('plan_period') else None,
            'plan_period':           _s('plan_period'),
            'plan_monthly':          _s('plan_monthly'),
            'sellout_prev':          _s('sellout_prev'),
            'diff_pct_sellout_prev': _safe_pct(_s('sellout_prev'), _s('sales_prev'))
                                     if _s('sales_prev') else None,
            'sellout_curr':          _s('sellout_curr'),
            'diff_pct_sellout_curr': _safe_pct(_s('sellout_curr'), _s('sales_curr'))
                                     if _s('sales_curr') else None,
        }

        result = {
            'labels': {
                'sales_prev':   _label(sales_prev_from,   sales_prev_to),
                'sales_curr':   _label(sales_curr_from,   sales_curr_to),
                'plan':         _label(plan_from,         plan_to),
                'plan_monthly': f"{_MONTHS_SHORT[pl_to.month]} {pl_to.year}",
                'sellout_prev': _label(sellout_prev_from, sellout_prev_to),
                'sellout_curr': _label(sellout_curr_from, sellout_curr_to),
            },
            'rows':         rows_out,
            'groups_order': groups_order,
            'group_totals': group_totals,
            'totals':       totals,
        }
        cache.set(cache_key, result, self.CACHE_TTL)
        return Response(result)

    @action(detail=False, methods=['get'], url_path='products-list')
    def products_list(self, request):
        products = (
            SalesPlan.objects
            .values_list('kod_tovara', flat=True)
            .distinct().order_by('kod_tovara')
        )
        return Response({'products': list(products)})
