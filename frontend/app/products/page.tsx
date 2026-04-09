'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Home, Calendar, Warehouse, Globe, Search, Inbox, TrendingUp, TrendingDown, Minus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient, formatNumber, getGrowthColor } from '@/lib/api';
import { ProductData, FilterParams, YEARS, MONTHS } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [filters, setFilters] = useState<FilterParams>({
    month: '',
    warehouse: '',
    region: '',
  });

  // Load initial data
  useEffect(() => {
    loadFilters();
    loadProducts();
  }, []);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadFilters = async () => {
    try {
      const [warehousesData, regionsData] = await Promise.all([
        apiClient.getWarehouses(),
        apiClient.getRegions(),
      ]);
      setWarehouses(warehousesData);
      setRegions(regionsData);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getProductsByYears(filters);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sorting and filtering
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortedAndFilteredProducts = () => {
    const filtered = products.filter(product => 
      product.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      if (sortBy === 'code') {
        compareA = a.code;
        compareB = b.code;
      } else {
        // Сортировка по году
        compareA = a.years[sortBy]?.value || 0;
        compareB = b.years[sortBy]?.value || 0;
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedProducts = getSortedAndFilteredProducts();

  // Calculate totals
  const totals = YEARS.reduce((acc, year) => {
    acc[year] = products.reduce((sum, product) => {
      return sum + (product.years[year]?.value || 0);
    }, 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate growth for totals
  const totalsGrowth = YEARS.reduce((acc, year, index) => {
    if (index === 0) {
      acc[year] = null;
    } else {
      const prevYear = YEARS[index - 1];
      const current = totals[year];
      const prev = totals[prevYear];
      if (prev > 0 && current > 0) {
        acc[year] = Math.round(((current - prev) / prev) * 100);
      } else {
        acc[year] = null;
      }
    }
    return acc;
  }, {} as Record<string, number | null>);

  const filterInfo = [
    filters.month && `Месяц: ${MONTHS.find(m => m.value === filters.month)?.label}`,
    filters.warehouse && `Склад: ${filters.warehouse}`,
    filters.region && `Регион: ${filters.region}`,
  ].filter(Boolean).join(' | ') || 'Все данные';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8" /> Аналитика по продуктам
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
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" /> Поиск
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Название товара..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Месяц
              </label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> Склад
              </label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все склады</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Регион
              </label>
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все регионы</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 font-medium flex items-center gap-2">
            <Search className="w-4 h-4" /> {filterInfo}
            {searchQuery && ` | Поиск: "${searchQuery}"`}
            {sortBy !== 'code' && ` | Сортировка: ${sortBy}`}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Загрузка данных...</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-blue-700 transition"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center gap-2">
                        Товар
                        {sortBy === 'code' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                        {sortBy !== 'code' && <ArrowUpDown className="w-4 h-4 opacity-50" />}
                      </div>
                    </th>
                    {YEARS.map((year) => (
                      <th 
                        key={year} 
                        className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-blue-700 transition"
                        onClick={() => handleSort(year)}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {year}
                          {sortBy === year && (
                            sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                          {sortBy !== year && <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Inbox className="w-5 h-5" /> Нет данных для отображения
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sortedProducts.map((product, index) => (
                        <tr
                          key={product.code}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 font-semibold text-blue-700 border-b">
                            {product.code}
                          </td>
                          {YEARS.map((year) => {
                            const value = product.years[year]?.value;
                            const growth = product.growth[year];
                            return (
                              <td key={year} className="px-4 py-3 text-center border-b">
                                <div className="font-semibold text-gray-900">
                                  {formatNumber(value)}
                                </div>
                                {year !== '2020' && (
                                  <div className="text-sm font-bold flex items-center justify-center gap-1">
                                    {growth !== null ? (
                                      <>
                                        {growth > 0 ? (
                                          <>
                                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                            <span className="text-green-600">{growth}%</span>
                                          </>
                                        ) : growth < 0 ? (
                                          <>
                                            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                            <span className="text-red-600">{growth}%</span>
                                          </>
                                        ) : (
                                          <>
                                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                                            <span className="text-gray-600">{growth}%</span>
                                          </>
                                        )}
                                      </>
                                    ) : '-'}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold">
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <BarChart3 className="w-5 h-5" /> ИТОГИ
                          </div>
                        </td>
                        {YEARS.map((year) => {
                          const growth = totalsGrowth[year];
                          return (
                            <td key={year} className="px-4 py-4 text-center">
                              <div className="font-bold text-lg">
                                {formatNumber(totals[year])}
                              </div>
                              {year !== '2020' && (
                                <div className="text-sm flex items-center justify-center gap-1">
                                  {growth !== null ? (
                                    <>
                                      {growth > 0 ? (
                                        <>
                                          <TrendingUp className="w-3.5 h-3.5 text-white/90" />
                                          <span className="text-white/90">{growth}%</span>
                                        </>
                                      ) : growth < 0 ? (
                                        <>
                                          <TrendingDown className="w-3.5 h-3.5 text-white/90" />
                                          <span className="text-white/90">{growth}%</span>
                                        </>
                                      ) : (
                                        <>
                                          <Minus className="w-3.5 h-3.5 text-white/90" />
                                          <span className="text-white/90">{growth}%</span>
                                        </>
                                      )}
                                    </>
                                  ) : '-'}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-blue-600">{sortedProducts.length}</div>
            <div className="text-gray-600">Товаров</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">
              {formatNumber(totals['2025'])}
            </div>
            <div className="text-gray-600">Итого 2025</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className={`text-3xl font-bold ${getGrowthColor(totalsGrowth['2025'])}`}>
              {totalsGrowth['2025'] !== null ? `${totalsGrowth['2025']}%` : '-'}
            </div>
            <div className="text-gray-600">Рост 2025</div>
          </div>
        </div>
      </div>
    </div>
  );
}
