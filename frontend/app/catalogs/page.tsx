'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Home,
  Plus,
  Edit,
  Trash2,
  X,
  Download,
  FileText,
  Snowflake,
  Flame,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import type { ProductCatalog, ProductCatalogFormData, CatalogType } from '@/lib/types';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  token: string | null,
  onProgress: (percent: number) => void
): Promise<ProductCatalog> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || err.error || `Ошибка ${xhr.status}`));
        } catch {
          reject(new Error(`Ошибка ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')));
    xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));
    xhr.send(formData);
  });
}

export default function CatalogsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<ProductCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [formData, setFormData] = useState<ProductCatalogFormData>({
    title: '',
    catalog_type: 'COLD',
    description: '',
    pdf_file: null,
    preview_image: null,
  });

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadCatalogs();
  }, [isAuthenticated, authLoading, router]);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const { apiClient } = await import('@/lib/api');
      const data = await apiClient.getCatalogs();
      setCatalogs(data);
    } catch (error) {
      console.error('Error loading catalogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCatalog) {
        // Обновление — без прогресса (файл не обязателен)
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('catalog_type', formData.catalog_type);
        fd.append('description', formData.description);
        if (formData.pdf_file) fd.append('pdf_file', formData.pdf_file);
        if (formData.preview_image) fd.append('preview_image', formData.preview_image);

        setUploadProgress(0);
        await uploadWithProgress(
          `${baseUrl}/catalogs/${editingCatalog.id}/`,
          fd,
          token,
          setUploadProgress
        ).catch(async () => {
          // PATCH fallback через apiClient если PUT не подходит
          const { apiClient } = await import('@/lib/api');
          return apiClient.updateCatalog(editingCatalog.id, formData);
        });
        addToast('success', 'Каталог успешно обновлён!');
      } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('catalog_type', formData.catalog_type);
        fd.append('description', formData.description);
        if (formData.pdf_file) fd.append('pdf_file', formData.pdf_file);
        if (formData.preview_image) fd.append('preview_image', formData.preview_image);

        setUploadProgress(0);
        await uploadWithProgress(`${baseUrl}/catalogs/`, fd, token, setUploadProgress);
        addToast('success', 'Каталог успешно создан!');
      }
      
      await loadCatalogs();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving catalog:', error);
      addToast('error', error instanceof Error ? error.message : 'Ошибка при сохранении каталога');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот каталог?')) {
      return;
    }

    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.deleteCatalog(id);
      addToast('success', 'Каталог удалён');
      loadCatalogs();
    } catch (error) {
      console.error('Error deleting catalog:', error);
      addToast('error', 'Ошибка при удалении каталога');
    }
  };

  const handleEdit = (catalog: ProductCatalog) => {
    setEditingCatalog(catalog);
    setFormData({
      title: catalog.title,
      catalog_type: catalog.catalog_type,
      description: catalog.description,
      pdf_file: null,
      preview_image: null,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCatalog(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      catalog_type: 'COLD',
      description: '',
      pdf_file: null,
      preview_image: null,
    });
  };

  const getCatalogTypeIcon = (type: CatalogType) => {
    return type === 'COLD' 
      ? <Snowflake className="w-5 h-5 text-blue-500" />
      : <Flame className="w-5 h-5 text-orange-500" />;
  };

  const getCatalogTypeBadge = (type: CatalogType, display: string) => {
    const colors = type === 'COLD'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-orange-100 text-orange-800';
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${colors}`}>
        {getCatalogTypeIcon(type)}
        {display}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right pointer-events-auto min-w-[280px] ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Upload className="w-5 h-5 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8" /> Каталог алюминиевых продукций
            </h1>
            <div className="flex items-center gap-4">
              {isAdminOrManager && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Добавить каталог
                </button>
              )}
              <Link 
                href="/" 
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
              >
                <Home className="w-5 h-5" /> Главная
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Поиск */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4" /> Поиск по каталогам
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите название каталога..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {catalogs.filter(catalog => 
          catalog.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Каталоги не найдены</p>
            {isAdminOrManager && (
              <p className="text-gray-500 mt-2">Добавьте первый каталог продукции</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {catalogs.filter(catalog => 
              catalog.title.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((catalog) => (
              <div
                key={catalog.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Preview Image */}
                <div className="relative h-64 bg-gray-100">
                  {catalog.preview_image_url ? (
                    <img
                      src={catalog.preview_image_url}
                      alt={catalog.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-24 h-24 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Type badge overlay */}
                  <div className="absolute top-3 right-3">
                    {getCatalogTypeBadge(catalog.catalog_type, catalog.catalog_type_display)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {catalog.title}
                  </h3>
                  
                  {catalog.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {catalog.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    <p>Создал: {catalog.created_by_username}</p>
                    <p>{new Date(catalog.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto">
                    <a
                      href={catalog.pdf_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-2 justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Открыть
                    </a>
                    <a
                      href={catalog.pdf_file_url}
                      download
                      className="flex-1 flex items-center gap-2 justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </a>

                    {isAdminOrManager && (
                      <>
                        <button
                          onClick={() => handleEdit(catalog)}
                          className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(catalog.id)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && isAdminOrManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCatalog ? 'Редактировать каталог' : 'Новый каталог'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название каталога *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип каталога *
                  </label>
                  <select
                    value={formData.catalog_type}
                    onChange={(e) => setFormData({ ...formData, catalog_type: e.target.value as CatalogType })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="COLD">Холодная серия</option>
                    <option value="WARM">Теплая серия</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF файл {!editingCatalog && '*'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData({ ...formData, pdf_file: e.target.files?.[0] || null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required={!editingCatalog}
                  />
                  {editingCatalog?.pdf_file_url && (
                    <p className="text-sm text-gray-500 mt-1">
                      Текущий файл:{' '}
                      <a
                        href={editingCatalog.pdf_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Открыть
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Превью (изображение первой страницы)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, preview_image: e.target.files?.[0] || null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  {editingCatalog?.preview_image_url && (
                    <p className="text-sm text-gray-500 mt-1">
                      Текущее превью:{' '}
                      <a
                        href={editingCatalog.preview_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Посмотреть
                      </a>
                    </p>
                  )}
                </div>

                {/* Upload progress bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Upload className="w-4 h-4 animate-pulse" />
                        {uploadProgress < 100 ? 'Загрузка файла...' : 'Обработка...'}
                      </span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploadProgress !== null}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadProgress !== null
                      ? `Загрузка ${uploadProgress}%...`
                      : editingCatalog ? 'Обновить' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={uploadProgress !== null}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
