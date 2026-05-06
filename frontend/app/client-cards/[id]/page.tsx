'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Award,
  Users,
  Building,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Plus,
  Camera,
  X,
  Save
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useAlert } from '@/hooks/useAlert';
import Alert from '@/components/Alert';
import type { ClientCard, ClientVisitReport, VisitReportFormData, ClientCardPurchases, ClientCardPurchaseItem, UserData } from '@/lib/types';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { alert, success, error, hideAlert } = useAlert();
  
  const [client, setClient] = useState<ClientCard | null>(null);
  const [purchasesData, setPurchasesData] = useState<ClientCardPurchases | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  
  // Visit Reports state
  const [visitReports, setVisitReports] = useState<ClientVisitReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [reportFormData, setReportFormData] = useState<VisitReportFormData>({
    client_card: 0,
    assigned_manager: null,
    work_description: '',
    suggestions: '',
    complaints: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [managers, setManagers] = useState<UserData[]>([]);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const clientId = params?.id ? parseInt(params.id as string) : null;

  const loadClient = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      const data = await apiClient.getClientCard(clientId);
      setClient(data);
    } catch (err) {
      console.error('Error loading client:', err);
      error('Ошибка загрузки данных клиента', 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [clientId, error]);

  const loadPurchases = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoadingPurchases(true);
      const data = await apiClient.getClientCardPurchases(clientId);
      setPurchasesData(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  }, [clientId]);

  const loadVisitReports = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoadingReports(true);
      console.log('Loading visit reports for client:', clientId);
      const data = await apiClient.getVisitReports(clientId);
      console.log('Loaded visit reports:', data);
      setVisitReports(data);
    } catch (error) {
      console.error('Error loading visit reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, [clientId]);

  const loadManagers = useCallback(async () => {
    try {
      console.log('Loading managers...');
      const data = await apiClient.getUsers();
      console.log('All users:', data);
      const managerUsers = data.filter((u: UserData) => u.role === 'MANAGER' || u.role === 'ADMIN');
      console.log('Filtered managers:', managerUsers);
      setManagers(managerUsers);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (clientId) {
      loadClient();
      loadPurchases();
      loadVisitReports();
      loadManagers();
      setReportFormData(prev => ({ ...prev, client_card: clientId }));
    }
  }, [isAuthenticated, authLoading, router, clientId, loadClient, loadPurchases, loadVisitReports, loadManagers]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    try {
      let report: ClientVisitReport;
      
      // Ensure client_card is set to current clientId
      const submitData = {
        ...reportFormData,
        client_card: clientId
      };
      
      console.log('Submitting report data:', submitData);
      
      if (editingReportId) {
        report = await apiClient.updateVisitReport(editingReportId, submitData);
      } else {
        report = await apiClient.createVisitReport(submitData);
      }

      console.log('Created/Updated report:', report);
      console.log('Report type:', typeof report);
      console.log('Is array?', Array.isArray(report));
      console.log('Report ID:', report.id);
      console.log('Report as JSON:', JSON.stringify(report));

      // Upload photos if selected
      if (selectedFiles.length > 0) {
        console.log('Uploading photos:', selectedFiles.length);
        console.log('Report ID for upload:', report.id);
        if (!report.id) {
          throw new Error('Report ID is missing! Cannot upload photos.');
        }
        await apiClient.uploadVisitReportPhotos(report.id, selectedFiles);
      }
      setShowReportForm(false);
      setEditingReportId(null);
      setReportFormData({
        client_card: clientId,
        assigned_manager: null,
        work_description: '',
        suggestions: '',
        complaints: '',
      });
      setSelectedFiles([]);
      console.log('Reloading visit reports...');
      await loadVisitReports();
      success(editingReportId ? 'Отчет обновлен успешно!' : 'Отчет создан успешно!');
    } catch (err) {
      console.error('Error saving report:', err);
      error((err as Error).message, 'Ошибка при сохранении отчета');
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Удалить этот отчет?')) return;

    try {
      console.log('Deleting report:', reportId);
      await apiClient.deleteVisitReport(reportId);
      console.log('Report deleted, reloading...');
      await loadVisitReports();
      success('Отчет удален успешно!');
    } catch (err) {
      console.error('Error deleting report:', err);
      error((err as Error).message, 'Ошибка при удалении отчета');
    }
  };

  const handleDeletePhoto = async (reportId: number, photoId: number) => {
    if (!confirm('Удалить эту фотографию?')) return;

    try {
      await apiClient.deleteVisitReportPhoto(reportId, photoId);
      success('Фото удалено!');
      await loadVisitReports();
    } catch (err) {
      console.error('Error deleting photo:', err);
      error('Ошибка при удалении фото', 'Ошибка при удалении фото');
    }
  };

  const handleDelete = async () => {
    if (!clientId || !confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }

    try {
      await apiClient.deleteClientCard(clientId);
      success('Карточка успешно удалена!');
      router.push('/client-cards');
    } catch (err) {
      console.error('Error deleting client card:', err);
      error('Ошибка при удалении карточки', 'Ошибка при удалении карточки');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-4">Клиент не найден</p>
          <Link
            href="/client-cards"
            className="text-indigo-600 hover:underline"
          >
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/client-cards"
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-3xl font-bold">Карточка клиента</h1>
            </div>
            
            {isAdminOrManager && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/client-cards/${client.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                  <Edit className="w-5 h-5" />
                  Редактировать
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Info Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">{/* Photo Section */}
              <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center p-6">
                {client.photo_url ? (
                  <Image
                    src={client.photo_url}
                    alt={client.full_name}
                    width={256}
                    height={256}
                    unoptimized
                    className="w-full h-full max-w-sm max-h-sm rounded-full object-cover border-8 border-white shadow-xl aspect-square"
                  />
                ) : (
                  <div className="w-full h-full max-w-sm max-h-sm rounded-full bg-white/20 flex items-center justify-center border-8 border-white shadow-xl aspect-square">
                    <User className="w-40 h-40 text-white" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="md:w-2/3 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {client.full_name}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Компания</p>
                      <p className="text-lg font-semibold text-gray-900">{client.client_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Регион</p>
                      <p className="text-lg font-semibold text-gray-900">{client.region}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Стаж работы</p>
                      <p className="text-lg font-semibold text-gray-900">{client.experience_years}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Должность</p>
                      <p className="text-lg font-semibold text-gray-900">{client.position || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Телефон</p>
                      <p className="text-lg font-semibold text-gray-900">{client.phone || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-lg font-semibold text-gray-900">{client.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Дата начала сотрудничества</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {client.start_date 
                          ? new Date(client.start_date).toLocaleDateString('ru-RU') 
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Partners Section */}
                  {client.partners.length > 0 && (
                    <div className="md:col-span-2 flex items-start gap-3">
                      <Users className="w-5 h-5 text-indigo-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">Партнёры и дилеры</p>
                        <div className="flex flex-wrap gap-2">
                          {client.partners.map((partner, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-200 flex items-center gap-2"
                            >
                              <Building className="w-4 h-4" />
                              {partner}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Purchases Table Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              История закупок по товарам
            </h3>
            
            {loadingPurchases ? (
              <div className="text-center py-8 text-gray-600">
                Загрузка данных...
              </div>
            ) : purchasesData && purchasesData.tovary && purchasesData.tovary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Товары
                      </th>
                      {purchasesData.years.map((year: number) => (
                        <th key={year} className="text-center py-3 px-4 font-semibold text-gray-900">
                          {year} (кг)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchasesData.tovary.map((item: ClientCardPurchaseItem, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {item.tovar_name}
                        </td>
                        {purchasesData.years.map((year: number) => {
                          const ves_kg = Number(item[String(year)] || 0);
                          
                          return (
                            <td key={year} className="text-center py-3 px-4">
                              {ves_kg > 0 ? (
                                <span className="font-semibold text-indigo-700">
                                  {new Intl.NumberFormat('ru-RU', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  }).format(ves_kg)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Нет данных о закупках</p>
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Метаданные
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Создано</p>
                <p className="font-medium text-gray-900">
                  {new Date(client.created_at).toLocaleString('ru-RU')}
                  {client.created_by_full_name && (
                    <span className="text-gray-600"> — {client.created_by_full_name}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Последнее изменение</p>
                <p className="font-medium text-gray-900">
                  {new Date(client.updated_at).toLocaleString('ru-RU')}
                  {client.updated_by_full_name && (
                    <span className="text-gray-600"> — {client.updated_by_full_name}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
            </div>

            {/* Right Column - Visit Reports */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                    Задания по обходу
                  </h3>
                  {isAdminOrManager && !showReportForm && (
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить
                    </button>
                  )}
                </div>

                {/* Report Form */}
                {showReportForm && isAdminOrManager && (
                  <form onSubmit={handleReportSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Назначить менеджера *
                        </label>
                        <select
                          required
                          value={reportFormData.assigned_manager || ''}
                          onChange={(e) => setReportFormData({ ...reportFormData, assigned_manager: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        >
                          <option value="">Выберите менеджера</option>
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {`${manager.first_name} ${manager.last_name}`.trim() || manager.username}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Описание работы *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={reportFormData.work_description}
                          onChange={(e) => setReportFormData({ ...reportFormData, work_description: e.target.value })}
                          placeholder="Опишите проделанную работу..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Предложения
                        </label>
                        <textarea
                          rows={3}
                          value={reportFormData.suggestions}
                          onChange={(e) => setReportFormData({ ...reportFormData, suggestions: e.target.value })}
                          placeholder="Предложения от клиента..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Жалобы
                        </label>
                        <textarea
                          rows={3}
                          value={reportFormData.complaints}
                          onChange={(e) => setReportFormData({ ...reportFormData, complaints: e.target.value })}
                          placeholder="Жалобы от клиента..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Фотоотчет *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Удерживайте Ctrl (или Cmd на Mac) для выбора нескольких файлов
                        </p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          required
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                        {selectedFiles.length > 0 && (
                          <p className="text-xs text-green-600 mt-1 font-medium">✓ Выбрано файлов: {selectedFiles.length}</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                        >
                          <Save className="w-4 h-4" />
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReportForm(false);
                            setEditingReportId(null);
                            setReportFormData({
                              client_card: clientId || 0,
                              assigned_manager: null,
                              work_description: '',
                              suggestions: '',
                              complaints: '',
                            });
                            setSelectedFiles([]);
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Reports List */}
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {loadingReports ? (
                    <div className="text-center py-8 text-gray-600">
                      Загрузка...
                    </div>
                  ) : visitReports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm">Нет отчетов о посещениях</p>
                    </div>
                  ) : (
                    visitReports.map((report) => (
                      <div key={report.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-xs text-gray-500">
                            {new Date(report.visit_date).toLocaleString('ru-RU')}
                          </div>
                          {isAdminOrManager && (
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Работа:</p>
                            <p className="text-gray-900">{report.work_description}</p>
                          </div>
                          
                          {report.suggestions && (
                            <div>
                              <p className="font-medium text-gray-700">Предложения:</p>
                              <p className="text-gray-900">{report.suggestions}</p>
                            </div>
                          )}
                          
                          {report.complaints && (
                            <div>
                              <p className="font-medium text-gray-700">Жалобы:</p>
                              <p className="text-gray-900">{report.complaints}</p>
                            </div>
                          )}

                          {report.photos && report.photos.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Camera className="w-4 h-4" />
                                Фото ({report.photos.length}):
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {report.photos.map((photo) => (
                                  <div key={photo.id} className="relative group">
                                    <Image
                                      src={photo.photo_url}
                                      alt={photo.description || 'Фото'}
                                      width={200}
                                      height={96}
                                      unoptimized
                                      className="w-full h-24 object-cover rounded border border-gray-200"
                                    />
                                    {isAdminOrManager && (
                                      <button
                                        onClick={() => handleDeletePhoto(report.id, photo.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                            <div>Назначен: {report.assigned_manager_full_name || report.assigned_manager_username || 'Не назначен'}</div>
                            <div>Создал: {report.created_by_full_name || report.created_by_username}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {alert && (
      <Alert
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        autoClose={alert.autoClose}
        duration={alert.duration}
      />
    )}
    </>
  );
}
