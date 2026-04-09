'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Search, TrendingUp, Package, ShoppingCart, Home, MapPin } from 'lucide-react';
import Link from 'next/link';
import { apiClient, formatNumber } from '@/lib/api';
import type { TopClient, TopProduct, ClientPurchaseHistory, ClientsFilterParams } from '@/lib/types';

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<'top_clients' | 'top_products' | 'history'>('top_clients');
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<ClientPurchaseHistory[]>([]);
  const [clientsList, setClientsList] = useState<string[]>([]);
  const [productsList, setProductsList] = useState<string[]>([]);
  const [regionsList, setRegionsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Флаги: были ли данные загружены хотя бы раз
  const [topClientsLoaded, setTopClientsLoaded] = useState(false);
  const [topProductsLoaded, setTopProductsLoaded] = useState(false);

  // Фильтры для ТОП клиентов
  const [topClientsFilters, setTopClientsFilters] = useState<ClientsFilterParams>({
    limit: 10,
    start_date: '',
    end_date: '',
    products: [],
    region: '',
  });

  // Фильтры для ТОП товаров
  const [topProductsFilters, setTopProductsFilters] = useState<ClientsFilterParams>({
    limit: 10,
    start_date: '',
    end_date: '',
    clients: [],
    region: '',
  });

  // Временные значения для добавления товаров/клиентов
  const [tempProduct, setTempProduct] = useState('');
  const [tempClient, setTempClient] = useState('');

  // Фильтры для истории покупок
  const [historyFilters, setHistoryFilters] = useState<ClientsFilterParams>({
    client: '',
    start_date: '',
    end_date: '',
    product: '',
    region: '',
  });

  // Загрузка списков
  useEffect(() => {
    loadClientsList();
    loadProductsList();
    loadRegionsList();
  }, []);

  const loadClientsList = async () => {
    try {
      const data = await apiClient.getClientsList();
      setClientsList(data.clients);
    } catch (err) {
      console.error('Error loading clients list:', err);
    }
  };

  const loadProductsList = async () => {
    try {
      const data = await apiClient.getProductsList();
      setProductsList(data.products);
    } catch (err) {
      console.error('Error loading products list:', err);
    }
  };

  const loadRegionsList = async () => {
    try {
      const data = await apiClient.getClientsRegionsList();
      setRegionsList(data.regions);
    } catch (err) {
      console.error('Error loading regions list:', err);
    }
  };

  const loadTopClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTopClients(topClientsFilters);
      setTopClients(data);
      setTopClientsLoaded(true);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTopProducts(topProductsFilters);
      setTopProducts(data);
      setTopProductsLoaded(true);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    if (!historyFilters.client) {
      setError('Выберите клиента');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getClientPurchaseHistory(historyFilters);
      setPurchaseHistory(data);
    } catch (err) {
      setError('Ошибка загрузки истории');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8" /> Клиентская База
            </h1>
            <Link 
              href="/" 
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <Home className="w-5 h-5" /> Главная
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('top_clients')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'top_clients'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            ТОП Клиентов
          </button>
          <button
            onClick={() => setActiveTab('top_products')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'top_products'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            ТОП Товаров
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            История Покупок
          </button>
        </div>

        {/* ТОП Клиентов */}
        {activeTab === 'top_clients' && (
          <div>
            {/* Фильтры */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Фильтры
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество клиентов
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={topClientsFilters.limit}
                    onChange={(e) => setTopClientsFilters({ ...topClientsFilters, limit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={topClientsFilters.start_date}
                    onChange={(e) => setTopClientsFilters({ ...topClientsFilters, start_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={topClientsFilters.end_date}
                    onChange={(e) => setTopClientsFilters({ ...topClientsFilters, end_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Фильтр по региону */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Регион
                </label>
                <select
                  value={topClientsFilters.region || ''}
                  onChange={(e) => setTopClientsFilters({ ...topClientsFilters, region: e.target.value })}
                  className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все регионы</option>
                  {regionsList.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              {/* Выбор товаров для колонок */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  Товары (колонки таблицы)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    list="products-list-filter"
                    value={tempProduct}
                    onChange={(e) => setTempProduct(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempProduct && !topClientsFilters.products?.includes(tempProduct)) {
                        setTopClientsFilters({ 
                          ...topClientsFilters, 
                          products: [...(topClientsFilters.products || []), tempProduct] 
                        });
                        setTempProduct('');
                      }
                    }}
                    placeholder="Начните вводить товар и нажмите Enter..."
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="products-list-filter">
                    {productsList.map((product) => (
                      <option key={product} value={product} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => {
                      if (tempProduct && !topClientsFilters.products?.includes(tempProduct)) {
                        setTopClientsFilters({ 
                          ...topClientsFilters, 
                          products: [...(topClientsFilters.products || []), tempProduct] 
                        });
                        setTempProduct('');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Добавить
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topClientsFilters.products?.map((product, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {product}
                      <button
                        onClick={() => setTopClientsFilters({ 
                          ...topClientsFilters, 
                          products: topClientsFilters.products?.filter((_, i) => i !== idx) 
                        })}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Кнопка применения фильтров */}
              <div className="mt-5 pt-4 border-t border-gray-200">
                <button
                  onClick={loadTopClients}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  {loading ? 'Загрузка...' : 'Применить фильтры'}
                </button>
              </div>
            </div>

            {/* Таблица ТОП клиентов */}
            {loading ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow">Загрузка...</div>
            ) : error ? (
              <div className="text-center text-red-600 py-12 bg-white rounded-lg shadow">{error}</div>
            ) : !topClientsLoaded ? (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 font-medium mb-2">Задайте фильтры</p>
                <p className="text-gray-400">Выберите параметры и нажмите «Применить фильтры»</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                <div className="overflow-auto max-h-[calc(100vh-280px)]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Клиент</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Дилер</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Итого (кг)</th>
                        {topClientsFilters.products?.map((product, idx) => (
                          <th key={idx} className="px-6 py-3 text-right text-sm font-semibold text-gray-700 min-w-[150px]">
                            {product}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((client, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-bold">{index + 1}</td>
                          <td className="px-6 py-4 text-gray-900 font-medium">{client.client}</td>
                          <td className="px-6 py-4 text-gray-600">{client.dealer || '-'}</td>
                          <td className="px-6 py-4 text-blue-600 text-right font-semibold">
                            {formatNumber(client.total_weight)}
                          </td>
                          {topClientsFilters.products?.map((product, idx) => (
                            <td key={idx} className="px-6 py-4 text-gray-700 text-right">
                              {formatNumber(client.products[product])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ТОП Товаров */}
        {activeTab === 'top_products' && (
          <div>
            {/* Фильтры */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Фильтры
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество товаров
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={topProductsFilters.limit}
                    onChange={(e) => setTopProductsFilters({ ...topProductsFilters, limit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={topProductsFilters.start_date}
                    onChange={(e) => setTopProductsFilters({ ...topProductsFilters, start_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={topProductsFilters.end_date}
                    onChange={(e) => setTopProductsFilters({ ...topProductsFilters, end_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Фильтр по региону */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Регион
                </label>
                <select
                  value={topProductsFilters.region || ''}
                  onChange={(e) => setTopProductsFilters({ ...topProductsFilters, region: e.target.value })}
                  className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все регионы</option>
                  {regionsList.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              {/* Выбор клиентов для колонок */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Клиенты (колонки таблицы)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    list="clients-list-filter"
                    value={tempClient}
                    onChange={(e) => setTempClient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempClient && !topProductsFilters.clients?.includes(tempClient)) {
                        setTopProductsFilters({ 
                          ...topProductsFilters, 
                          clients: [...(topProductsFilters.clients || []), tempClient] 
                        });
                        setTempClient('');
                      }
                    }}
                    placeholder="Начните вводить клиента и нажмите Enter..."
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="clients-list-filter">
                    {clientsList.map((client) => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => {
                      if (tempClient && !topProductsFilters.clients?.includes(tempClient)) {
                        setTopProductsFilters({ 
                          ...topProductsFilters, 
                          clients: [...(topProductsFilters.clients || []), tempClient] 
                        });
                        setTempClient('');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Добавить
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topProductsFilters.clients?.map((client, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {client}
                      <button
                        onClick={() => setTopProductsFilters({ 
                          ...topProductsFilters, 
                          clients: topProductsFilters.clients?.filter((_, i) => i !== idx) 
                        })}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Кнопка применения фильтров */}
              <div className="mt-5 pt-4 border-t border-gray-200">
                <button
                  onClick={loadTopProducts}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  {loading ? 'Загрузка...' : 'Применить фильтры'}
                </button>
              </div>
            </div>

            {/* Таблица ТОП товаров */}
            {loading ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow">Загрузка...</div>
            ) : error ? (
              <div className="text-center text-red-600 py-12 bg-white rounded-lg shadow">{error}</div>
            ) : !topProductsLoaded ? (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 font-medium mb-2">Задайте фильтры</p>
                <p className="text-gray-400">Выберите параметры и нажмите «Применить фильтры»</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                <div className="overflow-auto max-h-[calc(100vh-280px)]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Товар</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Итого (кг)</th>
                        {topProductsFilters.clients?.map((client, idx) => (
                          <th key={idx} className="px-6 py-3 text-right text-sm font-semibold text-gray-700 min-w-[150px]">
                            {client}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-bold">{index + 1}</td>
                          <td className="px-6 py-4 text-gray-900 font-medium">{product.product}</td>
                          <td className="px-6 py-4 text-blue-600 text-right font-semibold">
                            {formatNumber(product.total_weight)}
                          </td>
                          {topProductsFilters.clients?.map((client, idx) => (
                            <td key={idx} className="px-6 py-4 text-gray-700 text-right">
                              {formatNumber(product.clients[client])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* История Покупок */}
        {activeTab === 'history' && (
          <div>
            {/* Фильтры */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Фильтры
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Клиент *
                  </label>
                  <input
                    type="text"
                    list="clients-list"
                    value={historyFilters.client}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, client: e.target.value })}
                    placeholder="Начните вводить название..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="clients-list">
                    {clientsList.map((client) => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Товар
                  </label>
                  <input
                    type="text"
                    list="products-list"
                    value={historyFilters.product}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, product: e.target.value })}
                    placeholder="Фильтр по товару"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="products-list">
                    {productsList.map((product) => (
                      <option key={product} value={product} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={historyFilters.start_date}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, start_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={historyFilters.end_date}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, end_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* Фильтр по региону */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Регион
                </label>
                <select
                  value={historyFilters.region || ''}
                  onChange={(e) => setHistoryFilters({ ...historyFilters, region: e.target.value })}
                  className="w-full md:w-1/4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все регионы</option>
                  {regionsList.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadPurchaseHistory}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Загрузить историю
              </button>
            </div>

            {/* Таблица истории */}
            {loading ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow">Загрузка...</div>
            ) : error ? (
              <div className="text-center text-red-600 py-12 bg-white rounded-lg shadow">{error}</div>
            ) : purchaseHistory.length > 0 ? (
              <div className="bg-white rounded-lg shadow-md">
                <div className="overflow-auto max-h-[calc(100vh-280px)]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Дата</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Товар</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Вес (кг)</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Количество</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Доход</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Дилер</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseHistory.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-6 py-4 text-gray-900">{item.product}</td>
                          <td className="px-6 py-4 text-gray-700 text-right">
                            {formatNumber(item.weight)}
                          </td>
                          <td className="px-6 py-4 text-gray-700 text-right">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="px-6 py-4 text-green-600 text-right font-semibold">
                            {formatNumber(item.revenue)}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{item.dealer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 text-gray-600 text-sm bg-gray-50 border-t border-gray-200 flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Всего записей: {purchaseHistory.length}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">
                Выберите клиента и нажмите &quot;Загрузить историю&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
