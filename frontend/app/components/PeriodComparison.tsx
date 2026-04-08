'use client';

import { useState } from 'react';
import { apiClient, formatNumber } from '@/lib/api';
import type { SalesComparison } from '@/lib/types';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function PeriodComparison() {
  const [comparison, setComparison] = useState<SalesComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [period1Start, setPeriod1Start] = useState('');
  const [period1End, setPeriod1End] = useState('');
  const [period2Start, setPeriod2Start] = useState('');
  const [period2End, setPeriod2End] = useState('');

  const handleCompare = async () => {
    if (!period1Start || !period1End || !period2Start || !period2End) {
      alert('Заполните все даты периодов');
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getSalesComparison({
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
      });
      setComparison(data);
    } catch (error) {
      console.error('Ошибка сравнения периодов:', error);
      alert('Ошибка при сравнении периодов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Сравнение периодов
      </h2>

      {/* Форма выбора периодов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Период 1 */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Период 1</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Начало</label>
              <input
                type="date"
                value={period1Start}
                onChange={(e) => setPeriod1Start(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Конец</label>
              <input
                type="date"
                value={period1End}
                onChange={(e) => setPeriod1End(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Период 2 */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Период 2</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Начало</label>
              <input
                type="date"
                value={period2Start}
                onChange={(e) => setPeriod2Start(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Конец</label>
              <input
                type="date"
                value={period2End}
                onChange={(e) => setPeriod2End(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка сравнения */}
      <button
        onClick={handleCompare}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Сравнение...' : 'Сравнить периоды'}
      </button>

      {/* Результаты сравнения */}
      {comparison && (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            <ComparisonCard
              title="Объем продаж"
              period1Value={comparison.period1.data.sales_volume}
              period2Value={comparison.period2.data.sales_volume}
              change={comparison.changes.sales_volume}
              unit="кг"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ComparisonCardProps {
  title: string;
  period1Value: number;
  period2Value: number;
  change: {
    absolute: number;
    percentage: number;
  };
  unit?: string;
}

function ComparisonCard({ title, period1Value, period2Value, change, unit }: ComparisonCardProps) {
  const isPositive = change.percentage > 0;
  const isNegative = change.percentage < 0;

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-3">{title}</h4>
      
      {/* Период 1 */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">Период 1</p>
        <p className="text-lg font-semibold text-gray-900">
          {formatNumber(period1Value)}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>

      {/* Период 2 */}
      <div className="mb-3">
        <p className="text-xs text-gray-500">Период 2</p>
        <p className="text-lg font-semibold text-gray-900">
          {formatNumber(period2Value)}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>

      {/* Изменение */}
      <div className={`flex items-center gap-1 text-sm font-medium ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
      }`}>
        {isPositive && <TrendingUp className="w-4 h-4" />}
        {isNegative && <TrendingDown className="w-4 h-4" />}
        <span>
          {isPositive && '+'}
          {change.percentage.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500">
          ({isPositive && '+'}
          {formatNumber(change.absolute)}
          {unit && ` ${unit}`})
        </span>
      </div>
    </div>
  );
}
