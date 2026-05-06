'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Users as UsersIcon,
  Upload,
  Eye,
  Home,
  Filter,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { WorkReport, WorkReportFormData, WorkReportFilters, WorkReportStatus, AvailableEmployee, WorkReportPhoto } from '@/lib/types';

const STATUS_OPTIONS: { value: WorkReportStatus; label: string; color: string }[] = [
  { value: 'PLANNED', label: 'Запланировано', color: 'bg-gray-100 text-gray-800' },
  { value: 'IN_PROGRESS', label: 'В процессе', color: 'bg-blue-100 text-blue-800' },
  { value: 'ON_HOLD', label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'COMPLETED', label: 'Завершено', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Отменено', color: 'bg-red-100 text-red-800' },
];

export default function WorkReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkReport | null>(null);
  const [viewingReport, setViewingReport] = useState<WorkReport | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | WorkReportStatus>('ALL');
  const [lightboxPhoto, setLightboxPhoto] = useState<WorkReportPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Filters
  const [filters, setFilters] = useState<WorkReportFilters>({
    start_date: '',
    end_date: '',
    statuses: [],
    only_mine: false,
    search: '',
  });

  // Form data
  const [formData, setFormData] = useState<WorkReportFormData>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    budget: '',
    assigned_employees: [],
    status: 'PLANNED',
  });

  // Photos for upload
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photosCaptions, setPhotosCaptions] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadReports();
    loadAvailableEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, router]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWorkReports(filters);
      setReports(data);
    } catch (error) {
      console.error('Error loading work reports:', error);
      alert('Ошибка при загрузке отчётов');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEmployees = async () => {
    try {
      const data = await apiClient.getAvailableEmployees();
      setAvailableEmployees(data);
    } catch (error) {
      console.error('Error loading available employees:', error);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      statuses: [],
      only_mine: false,
      search: '',
    });
    setActiveTab('ALL');
  };

  const handleTabChange = (tab: 'ALL' | WorkReportStatus) => {
    setActiveTab(tab);
    if (tab === 'ALL') {
      setFilters({ ...filters, statuses: [] });
    } else {
      setFilters({ ...filters, statuses: [tab] });
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Close employee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
    };

    if (employeeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [employeeDropdownOpen]);

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxPhoto) {
        handleCloseLightbox();
      }
    };

    if (lightboxPhoto) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [lightboxPhoto]);

  // Handle arrow keys for navigation
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!lightboxPhoto || !viewingReport) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      }
    };

    if (lightboxPhoto) {
      document.addEventListener('keydown', handleArrowKeys);
      return () => {
        document.removeEventListener('keydown', handleArrowKeys);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxPhoto, lightboxIndex, viewingReport]);

  const handleOpenModal = (report?: WorkReport) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        date: report.date,
        description: report.description,
        budget: report.budget,
        assigned_employees: report.assigned_employees,
        status: report.status,
      });
    } else {
      setEditingReport(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        budget: '',
        assigned_employees: [],
        status: 'PLANNED',
      });
      setSelectedPhotos([]);
      setPhotosCaptions(new Map());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReport(null);
    setSelectedPhotos([]);
    setEmployeeDropdownOpen(false);
    setEmployeeSearchQuery('');
    setPhotosCaptions(new Map());
  };

  const handleOpenLightbox = (photo: WorkReportPhoto, index: number) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  };

  const handleCloseLightbox = () => {
    setLightboxPhoto(null);
  };

  const handlePrevPhoto = () => {
    if (!viewingReport) return;
    const newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : viewingReport.photos.length - 1;
    setLightboxIndex(newIndex);
    setLightboxPhoto(viewingReport.photos[newIndex]);
  };

  const handleNextPhoto = () => {
    if (!viewingReport) return;
    const newIndex = lightboxIndex < viewingReport.photos.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIndex);
    setLightboxPhoto(viewingReport.photos[newIndex]);
  };

  const handleViewReport = (report: WorkReport) => {
    setViewingReport(report);
    setShowViewModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReport) {
        await apiClient.updateWorkReport(editingReport.id, formData);
        alert('Отчёт успешно обновлён!');
      } else {
        const newReport = await apiClient.createWorkReport(formData);
        
        // Upload photos if any
        if (selectedPhotos.length > 0) {
          setUploadingPhotos(true);
          for (const photo of selectedPhotos) {
            const caption = photosCaptions.get(photo.name) || '';
            await apiClient.uploadWorkReportPhoto(newReport.id, photo, caption);
          }
          setUploadingPhotos(false);
        }
        
        alert('Отчёт успешно создан!');
      }
      
      handleCloseModal();
      loadReports();
    } catch (error) {
      console.error('Error saving work report:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при сохранении отчёта');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отчёт?')) {
      return;
    }

    try {
      await apiClient.deleteWorkReport(id);
      alert('Отчёт успешно удалён!');
      loadReports();
    } catch (error) {
      console.error('Error deleting work report:', error);
      alert('Ошибка при удалении отчёта');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedPhotos(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveSelectedPhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoUploadToExisting = async (reportId: number, files: FileList) => {
    try {
      setUploadingPhotos(true);
      const filesArray = Array.from(files);
      
      for (const file of filesArray) {
        await apiClient.uploadWorkReportPhoto(reportId, file, '');
      }
      
      alert('Фотографии успешно загружены!');
      loadReports();
      
      // Refresh viewing report if it's open
      if (viewingReport && viewingReport.id === reportId) {
        const updated = await apiClient.getWorkReport(reportId);
        setViewingReport(updated);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Ошибка при загрузке фотографий');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (reportId: number, photoId: number) => {
    if (!confirm('Удалить эту фотографию?')) return;

    try {
      await apiClient.deleteWorkReportPhoto(reportId, photoId);
      alert('Фотография удалена!');
      loadReports();
      
      if (viewingReport && viewingReport.id === reportId) {
        const updated = await apiClient.getWorkReport(reportId);
        setViewingReport(updated);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Ошибка при удалении фотографии');
    }
  };

  const getStatusBadge = (status: WorkReportStatus) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option : STATUS_OPTIONS[0];
  };

  const canEdit = (report: WorkReport) => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return true;
    return report.created_by === user?.id;
  };

  const canDelete = (report: WorkReport) => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return true;
    return report.created_by === user?.id;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Выполненные работы</h1>
                <p className="text-purple-100 mt-1">Отчёты и фотоматериалы по проектам</p>
              </div>
            </div>
            <div className="flex gap-3">
                              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition flex items-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" /> Создать отчёт
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
              >
                <Home className="w-5 h-5" /> Главная
              </button>

            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Фильтры</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">От даты</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">До даты</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Описание, сотрудники..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.only_mine}
                  onChange={(e) => setFilters({ ...filters, only_mine: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                Только мои
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Сбросить
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => handleTabChange('ALL')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'ALL'
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Все отчёты
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">
                {reports.length}
              </span>
            </button>
            
            {STATUS_OPTIONS.map((status) => {
              const count = reports.filter(r => r.status === status.value).length;
              return (
                <button
                  key={status.value}
                  onClick={() => handleTabChange(status.value)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === status.value
                      ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {status.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === status.value
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Бюджет</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сотрудники</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Фото</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создал</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Изменил</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Загрузка...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Нет отчётов
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const statusBadge = getStatusBadge(report.status);
                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(report.date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                          {report.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                          {Number(report.budget).toLocaleString('ru-RU')} $
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {report.assigned_employees_details && report.assigned_employees_details.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {report.assigned_employees_details.map((emp) => (
                                <span key={emp.id} className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                  {emp.full_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {report.photos.length > 0 ? (
                            <button
                              onClick={() => handleViewReport(report)}
                              className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              {report.photos.length} шт
                            </button>
                          ) : (
                            <span className="text-gray-400">нет</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>
                            <p className="font-medium">{report.created_by_full_name || report.created_by_username}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(report.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {report.updated_by ? (
                            <div>
                              <p className="font-medium">{report.updated_by_full_name || report.updated_by_username}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(report.updated_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Просмотр"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEdit(report) && (
                              <button
                                onClick={() => handleOpenModal(report)}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete(report) && (
                              <button
                                onClick={() => handleDelete(report.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingReport ? 'Редактировать отчёт' : 'Создать отчёт'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание работы *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Бюджет *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="relative" ref={employeeDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Прикреплённые сотрудники
                </label>
                
                {/* Dropdown trigger button */}
                <button
                  type="button"
                  onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    {formData.assigned_employees.length > 0
                      ? `Выбрано: ${formData.assigned_employees.length}`
                      : 'Выберите сотрудников'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                    employeeDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Dropdown menu */}
                {employeeDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Поиск сотрудников..."
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Employee list */}
                    <div className="max-h-64 overflow-y-auto">
                      {availableEmployees
                        .filter((emp) =>
                          emp.full_name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                          emp.role_display.toLowerCase().includes(employeeSearchQuery.toLowerCase())
                        )
                        .map((emp) => (
                          <label
                            key={emp.id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.assigned_employees.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    assigned_employees: [...formData.assigned_employees, emp.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    assigned_employees: formData.assigned_employees.filter(id => id !== emp.id)
                                  });
                                }
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-gray-900">{emp.full_name}</div>
                              <div className="text-xs text-gray-500">{emp.role_display}</div>
                            </div>
                          </label>
                        ))}
                      {availableEmployees.filter((emp) =>
                        emp.full_name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                        emp.role_display.toLowerCase().includes(employeeSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          Сотрудники не найдены
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="p-2 border-t border-gray-200 flex justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assigned_employees: [] });
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Очистить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmployeeDropdownOpen(false);
                          setEmployeeSearchQuery('');
                        }}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Готово
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Display selected employees as badges */}
                {formData.assigned_employees.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.assigned_employees.map((empId) => {
                      const emp = availableEmployees.find(e => e.id === empId);
                      if (!emp) return null;
                      return (
                        <span
                          key={empId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          <span>{emp.full_name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                assigned_employees: formData.assigned_employees.filter(id => id !== empId)
                              });
                            }}
                            className="text-purple-500 hover:text-purple-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as WorkReportStatus })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingReport && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фотоотчёт
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {selectedPhotos.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-600">Выбрано фотографий: {selectedPhotos.length}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={photo.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedPhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploadingPhotos}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50"
                >
                  {uploadingPhotos ? 'Загрузка фото...' : editingReport ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Просмотр отчёта</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Дата</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    {new Date(viewingReport.date).toLocaleDateString('ru-RU')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Бюджет</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    {Number(viewingReport.budget).toLocaleString('ru-RU')} $
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Статус</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(viewingReport.status).color}`}>
                    {getStatusBadge(viewingReport.status).label}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Сотрудники</p>
                  {viewingReport.assigned_employees_details && viewingReport.assigned_employees_details.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewingReport.assigned_employees_details.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                          <UsersIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{emp.full_name}</span>
                          <span className="text-xs text-blue-500">({emp.role_display})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base text-gray-400 flex items-center gap-2">
                      <UsersIcon className="w-5 h-5" />
                      Не указаны
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Описание</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap">
                  {viewingReport.description}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Создал</p>
                <p className="text-base">
                  {viewingReport.created_by_full_name || viewingReport.created_by_username} - {new Date(viewingReport.created_at).toLocaleString('ru-RU')}
                </p>
              </div>

              {viewingReport.updated_by && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Последнее изменение</p>
                  <p className="text-base">
                    {viewingReport.updated_by_full_name || viewingReport.updated_by_username} - {new Date(viewingReport.updated_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              )}

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Фотоотчёт ({viewingReport.photos.length})
                  </h3>
                  {canEdit(viewingReport) && (
                    <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Загрузить фото
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => e.target.files && handlePhotoUploadToExisting(viewingReport.id, e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {viewingReport.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viewingReport.photos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <div
                          className="cursor-pointer overflow-hidden rounded-lg"
                          onClick={() => handleOpenLightbox(photo, index)}
                        >
                          <img
                            src={photo.image_url}
                            alt={photo.caption || 'Фото'}
                            className="w-full h-48 object-cover rounded-lg transition-transform duration-200 group-hover:scale-110"
                          />
                        </div>
                        {photo.caption && (
                          <p className="mt-1 text-sm text-gray-600">{photo.caption}</p>
                        )}
                        {canEdit(viewingReport) && (
                          <button
                            onClick={() => handleDeletePhoto(viewingReport.id, photo.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Фотографии не загружены</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxPhoto && viewingReport && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
          onClick={handleCloseLightbox}
        >
          <button
            onClick={handleCloseLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation buttons */}
          {viewingReport.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 transition"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 transition"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.caption || 'Фото'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            
            {/* Caption and counter */}
            <div className="text-center mt-4">
              {lightboxPhoto.caption && (
                <p className="text-white text-lg mb-2">{lightboxPhoto.caption}</p>
              )}
              <p className="text-gray-300 text-sm">
                {lightboxIndex + 1} / {viewingReport.photos.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
