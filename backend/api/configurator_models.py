"""
Модели конфигуратора оконных/дверных конструкций.

Иерархия:
  Series (серия профиля)
    └── MaterialRates (ставки расхода — 1:1 с Series)
  ProfileColor  (цвет профиля, tier=white/colored/laminated)
  GlassOption   (стеклопакет)
  Accessory     (аксессуары и доп. опции)
"""

from django.db import models
from django.core.validators import MinValueValidator


# ─── Выборочные константы ─────────────────────────────────────────────────────

MATERIAL_CHOICES = [
    ('PVC',       'ПВХ'),
    ('aluminum',  'Алюминий'),
]

CATEGORY_CHOICES = [
    ('window',   'Окно'),
    ('door',     'Дверь'),
    ('sliding',  'Раздвижное'),
]

COLOR_TYPE_CHOICES = [
    ('ral',        'RAL'),
    ('lamination', 'Ламинация'),
]

COLOR_TIER_CHOICES = [
    ('white',     'Белый'),
    ('colored',   'Цветной RAL'),
    ('laminated', 'Ламинированный'),
]

PRICE_MODE_CHOICES = [
    ('fixed',        'За штуку (фиксированно)'),
    ('per_width',    'Пог.м по ширине'),
    ('per_height',   'Пог.м по высоте'),
    ('per_perimeter','Пог.м по периметру'),
]


# ─── Series ───────────────────────────────────────────────────────────────────

class Series(models.Model):
    """Профильная серия (AKFA 60, AKFA 70, Alu 60, Sliding…)"""

    id_code = models.CharField(
        max_length=50, unique=True,
        verbose_name='Код серии',
        help_text='Латинские буквы и цифры, без пробелов. Пример: akfa-60',
    )
    name = models.CharField(max_length=100, verbose_name='Название')
    material = models.CharField(
        max_length=20, choices=MATERIAL_CHOICES,
        verbose_name='Материал',
    )
    description = models.TextField(blank=True, verbose_name='Описание')
    features = models.JSONField(
        default=list, blank=True,
        verbose_name='Особенности',
        help_text='Список строк — пунктов характеристики. Пример: ["60мм профиль", "3 камеры"]',
    )
    categories = models.JSONField(
        default=list,
        verbose_name='Категории изделий',
        help_text='Список из: window, door, sliding. Пример: ["window","door"]',
    )

    min_width  = models.PositiveIntegerField(default=400,  verbose_name='Мин. ширина (мм)')
    max_width  = models.PositiveIntegerField(default=2500, verbose_name='Макс. ширина (мм)')
    min_height = models.PositiveIntegerField(default=400,  verbose_name='Мин. высота (мм)')
    max_height = models.PositiveIntegerField(default=2500, verbose_name='Макс. высота (мм)')

    price_per_sqm = models.PositiveIntegerField(
        default=0,
        verbose_name='Справочная цена (сум/м²)',
        help_text='Только для отображения в карточке серии; расчёт идёт по ставкам материалов.',
    )

    is_active = models.BooleanField(default=True, verbose_name='Активна')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок сортировки')

    class Meta:
        db_table = 'cfg_series'
        verbose_name = 'Серия профиля'
        verbose_name_plural = 'Серии профиля'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class MaterialRates(models.Model):
    """Ставки расхода материалов для серии (сум / ед.)"""

    series = models.OneToOneField(
        Series, on_delete=models.CASCADE,
        related_name='rates', verbose_name='Серия',
    )

    # Рамный профиль — 3 тира
    frame_per_m           = models.PositiveIntegerField(default=0, verbose_name='Рама белая (сум/пог.м)')
    frame_colored_per_m   = models.PositiveIntegerField(default=0, verbose_name='Рама цветная RAL (сум/пог.м)')
    frame_laminated_per_m = models.PositiveIntegerField(default=0, verbose_name='Рама ламинация (сум/пог.м)')

    # Профиль створки — 3 тира
    sash_per_m            = models.PositiveIntegerField(default=0, verbose_name='Створка белая (сум/пог.м)')
    sash_colored_per_m    = models.PositiveIntegerField(default=0, verbose_name='Створка цветная RAL (сум/пог.м)')
    sash_laminated_per_m  = models.PositiveIntegerField(default=0, verbose_name='Створка ламинация (сум/пог.м)')

    # Импост — 3 тира
    imposta_per_m           = models.PositiveIntegerField(default=0, verbose_name='Импост белый (сум/пог.м)')
    imposta_colored_per_m   = models.PositiveIntegerField(default=0, verbose_name='Импост цветной RAL (сум/пог.м)')
    imposta_laminated_per_m = models.PositiveIntegerField(default=0, verbose_name='Импост ламинация (сум/пог.м)')

    # Остальные позиции (не зависят от цвета)
    glass_per_sqm         = models.PositiveIntegerField(default=0, verbose_name='Стеклопакет базовый (сум/м²)')
    hardware_per_opening  = models.PositiveIntegerField(default=0, verbose_name='Фурнитура П/О (сум/шт)')
    hardware_per_sliding  = models.PositiveIntegerField(default=0, verbose_name='Фурнитура раздвижная (сум/шт)')
    seal_per_m            = models.PositiveIntegerField(default=0, verbose_name='Уплотнитель (сум/пог.м)')
    install_base          = models.PositiveIntegerField(default=0, verbose_name='Монтаж базовый (сум/изделие)')

    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        db_table = 'cfg_material_rates'
        verbose_name = 'Ставки материалов'
        verbose_name_plural = 'Ставки материалов'

    def __str__(self):
        return f'Ставки: {self.series.name}'


