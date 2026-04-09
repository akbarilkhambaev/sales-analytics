'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Home, 
  Palette, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Warehouse,
  Globe
} from 'lucide-react';
import { apiClient, formatNumber } from '@/lib/api';
import { ProductColorsHierarchy, FilterParams, YEARS, MONTHS } from '@/lib/types';

export default function ColorsPage() {
  const [products, setProducts] = useState<ProductColorsHierarchy[]>([]);
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
      const data = await apiClient.getProductsColorsHierarchy(filters);
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

  const toggleProduct = (product: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(product)) {
      newExpanded.delete(product);
    } else {
      newExpanded.add(product);
    }
    setExpandedProducts(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Palette className="w-8 h-8" /> Продукты по цветам
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Palette className="w-8 h-8" /> Продукты по цветам
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
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="w-8 h-8" /> Продукты по цветам
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              <p className="text-sm text-gray-600">Всего продуктов</p>
              <p className="text-2xl font-bold text-amber-600">{products.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Всего цветов</p>
              <p className="text-2xl font-bold text-amber-600">
                {products.reduce((sum, p) => sum + p.colors.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Общий объем</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatNumber(products.reduce((sum, p) => sum + p.total_sales, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-340px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-amber-50 z-10" rowSpan={2}>
                    Продукт / Цвет
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider" rowSpan={2}>
                    Всего (кг)
                  </th>
                  {YEARS.map((year) => (
                    <th key={year} className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-l border-gray-200" colSpan={2}>
                      {year}
                    </th>
                  ))}
                </tr>
                <tr>
                  {YEARS.map((year) => (
                    <>
                      <th key={`${year}-pcs`} className="px-3 py-2 text-right text-xs font-medium text-blue-500 border-l border-gray-200">шт</th>
                      <th key={`${year}-kg`} className="px-3 py-2 text-right text-xs font-medium text-amber-600">кг</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isExpanded = expandedProducts.has(product.product);
                  
                  return (
                    <>
                      {/* Product Row */}
                      <tr 
                        key={product.product}
                        className="hover:bg-amber-50 cursor-pointer font-semibold"
                        onClick={() => toggleProduct(product.product)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white hover:bg-amber-50">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-amber-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">{product.product}</span>
                            <span className="text-xs text-gray-500">({product.colors.length})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatNumber(product.total_sales)}
                        </td>
                        {YEARS.map((year) => {
                          const yearKg = product.colors.reduce((sum, c) => sum + (c.years[year]?.value || 0), 0);
                          const yearPcs = product.colors.reduce((sum, c) => sum + (c.years[year]?.pieces || 0), 0);
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

                      {/* Color Rows */}
                      {isExpanded && product.colors.map((color) => (
                        <tr key={`${product.product}-${color.name}`} className="bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap sticky left-0 bg-gray-50">
                            <div className="flex items-center gap-2 pl-8">
                              <span className="text-sm text-gray-700">{color.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                            {formatNumber(color.total)}
                          </td>
                          {YEARS.map((year) => (
                            <>
                              <td key={`${year}-pcs`} className="px-3 py-3 whitespace-nowrap text-right text-sm text-blue-500 border-l border-gray-100">
                                {color.years[year]?.pieces > 0 ? formatNumber(color.years[year].pieces) : '-'}
                              </td>
                              <td key={`${year}-kg`} className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                                {color.years[year]?.value > 0 ? formatNumber(color.years[year].value) : '-'}
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
