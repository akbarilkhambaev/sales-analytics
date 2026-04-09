// API Types для Sales Analytics

export interface TovaryMappingItem {
  id: number;
  tovary: string;
  kod_tovara: string | null;
  gruppa_tovara: string | null;
  cvet: string | null;
  profil_perechen: string | null;
  is_coded: boolean;
  updated_at: string | null;
}

export interface SchetaMappingItem {
  id: number;
  scheta: string;
  region: string | null;
  is_mapped: boolean;
  updated_at: string | null;
}

export interface YearValue {
  value: number;
  pieces?: number;
}

export interface ProductData {
  code: string;
  years: {
    [year: string]: YearValue;
  };
  growth: {
    [year: string]: number | null;
  };
}

export interface GroupData {
  group: string;
  years: {
    [year: string]: YearValue;
  };
  growth: {
    [year: string]: number | null;
  };
}

export interface FilterParams {
  month?: string;
  warehouse?: string;
  region?: string;
}

export const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'] as const;

export const MONTHS = [
  { value: '', label: 'Все месяцы' },
  { value: '01', label: 'Январь' },
  { value: '02', label: 'Февраль' },
  { value: '03', label: 'Март' },
  { value: '04', label: 'Апрель' },
  { value: '05', label: 'Май' },
  { value: '06', label: 'Июнь' },
  { value: '07', label: 'Июль' },
  { value: '08', label: 'Август' },
  { value: '09', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
] as const;

// Hierarchical data types
export interface ProfileData {
  name: string;
  total: number;
  years: {
    [year: string]: YearValue;
  };
  growth: {
    [year: string]: number | null;
  };
}

export interface ProductHierarchy {
  kod_tovara: string;
  total_sales: number;
  profiles: ProfileData[];
}

export interface ProductData {
  name: string;
  total: number;
  years: Record<string, YearValue>;
  growth: Record<string, number | null>;
}

export interface ColorHierarchy {
  color: string;
  total_sales: number;
  products: ProductData[];
}

export interface ColorData {
  name: string;
  total: number;
  years: Record<string, YearValue>;
}

export interface ProductColorsHierarchy {
  product: string;
  total_sales: number;
  colors: ColorData[];
}

// Client database types
export interface ClientPurchaseHistory {
  date: string;
  product: string;
  weight: number;
  quantity: number;
  revenue: number;
  dealer: string;
}

export interface TopClient {
  client: string;
  dealer: string;
  total_weight: number;
  products: Record<string, number>;  // {товар: вес}
}

export interface TopProduct {
  product: string;
  total_weight: number;
  clients: Record<string, number>;  // {клиент: вес}
}

export interface ClientsFilterParams {
  client?: string;
  start_date?: string;
  end_date?: string;
  product?: string;
  region?: string;      // Фильтр по региону
  limit?: number;
  products?: string[];  // Выбранные товары для колонок
  clients?: string[];   // Выбранные клиенты для колонок
}

// Dashboard types
export interface DashboardSummary {
  total_sales_volume: number;
  unique_products: number;
}

export interface SalesTrendItem {
  month: string;
  volume: number;
}

export interface TopProductItem {
  code: string;
  name: string;
  volume: number;
}

export interface TopRegionItem {
  region: string;
  volume: number;
}

export interface SalesByGroupItem {
  group: string;
  volume: number;
}

export interface DashboardMetrics {
  summary: DashboardSummary;
  sales_trend: SalesTrendItem[];
  top_products: TopProductItem[];
  top_regions: TopRegionItem[];
  sales_by_group: SalesByGroupItem[];
}

export interface PeriodComparisonData {
  sales_volume: number;
}

export interface ComparisonChange {
  absolute: number;
  percentage: number;
}

export interface SalesComparison {
  period1: {
    start: string;
    end: string;
    data: PeriodComparisonData;
  };
  period2: {
    start: string;
    end: string;
    data: PeriodComparisonData;
  };
  changes: {
    sales_volume: ComparisonChange;
  };
}

// Expense Types

export type CurrencyType = 'UZS' | 'USD';

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Expense {
  id: number;
  tema: string;
  description: string;
  category: number;
  category_name: string;
  amount: string;
  currency: CurrencyType;
  date: string;
  attachment: string | null;
  attachment_url: string | null;
  comment: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_by: number | null;
  updated_by_username: string;
  updated_at: string;
}

export interface ExpenseFormData {
  tema: string;
  description: string;
  category: number | null;
  amount: string;
  currency: CurrencyType;
  date: string;
  attachment: File | null;
  comment: string;
}

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  categories?: number[];
  currency?: CurrencyType;
  search?: string;
}

export interface ExpenseStatistics {
  total_uzs: string;
  total_usd: string;
  count: number;
  by_category: {
    category__name: string;
    currency: CurrencyType;
    total: string;
    count: number;
  }[];
  by_month: {
    month: string;
    currency: CurrencyType;
    total: string;
    count: number;
  }[];
}

