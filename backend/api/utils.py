from django.db.models import Case, When, FloatField, Sum, Value, Q
from django.db.models.functions import Cast


def get_sale_sector_q(user) -> Q:
    """
    Returns a Q object to filter Sale/ReadySale by the user's sector gruppa_filters.
    - If the user has a sector AND that sector has gruppa_filters configured → filter by them.
    - Otherwise (admin with no sector, or sector with empty filter list) → Q() means no filter.
    """
    profile = getattr(user, 'profile', None)
    if profile and profile.sector_id is not None:
        try:
            sector = profile.sector
        except Exception:
            return Q()
        if sector and sector.gruppa_filters:
            return Q(gruppa_tovara__in=sector.gruppa_filters)
    return Q()


def get_sector_cache_prefix(user) -> str:
    """Returns a short string for use in cache keys to isolate data by sector."""
    profile = getattr(user, 'profile', None)
    if profile and profile.sector_id is not None:
        return f's{profile.sector_id}'
    return 'all'


class SectorQuerysetMixin:
    """
    Mixin for ViewSets: automatically filters queryset by the user's sector.
    - ADMIN / SUPER_ADMIN have sector=null → they see everything.
    - MANAGER has sector set → sees only their sector's data.
    Set `sector_field` on subclass to customise the filter lookup
    (e.g. 'column__sector' for KanbanTask).
    """
    sector_field = 'sector'

    def get_queryset(self):
        qs = super().get_queryset()
        profile = getattr(self.request.user, 'profile', None)
        if profile and profile.sector_id is not None:
            qs = qs.filter(**{self.sector_field: profile.sector_id})
        return qs


def safe_kol_vo_sum():
    """
    PostgreSQL-compatible Sum of dopoln_kol_vo.
    SQLite Cast('', float) = 0, но PostgreSQL Cast('NaN', float) = NaN.
    Используем Case/When чтобы пропускать нечисловые значения.
    """
    return Sum(
        Case(
            When(dopoln_kol_vo__regex=r'^-?\d+(\.\d+)?$',
                 then=Cast('dopoln_kol_vo', FloatField())),
            default=Value(0.0),
            output_field=FloatField()
        )
    )


def safe_uch_kol_vo_sum():
    """PostgreSQL-compatible Sum of uch_kol_vo (УЧИТЫВАЯ_КОЛ-ВО = штуки)."""
    return Sum(
        Case(
            When(uch_kol_vo__regex=r'^-?\d+(\.\d+)?$',
                 then=Cast('uch_kol_vo', FloatField())),
            default=Value(0.0),
            output_field=FloatField()
        )
    )
