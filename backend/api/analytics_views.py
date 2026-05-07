"""
Аналитические представления:
    - ABCAnalysisView: ABC-XYZ анализ товаров/групп/регионов
    - MonthlyTrendView: тренд продаж по месяцам для выбранного среза
"""
from django.db.models import Sum, Q
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import date, datetime

from .models import Sale, SalesPlan
from .utils import safe_kol_vo_sum, get_sale_sector_q, get_sector_cache_prefix


GROUPBY_FIELDS = {
    'tovary':        'tovary',
    'kod_tovara':    'kod_tovara',
    'gruppa_tovara': 'gruppa_tovara',
    'region':        'region',
    'cvet':          'cvet',
}

ABC_THRESHOLDS = (80.0, 95.0)  # A ≤ 80%, B ≤ 95%, C остальное
XYZ_THRESHOLDS = (10.0, 25.0)  # X ≤ 10%, Y ≤ 25%, Z остальное


def _empty_abcxyz_summary() -> dict:
    matrix = {
        f'{abc_cat}{xyz_cat}': {'count': 0, 'volume': 0}
        for abc_cat in ('A', 'B', 'C')
        for xyz_cat in ('X', 'Y', 'Z')
    }
    return {
        'a_count': 0,
        'b_count': 0,
        'c_count': 0,
        'a_volume': 0,
        'b_volume': 0,
        'c_volume': 0,
        'a_pct': 0,
        'b_pct': 0,
        'c_pct': 0,
        'x_count': 0,
        'y_count': 0,
        'z_count': 0,
        'x_pct': 0,
        'y_pct': 0,
        'z_pct': 0,
        'matrix': matrix,
    }


def _month_range(start_date: str, end_date: str, observed_months: set[str]) -> list[str]:
    if start_date and end_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date().replace(day=1)
        end = datetime.strptime(end_date, '%Y-%m-%d').date().replace(day=1)
        months: list[str] = []
        current = start
        while current <= end:
            months.append(current.strftime('%Y-%m'))
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        return months

    if observed_months:
        return sorted(observed_months)

    today = date.today()
    return [today.strftime('%Y-%m')]


def _xyz_category(variation: float) -> str:
    if variation <= XYZ_THRESHOLDS[0]:
        return 'X'
    if variation <= XYZ_THRESHOLDS[1]:
        return 'Y'
    return 'Z'


class ABCAnalysisView(APIView):
    """
    GET /api/analytics/abc/
    Params:
            groupby  — tovary | kod_tovara | gruppa_tovara | region | cvet  (default: kod_tovara)
      start_date, end_date — YYYY-MM-DD
      limit    — int (default 200)
    """
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 300

    def get(self, request):
        groupby    = request.query_params.get('groupby', 'kod_tovara')
        start_date = request.query_params.get('start_date', '')
        end_date   = request.query_params.get('end_date', '')
        limit      = int(request.query_params.get('limit', 200))

        if groupby not in GROUPBY_FIELDS:
            return Response({'error': f'Некорректный groupby: {groupby}'}, status=400)

        sector_prefix = get_sector_cache_prefix(request.user)
        cache_key = f'abcxyz_v1_{sector_prefix}_{groupby}_{start_date}_{end_date}_{limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        db_field = GROUPBY_FIELDS[groupby]
        sector_q = get_sale_sector_q(request.user)
        qs = Sale.objects.filter(sector_q).exclude(**{f'{db_field}__isnull': True}).exclude(**{f'{db_field}': ''})
        if start_date:
            qs = qs.filter(data__gte=start_date)
        if end_date:
            qs = qs.filter(data__lte=end_date)

        rows = (
            qs.values(db_field)
            .annotate(volume=safe_kol_vo_sum())
            .order_by('-volume')[:limit]
        )

        total = sum(float(r['volume'] or 0) for r in rows)
        if total == 0:
            return Response({'items': [], 'summary': _empty_abcxyz_summary(), 'total': 0})

        top_names = [row[db_field] for row in rows if row[db_field]]

        from django.db.models.functions import Substr
        month_rows = (
            qs.filter(**{f'{db_field}__in': top_names})
            .annotate(ym=Substr('data', 1, 7))
            .values('ym', db_field)
            .annotate(volume=safe_kol_vo_sum())
            .order_by('ym', db_field)
        )

        observed_months: set[str] = set()
        month_map: dict[str, dict[str, float]] = {name: {} for name in top_names}
        for row in month_rows:
            ym = row['ym'] or ''
            name = row[db_field] or ''
            if not ym or not name:
                continue
            observed_months.add(ym)
            month_map.setdefault(name, {})[ym] = float(row['volume'] or 0)

        months = _month_range(start_date, end_date, observed_months)

        items = []
        cumulative = 0.0
        for rank, row in enumerate(rows, start=1):
            name = row[db_field]
            vol = float(row['volume'] or 0)
            pct = round(vol / total * 100, 2)
            cumulative += pct
            if cumulative <= ABC_THRESHOLDS[0]:
                abc_cat = 'A'
            elif cumulative <= ABC_THRESHOLDS[1]:
                abc_cat = 'B'
            else:
                abc_cat = 'C'

            monthly_values = [month_map.get(name, {}).get(month, 0.0) for month in months]
            mean = sum(monthly_values) / len(monthly_values) if monthly_values else 0.0
            variance = sum((value - mean) ** 2 for value in monthly_values) / len(monthly_values) if monthly_values else 0.0
            std_dev = variance ** 0.5
            variation = round((std_dev / mean * 100) if mean else 0.0, 2)
            xyz_cat = _xyz_category(variation)
            items.append({
                'rank':       rank,
                'name':       name,
                'volume':     round(vol, 2),
                'pct':        pct,
                'cumulative': round(cumulative, 2),
                'category':   abc_cat,
                'xyz_category': xyz_cat,
                'variation':  variation,
                'matrix':     f'{abc_cat}{xyz_cat}',
            })

        a_items = [i for i in items if i['category'] == 'A']
        b_items = [i for i in items if i['category'] == 'B']
        c_items = [i for i in items if i['category'] == 'C']
        x_items = [i for i in items if i['xyz_category'] == 'X']
        y_items = [i for i in items if i['xyz_category'] == 'Y']
        z_items = [i for i in items if i['xyz_category'] == 'Z']

        matrix_summary = {}
        for abc_cat in ('A', 'B', 'C'):
            for xyz_cat in ('X', 'Y', 'Z'):
                key = f'{abc_cat}{xyz_cat}'
                bucket = [i for i in items if i['matrix'] == key]
                matrix_summary[key] = {
                    'count': len(bucket),
                    'volume': round(sum(i['volume'] for i in bucket), 2),
                }

        summary = {
            'a_count':  len(a_items),
            'b_count':  len(b_items),
            'c_count':  len(c_items),
            'a_volume': round(sum(i['volume'] for i in a_items), 2),
            'b_volume': round(sum(i['volume'] for i in b_items), 2),
            'c_volume': round(sum(i['volume'] for i in c_items), 2),
            'a_pct':    round(sum(i['pct'] for i in a_items), 1),
            'b_pct':    round(sum(i['pct'] for i in b_items), 1),
            'c_pct':    round(sum(i['pct'] for i in c_items), 1),
            'x_count':  len(x_items),
            'y_count':  len(y_items),
            'z_count':  len(z_items),
            'x_pct':    round(sum(i['pct'] for i in x_items), 1),
            'y_pct':    round(sum(i['pct'] for i in y_items), 1),
            'z_pct':    round(sum(i['pct'] for i in z_items), 1),
            'matrix':   matrix_summary,
        }

        result = {'items': items, 'summary': summary, 'total': round(total, 2)}
        cache.set(cache_key, result, self.CACHE_TTL)
        return Response(result)


