'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Trash2, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient, formatNumber } from '@/lib/api';

type ModelChoice = 'sale' | 'ready_sale' | 'both';

interface PreviewResult {
  counts: Record<string, number>;
  total: number;
}

interface DeleteResult {
  deleted: Record<string, number>;
  total: number;
  message: string;
}

const MODEL_LABELS: Record<string, string> = {
  sale: 'Продажи (Sale)',
  ready_sale: 'Готовые продажи (ReadySale)',
};

export default function DataManagementPage() {
  const [model, setModel] = useState<ModelChoice>('both');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePreview = async () => {
    setError(null);
    setPreview(null);
    setDeleteResult(null);
    setShowConfirm(false);
    setConfirmText('');
    setLoading(true);
    try {
      const result = await apiClient.dataManage({
        action: 'preview',
        model,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setPreview({ counts: result.counts ?? {}, total: result.total });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.dataManage({
        action: 'delete',
        model,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setDeleteResult({ deleted: result.deleted ?? {}, total: result.total, message: result.message ?? '' });
      setPreview(null);
      setShowConfirm(false);
      setConfirmText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при удалении');
    } finally {
      setLoading(false);
    }
  };

  const canDelete = preview && preview.total > 0 && confirmText === 'УДАЛИТЬ';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trash2 className="w-8 h-8" /> Управление данными
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Warning banner */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Удаление данных <strong>необратимо</strong>. Перед удалением убедитесь, что выбраны правильные даты,
            и обязательно сделайте резервную копию базы данных.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-5">
          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Таблица</label>
            <select
              value={model}
              onChange={(e) => { setModel(e.target.value as ModelChoice); setPreview(null); setDeleteResult(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent"
            >
              <option value="both">Обе таблицы (Sale + ReadySale)</option>
              <option value="sale">Только Sale (~1M строк)</option>
              <option value="ready_sale">Только ReadySale (~4.8M строк)</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата от</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPreview(null); setDeleteResult(null); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата до</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPreview(null); setDeleteResult(null); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview button */}
          <button
            onClick={handlePreview}
            disabled={loading || (!dateFrom && !dateTo)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Загрузка...' : 'Предпросмотр — сколько записей будет удалено'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Preview result */}
        {preview && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Результат предпросмотра</h2>
            <div className="space-y-2 mb-4">
              {Object.entries(preview.counts).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{MODEL_LABELS[name] ?? name}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(count)} строк</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-gray-800">Итого</span>
                <span className="text-lg font-bold text-red-600">{formatNumber(preview.total)} строк</span>
              </div>
            </div>

            {preview.total === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">Записей не найдено — нечего удалять.</p>
            ) : (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <p className="text-sm text-red-800 mb-3">
                  Для подтверждения удаления введите слово <strong>УДАЛИТЬ</strong> в поле ниже:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="УДАЛИТЬ"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                >
                  <Trash2 className="w-5 h-5" />
                  {loading ? 'Удаление...' : `Удалить ${formatNumber(preview.total)} записей`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete success */}
        {deleteResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold text-green-800">{deleteResult.message}</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(deleteResult.deleted).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{MODEL_LABELS[name] ?? name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(count)} строк</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
