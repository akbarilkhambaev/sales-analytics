'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Home, 
  PackageOpen, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Warehouse,
  Globe
} from 'lucide-react';
import { apiClient, formatNumber } from '@/lib/api';
import { ProductHierarchy, FilterParams, YEARS, MONTHS } from '@/lib/types';

export default function HierarchyPage() {
  const [products, setProducts] = useState<ProductHierarchy[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterParams>({
    month: '',
    warehouse: '',
    region: '',
  });

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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getProductsHierarchy(filters);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load initial data
  useEffect(() => {
    loadFilters();
  }, []);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleProduct = (kodTovara: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(kodTovara)) {
      newExpanded.delete(kodTovara);
    } else {
      newExpanded.add(kodTovara);
    }
    setExpandedProducts(newExpanded);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <PackageOpen className="w-8 h-8" /> Иерархия продукций
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
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <PackageOpen className="w-8 h-8" /> Иерархия продукций
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Ошибка: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PackageOpen className="w-8 h-8" /> Иерархия продукций
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4" /> Месяц
              </label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Warehouse className="w-4 h-4" /> Склад
              </label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Все склады</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" /> Регион
              </label>
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Всего продукций</p>
              <p className="text-2xl font-bold text-purple-600">{products.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Всего профилей</p>
              <p className="text-2xl font-bold text-purple-600">
                {products.reduce((sum, p) => sum + p.profiles.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Общий объем</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatNumber(products.reduce((sum, p) => sum + p.total_sales, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-340px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50" rowSpan={2}>
                    Продукция / Профиль
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Всего (кг)
                  </th>
                  {YEARS.map((year) => (
                    <th key={year} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200" colSpan={2}>
                      {year}
                    </th>
                  ))}
                </tr>
                <tr>
                  {YEARS.map((year) => (
                    <>
                      <th key={`${year}-pcs`} className="px-3 py-2 text-right text-xs font-medium text-blue-500 border-l border-gray-200">шт</th>
                      <th key={`${year}-kg`} className="px-3 py-2 text-right text-xs font-medium text-purple-500">кг</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isExpanded = expandedProducts.has(product.kod_tovara);
                  
                  return (
                    <>
                      {/* Product Row */}
                      <tr 
                        key={product.kod_tovara}
                        className="hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={() => toggleProduct(product.kod_tovara)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white hover:bg-purple-50">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-purple-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="font-semibold text-purple-900">{product.kod_tovara}</span>
                            <span className="text-xs text-gray-500">({product.profiles.length} профилей)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-purple-900">
                          {formatNumber(product.total_sales)}
                        </td>
                        {YEARS.map((year) => {
                          const yearKg = product.profiles.reduce((sum, profile) => sum + (profile.years[year]?.value || 0), 0);
                          const yearPcs = product.profiles.reduce((sum, profile) => sum + (profile.years[year]?.pieces || 0), 0);
                          return (
                            <>
                              <td key={`${year}-pcs`} className="px-3 py-4 whitespace-nowrap text-right text-blue-600 text-sm border-l border-gray-100">
                                {yearPcs > 0 ? formatNumber(yearPcs) : '-'}
                              </td>
                              <td key={`${year}-kg`} className="px-3 py-4 whitespace-nowrap text-right text-gray-700 text-sm">
                                {yearKg > 0 ? formatNumber(yearKg) : '-'}
                              </td>
                            </>
                          );
                        })}
                      </tr>

                      {/* Profile Rows (when expanded) */}
                      {isExpanded && product.profiles.map((profile) => (
                        <tr key={`${product.kod_tovara}-${profile.name}`} className="bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap sticky left-0 bg-gray-50">
                            <div className="flex items-center gap-2 pl-8">
                              <span className="text-sm text-gray-700">{profile.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                            {formatNumber(profile.total)}
                          </td>
                          {YEARS.map((year) => (
                            <>
                              <td key={`${year}-pcs`} className="px-3 py-3 whitespace-nowrap text-right text-sm text-blue-500 border-l border-gray-100">
                                {profile.years[year]?.pieces > 0 ? formatNumber(profile.years[year].pieces) : '-'}
                              </td>
                              <td key={`${year}-kg`} className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                                {profile.years[year]?.value > 0 ? formatNumber(profile.years[year].value) : '-'}
                              </td>
                            </>
                          ))}
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