class MonthlyTrendView(APIView):
    """
    GET /api/analytics/monthly-trend/
    Params:
      groupby  — gruppa_tovara | region | cvet | kod_tovara  (default: gruppa_tovara)
      values   — comma-separated list of values to include (e.g. "ПРОФИЛЬ,ПЕРЕПЛЁТ")
      start_date, end_date — YYYY-MM-DD
    Returns: { months: [...], series: [{name, data: [...]}, ...] }
    """
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 300

    def get(self, request):
        groupby    = request.query_params.get('groupby', 'gruppa_tovara')
        values_str = request.query_params.get('values', '')
        start_date = request.query_params.get('start_date', '')
        end_date   = request.query_params.get('end_date', '')

        if groupby not in GROUPBY_FIELDS:
            return Response({'error': f'Некорректный groupby: {groupby}'}, status=400)

        db_field = GROUPBY_FIELDS[groupby]
        sector_q = get_sale_sector_q(request.user)
        qs = Sale.objects.filter(sector_q).exclude(**{f'{db_field}__isnull': True}).exclude(**{f'{db_field}': ''})

        if start_date:
            qs = qs.filter(data__gte=start_date)
        if end_date:
            qs = qs.filter(data__lte=end_date)

        selected = [v.strip() for v in values_str.split(',') if v.strip()]
        if selected:
            qs = qs.filter(**{f'{db_field}__in': selected})

        from django.db.models.functions import Substr
        rows = (
            qs.annotate(ym=Substr('data', 1, 7))
            .values('ym', db_field)
            .annotate(volume=safe_kol_vo_sum())
            .order_by('ym', db_field)
        )

        # Собираем структуру: {name: {month: volume}}
        from collections import defaultdict
        series_map: dict[str, dict[str, float]] = defaultdict(dict)
        months_set: set[str] = set()

        for row in rows:
            ym   = row['ym'] or ''
            name = row[db_field] or ''
            vol  = float(row['volume'] or 0)
            if ym:
                months_set.add(ym)
                series_map[name][ym] = series_map[name].get(ym, 0) + vol

        months = sorted(months_set)

        # Если groupby не задан — берём топ-10 по суммарному обьёму
        if not selected:
            totals = {name: sum(v for v in data.values()) for name, data in series_map.items()}
            top_names = sorted(totals, key=lambda n: totals[n], reverse=True)[:10]
        else:
            top_names = selected

        series = [
            {
                'name': name,
                'data': [round(series_map[name].get(m, 0), 2) for m in months],
            }
            for name in top_names
        ]

        return Response({'months': months, 'series': series})


