'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Home, MapPin, Search, AlertTriangle, CheckCircle,
  RefreshCw, Zap, X, Check, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { SchetaMappingItem } from '@/lib/types';

type EditState = {
  id: number;
  region: string;
};

export default function RegionMappingPage() {
  const [items, setItems]           = useState<SchetaMappingItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [unmapped, setUnmapped]     = useState(0);
  const [regions, setRegions]       = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterMapped, setFilterMapped] = useState<'all' | 'true' | 'false'>('all');
  const [editState, setEditState]   = useState<EditState | null>(null);
  const [saving, setSaving]         = useState(false);
  const [applying, setApplying]     = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [count, setCount]           = useState(0);
  const PER_PAGE = 50;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (s: string, mapped: 'all' | 'true' | 'false', p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: { search?: string; mapped?: 'true' | 'false'; page?: number; per_page?: number } = { page: p, per_page: PER_PAGE };
      if (s) params.search = s;
      if (mapped !== 'all') params.mapped = mapped;
      const data = await apiClient.getSchetaMapping(params);
      setItems(data.results);
      setTotal(data.total);
      setUnmapped(data.unmapped);
      setPage(data.page);
      setPages(data.pages);
      setCount(data.count);
      if (data.regions?.length) setRegions(data.regions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load('', 'all', 1); }, []);  // eslint-disable-line

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val, filterMapped, 1), 400);
  };

  const handleFilter = (val: 'all' | 'true' | 'false') => {
    setFilterMapped(val);
    load(search, val, 1);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > pages) return;
    load(search, filterMapped, p);
  };

  const startEdit = (item: SchetaMappingItem) => {
    setEditState({ id: item.id, region: item.region ?? '' });
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateSchetaMapping(editState.id, {
        region: editState.region || null,
      });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setUnmapped(prev => {
        const was = items.find(i => i.id === updated.id);
        if (was && !was.is_mapped && updated.is_mapped) return prev - 1;
        if (was && was.is_mapped && !updated.is_mapped) return prev + 1;
        return prev;
      });
      setEditState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const syncMapping = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const result = await apiClient.syncSchetaMapping();
      setApplyResult(`Синхронизация: ${result.message}`);
      load(search, filterMapped, 1);
    } catch (e) {
      setApplyResult(e instanceof Error ? e.message : 'Ошибка синхронизации');
    } finally {
      setApplying(false);
    }
  };

  const applyMapping = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const result = await apiClient.applySchetaMapping();
      setApplyResult(result.message);
    } catch (e) {
      setApplyResult(e instanceof Error ? e.message : 'Ошибка применения');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MapPin className="w-8 h-8" /> Справочник счетов → регион
            </h1>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                Администрирование
              </Link>
              <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                <Home className="w-5 h-5" /> Главная
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500">Всего счетов</p>
            <p className="text-2xl font-bold text-blue-600">{total.toLocaleString('ru')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500">Сопоставлены</p>
            <p className="text-2xl font-bold text-green-600">{(total - unmapped).toLocaleString('ru')}</p>
          </div>
          <div className={`rounded-lg shadow-sm p-5 ${unmapped > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <p className="text-sm text-gray-500">Без региона</p>
            <p className={`text-2xl font-bold ${unmapped > 0 ? 'text-red-600' : 'text-gray-400'}`}>{unmapped}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center gap-3 flex-wrap">
          <button
            onClick={syncMapping}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={applying ? 'animate-spin' : ''} />
            Синхронизировать счета из продаж
          </button>
          <button
            onClick={applyMapping}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Zap size={15} />
            Применить к продажам
          </button>
          {applyResult && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              applyResult.includes('Ошибка') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {applyResult.includes('Ошибка') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
              {applyResult}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по счёту или региону..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'false', 'true'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleFilter(v)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMapped === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v === 'all' ? 'Все' : v === 'false' ? 'Без региона' : 'Сопоставленные'}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-400">Показано: {count}</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-8">#</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Счёт (СЧЕТЫ)</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-56">Регион</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-36">Обновлён</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium w-28">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Загрузка...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Нет данных
                  </td>
                </tr>
              ) : items.map((item, idx) => {
                const isEditing = editState?.id === item.id;
                const rowNum = (page - 1) * PER_PAGE + idx + 1;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${!item.is_mapped ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{rowNum}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-800">{item.scheta}</span>
                      {!item.is_mapped && (
                        <span className="ml-2 text-xs text-amber-600 font-medium">не сопоставлен</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={editState.region}
                          onChange={e => setEditState(s => s ? { ...s, region: e.target.value } : s)}
                          className="w-full border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                          autoFocus
                        >
                          <option value="">— не выбрано —</option>
                          {regions.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={item.region ? 'text-blue-700 font-medium' : 'text-gray-400 italic'}>
                          {item.region || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{item.updated_at || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1.5 bg-green-600 hover:bg-green-700 rounded text-white transition-colors disabled:opacity-50"
                            title="Сохранить"
                          >
                            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-600 transition-colors"
                            title="Отмена"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                        >
                          Изменить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between py-4">
            <span className="text-sm text-gray-500">Страница {page} из {pages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm border transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pages}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
