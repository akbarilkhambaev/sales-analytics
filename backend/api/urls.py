from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesViewSet, ClientsViewSet
from .upload_views import ExcelUploadView, DataManagementView
from .tovary_mapping_views import TovaryMappingListView, TovaryMappingDetailView, TovaryMappingApplyView, TovaryMappingSuggestionsView
from .dashboard_views import DashboardMetricsView, SalesComparisonView
from .expense_views import ExpenseViewSet, ExpenseCategoryViewSet
from .work_report_views import WorkReportViewSet, WorkReportPhotoViewSet
from .catalog_views import ProductCatalogViewSet
from .clientcard_views import ClientCardViewSet
from .visitreport_views import ClientVisitReportViewSet
from .planfact_views import PlanFactViewSet
from .kanban_views import KanbanColumnViewSet, KanbanTaskViewSet, KanbanUsersView
from .kpi_views import (
    KPITemplateViewSet, KPITemplateItemViewSet,
    KPIRecordViewSet, KPISummaryView, KPIManagersView,
)
from .configurator_views import (
    SeriesViewSet, ProfileColorViewSet, GlassOptionViewSet, AccessoryViewSet,
)

router = DefaultRouter()
router.register(r'sales', SalesViewSet, basename='sales')
router.register(r'clients', ClientsViewSet, basename='clients')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expense-categories')
router.register(r'work-reports', WorkReportViewSet, basename='work-reports')
router.register(r'work-report-photos', WorkReportPhotoViewSet, basename='work-report-photos')
router.register(r'catalogs', ProductCatalogViewSet, basename='catalogs')
router.register(r'client-cards', ClientCardViewSet, basename='client-cards')
router.register(r'visit-reports', ClientVisitReportViewSet, basename='visit-reports')
router.register(r'plan-fact', PlanFactViewSet, basename='plan-fact')
router.register(r'kanban/columns', KanbanColumnViewSet, basename='kanban-columns')
router.register(r'kanban/tasks', KanbanTaskViewSet, basename='kanban-tasks')
router.register(r'kanban/users', KanbanUsersView, basename='kanban-users')
router.register(r'kpi/templates', KPITemplateViewSet, basename='kpi-templates')
router.register(r'kpi/template-items', KPITemplateItemViewSet, basename='kpi-template-items')
router.register(r'kpi/records', KPIRecordViewSet, basename='kpi-records')
router.register(r'configurator/series',      SeriesViewSet,       basename='cfg-series')
router.register(r'configurator/colors',      ProfileColorViewSet, basename='cfg-colors')
router.register(r'configurator/glass',       GlassOptionViewSet,  basename='cfg-glass')
router.register(r'configurator/accessories', AccessoryViewSet,    basename='cfg-accessories')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/excel/', ExcelUploadView.as_view(), name='upload-excel'),
    path('data/manage/', DataManagementView.as_view(), name='data-manage'),
    path('tovary-mapping/', TovaryMappingListView.as_view(), name='tovary-mapping-list'),
    path('tovary-mapping/suggestions/', TovaryMappingSuggestionsView.as_view(), name='tovary-mapping-suggestions'),
    path('tovary-mapping/<int:pk>/', TovaryMappingDetailView.as_view(), name='tovary-mapping-detail'),
    path('tovary-mapping/apply/', TovaryMappingApplyView.as_view(), name='tovary-mapping-apply'),
    path('dashboard/metrics/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
    path('dashboard/comparison/', SalesComparisonView.as_view(), name='sales-comparison'),
    path('kpi/summary/', KPISummaryView.as_view(), name='kpi-summary'),
    path('kpi/managers/', KPIManagersView.as_view(), name='kpi-managers'),
]
