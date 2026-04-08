'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ExportToExcel from '../components/ExportToExcel';
import PeriodComparison from '../components/PeriodComparison';
import { apiClient, formatNumber } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { DashboardMetrics } from '@/lib/types';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Package, 
  ShoppingCart,
  Calendar,
  Home,
  BarChart3
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadMetrics();
  }, [isAuthenticated, authLoading, router]);

  const loadMetrics = async (dateParams?: { start_date?: string; end_date?: string }) => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardMetrics(dateParams);
      setMetrics(data);
    } catch (error) {
      console.error('Ошибка загрузки метрик:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadMetrics({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    loadMetrics();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="w-8 h-8" /> Дашборд Аналитики
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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка метрик...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="w-8 h-8" /> Дашборд Аналитики
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
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Нет данных для отображения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8" /> Дашборд Аналитики
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
        {/* Кнопка экспорта */}
        <div className="mb-8 flex items-center justify-end">
          {metrics && (
            <ExportToExcel
              data={[
                ...metrics.sales_trend.map(item => ({ type: 'sales_trend', ...item })),
                ...metrics.top_products.map(item => ({ type: 'top_products', ...item })),
                ...metrics.top_regions.map(item => ({ type: 'top_regions', ...item })),
                ...metrics.sales_by_group.map(item => ({ type: 'sales_by_group', ...item })),
              ]}
              filename="dashboard_metrics"
              sheetName="Metrics"
            />
          )}
        </div>

        {/* Фильтры по датам */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Начало периода
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Конец периода
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Применить
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Карточки с ключевыми метриками */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="Объем продаж"
            value={formatNumber(metrics.summary.total_sales_volume)}
            icon={<ShoppingCart className="w-8 h-8" />}
            color="blue"
            unit="кг"
          />
          <MetricCard
            title="Продукты"
            value={metrics.summary.unique_products.toString()}
            icon={<Package className="w-8 h-8" />}
            color="orange"
          />
        </div>

        {/* Графики */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Динамика продаж */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Динамика объема продаж</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => formatNumber(Number(value || 0))} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Объем (кг)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Топ продукты и регионы */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Топ продукты */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Топ-5 продуктов</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.top_products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => formatNumber(Number(value || 0))} />
                <Legend />
                <Bar dataKey="volume" fill="#3b82f6" name="Объем (кг)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Топ регионы */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Топ-5 регионов</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.top_regions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => formatNumber(Number(value || 0))} />
                <Legend />
                <Bar dataKey="volume" fill="#10b981" name="Объем (кг)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Распределение по группам товаров */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Распределение по группам товаров</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Круговая диаграмма */}
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={metrics.sales_by_group}
                  dataKey="volume"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {metrics.sales_by_group.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => formatNumber(Number(value || 0))} />
              </PieChart>
            </ResponsiveContainer>

            {/* Таблица с цифрами */}
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold text-gray-700">Группа</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">Объем (кг)</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">%</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.sales_by_group.map((item, index) => {
                    const total = metrics.sales_by_group.reduce((sum, i) => sum + i.volume, 0);
                    const percentage = (item.volume / total) * 100;
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {item.group}
                        </td>
                        <td className="text-right py-2 px-4">{formatNumber(item.volume)}</td>
                        <td className="text-right py-2 px-4">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Сравнение периодов */}
        <div className="mt-8">
          <PeriodComparison />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange';
  unit?: string;
}

function MetricCard({ title, value, icon, color, unit }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
