// API Client для взаимодействия с Django Backend

import type { 
  ProductData, 
  GroupData, 
  FilterParams, 
  ProductHierarchy, 
  ColorHierarchy, 
  ProductColorsHierarchy,
  ClientPurchaseHistory,
  TopClient,
  TopProduct,
  ClientsFilterParams,
  DashboardMetrics,
  SalesComparison,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseStatistics,
  UserData,
  CreateUserData,
  ChangePasswordData,
  UserRole,
  WorkReport,
  WorkReportFormData,
  WorkReportFilters,
  WorkReportPhoto,
  AvailableEmployee,
  ProductCatalog,
  ProductCatalogFormData,
  ClientCard,
  ClientCardFormData,
  ClientCardPurchases,
  ClientVisitReport,
  VisitReportFormData,
  VisitReportPhoto,
  PlanFactResponse,
  PlanFactFilters,
  TovaryMappingItem,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store', // Всегда получать свежие данные
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - перенаправляем на login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getWarehouses(): Promise<string[]> {
    return this.fetch<string[]>('/sales/warehouses/');
  }

  async getRegions(): Promise<string[]> {
    return this.fetch<string[]>('/sales/regions/');
  }

  async getProductsByYears(filters?: FilterParams): Promise<ProductData[]> {
    return this.fetch<ProductData[]>('/sales/products-by-years/', {
      month: filters?.month || '',
      warehouse: filters?.warehouse || '',
      region: filters?.region || '',
    });
  }

  async getGroupsByYears(filters?: FilterParams): Promise<GroupData[]> {
    return this.fetch<GroupData[]>('/sales/groups-by-years/', {
      month: filters?.month || '',
      warehouse: filters?.warehouse || '',
      region: filters?.region || '',
    });
  }

  async getProductsHierarchy(filters?: FilterParams): Promise<ProductHierarchy[]> {
    return this.fetch<ProductHierarchy[]>('/sales/products-hierarchy/', {
      month: filters?.month || '',
      warehouse: filters?.warehouse || '',
      region: filters?.region || '',
    });
  }

  async getColorsHierarchy(): Promise<ColorHierarchy[]> {
    return this.fetch<ColorHierarchy[]>('/sales/colors-hierarchy/');
  }

  async getProductsColorsHierarchy(filters?: FilterParams): Promise<ProductColorsHierarchy[]> {
    return this.fetch<ProductColorsHierarchy[]>('/sales/products-colors-hierarchy/', {
      month: filters?.month || '',
      warehouse: filters?.warehouse || '',
      region: filters?.region || '',
    });
  }

  // Clients API
  async getClientsList(): Promise<{ clients: string[] }> {
    return this.fetch<{ clients: string[] }>('/clients/clients_list/');
  }

  async getProductsList(): Promise<{ products: string[] }> {
    return this.fetch<{ products: string[] }>('/clients/products_list/');
  }

  async getClientsRegionsList(): Promise<{ regions: string[] }> {
    return this.fetch<{ regions: string[] }>('/clients/regions_list/');
  }

  async getClientPurchaseHistory(params: ClientsFilterParams): Promise<ClientPurchaseHistory[]> {
    return this.fetch<ClientPurchaseHistory[]>('/clients/purchase_history/', {
      client: params.client || '',
      start_date: params.start_date || '',
      end_date: params.end_date || '',
      product: params.product || '',
      region: params.region || '',
    });
  }

  async getTopClients(params?: ClientsFilterParams): Promise<TopClient[]> {
    return this.fetch<TopClient[]>('/clients/top_clients/', {
      limit: params?.limit?.toString() || '10',
      start_date: params?.start_date || '',
      end_date: params?.end_date || '',
      products: params?.products?.join(',') || '',
      region: params?.region || '',
    });
  }

  async getTopProducts(params?: ClientsFilterParams): Promise<TopProduct[]> {
    return this.fetch<TopProduct[]>('/clients/top_products/', {
      limit: params?.limit?.toString() || '10',
      start_date: params?.start_date || '',
      end_date: params?.end_date || '',
      clients: params?.clients?.join(',') || '',
      region: params?.region || '',
    });
  }

  // Dashboard metrics
  async getDashboardMetrics(params?: { start_date?: string; end_date?: string }): Promise<DashboardMetrics> {
    return this.fetch<DashboardMetrics>('/dashboard/metrics/', {
      start_date: params?.start_date || '',
      end_date: params?.end_date || '',
    });
  }

  async getSalesComparison(params: {
    period1_start: string;
    period1_end: string;
    period2_start: string;
    period2_end: string;
  }): Promise<SalesComparison> {
    return this.fetch<SalesComparison>('/dashboard/comparison/', params);
  }

  // Expense Management
  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const params: Record<string, string> = {};
    
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.currency) params.currency = filters.currency;
    if (filters?.search) params.search = filters.search;
    
    const url = new URL(`${this.baseUrl}/expenses/`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    
    // Добавляем categories[] как массив
    if (filters?.categories && filters.categories.length > 0) {
      filters.categories.forEach(cat => {
        url.searchParams.append('categories[]', cat.toString());
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getExpense(id: number): Promise<Expense> {
    const response = await fetch(`${this.baseUrl}/expenses/${id}/`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createExpense(formData: FormData): Promise<Expense> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/expenses/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create expense');
    }

    return response.json();
  }

  async updateExpense(id: number, formData: FormData): Promise<Expense> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/expenses/${id}/`, {
      method: 'PATCH',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update expense');
    }

    return response.json();
  }

  async deleteExpense(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/expenses/${id}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return this.fetch<ExpenseCategory[]>('/expense-categories/');
  }

  async createExpenseCategory(name: string, description: string = ''): Promise<ExpenseCategory> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    console.log('Creating expense category with token:', token ? 'present' : 'missing');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/expense-categories/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    });

    if (response.status === 401) {
      console.error('Unauthorized - token may be invalid or expired');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Необходима авторизация. Войдите как администратор.');
    }

    if (response.status === 403) {
      throw new Error('Недостаточно прав. Только администраторы могут создавать категории.');
    }

    if (!response.ok) {
      let errorMessage = 'Failed to create category';
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || JSON.stringify(error);
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getExpenseStatistics(filters?: ExpenseFilters): Promise<ExpenseStatistics> {
    const params: Record<string, string> = {};
    
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;

    return this.fetch<ExpenseStatistics>('/expenses/statistics/', params);
  }

  // User Management
  async getAllUsers(role?: UserRole): Promise<UserData[]> {
    const params: Record<string, string> = {};
    if (role) params.role = role;
    
    const response = await fetch(`${this.baseUrl}/auth/users/?${new URLSearchParams(params)}`, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Alias for getAllUsers
  async getUsers(role?: UserRole): Promise<UserData[]> {
    return this.getAllUsers(role);
  }

  async createUser(userData: CreateUserData): Promise<UserData> {
    const response = await fetch(`${this.baseUrl}/auth/users/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create user');
    }

    return response.json();
  }

  async updateUser(userId: number, userData: Partial<UserData>): Promise<UserData> {
    const response = await fetch(`${this.baseUrl}/auth/users/${userId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update user');
    }

    return response.json();
  }

  async updateUserRole(userId: number, role: UserRole): Promise<UserData> {
    const response = await fetch(`${this.baseUrl}/auth/users/${userId}/update_role/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update role');
    }

    return response.json();
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/users/${userId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async changePassword(passwordData: ChangePasswordData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/users/change_password/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.old_password || 'Failed to change password');
    }
  }

  // Work Reports

  async getWorkReports(filters?: WorkReportFilters): Promise<WorkReport[]> {
    const params = new URLSearchParams();
    
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (filters?.only_mine) params.append('only_mine', 'true');
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/work-reports/${queryString ? `?${queryString}` : ''}`;
    
    return this.fetch<WorkReport[]>(url);
  }

  async getWorkReport(id: number): Promise<WorkReport> {
    return this.fetch<WorkReport>(`/work-reports/${id}/`);
  }

  async createWorkReport(data: WorkReportFormData): Promise<WorkReport> {
    const response = await fetch(`${this.baseUrl}/work-reports/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create work report');
    }

    return response.json();
  }

  async updateWorkReport(id: number, data: WorkReportFormData): Promise<WorkReport> {
    const response = await fetch(`${this.baseUrl}/work-reports/${id}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update work report');
    }

    return response.json();
  }

  async deleteWorkReport(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/work-reports/${id}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async uploadWorkReportPhoto(reportId: number, image: File, caption: string = ''): Promise<WorkReportPhoto> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append('image', image);
    formData.append('caption', caption);

    const response = await fetch(`${this.baseUrl}/work-reports/${reportId}/upload_photo/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to upload photo');
    }

    return response.json();
  }

  async deleteWorkReportPhoto(reportId: number, photoId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/work-reports/${reportId}/delete_photo/?photo_id=${photoId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to delete photo');
    }
  }

  async getMyWorkReports(): Promise<WorkReport[]> {
    return this.fetch<WorkReport[]>('/work-reports/my_reports/');
  }

  async getAvailableEmployees(): Promise<AvailableEmployee[]> {
    return this.fetch<AvailableEmployee[]>('/work-reports/available_employees/');
  }

  // Product Catalogs
  async getCatalogs(): Promise<ProductCatalog[]> {
    return this.fetch<ProductCatalog[]>('/catalogs/');
  }

  async getCatalog(id: number): Promise<ProductCatalog> {
    return this.fetch<ProductCatalog>(`/catalogs/${id}/`);
  }

  async createCatalog(data: ProductCatalogFormData): Promise<ProductCatalog> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('catalog_type', data.catalog_type);
    formData.append('description', data.description);
    
    if (data.pdf_file) {
      formData.append('pdf_file', data.pdf_file);
    }
    
    if (data.preview_image) {
      formData.append('preview_image', data.preview_image);
    }

    const response = await fetch(`${this.baseUrl}/catalogs/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to create catalog');
    }

    return response.json();
  }

  async updateCatalog(id: number, data: Partial<ProductCatalogFormData>): Promise<ProductCatalog> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    
    if (data.title) formData.append('title', data.title);
    if (data.catalog_type) formData.append('catalog_type', data.catalog_type);
    if (data.description !== undefined) formData.append('description', data.description);
    
    if (data.pdf_file) {
      formData.append('pdf_file', data.pdf_file);
    }
    
    if (data.preview_image) {
      formData.append('preview_image', data.preview_image);
    }

    const response = await fetch(`${this.baseUrl}/catalogs/${id}/`, {
      method: 'PATCH',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to update catalog');
    }

    return response.json();
  }

  async deleteCatalog(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/catalogs/${id}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to delete catalog');
    }
  }

  // Client Cards API

  async getClientCards(): Promise<ClientCard[]> {
    return this.fetch<ClientCard[]>('/client-cards/');
  }

  async getClientCard(id: number): Promise<ClientCard> {
    return this.fetch<ClientCard>(`/client-cards/${id}/`);
  }

  async createClientCard(data: ClientCardFormData): Promise<ClientCard> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append('first_name', data.first_name);
    formData.append('last_name', data.last_name);
    formData.append('experience_years', data.experience_years);
    formData.append('client_name', data.client_name);
    formData.append('region', data.region);
    formData.append('partners', JSON.stringify(data.partners));
    
    if (data.photo) {
      formData.append('photo', data.photo);
    }

    const response = await fetch(`${this.baseUrl}/client-cards/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to create client card');
    }

    return response.json();
  }

  async updateClientCard(id: number, data: Partial<ClientCardFormData>): Promise<ClientCard> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    
    if (data.first_name) formData.append('first_name', data.first_name);
    if (data.last_name) formData.append('last_name', data.last_name);
    if (data.experience_years) formData.append('experience_years', data.experience_years);
    if (data.client_name) formData.append('client_name', data.client_name);
    if (data.region) formData.append('region', data.region);
    if (data.partners) formData.append('partners', JSON.stringify(data.partners));
    
    if (data.photo) {
      formData.append('photo', data.photo);
    }

    const response = await fetch(`${this.baseUrl}/client-cards/${id}/`, {
      method: 'PATCH',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to update client card');
    }

    return response.json();
  }

  async deleteClientCard(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/client-cards/${id}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to delete client card');
    }
  }

  async getClientCardPurchases(id: number): Promise<ClientCardPurchases> {
    return this.fetch<ClientCardPurchases>(`/client-cards/${id}/purchases/`);
  }

  // ========== Visit Reports ==========
  async getVisitReports(clientCardId?: number): Promise<ClientVisitReport[]> {
    const params = clientCardId ? `?client_card=${clientCardId}` : '';
    return this.fetch<ClientVisitReport[]>(`/visit-reports/${params}`);
  }

  async getVisitReport(id: number): Promise<ClientVisitReport> {
    return this.fetch<ClientVisitReport>(`/visit-reports/${id}/`);
  }

  async createVisitReport(data: VisitReportFormData): Promise<ClientVisitReport> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('createVisitReport - POST to:', `${this.baseUrl}/visit-reports/`);
    console.log('createVisitReport - data:', data);

    const response = await fetch(`${this.baseUrl}/visit-reports/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    console.log('createVisitReport - response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('createVisitReport - error:', error);
      throw new Error(error.detail || 'Failed to create visit report');
    }

    const result = await response.json();
    console.log('createVisitReport - result:', result);
    return result;
  }

  async updateVisitReport(id: number, data: VisitReportFormData): Promise<ClientVisitReport> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/visit-reports/${id}/`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update visit report');
    }

    return response.json();
  }

  async deleteVisitReport(id: number): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('deleteVisitReport - DELETE to:', `${this.baseUrl}/visit-reports/${id}/`);

    const response = await fetch(`${this.baseUrl}/visit-reports/${id}/`, {
      method: 'DELETE',
      headers,
    });

    console.log('deleteVisitReport - response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to delete' }));
      console.error('deleteVisitReport - error:', error);
      throw new Error(error.detail || 'Failed to delete visit report');
    }
  }

  async uploadVisitReportPhotos(reportId: number, files: File[], descriptions: string[] = []): Promise<VisitReportPhoto[]> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append('photos', file);
      if (descriptions[index]) {
        formData.append(`description_${index}`, descriptions[index]);
      }
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadUrl = `${this.baseUrl}/visit-reports/${reportId}/upload-photos/`;
    console.log('Uploading photos to URL:', uploadUrl);
    console.log('Files count:', files.length);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      console.error('Upload error:', error);
      throw new Error(error.detail || error.error || 'Failed to upload photos');
    }

    return response.json();
  }

  async deleteVisitReportPhoto(reportId: number, photoId: number): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/visit-reports/${reportId}/delete-photo/${photoId}/`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Failed to delete photo');
    }
  }

  // ─── ПЛАН-ФАКТ ──────────────────────────────────────────────────────────────

  getPlanFactTable(filters: PlanFactFilters): Promise<PlanFactResponse> {
    return this.fetch<PlanFactResponse>('/plan-fact/table/', {
      sales_prev_from:   filters.sales_prev_from,
      sales_prev_to:     filters.sales_prev_to,
      sales_curr_from:   filters.sales_curr_from,
      sales_curr_to:     filters.sales_curr_to,
      plan_from:         filters.plan_from,
      plan_to:           filters.plan_to,
      sellout_prev_from: filters.sellout_prev_from,
      sellout_prev_to:   filters.sellout_prev_to,
      sellout_curr_from: filters.sellout_curr_from,
      sellout_curr_to:   filters.sellout_curr_to,
    });
  }

  getPlanFactProductsList(): Promise<{ products: string[] }> {
    return this.fetch<{ products: string[] }>('/plan-fact/products-list/');
  }

  // ─── СПРАВОЧНИК ТОВАРОВ ──────────────────────────────────────────────────────

  getTovaryMapping(params?: { search?: string; coded?: 'true' | 'false' }): Promise<{
    results: TovaryMappingItem[];
    total: number;
    uncoded: number;
  }> {
    return this.fetch('/tovary-mapping/', params as Record<string, string>);
  }

  async updateTovaryMapping(id: number, data: Partial<TovaryMappingItem>): Promise<TovaryMappingItem> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${this.baseUrl}/tovary-mapping/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Ошибка обновления');
    return json;
  }

  getTovaryMappingSuggestions(field: string, q?: string): Promise<{ values: string[] }> {
    const params: Record<string, string> = { field };
    if (q) params.q = q;
    return this.fetch('/tovary-mapping/suggestions/', params);
  }

  async applyTovaryMapping(): Promise<{ total: number; fixed: number; skipped: number; message: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${this.baseUrl}/tovary-mapping/apply/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Ошибка применения');
    return json;
  }

  // ─── УПРАВЛЕНИЕ ДАННЫМИ ──────────────────────────────────────────────────────

  async dataManage(payload: {
    action: 'preview' | 'delete';
    model: 'sale' | 'ready_sale' | 'both';
    date_from: string;
    date_to: string;
  }): Promise<{ counts?: Record<string, number>; deleted?: Record<string, number>; total: number; message?: string }> {
    const response = await fetch(`${this.baseUrl}/data/manage/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка запроса');
    }
    return data;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Утилиты для форматирования
export const formatNumber = (num: number | undefined): string => {
  if (!num || num === 0) return '-';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const getGrowthColor = (growth: number | null): string => {
  if (growth === null) return 'text-gray-400';
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-600';
};