// User Management Types

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
  phone: string;
  department: string;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
  permissions: {
    can_upload: boolean;
    can_export: boolean;
    can_use_filters: boolean;
  };
}

export interface CreateUserData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  phone?: string;
  department?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

// Work Report Types

export type WorkReportStatus = 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface WorkReportPhoto {
  id: number;
  image: string;
  image_url: string;
  caption: string;
  uploaded_at: string;
}

export interface AssignedEmployee {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  role_display: string;
}

export interface AvailableEmployee {
  id: number;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
}

export interface WorkReport {
  id: number;
  date: string;
  description: string;
  budget: string;
  assigned_employees: number[];
  assigned_employees_details: AssignedEmployee[];
  status: WorkReportStatus;
  status_display: string;
  photos: WorkReportPhoto[];
  created_by: number | null;
  created_by_username: string;
  created_by_full_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_username: string;
  updated_by_full_name: string | null;
  updated_at: string;
}

export interface WorkReportFormData {
  date: string;
  description: string;
  budget: string;
  assigned_employees: number[];
  status: WorkReportStatus;
}

export interface WorkReportFilters {
  start_date?: string;
  end_date?: string;
  statuses?: WorkReportStatus[];
  only_mine?: boolean;
  search?: string;
}

// Product Catalog Types

export type CatalogType = 'COLD' | 'WARM';

export interface ProductCatalog {
  id: number;
  title: string;
  catalog_type: CatalogType;
  catalog_type_display: string;
  pdf_file: string;
  pdf_file_url: string;
  preview_image: string | null;
  preview_image_url: string | null;
  description: string;
  created_by: number | null;
  created_by_username: string;
  created_by_full_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_username: string;
  updated_by_full_name: string | null;
  updated_at: string;
}

export interface ProductCatalogFormData {
  title: string;
  catalog_type: CatalogType;
  description: string;
  pdf_file: File | null;
  preview_image: File | null;
}

// Client Card Types

export interface ClientCard {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  experience_years: string;
  client_name: string;
  region: string;
  partners: string[];
  phone: string;
  email: string;
  start_date: string | null;
  position: string;
  photo: string | null;
  photo_url: string | null;
  created_by: number | null;
  created_by_username: string;
  created_by_full_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_username: string;
  updated_by_full_name: string | null;
  updated_at: string;
}

export interface ClientCardFormData {
  first_name: string;
  last_name: string;
  experience_years: string;
  client_name: string;
  region: string;
  partners: string[];
  phone: string;
  email: string;
  start_date: string;
  position: string;
  photo: File | null;
}

export interface VisitReportPhoto {
  id: number;
  photo: string;
  photo_url: string;
  description: string;
  uploaded_at: string;
}

export interface ClientVisitReport {
  id: number;
  client_card: number;
  client_name: string;
  assigned_manager: number | null;
  assigned_manager_username: string;
  assigned_manager_full_name: string | null;
  visit_date: string;
  work_description: string;
  suggestions: string;
  complaints: string;
  photos: VisitReportPhoto[];
  created_by: number | null;
  created_by_username: string;
  created_by_full_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_username: string;
  updated_by_full_name: string | null;
  updated_at: string;
}

export interface VisitReportFormData {
  client_card: number;
  assigned_manager: number | null;
  work_description: string;
  suggestions: string;
  complaints: string;
}

export interface ClientCardPurchaseItem {
  tovar_name: string;
  [year: string]: number | string; // динамические поля для каждого года (значения - числа)
}

export interface ClientCardPurchases {
  years: number[];
  tovary: ClientCardPurchaseItem[];
}

// ─── ПЛАН-ФАКТ ────────────────────────────────────────────────────────────────

export interface PlanFactRow {
  product: string;
  gruppa_tovara: string;
  sales_prev: number;
  sales_curr: number;
  diff_pct_sales: number | null;
  diff_pct_plan: number | null;
  plan_period: number;
  plan_monthly: number;
  sellout_prev: number;
  sellout_curr: number;
}

export interface PlanFactLabels {
  sales_prev: string;
  sales_curr: string;
  plan: string;
  plan_monthly: string;
  sellout_prev: string;
  sellout_curr: string;
}

export interface PlanFactResponse {
  labels: PlanFactLabels;
  rows: PlanFactRow[];
  groups_order: string[];
  group_totals: Record<string, PlanFactRow>;
  totals: PlanFactRow;
}

export interface PlanFactFilters {
  sales_prev_from: string;
  sales_prev_to: string;
  sales_curr_from: string;
  sales_curr_to: string;
  plan_from: string;
  plan_to: string;
  sellout_prev_from: string;
  sellout_prev_to: string;
  sellout_curr_from: string;
  sellout_curr_to: string;
}