# ─── ProfileColor ─────────────────────────────────────────────────────────────

class ProfileColor(models.Model):
    """Цвет/ламинация профиля"""

    id_code = models.CharField(
        max_length=60, unique=True,
        verbose_name='Код цвета',
        help_text='Пример: ral-9016, lam-staufer-mocca',
    )
    name        = models.CharField(max_length=150, verbose_name='Название')
    color_type  = models.CharField(max_length=20, choices=COLOR_TYPE_CHOICES, verbose_name='Тип')
    tier        = models.CharField(max_length=20, choices=COLOR_TIER_CHOICES, verbose_name='Ценовой тир')

    hex          = models.CharField(max_length=7,  verbose_name='Hex цвет')
    highlight_hex = models.CharField(max_length=7, verbose_name='Hex блик (светлее)')
    shadow_hex    = models.CharField(max_length=7, verbose_name='Hex тень (темнее)')

    texture = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='Путь к текстуре',
        help_text='Относительный путь: /textures/lamination/filename.png',
    )
    materials = models.JSONField(
        default=list,
        verbose_name='Совместимые материалы',
        help_text='Список: ["PVC"], ["aluminum"] или ["PVC","aluminum"]',
    )

    is_active  = models.BooleanField(default=True, verbose_name='Активен')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        db_table = 'cfg_profile_color'
        verbose_name = 'Цвет профиля'
        verbose_name_plural = 'Цвета профиля'
        ordering = ['tier', 'sort_order', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_tier_display()})'


# ─── GlassOption ─────────────────────────────────────────────────────────────

class GlassOption(models.Model):
    """Тип стеклопакета"""

    id_code        = models.CharField(max_length=50, unique=True, verbose_name='Код')
    name           = models.CharField(max_length=100, verbose_name='Название')
    spec           = models.CharField(max_length=100, blank=True, verbose_name='Формула (4-16-4)')
    description    = models.CharField(max_length=255, blank=True, verbose_name='Описание')
    u_value        = models.CharField(max_length=30, blank=True, verbose_name='Теплопередача (U)')
    price_modifier = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.0,
        validators=[MinValueValidator(1.0)],
        verbose_name='Коэффициент к цене стекла',
        help_text='1.0 = базовый, 1.35 = +35% и т.д.',
    )

    is_active  = models.BooleanField(default=True,  verbose_name='Активен')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        db_table = 'cfg_glass_option'
        verbose_name = 'Стеклопакет'
        verbose_name_plural = 'Стеклопакеты'
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.name} ({self.spec})'


# ─── Accessory ────────────────────────────────────────────────────────────────

class Accessory(models.Model):
    """Аксессуар / дополнительная опция"""

    id_code    = models.CharField(max_length=60, unique=True, verbose_name='Код')
    name       = models.CharField(max_length=150, verbose_name='Название')
    category   = models.CharField(max_length=60, verbose_name='Категория',
                                  help_text='handle, net, sill, seal, slope, blind, espagnolette…')
    price      = models.PositiveIntegerField(verbose_name='Цена за единицу (сум)')
    unit       = models.CharField(max_length=20, verbose_name='Единица (шт / пог.м / компл)')
    price_mode = models.CharField(
        max_length=20, choices=PRICE_MODE_CHOICES,
        verbose_name='Режим расчёта',
    )

    is_active  = models.BooleanField(default=True, verbose_name='Активен')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        db_table = 'cfg_accessory'
        verbose_name = 'Аксессуар'
        verbose_name_plural = 'Аксессуары'
        ordering = ['category', 'sort_order', 'name']

    def __str__(self):
        return f'{self.name} — {self.price:,} сум/{self.unit}'
