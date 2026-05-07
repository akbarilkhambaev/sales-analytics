from django.contrib import admin
from .models import (
    Sector,
    Sale, ReadySale, Expense, ExpenseCategory, WorkReport, WorkReportPhoto,
    ProductCatalog, ClientCard, ClientVisitReport, VisitReportPhoto,
    KanbanColumn, KanbanTask,
    KPITemplate, KPITemplateItem, KPIRecord, KPIRecordItem,
)
from .configurator_models import Series, MaterialRates, ProfileColor, GlassOption, Accessory


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    prepopulated_fields = {'code': ('name',)}
    readonly_fields = ['created_at']


# ─── Configurator Admin ───────────────────────────────────────────────────────

class MaterialRatesInline(admin.StackedInline):
    model = MaterialRates
    can_delete = False
    verbose_name = 'Ставки материалов'
    fieldsets = (
        ('Рамный профиль (сум/пог.м)', {
            'fields': (
                ('frame_per_m', 'frame_colored_per_m', 'frame_laminated_per_m'),
            ),
        }),
        ('Профиль створки (сум/пог.м)', {
            'fields': (
                ('sash_per_m', 'sash_colored_per_m', 'sash_laminated_per_m'),
            ),
        }),
        ('Импост (сум/пог.м)', {
            'fields': (
                ('imposta_per_m', 'imposta_colored_per_m', 'imposta_laminated_per_m'),
            ),
        }),
        ('Остальные позиции', {
            'fields': (
                ('glass_per_sqm',),
                ('hardware_per_opening', 'hardware_per_sliding'),
                ('seal_per_m', 'install_base'),
            ),
        }),
    )


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    inlines = [MaterialRatesInline]
    list_display = ['name', 'id_code', 'material', 'price_per_sqm', 'is_active', 'sort_order']
    list_editable = ['is_active', 'sort_order']
    list_filter = ['material', 'is_active']
    search_fields = ['name', 'id_code']
    fieldsets = (
        ('Основное', {
            'fields': ('id_code', 'name', 'material', 'description', 'features', 'categories'),
        }),
        ('Размеры (мм)', {
            'fields': (
                ('min_width', 'max_width'),
                ('min_height', 'max_height'),
            ),
        }),
        ('Цена и отображение', {
            'fields': ('price_per_sqm', 'is_active', 'sort_order'),
        }),
    )


@admin.register(ProfileColor)
class ProfileColorAdmin(admin.ModelAdmin):
    list_display = ['name', 'id_code', 'color_type', 'tier', 'hex', 'is_active', 'sort_order']
    list_editable = ['is_active', 'sort_order']
    list_filter = ['color_type', 'tier', 'is_active']
    search_fields = ['name', 'id_code']
    fieldsets = (
        ('Основное', {
            'fields': ('id_code', 'name', 'color_type', 'tier', 'materials'),
        }),
        ('Цвет (SVG)', {
            'fields': ('hex', 'highlight_hex', 'shadow_hex', 'texture'),
        }),
        ('Отображение', {
            'fields': ('is_active', 'sort_order'),
        }),
    )


@admin.register(GlassOption)
class GlassOptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'id_code', 'spec', 'u_value', 'price_modifier', 'is_active', 'sort_order']
    list_editable = ['price_modifier', 'is_active', 'sort_order']
    search_fields = ['name', 'id_code']


@admin.register(Accessory)
class AccessoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'id_code', 'category', 'price', 'unit', 'price_mode', 'is_active', 'sort_order']
    list_editable = ['price', 'is_active', 'sort_order']
    list_filter = ['category', 'price_mode', 'is_active']
    search_fields = ['name', 'id_code', 'category']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    """Админ панель для продаж"""
    
    list_display = [
        'kod_tovara',
        'gruppa_tovara',
        'region',
        'sklad',
        'data',
        'dopoln_kol_vo'
    ]
    
    list_filter = [
        'gruppa_tovara',
        'region',
        'sklad',
    ]
    
    search_fields = [
        'kod_tovara',
        'gruppa_tovara',
        'region',
    ]
    
    list_per_page = 50
    
    readonly_fields = ['data']
    
    fieldsets = (
        ('Товар', {
            'fields': ('kod_tovara', 'gruppa_tovara', 'dopoln_kol_vo')
        }),
        ('Локация', {
            'fields': ('region', 'sklad', 'scheta')
        }),
        ('Дата', {
            'fields': ('data',)
        }),
    )


