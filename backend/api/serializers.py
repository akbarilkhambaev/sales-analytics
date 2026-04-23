from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Sale, ReadySale, Expense, ExpenseCategory, WorkReport, WorkReportPhoto,
    ProductCatalog, ClientCard, ClientVisitReport, VisitReportPhoto,
    KanbanColumn, KanbanTask,
    KPITemplate, KPITemplateItem, KPIRecord, KPIRecordItem,
)


class SaleSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Sale"""
    
    class Meta:
        model = Sale
        fields = '__all__'


class ProductYearData(serializers.Serializer):
    """Данные продукта по годам"""
    code = serializers.CharField()
    years = serializers.DictField()
    growth = serializers.DictField()


class GroupYearData(serializers.Serializer):
    """Данные группы по годам"""
    group = serializers.CharField()
    years = serializers.DictField()
    growth = serializers.DictField()


class WarehouseSerializer(serializers.Serializer):
    """Список складов"""
    warehouses = serializers.ListField(child=serializers.CharField())


class RegionSerializer(serializers.Serializer):
    """Список регионов"""
    regions = serializers.ListField(child=serializers.CharField())


class ProfileData(serializers.Serializer):
    """Данные профиля"""
    name = serializers.CharField()
    total = serializers.FloatField()
    years = serializers.DictField()
    growth = serializers.DictField()


class ProductHierarchy(serializers.Serializer):
    """Иерархия: Продукция -> Профили"""
    kod_tovara = serializers.CharField()
    total_sales = serializers.FloatField()
    profiles = ProfileData(many=True)


class ProductData(serializers.Serializer):
    """Данные продукта для цвета"""
    name = serializers.CharField()
    total = serializers.FloatField()
    years = serializers.DictField()
    growth = serializers.DictField()


class ColorHierarchy(serializers.Serializer):
    """Иерархия: Цвет -> Продукты"""
    color = serializers.CharField()
    total_sales = serializers.FloatField()
    products = ProductData(many=True)


class ColorData(serializers.Serializer):
    """Данные цвета для продукта"""
    name = serializers.CharField()
    total = serializers.FloatField()
    years = serializers.DictField()
    growth = serializers.DictField()


class ProductColorsHierarchy(serializers.Serializer):
    """Иерархия: Продукт -> Цвета"""
    product = serializers.CharField()
    total_sales = serializers.FloatField()
    colors = ColorData(many=True)


class ReadySaleSerializer(serializers.ModelSerializer):
    """Сериализатор для готовых продаж"""
    
    class Meta:
        model = ReadySale
        fields = '__all__'


class ClientPurchaseHistory(serializers.Serializer):
    """История покупок клиента"""
    date = serializers.DateField()
    product = serializers.CharField()
    weight = serializers.FloatField()
    quantity = serializers.FloatField()
    revenue = serializers.FloatField()
    dealer = serializers.CharField()


class TopClient(serializers.Serializer):
    """ТОП клиент по весу"""
    client = serializers.CharField()
    dealer = serializers.CharField()
    total_weight = serializers.FloatField()
    products = serializers.DictField()  # {товар: вес}


class TopProduct(serializers.Serializer):
    """ТОП товар по весу"""
    product = serializers.CharField()
    total_weight = serializers.FloatField()
    clients = serializers.DictField()  # {клиент: вес}


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Сериализатор категорий расходов"""
    
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['created_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """Сериализатор расходов"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = [
            'id', 'tema', 'description', 'category', 'category_name',
            'amount', 'currency', 'date', 'attachment', 'attachment_url',
            'comment', 'created_by', 'created_by_username', 'created_at',
            'updated_by', 'updated_by_username', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_by', 'updated_at']
    
    def get_attachment_url(self, obj):
        """Получить URL прикреплённого файла"""
        if obj.attachment:
            return obj.attachment.url
        return None
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Автоматически устанавливаем updated_by при изменении"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)


class ExpenseStatisticsSerializer(serializers.Serializer):
    """Статистика расходов"""
    total_uzs = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_usd = serializers.DecimalField(max_digits=15, decimal_places=2)
    count = serializers.IntegerField()
    by_category = serializers.ListField()
    by_month = serializers.ListField()


class WorkReportPhotoSerializer(serializers.ModelSerializer):
    """Сериализатор фотографий отчёта"""
    
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkReportPhoto
        fields = ['id', 'image', 'image_url', 'caption', 'uploaded_at']
        read_only_fields = ['uploaded_at']
    
    def get_image_url(self, obj):
        """Получить URL изображения"""
        if obj.image:
            return obj.image.url
        return None


class WorkReportSerializer(serializers.ModelSerializer):
    """Сериализатор отчётов по выполненным работам"""
    
    photos = WorkReportPhotoSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    created_by_full_name = serializers.SerializerMethodField()
    updated_by_full_name = serializers.SerializerMethodField()
    assigned_employees_details = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkReport
        fields = [
            'id', 'date', 'description', 'budget', 'assigned_employees', 'assigned_employees_details',
            'status', 'status_display', 'photos',
            'created_by', 'created_by_username', 'created_by_full_name', 'created_at',
            'updated_by', 'updated_by_username', 'updated_by_full_name', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_by', 'updated_at']
    
    def get_created_by_full_name(self, obj):
        """Полное имя создателя"""
        if obj.created_by:
            if obj.created_by.first_name and obj.created_by.last_name:
                return f"{obj.created_by.first_name} {obj.created_by.last_name}"
            return obj.created_by.username
        return None
    
    def get_updated_by_full_name(self, obj):
        """Полное имя изменившего"""
        if obj.updated_by:
            if obj.updated_by.first_name and obj.updated_by.last_name:
                return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
            return obj.updated_by.username
        return None
    
    def get_assigned_employees_details(self, obj):
        """Детальная информация о прикрепленных сотрудниках"""
        employees = obj.assigned_employees.all()
        return [
            {
                'id': emp.id,
                'username': emp.username,
                'full_name': f"{emp.first_name} {emp.last_name}" if emp.first_name and emp.last_name else emp.username,
                'role': emp.profile.role if hasattr(emp, 'profile') else 'VIEWER',
                'role_display': emp.profile.get_role_display() if hasattr(emp, 'profile') else 'Просмотр',
            }
            for emp in employees
        ]
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by и обрабатываем ManyToMany"""
        assigned_employees = validated_data.pop('assigned_employees', [])
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['created_by'] = request.user
        
        instance = super().create(validated_data)
        
        if assigned_employees:
            instance.assigned_employees.set(assigned_employees)
        
        return instance
    
    def update(self, instance, validated_data):
        """Автоматически устанавливаем updated_by при изменении и обрабатываем ManyToMany"""
        assigned_employees = validated_data.pop('assigned_employees', None)
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['updated_by'] = request.user
        
        instance = super().update(instance, validated_data)
        
        if assigned_employees is not None:
            instance.assigned_employees.set(assigned_employees)
        
        return instance


class ProductCatalogSerializer(serializers.ModelSerializer):
    """Сериализатор для каталогов продукции"""
    
    catalog_type_display = serializers.CharField(source='get_catalog_type_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_full_name = serializers.SerializerMethodField()
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    updated_by_full_name = serializers.SerializerMethodField()
    pdf_file_url = serializers.SerializerMethodField()
    preview_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCatalog
        fields = [
            'id', 'title', 'catalog_type', 'catalog_type_display',
            'pdf_file', 'pdf_file_url', 'preview_image', 'preview_image_url',
            'description', 'created_by', 'created_by_username', 'created_by_full_name',
            'created_at', 'updated_by', 'updated_by_username', 'updated_by_full_name',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at']
    
    def get_created_by_full_name(self, obj):
        if obj.created_by and obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_updated_by_full_name(self, obj):
        if obj.updated_by and obj.updated_by.first_name and obj.updated_by.last_name:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
        return None
    
    def get_pdf_file_url(self, obj):
        if obj.pdf_file:
            return obj.pdf_file.url
        return None
    
    def get_preview_image_url(self, obj):
        if obj.preview_image:
            return obj.preview_image.url
        return None
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Автоматически устанавливаем updated_by при изменении"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['updated_by'] = request.user
        
        return super().update(instance, validated_data)


class ClientCardSerializer(serializers.ModelSerializer):
    """Сериализатор для карточек клиентов"""
    
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_full_name = serializers.SerializerMethodField()
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    updated_by_full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = ClientCard
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'experience_years',
            'client_name', 'region', 'partners', 'phone', 'email', 'start_date', 
            'position', 'photo', 'photo_url',
            'created_by', 'created_by_username', 'created_by_full_name',
            'created_at', 'updated_by', 'updated_by_username', 'updated_by_full_name',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at']
    
    def get_created_by_full_name(self, obj):
        if obj.created_by and obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_updated_by_full_name(self, obj):
        if obj.updated_by and obj.updated_by.first_name and obj.updated_by.last_name:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
        return None
    
    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Автоматически устанавливаем updated_by при изменении"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['updated_by'] = request.user
        
        return super().update(instance, validated_data)


class VisitReportPhotoSerializer(serializers.ModelSerializer):
    """Сериализатор для фотографий отчета о посещении"""
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VisitReportPhoto
        fields = ['id', 'photo', 'photo_url', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None


class ClientVisitReportSerializer(serializers.ModelSerializer):
    """Сериализатор для отчетов о посещении клиентов"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_full_name = serializers.SerializerMethodField()
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    updated_by_full_name = serializers.SerializerMethodField()
    assigned_manager_username = serializers.SerializerMethodField()
    assigned_manager_full_name = serializers.SerializerMethodField()
    photos = VisitReportPhotoSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client_card.full_name', read_only=True)
    
    class Meta:
        model = ClientVisitReport
        fields = [
            'id', 'client_card', 'client_name', 'assigned_manager', 
            'assigned_manager_username', 'assigned_manager_full_name',
            'visit_date', 'work_description', 'suggestions', 'complaints',
            'photos', 'created_by', 'created_by_username', 'created_by_full_name',
            'created_at', 'updated_by', 'updated_by_username', 'updated_by_full_name',
            'updated_at'
        ]
        read_only_fields = ['id', 'visit_date', 'created_by', 'created_at', 'updated_by', 'updated_at']
    
    def get_assigned_manager_username(self, obj):
        return obj.assigned_manager.username if obj.assigned_manager else None
    
    def get_assigned_manager_full_name(self, obj):
        if obj.assigned_manager and obj.assigned_manager.first_name and obj.assigned_manager.last_name:
            return f"{obj.assigned_manager.first_name} {obj.assigned_manager.last_name}"
        return None
    
    def get_created_by_full_name(self, obj):
        if obj.created_by and obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_updated_by_full_name(self, obj):
        if obj.updated_by and obj.updated_by.first_name and obj.updated_by.last_name:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
        return None
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Автоматически устанавливаем updated_by при изменении"""
        request = self.context.get('request')
        
        if request and request.user:
            validated_data['updated_by'] = request.user
        
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────────────────────────────────────
# Kanban
# ─────────────────────────────────────────────────────────────────────────────

class UserBriefSerializer(serializers.ModelSerializer):
    """Краткая информация о пользователе"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class KanbanTaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserBriefSerializer(source='assignee', read_only=True)
    created_by_detail = UserBriefSerializer(source='created_by', read_only=True)
    tags_list = serializers.SerializerMethodField()

    class Meta:
        model = KanbanTask
        fields = [
            'id', 'column', 'title', 'description',
            'assignee', 'assignee_detail',
            'created_by', 'created_by_detail',
            'priority', 'progress', 'due_date',
            'tags', 'tags_list', 'order',
            'created_at', 'updated_at',
        ]

    def get_tags_list(self, obj):
        if not obj.tags:
            return []
        return [t.strip() for t in obj.tags.split(',') if t.strip()]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class KanbanColumnSerializer(serializers.ModelSerializer):
    tasks = KanbanTaskSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = KanbanColumn
        fields = ['id', 'title', 'color', 'order', 'tasks', 'task_count', 'created_at']

    def get_task_count(self, obj):
        return obj.tasks.count()


# ─── KPI Serializers ─────────────────────────────────────────────────────────

class KPITemplateItemSerializer(serializers.ModelSerializer):
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = KPITemplateItem
        fields = [
            'id', 'template', 'name', 'unit', 'unit_display',
            'weight', 'min_threshold', 'max_threshold',
            'default_target', 'notes', 'order',
        ]


class KPITemplateSerializer(serializers.ModelSerializer):
    items = KPITemplateItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = KPITemplate
        fields = [
            'id', 'name', 'description',
            'created_by', 'created_by_name',
            'is_active', 'items', 'items_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by']

    def get_items_count(self, obj):
        return obj.items.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class KPIRecordItemSerializer(serializers.ModelSerializer):
    template_item_detail = KPITemplateItemSerializer(source='template_item', read_only=True)
    fact = serializers.FloatField(read_only=True)
    completion_pct = serializers.FloatField(read_only=True)
    capped_completion = serializers.FloatField(read_only=True)
    weighted_contribution = serializers.FloatField(read_only=True)
    payout_amount = serializers.FloatField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = KPIRecordItem
        fields = [
            'id', 'record', 'template_item', 'template_item_detail',
            'target', 'fact_auto', 'fact_manual',
            'fact', 'completion_pct', 'capped_completion',
            'weighted_contribution', 'payout_amount', 'is_valid',
            'notes',
        ]


class KPIRecordSerializer(serializers.ModelSerializer):
    record_items = KPIRecordItemSerializer(many=True, read_only=True)
    manager_detail = serializers.SerializerMethodField()
    template_detail = KPITemplateSerializer(source='template', read_only=True)
    total_weighted = serializers.FloatField(read_only=True)
    fix_payout = serializers.FloatField(read_only=True)
    bonus_payout = serializers.FloatField(read_only=True)
    total_payout = serializers.FloatField(read_only=True)
    period_type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = KPIRecord
        fields = [
            'id', 'manager', 'manager_detail',
            'template', 'template_detail',
            'period_type', 'period_type_display',
            'period_year', 'period_number',
            'base_salary', 'fix_ratio',
            'status', 'status_display',
            'notes', 'created_by',
            'fix_payout', 'bonus_payout',
            'total_weighted', 'total_payout',
            'record_items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by']

    def get_manager_detail(self, obj):
        return {
            'id': obj.manager.id,
            'username': obj.manager.username,
            'full_name': obj.manager.get_full_name() or obj.manager.username,
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class KPIRecordListSerializer(serializers.ModelSerializer):
    """Лёгкий сериализатор для списков (без вложенных items)"""
    manager_detail = serializers.SerializerMethodField()
    total_weighted = serializers.FloatField(read_only=True)
    fix_payout = serializers.FloatField(read_only=True)
    bonus_payout = serializers.FloatField(read_only=True)
    total_payout = serializers.FloatField(read_only=True)
    period_type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = KPIRecord
        fields = [
            'id', 'manager', 'manager_detail',
            'template', 'period_type', 'period_type_display',
            'period_year', 'period_number',
            'base_salary', 'fix_ratio', 'status', 'status_display',
            'fix_payout', 'bonus_payout', 'total_weighted', 'total_payout',
            'items_count', 'created_at',
        ]

    def get_manager_detail(self, obj):
        return {
            'id': obj.manager.id,
            'username': obj.manager.username,
            'full_name': obj.manager.get_full_name() or obj.manager.username,
        }

    def get_items_count(self, obj):
        return obj.record_items.count()
