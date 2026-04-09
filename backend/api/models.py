from django.db import models


class Sale(models.Model):
    """Модель продаж"""
    
    kod_tovara = models.CharField(
        max_length=100,
        verbose_name="Код товара",
        db_column="КОД_ТОВАРА",
        db_index=True
    )
    gruppa_tovara = models.CharField(
        max_length=100,
        verbose_name="Группа товара",
        db_column="ГРУППА_ТОВАРА",
        db_index=True,
        null=True,
        blank=True
    )
    region = models.CharField(
        max_length=100,
        verbose_name="Регион",
        db_column="РЕГИОН",
        db_index=True,
        null=True,
        blank=True
    )
    sklad = models.CharField(
        max_length=100,
        verbose_name="Склад",
        db_column="СКЛАД",
        null=True,
        blank=True
    )
    scheta = models.CharField(
        max_length=100,
        verbose_name="Счета",
        db_column="СЧЕТЫ",
        null=True,
        blank=True
    )
    data = models.CharField(
        max_length=20,
        verbose_name="Дата",
        db_column="Дата",
        db_index=True,
        null=True,
        blank=True
    )
    dopoln_kol_vo = models.CharField(
        max_length=50,
        verbose_name="Дополн. кол-во",
        db_column="ДОПОЛН__КОЛ-ВО",
        null=True,
        blank=True
    )
    uch_kol_vo = models.CharField(
        max_length=50,
        verbose_name="Учитывая кол-во",
        db_column="УЧИТЫВАЯ_КОЛ-ВО",
        null=True,
        blank=True
    )
    tovary = models.CharField(
        max_length=255,
        verbose_name="Товары",
        db_column="ТОВАРЫ",
        null=True,
        blank=True
    )
    cvet = models.CharField(
        max_length=100,
        verbose_name="Цвет",
        db_column="ЦВЕТ",
        null=True,
        blank=True
    )
    profil_perechen = models.CharField(
        max_length=100,
        verbose_name="Профиль перечень",
        db_column="профиль_перечень",
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'sales'
        verbose_name = 'Продажа'
        verbose_name_plural = 'Продажи'
        ordering = ['-data']
        managed = False  # Не управлять таблицей через миграции

    def __str__(self):
        return f"{self.kod_tovara} - {self.data}"

    @property
    def year(self):
        """Извлечение года из даты"""
        if self.data and len(self.data) >= 4:
            return self.data[:4]
        return None

    @property
    def month(self):
        """Извлечение месяца из даты"""
        if self.data and len(self.data) >= 7:
            return self.data[5:7]
        return None
    
    @property
    def quantity(self):
        """Конвертация кол-ва в число"""
        try:
            return float(self.dopoln_kol_vo) if self.dopoln_kol_vo else 0
        except (ValueError, TypeError):
            return 0


class ReadySale(models.Model):
    """Модель для готовых данных из файлов 2024-2025"""
    
    data = models.DateField(
        verbose_name="Дата", 
        db_column="Дата",
        db_index=True,
        null=True,
        blank=True
    )
    diler = models.CharField(
        max_length=100,
        verbose_name="Дилер",
        db_column="Дилер",
        db_index=True,
        null=True,
        blank=True
    )
    region = models.CharField(
        max_length=100,
        verbose_name="Регион",
        db_column="Регион",
        db_index=True,
        null=True,
        blank=True
    )
    klient_id = models.FloatField(
        verbose_name="Клиент ИД",
        db_column="Клиент_ИД",
        null=True,
        blank=True
    )
    klient = models.CharField(
        max_length=255,
        verbose_name="Клиент",
        db_column="Клиент",
        db_index=True,
        null=True,
        blank=True
    )
    invoice_sid = models.BigIntegerField(
        verbose_name="Инвоиcе CИД",
        db_column="Инвоиcе_CИД",
        db_index=True,
        null=True,
        blank=True
    )
    tip = models.CharField(
        max_length=100,
        verbose_name="Тип",
        db_column="Тип",
        null=True,
        blank=True
    )
    tip_organizacii = models.CharField(
        max_length=100,
        verbose_name="Тип организации",
        db_column="Тип_организации",
        null=True,
        blank=True
    )
    produkt = models.CharField(
        max_length=255,
        verbose_name="Продукт",
        db_column="Продукт",
        db_index=True,
        null=True,
        blank=True
    )
    gruppa_produktov = models.CharField(
        max_length=100,
        verbose_name="Группа продуктов",
        db_column="Группа_продуктов",
        db_index=True,
        null=True,
        blank=True
    )
    kolichestvo = models.FloatField(
        verbose_name="Количество",
        db_column="Количество",
        null=True,
        blank=True
    )
    ves_kg = models.FloatField(
        verbose_name="Вес(кг)",
        db_column="Вес_кг",
        null=True,
        blank=True
    )
    obshchaya_summa = models.FloatField(
        verbose_name="Общая сумма",
        db_column="Общая_сумма",
        null=True,
        blank=True
    )
    dokhod = models.FloatField(
        verbose_name="Доход",
        db_column="Доход",
        null=True,
        blank=True
    )
    valyuta = models.CharField(
        max_length=10,
        verbose_name="Валюта",
        db_column="Валюта",
        null=True,
        blank=True
    )
    tovary = models.CharField(
        max_length=255,
        verbose_name="Товары",
        db_column="ТОВАРЫ",
        db_index=True,
        null=True,
        blank=True
    )
    gruppa_tovara = models.CharField(
        max_length=100,
        verbose_name="Группа товара",
        db_column="Группа_товара",
        db_index=True,
        null=True,
        blank=True,
        help_text="Группа товара из таблицы sales (по коду товара)"
    )
    year = models.IntegerField(
        verbose_name="Год",
        db_column="Год",
        db_index=True,
        null=True,
        blank=True,
        help_text="Год из файла (2024 или 2025)"
    )
    sheet_name = models.CharField(
        max_length=50,
        verbose_name="Лист",
        db_column="Лист",
        db_index=True,
        null=True,
        blank=True,
        help_text="Название листа в Excel файле"
    )

    class Meta:
        db_table = 'ready_sales'
        verbose_name = 'Готовая продажа'
        verbose_name_plural = 'Готовые продажи'
        ordering = ['-data']
        indexes = [
            models.Index(fields=['data', 'diler']),
            models.Index(fields=['gruppa_produktov', 'data']),
            models.Index(fields=['tovary', 'year']),
            models.Index(fields=['klient', 'data']),
            models.Index(fields=['region', 'diler']),
        ]

    def __str__(self):
        return f"{self.diler} - {self.data} - {self.produkt}"


class SalesPlan(models.Model):
    """Плановые показатели продаж по продукту, году и месяцу"""

    kod_tovara = models.CharField(
        max_length=100,
        verbose_name="Код товара",
        db_column="КОД_ТОВАРА",
        db_index=True
    )
    year = models.IntegerField(
        verbose_name="Год",
        db_column="Год",
        db_index=True
    )
    month = models.IntegerField(
        verbose_name="Месяц (1-12)",
        db_column="Месяц",
        db_index=True
    )
    plan_kg = models.FloatField(
        verbose_name="План (кг)",
        db_column="План_кг",
        null=True,
        blank=True
    )
    region = models.CharField(
        max_length=100,
        verbose_name="Регион",
        db_column="Регион",
        db_index=True,
        blank=True,
        default=''
    )
    baza = models.CharField(
        max_length=100,
        verbose_name="База",
        db_column="База",
        db_index=True,
        blank=True,
        default=''
    )
    gruppa_tovara = models.CharField(
        max_length=100,
        verbose_name="Группа товара",
        db_column="Группа_товара",
        db_index=True,
        null=True,
        blank=True,
        help_text="Группа товара из таблицы sales (по коду товара)"
    )

    class Meta:
        db_table = 'sales_plan'
        verbose_name = 'План продаж'
        verbose_name_plural = 'Планы продаж'
        ordering = ['year', 'month', 'region', 'kod_tovara']
        unique_together = [('kod_tovara', 'year', 'month', 'region', 'baza')]
        indexes = [
            models.Index(fields=['year', 'month']),
            models.Index(fields=['kod_tovara', 'year']),
            models.Index(fields=['region', 'year', 'month']),
        ]

    def __str__(self):
        return f"{self.kod_tovara} — {self.year}/{self.month:02d} — {self.plan_kg} кг"


class TovaryMapping(models.Model):
    """Справочник: ТОВАРЫ → КОД_ТОВАРА, ГРУППА_ТОВАРА, ЦВЕТ, профиль_перечень"""

    tovary = models.CharField(
        max_length=255,
        verbose_name="Товары",
        unique=True,
        db_index=True,
    )
    kod_tovara = models.CharField(
        max_length=100,
        verbose_name="Код товара",
        null=True, blank=True,
    )
    gruppa_tovara = models.CharField(
        max_length=100,
        verbose_name="Группа товара",
        null=True, blank=True,
    )
    cvet = models.CharField(
        max_length=100,
        verbose_name="Цвет",
        null=True, blank=True,
    )
    profil_perechen = models.CharField(
        max_length=100,
        verbose_name="Профиль перечень",
        null=True, blank=True,
    )
    is_coded = models.BooleanField(
        default=False,
        verbose_name="Закодирован",
        help_text="True если все поля заполнены",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tovary_mapping'
        verbose_name = 'Справочник товаров'
        verbose_name_plural = 'Справочник товаров'
        ordering = ['tovary']

    def save(self, *args, **kwargs):
        self.is_coded = bool(
            self.kod_tovara and self.gruppa_tovara and
            self.cvet and self.profil_perechen
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tovary} → {self.kod_tovara or '?'}"


class ExpenseCategory(models.Model):
    """Категория расходов"""
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Название категории"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )

    class Meta:
        db_table = 'expense_categories'
        verbose_name = 'Категория расхода'
        verbose_name_plural = 'Категории расходов'
        ordering = ['name']

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Расходы отдела"""
    
    CURRENCY_CHOICES = [
        ('UZS', 'Сум'),
        ('USD', 'Доллар'),
    ]
    
    tema = models.CharField(
        max_length=255,
        verbose_name="Тема"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Категория"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Сумма"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='UZS',
        verbose_name="Валюта"
    )
    date = models.DateField(
        verbose_name="Дата расхода"
    )
    attachment = models.FileField(
        upload_to='expenses/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Прикреплённый файл"
    )
    comment = models.TextField(
        blank=True,
        verbose_name="Комментарий"
    )
    
    # Аудит
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_created',
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses_updated',
        verbose_name="Изменил"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата изменения"
    )

    class Meta:
        db_table = 'expenses'
        verbose_name = 'Расход'
        verbose_name_plural = 'Расходы'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'category']),
            models.Index(fields=['created_by']),
            models.Index(fields=['currency']),
        ]

    def __str__(self):
        return f"{self.tema} - {self.amount} {self.currency} ({self.date})"


class WorkReport(models.Model):
    """Отчёты по выполненным работам"""
    
    STATUS_CHOICES = [
        ('PLANNED', 'Запланировано'),
        ('IN_PROGRESS', 'В процессе'),
        ('ON_HOLD', 'На паузе'),
        ('COMPLETED', 'Завершено'),
        ('CANCELLED', 'Отменено'),
    ]
    
    date = models.DateField(
        verbose_name="Дата"
    )
    description = models.TextField(
        verbose_name="Описание работы"
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Бюджет"
    )
    assigned_employees = models.ManyToManyField(
        'auth.User',
        blank=True,
        related_name='assigned_work_reports',
        verbose_name="Прикреплённые сотрудники",
        limit_choices_to={'profile__role__in': ['ADMIN', 'MANAGER']}
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PLANNED',
        verbose_name="Процесс"
    )
    
    # Аудит
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='work_reports_created',
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_reports_updated',
        verbose_name="Изменил последний раз"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата изменения"
    )

    class Meta:
        db_table = 'work_reports'
        verbose_name = 'Отчёт по работе'
        verbose_name_plural = 'Отчёты по выполненным работам'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'status']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"{self.description[:50]} - {self.date} ({self.get_status_display()})"


class WorkReportPhoto(models.Model):
    """Фотоотчёты для выполненных работ"""
    
    work_report = models.ForeignKey(
        WorkReport,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name="Отчёт"
    )
    image = models.ImageField(
        upload_to='work_reports/%Y/%m/',
        verbose_name="Фотография"
    )
    caption = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Подпись"
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата загрузки"
    )

    class Meta:
        db_table = 'work_report_photos'
        verbose_name = 'Фотография отчёта'
        verbose_name_plural = 'Фотографии отчётов'
        ordering = ['uploaded_at']

    def __str__(self):
        return f"Фото для {self.work_report} - {self.uploaded_at}"


class ProductCatalog(models.Model):
    """Электронные каталоги продукции"""
    
    CATALOG_TYPE_CHOICES = [
        ('COLD', 'Холодная серия'),
        ('WARM', 'Теплая серия'),
    ]
    
    title = models.CharField(
        max_length=255,
        verbose_name="Название каталога"
    )
    catalog_type = models.CharField(
        max_length=10,
        choices=CATALOG_TYPE_CHOICES,
        verbose_name="Тип каталога"
    )
    pdf_file = models.FileField(
        upload_to='catalogs/pdf/%Y/%m/',
        verbose_name="PDF файл"
    )
    preview_image = models.ImageField(
        upload_to='catalogs/previews/%Y/%m/',
        verbose_name="Превью (первая страница)",
        blank=True,
        null=True
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_catalogs',
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_catalogs',
        verbose_name="Изменил"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата изменения"
    )

    class Meta:
        db_table = 'product_catalogs'
        verbose_name = 'Каталог продукции'
        verbose_name_plural = 'Каталоги продукции'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_catalog_type_display()})"


class ClientCard(models.Model):
    """
    Модель для хранения карточек клиентов.
    Содержит информацию о клиентах: ФИО, стаж, регион, партнёры и фото.
    """
    first_name = models.CharField(
        max_length=100,
        verbose_name="Имя"
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name="Фамилия"
    )
    experience_years = models.CharField(
        max_length=50,
        verbose_name="Стаж работы",
        help_text="Например: '5 лет' или '10 лет'"
    )
    client_name = models.CharField(
        max_length=255,
        verbose_name="Клиентское название",
        help_text="Название компании клиента из списка"
    )
    region = models.CharField(
        max_length=100,
        verbose_name="Регион"
    )
    partners = models.JSONField(
        default=list,
        verbose_name="Партнёры (дилеры)",
        help_text="Список партнёров/дилеров, с которыми работает клиент"
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Телефон",
        help_text="Контактный телефон клиента"
    )
    email = models.EmailField(
        max_length=255,
        blank=True,
        verbose_name="Email",
        help_text="Электронная почта клиента"
    )
    start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Дата начала сотрудничества",
        help_text="Дата начала работы с клиентом"
    )
    position = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Должность",
        help_text="Должность клиента в компании"
    )
    photo = models.ImageField(
        upload_to='client_cards/photos/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Фото клиента"
    )
    
    # Audit fields
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_client_cards',
        verbose_name="Создано пользователем"
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_client_cards',
        verbose_name="Изменено пользователем"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата изменения"
    )

    class Meta:
        db_table = 'client_cards'
        verbose_name = 'Карточка клиента'
        verbose_name_plural = 'Карточки клиентов'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.client_name})"
    
    @property
    def full_name(self):
        """Полное имя клиента"""
        return f"{self.first_name} {self.last_name}"


class ClientVisitReport(models.Model):
    """
    Модель для отчетов о посещении клиентов.
    Менеджеры заполняют информацию о проделанной работе, предложениях и жалобах.
    """
    client_card = models.ForeignKey(
        ClientCard,
        on_delete=models.CASCADE,
        related_name='visit_reports',
        verbose_name="Карточка клиента"
    )
    assigned_manager = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_visit_reports',
        verbose_name="Назначенный менеджер",
        help_text="Менеджер, которому назначено задание"
    )
    visit_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата обхода",
        help_text="Автоматически проставляется при создании"
    )
    work_description = models.TextField(
        verbose_name="Описание проделанной работы",
        help_text="Подробное описание работы выполненной во время визита"
    )
    suggestions = models.TextField(
        blank=True,
        verbose_name="Предложения",
        help_text="Предложения от клиента"
    )
    complaints = models.TextField(
        blank=True,
        verbose_name="Жалобы",
        help_text="Жалобы от клиента"
    )
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_visit_reports',
        verbose_name="Создано менеджером"
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_visit_reports',
        verbose_name="Изменено менеджером"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания записи"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата изменения записи"
    )

    class Meta:
        db_table = 'client_visit_reports'
        verbose_name = 'Отчет о посещении клиента'
        verbose_name_plural = 'Отчеты о посещениях клиентов'
        ordering = ['-visit_date']

    def __str__(self):
        return f"Визит к {self.client_card.full_name} - {self.visit_date.strftime('%d.%m.%Y %H:%M')}"


class VisitReportPhoto(models.Model):
    """
    Модель для хранения фотографий к отчетам о посещении.
    """
    visit_report = models.ForeignKey(
        ClientVisitReport,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name="Отчет о посещении"
    )
    photo = models.ImageField(
        upload_to='visit_reports/photos/%Y/%m/',
        verbose_name="Фотография"
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Описание фото"
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата загрузки"
    )

    class Meta:
        db_table = 'visit_report_photos'
        verbose_name = 'Фотография отчета'
        verbose_name_plural = 'Фотографии отчетов'
        ordering = ['uploaded_at']

    def __str__(self):
        return f"Фото к визиту {self.visit_report.id}"


# ──────────────────────────────────────────────────────────────────────────────
# Kanban Board (Доска задач для менеджеров)
# ──────────────────────────────────────────────────────────────────────────────

class KanbanColumn(models.Model):
    """Колонка доски задач (например: К выполнению, В процессе, Готово)"""

    COLOR_CHOICES = [
        ('gray',    'Серый'),
        ('blue',    'Синий'),
        ('yellow',  'Жёлтый'),
        ('green',   'Зелёный'),
        ('red',     'Красный'),
        ('purple',  'Фиолетовый'),
    ]

    title = models.CharField(max_length=100, verbose_name='Название')
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='gray', verbose_name='Цвет')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kanban_columns'
        verbose_name = 'Колонка доски'
        verbose_name_plural = 'Колонки доски'
        ordering = ['order']

    def __str__(self):
        return self.title


# ─── KPI System ──────────────────────────────────────────────────────────────

class KPITemplate(models.Model):
    """Шаблон KPI — набор пунктов для оценки менеджера"""

    name = models.CharField(max_length=200, verbose_name='Название шаблона')
    description = models.TextField(blank=True, default='', verbose_name='Описание')
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='kpi_templates_created',
        verbose_name='Создал',
    )
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kpi_templates'
        verbose_name = 'Шаблон KPI'
        verbose_name_plural = 'Шаблоны KPI'
        ordering = ['name']

    def __str__(self):
        return self.name


class KPITemplateItem(models.Model):
    """Пункт шаблона KPI"""

    UNIT_CHOICES = [
        ('kg',    'Кг'),
        ('pcs',   'Штук'),
        ('sum',   'Сум'),
        ('usd',   'USD'),
        ('pct',   '%'),
        ('other', 'Другое'),
    ]

    template = models.ForeignKey(
        KPITemplate,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Шаблон',
    )
    name = models.CharField(max_length=200, verbose_name='Название пункта')
    unit = models.CharField(
        max_length=20,
        choices=UNIT_CHOICES,
        default='kg',
        verbose_name='Единица измерения',
    )
    weight = models.DecimalField(
        max_digits=5, decimal_places=2,
        verbose_name='Доля бонуса',
        help_text='Например: 0.60 = 60% от фиксы идёт на этот пункт',
    )
    min_threshold = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=0.85,
        verbose_name='Мин. порог выполнения',
        help_text='Если выполнение ниже — пункт не засчитывается (например: 0.85 = 85%)',
    )
    max_threshold = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=1.20,
        verbose_name='Макс. порог (cap)',
        help_text='Выполнение выше этого значения обрезается (например: 1.20 = 120%)',
    )
    default_target = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True,
        verbose_name='План (по умолчанию)',
        help_text='Подставляется автоматически при создании записи KPI',
    )
    notes = models.TextField(blank=True, default='', verbose_name='Примечание')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        db_table = 'kpi_template_items'
        verbose_name = 'Пункт шаблона KPI'
        verbose_name_plural = 'Пункты шаблона KPI'
        ordering = ['order']

    def __str__(self):
        return f"{self.template.name} — {self.name}"


class KPIRecord(models.Model):
    """Запись KPI менеджера за конкретный период"""

    PERIOD_TYPE_CHOICES = [
        ('month',   'Месяц'),
        ('quarter', 'Квартал'),
        ('year',    'Год'),
    ]
    STATUS_CHOICES = [
        ('draft',  'Черновик'),
        ('active', 'Активный'),
        ('closed', 'Закрыт'),
    ]

    manager = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='kpi_records',
        verbose_name='Менеджер',
    )
    template = models.ForeignKey(
        KPITemplate,
        on_delete=models.PROTECT,
        related_name='records',
        verbose_name='Шаблон KPI',
    )
    period_type   = models.CharField(max_length=10, choices=PERIOD_TYPE_CHOICES, default='month', verbose_name='Тип периода')
    period_year   = models.PositiveIntegerField(verbose_name='Год')
    period_number = models.PositiveIntegerField(
        verbose_name='Номер периода',
        help_text='Месяц (1–12), квартал (1–4) или год (1)',
    )
    base_salary = models.DecimalField(
        max_digits=15, decimal_places=2,
        verbose_name='Базовая зарплата',
    )
    fix_ratio = models.DecimalField(
        max_digits=4, decimal_places=2,
        default=0.60,
        verbose_name='Фикса (доля)',
        help_text='Доля от базовой зарплаты, выплачиваемая всегда. Например: 0.60 = 60%',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', verbose_name='Статус')
    notes = models.TextField(blank=True, default='', verbose_name='Примечания')
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='kpi_records_created',
        verbose_name='Создал',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kpi_records'
        verbose_name = 'Запись KPI'
        verbose_name_plural = 'Записи KPI'
        ordering = ['-period_year', '-period_number']
        unique_together = [('manager', 'period_type', 'period_year', 'period_number')]

    def __str__(self):
        return (
            f"{self.manager.get_full_name() or self.manager.username} "
            f"— {self.get_period_type_display()} {self.period_number}/{self.period_year}"
        )

    @property
    def fix_payout(self):
        """Фиксированная часть — выплачивается всегда"""
        return round(float(self.base_salary) * float(self.fix_ratio), 2)

    @property
    def bonus_payout(self):
        """Бонусная часть = сумма бонусов по каждому пункту (выполнение × вес × фикса)"""
        return round(sum(item.payout_amount for item in self.record_items.all()), 2)

    @property
    def total_weighted(self):
        """Суммарный взвешенный % выполнения по бонусным пунктам (0.0 – max)"""
        return sum(item.weighted_contribution for item in self.record_items.all())

    @property
    def total_payout(self):
        """Итоговая выплата = фикса + бонус"""
        return self.fix_payout + self.bonus_payout


class KPIRecordItem(models.Model):
    """Факт/план по конкретному пункту KPI"""

    record = models.ForeignKey(
        KPIRecord,
        on_delete=models.CASCADE,
        related_name='record_items',
        verbose_name='Запись KPI',
    )
    template_item = models.ForeignKey(
        KPITemplateItem,
        on_delete=models.PROTECT,
        related_name='record_items',
        verbose_name='Пункт шаблона',
    )
    target      = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Таргет (план)')
    fact_auto   = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Факт (авто)')
    fact_manual = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Факт (ручной)')
    notes       = models.TextField(blank=True, default='', verbose_name='Примечание')

    class Meta:
        db_table = 'kpi_record_items'
        verbose_name = 'Пункт записи KPI'
        verbose_name_plural = 'Пункты записи KPI'
        ordering = ['template_item__order']

    def __str__(self):
        return f"{self.record} / {self.template_item.name}"

    @property
    def fact(self):
        """Итоговый факт: ручной перекрывает авто"""
        if self.fact_manual is not None:
            return float(self.fact_manual)
        if self.fact_auto is not None:
            return float(self.fact_auto)
        return 0.0

    @property
    def completion_pct(self):
        """Процент выполнения (0.0 – n)"""
        t = float(self.target)
        return (self.fact / t) if t > 0 else 0.0

    @property
    def is_valid(self):
        """Засчитывается ли пункт (>= min_threshold)"""
        return self.completion_pct >= float(self.template_item.min_threshold)

    @property
    def capped_completion(self):
        """Выполнение с учётом min/max cap"""
        pct = self.completion_pct
        if pct < float(self.template_item.min_threshold):
            return 0.0
        return min(pct, float(self.template_item.max_threshold))

    @property
    def weighted_contribution(self):
        """Взвешенный вклад (weight × capped_completion)"""
        return self.capped_completion * float(self.template_item.weight)

    @property
    def payout_amount(self):
        """Выплата по пункту = выполнение × вес × фикса
        Бонус начисляется поверх фиксы, сверх базы."""
        fix_payout = float(self.record.base_salary) * float(self.record.fix_ratio)
        return round(self.capped_completion * float(self.template_item.weight) * fix_payout, 2)

class KanbanTask(models.Model):
    """Задача на доске задач"""

    PRIORITY_CHOICES = [
        ('low',      'Низкий'),
        ('medium',   'Средний'),
        ('high',     'Высокий'),
        ('critical', 'Критический'),
    ]

    column = models.ForeignKey(
        KanbanColumn,
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='Колонка',
    )
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    description = models.TextField(blank=True, default='', verbose_name='Описание')
    assignee = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='kanban_tasks',
        verbose_name='Исполнитель',
    )
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='kanban_tasks_created',
        verbose_name='Создал',
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет',
    )
    progress = models.PositiveIntegerField(default=0, verbose_name='Прогресс (%)')
    due_date = models.DateField(null=True, blank=True, verbose_name='Срок выполнения')
    tags = models.CharField(max_length=255, blank=True, default='', verbose_name='Теги (через запятую)')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок в колонке')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kanban_tasks'
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'
        ordering = ['column__order', 'order']

    def __str__(self):
        return self.title

