'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Home,
  Plus,
  Edit,
  Trash2,
  X,
  User,
  Search,
  Briefcase,
  MapPin,
  Award
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { ClientCard, ClientCardFormData } from '@/lib/types';

export default function ClientCardsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadCards();
    loadClients();
  }, [isAuthenticated, authLoading, router]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientCards();
      setCards(data);
    } catch (error) {
      console.error('Error loading client cards:', error);
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

    try {
      await apiClient.createClientCard(formData);
      alert('Карточка успешно создана!');
      loadCards();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving client card:', error);
      alert('Ошибка при создании карточки');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }

    try {
      await apiClient.deleteClientCard(id);
      alert('Карточка успешно удалена!');
      loadCards();
    } catch (error) {
      console.error('Error deleting client card:', error);
      alert('Ошибка при удалении карточки');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
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
    setPartnerInput('');
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

  const filteredCards = cards.filter(card => 
    card.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8" /> Карточки клиентов
            </h1>
            <div className="flex items-center gap-4">
              {isAdminOrManager && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Добавить клиента
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
            <Search className="w-4 h-4" /> Поиск по клиентам
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите имя, компанию или регион..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Клиенты не найдены</p>
            {isAdminOrManager && (
              <p className="text-gray-500 mt-2">Добавьте первого клиента</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                onClick={() => router.push(`/client-cards/${card.id}`)}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Photo */}
                <div className="relative h-56 bg-gradient-to-br from-indigo-400 to-purple-500">
                  {card.photo_url ? (
                    <img
                      src={card.photo_url}
                      alt={card.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-24 h-24 text-white opacity-50" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {card.full_name}
                  </h3>
                  
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium">{card.client_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{card.region}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="w-4 h-4" />
                      <span>Стаж: {card.experience_years}</span>
                    </div>

                    {card.partners.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Партнёры:</p>
                        <div className="flex flex-wrap gap-1">
                          {card.partners.slice(0, 3).map((partner, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                              {partner}
                            </span>
                          ))}
                          {card.partners.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{card.partners.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdminOrManager && (
                    <div className="flex items-center gap-2 mt-auto">
                      <Link
                        href={`/client-cards/${card.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(card.id);
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Новый клиент
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-medium"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