class RegionMapView(APIView):
    """
    GET /api/analytics/region-map/
    Params:
      year  — int (default: текущий год)
      month — int 1-12 or 0 = весь год
    Returns:
      {
        regions: [{name, volume, pct, rank}],
        warehouses: [{name, volume, regions: [{name, volume}]}],
        total: float,
        period: str
      }
    """
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 300

    def get(self, request):
        from datetime import date
        year   = int(request.query_params.get('year',  date.today().year))
        month  = int(request.query_params.get('month', 0))
        gruppa = request.query_params.get('gruppa', '').strip()
        kod    = request.query_params.get('kod', '').strip()

        cache_key = f'region_map_{get_sector_cache_prefix(request.user)}_{year}_{month}_{gruppa}_{kod}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        sector_q = get_sale_sector_q(request.user)
        qs = Sale.objects.filter(sector_q, data__startswith=str(year))
        if month:
            month_str = f'{year}-{month:02d}'
            qs = qs.filter(data__startswith=month_str)
        if gruppa:
            qs = qs.filter(gruppa_tovara=gruppa)
        if kod:
            qs = qs.filter(kod_tovara=kod)

        # --- Продажи по регионам ---
        region_rows = (
            qs.exclude(region__isnull=True).exclude(region='')
            .values('region')
            .annotate(volume=safe_kol_vo_sum())
            .order_by('-volume')
        )

        # --- План по регионам ---
        plan_qs = SalesPlan.objects.filter(year=year).exclude(region='').exclude(region__isnull=True)
        if month:
            plan_qs = plan_qs.filter(month=month)
        if gruppa:
            plan_qs = plan_qs.filter(gruppa_tovara=gruppa)
        if kod:
            plan_qs = plan_qs.filter(kod_tovara=kod)

        from django.db.models import Sum as DjSum
        plan_rows = plan_qs.values('region').annotate(plan=DjSum('plan_kg'))
        plan_map = {r['region']: float(r['plan'] or 0) for r in plan_rows}

        total = sum(float(r['volume'] or 0) for r in region_rows)
        regions = []
        for rank, row in enumerate(region_rows, 1):
            vol = float(row['volume'] or 0)
            reg = row['region']
            regions.append({
                'name':   reg,
                'volume': round(vol, 2),
                'pct':    round(vol / total * 100, 1) if total else 0,
                'rank':   rank,
                'plan':   round(plan_map.get(reg, 0), 2),
            })

        # --- Продажи по складам с разбивкой по регионам ---
        wh_rows = (
            qs.exclude(sklad__isnull=True).exclude(sklad='')
            .exclude(region__isnull=True).exclude(region='')
            .values('sklad', 'region')
            .annotate(volume=safe_kol_vo_sum())
            .order_by('sklad', '-volume')
        )

        from collections import defaultdict
        wh_map: dict = defaultdict(lambda: {'volume': 0.0, 'regions': []})
        for row in wh_rows:
            wh   = row['sklad']
            reg  = row['region']
            vol  = float(row['volume'] or 0)
            wh_map[wh]['volume'] += vol
            wh_map[wh]['regions'].append({'name': reg, 'volume': round(vol, 2)})

        warehouses = [
            {'name': wh, 'volume': round(data['volume'], 2), 'regions': data['regions']}
            for wh, data in sorted(wh_map.items(), key=lambda x: -x[1]['volume'])
        ]

        period = f'{year}' if not month else f'{year}-{month:02d}'
        result = {
            'regions':    regions,
            'warehouses': warehouses,
            'total':      round(total, 2),
            'period':     period,
        }
        cache.set(cache_key, result, self.CACHE_TTL)
        return Response(result)


class RegionMapFiltersView(APIView):
    """
    GET /api/analytics/region-map/filters/?gruppa=Опция
    Returns distinct gruppa_tovara values and kod_tovara values.
    If gruppa is provided, codes are scoped to that group.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        gruppa = request.query_params.get('gruppa', '').strip()
        sector_prefix = get_sector_cache_prefix(request.user)
        cache_key = f'region_map_filters_{sector_prefix}_{gruppa}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        sector_q = get_sale_sector_q(request.user)
        groups = (
            Sale.objects
            .filter(sector_q)
            .exclude(gruppa_tovara__isnull=True)
            .exclude(gruppa_tovara='')
            .values_list('gruppa_tovara', flat=True)
            .distinct()
            .order_by('gruppa_tovara')
        )
        codes_qs = Sale.objects.filter(sector_q).exclude(kod_tovara__isnull=True).exclude(kod_tovara='')
        if gruppa:
            codes_qs = codes_qs.filter(gruppa_tovara=gruppa)
        codes = (
            codes_qs
            .values_list('kod_tovara', flat=True)
            .distinct()
            .order_by('kod_tovara')
        )
        result = {
            'groups': list(groups),
            'codes':  list(codes),
        }
        cache.set(cache_key, result, 600)
        return Response(result)
