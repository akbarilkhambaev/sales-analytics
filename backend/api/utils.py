from django.db.models import Case, When, FloatField, Sum, Value
from django.db.models.functions import Cast


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
