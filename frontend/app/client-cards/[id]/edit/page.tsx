'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  X,
  Save
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { ClientCard, ClientCardFormData } from '@/lib/types';

export default function EditClientCardPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [client, setClient] = useState<ClientCard | null>(null);
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<ClientCardFormData>({
    first_name: '',
    last_name: '',
    experience_years: '',
    client_name: '',
    region: '',
    partners: [],
    phone: '',
    email: '',
    start_date: '',
    position: '',
    photo: null,
  });

  const [partnerInput, setPartnerInput] = useState('');

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const clientId = params?.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isAdminOrManager) {
      alert('У вас нет прав для редактирования клиентов');
      router.push('/client-cards');
      return;
    }

    if (clientId) {
      loadClient();
      loadClients();
    }
  }, [isAuthenticated, authLoading, router, clientId, isAdminOrManager]);

  const loadClient = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      const data = await apiClient.getClientCard(clientId);
      setClient(data);
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        experience_years: data.experience_years,
        client_name: data.client_name,
        region: data.region,
        partners: data.partners,
        phone: data.phone || '',
        email: data.email || '',
        start_date: data.start_date || '',
        position: data.position || '',
        photo: null,
      });
    } catch (error) {
      console.error('Error loading client:', error);
      alert('Ошибка загрузки данных клиента');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await apiClient.getClientsList();
      setClients(data.clients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) return;

    try {
      setSaving(true);
      await apiClient.updateClientCard(clientId, formData);
      alert('Карточка успешно обновлена!');
      router.push(`/client-cards/${clientId}`);
    } catch (error) {
      console.error('Error updating client card:', error);
      alert('Ошибка при обновлении карточки');
    } finally {
      setSaving(false);
    }
  };

  const addPartner = () => {
    if (partnerInput.trim() && !formData.partners.includes(partnerInput.trim())) {
      setFormData({
        ...formData,
        partners: [...formData.partners, partnerInput.trim()]
      });
      setPartnerInput('');
    }
  };

  const removePartner = (partner: string) => {
    setFormData({
      ...formData,
      partners: formData.partners.filter(p => p !== partner)
    });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/client-cards/${clientId}`}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Редактировать клиента</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фамилия *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Стаж работы *
                </label>
                <input
                  type="text"
                  required
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  placeholder="Например: 5 лет"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Клиентское название *
                </label>
                <select
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Выберите клиента</option>
                  {clients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Регион *
                </label>
                <input
                  type="text"
                  required
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Партнёры (дилеры)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={partnerInput}
                    onChange={(e) => setPartnerInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPartner())}
                    placeholder="Введите название партнёра и нажмите Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addPartner}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Добавить
                  </button>
                </div>
                
                {formData.partners.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    {formData.partners.map((partner, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                      >
                        {partner}
                        <button
                          type="button"
                          onClick={() => removePartner(partner)}
                          className="hover:text-indigo-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата начала сотрудничества
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Должность
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Менеджер по закупкам"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фото
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {client.photo_url && (
                  <p className="text-sm text-gray-500 mt-2">
                    Текущее фото: <a href={client.photo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Просмотр</a>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-medium disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
                <Link
                  href={`/client-cards/${clientId}`}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-center"
                >
                  Отмена
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