@admin.register(ReadySale)
class ReadySaleAdmin(admin.ModelAdmin):
    """Админ панель для готовых продаж"""
    
    list_display = [
        'data',
        'diler',
        'klient',
        'produkt',
        'gruppa_produktov',
        'kolichestvo',
        'dokhod',
        'valyuta',
        'year'
    ]
    
    list_filter = [
        'year',
        'diler',
        'gruppa_produktov',
        'valyuta',
        'tip',
        'tip_organizacii',
    ]
    
    search_fields = [
        'produkt',
        'tovary',
        'klient',
        'diler',
    ]
    
    list_per_page = 50
    
    date_hierarchy = 'data'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('data', 'year', 'diler', 'klient', 'klient_id', 'invoice_sid')
        }),
        ('Тип', {
            'fields': ('tip', 'tip_organizacii')
        }),
        ('Продукт', {
            'fields': ('produkt', 'gruppa_produktov', 'tovary')
        }),
        ('Метрики', {
            'fields': ('kolichestvo', 'ves_kg', 'obshchaya_summa', 'dokhod', 'valyuta')
        }),
    )


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    """Админ панель для категорий расходов"""
    
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    """Админ панель для расходов отдела"""
    
    list_display = [
        'tema',
        'category',
        'amount',
        'currency',
        'date',
        'created_by',
        'updated_by',
        'created_at'
    ]
    
    list_filter = [
        'category',
        'currency',
        'date',
        'created_at'
    ]
    
    search_fields = [
        'tema',
        'description',
        'comment',
        'created_by__username',
        'updated_by__username'
    ]
    
    readonly_fields = ['created_by', 'created_at', 'updated_by', 'updated_at']
    
    date_hierarchy = 'date'
    
    list_per_page = 50
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('tema', 'category', 'description')
        }),
        ('Финансы', {
            'fields': ('amount', 'currency', 'date')
        }),
        ('Дополнительно', {
            'fields': ('attachment', 'comment')
        }),
        ('Аудит', {
            'fields': ('created_by', 'created_at', 'updated_by', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class WorkReportPhotoInline(admin.TabularInline):
    """Inline для фотографий отчёта"""
    model = WorkReportPhoto
    extra = 1
    fields = ['image', 'caption', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(WorkReport)
class WorkReportAdmin(admin.ModelAdmin):
    """Админ панель для отчётов по выполненным работам"""
    
    list_display = [
        'date',
        'description_short',
        'budget',
        'status',
        'created_by',
        'updated_by',
        'created_at'
    ]
    
    list_filter = [
        'status',
        'date',
        'created_at'
    ]
    
    search_fields = [
        'description',
        'assigned_employees',
        'created_by__username',
        'updated_by__username'
    ]
    
    readonly_fields = ['created_by', 'created_at', 'updated_by', 'updated_at']
    
    date_hierarchy = 'date'
    
    list_per_page = 50
    
    inlines = [WorkReportPhotoInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('date', 'description', 'status')
        }),
        ('Бюджет и сотрудники', {
            'fields': ('budget', 'assigned_employees')
        }),
        ('Аудит', {
            'fields': ('created_by', 'created_at', 'updated_by', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def description_short(self, obj):
        """Короткое описание"""
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Описание'


@admin.register(WorkReportPhoto)
class WorkReportPhotoAdmin(admin.ModelAdmin):
    """Админ панель для фотографий отчётов"""
    
    list_display = ['work_report', 'caption', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['caption', 'work_report__description']
    readonly_fields = ['uploaded_at']


@admin.register(ProductCatalog)
class ProductCatalogAdmin(admin.ModelAdmin):
    """Админ панель для каталогов продукции"""
    
    list_display = [
        'title',
        'catalog_type',
        'created_by',
        'created_at',
        'updated_at'
    ]
    
    list_filter = [
        'catalog_type',
        'created_at',
        'updated_at'
    ]
    
    search_fields = [
        'title',
        'description'
    ]
    
    readonly_fields = [
        'created_by',
        'created_at',
        'updated_by',
        'updated_at'
    ]
    
    list_per_page = 50
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'catalog_type', 'description')
        }),
        ('Файлы', {
            'fields': ('pdf_file', 'preview_image')
        }),
        ('Аудит', {
            'fields': ('created_by', 'created_at', 'updated_by', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ClientCard)
class ClientCardAdmin(admin.ModelAdmin):
    """Админ панель для карточек клиентов"""
    
    list_display = [
        'last_name',
        'first_name',
        'client_name',
        'region',
        'experience_years',
        'created_at'
    ]
    
    list_filter = [
        'region',
        'created_at',
        'updated_at'
    ]
    
    search_fields = [
        'first_name',
        'last_name',
        'client_name',
        'region',
        'phone',
        'email',
        'position'
    ]
    
    readonly_fields = [
        'created_by',
        'created_at',
        'updated_by',
        'updated_at',
        'full_name'
    ]
    
    list_per_page = 50
    
    fieldsets = (
        ('Личная информация', {
            'fields': ('first_name', 'last_name', 'full_name', 'photo')
        }),
        ('Профессиональная информация', {
            'fields': ('client_name', 'region', 'experience_years', 'position', 'partners')
        }),
        ('Контактная информация', {
            'fields': ('phone', 'email', 'start_date')
        }),
        ('Аудит', {
            'fields': ('created_by', 'created_at', 'updated_by', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class VisitReportPhotoInline(admin.TabularInline):
    model = VisitReportPhoto
    extra = 1
    fields = ('photo', 'description', 'uploaded_at')
    readonly_fields = ('uploaded_at',)


@admin.register(ClientVisitReport)
class ClientVisitReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'client_card', 'visit_date', 'created_by', 'created_at')
    list_filter = ('visit_date', 'created_at', 'created_by')
    search_fields = (
        'client_card__first_name',
        'client_card__last_name',
        'client_card__client_name',
        'work_description',
        'suggestions',
        'complaints'
    )
    readonly_fields = ('visit_date', 'created_by', 'created_at', 'updated_by', 'updated_at')
    inlines = [VisitReportPhotoInline]
    
    fieldsets = (
        ('Информация о визите', {
            'fields': ('client_card', 'visit_date')
        }),
        ('Отчет', {
            'fields': ('work_description', 'suggestions', 'complaints')
        }),
        ('Аудит', {
            'fields': ('created_by', 'created_at', 'updated_by', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(VisitReportPhoto)
class VisitReportPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'visit_report', 'description', 'uploaded_at')
    list_filter = ('uploaded_at',)
    search_fields = ('description', 'visit_report__client_card__full_name')
    readonly_fields = ('uploaded_at',)


@admin.register(KanbanColumn)
class KanbanColumnAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'color', 'order', 'created_at')
    ordering = ('order',)


class KanbanTaskInline(admin.TabularInline):
    model = KanbanTask
    extra = 0
    fields = ('title', 'assignee', 'priority', 'progress', 'due_date', 'order')



@admin.register(KanbanTask)
class KanbanTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'column', 'assignee', 'priority', 'progress', 'due_date', 'order')
    list_filter = ('column', 'priority', 'assignee')
    search_fields = ('title', 'description', 'tags')
    ordering = ('column__order', 'order')


# ─── KPI Admin ────────────────────────────────────────────────────────────────

class KPITemplateItemInline(admin.TabularInline):
    model = KPITemplateItem
    extra = 1
    fields = ('order', 'name', 'unit', 'weight', 'min_threshold', 'max_threshold', 'notes')


@admin.register(KPITemplate)
class KPITemplateAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name', 'is_active', 'items_count', 'created_by', 'created_at')
    list_filter   = ('is_active',)
    search_fields = ('name', 'description')
    inlines       = [KPITemplateItemInline]

    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Пунктов'


@admin.register(KPITemplateItem)
class KPITemplateItemAdmin(admin.ModelAdmin):
    list_display  = ('id', 'template', 'name', 'unit', 'weight', 'min_threshold', 'max_threshold', 'order')
    list_filter   = ('template', 'unit')
    search_fields = ('name', 'template__name')
    ordering      = ('template', 'order')


class KPIRecordItemInline(admin.TabularInline):
    model       = KPIRecordItem
    extra       = 0
    readonly_fields = ('fact', 'completion_pct_display', 'payout_amount')
    fields      = ('template_item', 'target', 'fact_auto', 'fact_manual', 'fact', 'completion_pct_display', 'payout_amount', 'notes')

    def completion_pct_display(self, obj):
        return f"{round(obj.completion_pct * 100, 1)} %"
    completion_pct_display.short_description = 'Выполнение %'


@admin.register(KPIRecord)
class KPIRecordAdmin(admin.ModelAdmin):
    list_display  = ('id', 'manager', 'template', 'period_type', 'period_number', 'period_year', 'base_salary', 'total_payout_display', 'status')
    list_filter   = ('period_type', 'period_year', 'status', 'template')
    search_fields = ('manager__username', 'manager__first_name', 'manager__last_name')
    inlines       = [KPIRecordItemInline]

    def total_payout_display(self, obj):
        return f"{obj.total_payout:,.0f}"
    total_payout_display.short_description = 'Итого выплата'


@admin.register(KPIRecordItem)
class KPIRecordItemAdmin(admin.ModelAdmin):
    list_display  = ('id', 'record', 'template_item', 'target', 'fact', 'completion_pct_display', 'payout_amount')
    list_filter   = ('template_item__unit',)
    search_fields = ('record__manager__username', 'template_item__name')

    def completion_pct_display(self, obj):
        return f"{round(obj.completion_pct * 100, 1)} %"
    completion_pct_display.short_description = 'Выполнение %'
