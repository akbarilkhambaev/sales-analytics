'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Home, BookOpen, Search, AlertTriangle, CheckCircle,
  RefreshCw, Zap, X, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import ComboBox from '@/components/ComboBox';
import { TovaryMappingItem } from '@/lib/types';

type EditState = {
  id: number;
  kod_tovara: string;
  gruppa_tovara: string;
  cvet: string;
  profil_perechen: string;
};

export default function TovaryMappingPage() {
  const [items, setItems] = useState<TovaryMappingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [uncoded, setUncoded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCoded, setFilterCoded] = useState<'all' | 'true' | 'false'>('all');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncodedOpen, setUncodedOpen] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (s: string, coded: 'all' | 'true' | 'false') => {
    setLoading(true);
    setError(null);
    try {
      const params: { search?: string; coded?: 'true' | 'false' } = {};
      if (s) params.search = s;
      if (coded !== 'all') params.coded = coded;
      const data = await apiClient.getTovaryMapping(params);
      setItems(data.results);
      setTotal(data.total);
      setUncoded(data.uncoded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(search, filterCoded);
  }, []);  // eslint-disable-line

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val, filterCoded), 400);
  };

  const handleFilter = (val: 'all' | 'true' | 'false') => {
    setFilterCoded(val);
    load(search, val);
  };

  const startEdit = (item: TovaryMappingItem) => {
    setEditState({
      id: item.id,
      kod_tovara:     item.kod_tovara     ?? '',
      gruppa_tovara:  item.gruppa_tovara  ?? '',
      cvet:           item.cvet           ?? '',
      profil_perechen: item.profil_perechen ?? '',
    });
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateTovaryMapping(editState.id, {
        kod_tovara:     editState.kod_tovara     || null,
        gruppa_tovara:  editState.gruppa_tovara  || null,
        cvet:           editState.cvet           || null,
        profil_perechen: editState.profil_perechen || null,
      });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setUncoded(prev => {
        const was = items.find(i => i.id === updated.id);
        if (was && !was.is_coded && updated.is_coded) return prev - 1;
        if (was && was.is_coded && !updated.is_coded) return prev + 1;
        return prev;
      });
      setEditState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const applyMapping = async () => {
    setApplying(true);
    setApplyResult(null);
    setError(null);
    try {
      const res = await apiClient.applyTovaryMapping();
      setApplyResult(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка применения');
    } finally {
      setApplying(false);
    }
  };

  const uncodedItems = items.filter(i => !i.is_coded);
  const codedItems   = items.filter(i =>  i.is_coded);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8" /> Справочник товаров
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
            <p className="text-sm text-gray-500">Всего товаров</p>
            <p className="text-2xl font-bold text-indigo-600">{total.toLocaleString('ru')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500">Закодированы</p>
            <p className="text-2xl font-bold text-green-600">{(total - uncoded).toLocaleString('ru')}</p>
          </div>
          <div className={`rounded-lg shadow-sm p-5 ${uncoded > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <p className="text-sm text-gray-500">Не закодированы</p>
            <p className={`text-2xl font-bold ${uncoded > 0 ? 'text-red-600' : 'text-gray-400'}`}>{uncoded}</p>
          </div>
        </div>

        {/* Alert: uncoded */}
        {uncoded > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg mb-6">
            <button
              onClick={() => setUncodedOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-800">
                  Не закодированы {uncoded} {uncoded === 1 ? 'товар' : 'товаров'} — заполните поля ниже
                </span>
              </div>
              {uncodedOpen ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
            </button>

            {uncodedOpen && (
              <div className="border-t border-amber-200 overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-amber-800">ТОВАРЫ</th>
                      <th className="px-4 py-2 text-left text-amber-800">КОД_ТОВАРА</th>
                      <th className="px-4 py-2 text-left text-amber-800">ГРУППА_ТОВАРА</th>
                      <th className="px-4 py-2 text-left text-amber-800">ЦВЕТ</th>
                      <th className="px-4 py-2 text-left text-amber-800">профиль_перечень</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {uncodedItems.map(item => (
                      <tr key={item.id} className="border-t border-amber-100 hover:bg-amber-50">
                        <td className="px-4 py-2 font-medium text-gray-800 max-w-xs truncate">{item.tovary}</td>
                        <td className="px-4 py-2 text-red-500">{item.kod_tovara ?? '—'}</td>
                        <td className="px-4 py-2 text-red-500">{item.gruppa_tovara ?? '—'}</td>
                        <td className="px-4 py-2 text-red-500">{item.cvet ?? '—'}</td>
                        <td className="px-4 py-2 text-red-500">{item.profil_perechen ?? '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => { setFilterCoded('all'); setSearch(''); startEdit(item); }}
                            className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded"
                          >
                            Заполнить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Apply button */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Применить справочник к продажам</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Заполнит КОД_ТОВАРА, ГРУППА, ЦВЕТ, ПРОФИЛЬ у записей Sale где эти поля пустые
            </p>
          </div>
          <button
            onClick={applyMapping}
            disabled={applying}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            {applying ? 'Применяю...' : 'Применить'}
          </button>
        </div>

        {applyResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-3 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 text-sm font-medium">{applyResult}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Поиск по ТОВАРЫ, КОД, ГРУППА..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'false', 'true'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleFilter(v)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filterCoded === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {v === 'all' ? 'Все' : v === 'false' ? '⚠ Не закодированы' : '✓ Закодированы'}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(search, filterCoded)}
            className="p-2 text-gray-500 hover:text-indigo-600 transition"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/3">ТОВАРЫ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">КОД_ТОВАРА</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ГРУППА_ТОВАРА</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ЦВЕТ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">профиль_перечень</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Загрузка...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Ничего не найдено</td></tr>
                ) : items.map(item => {
                  const isEditing = editState?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${!item.is_coded ? 'bg-red-50/40' : ''}`}
                    >
                      {/* ТОВАРЫ */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.is_coded ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="text-gray-800 break-words">{item.tovary}</span>
                        </div>
                      </td>

                      {isEditing ? (
                        <>
                          <td className="px-2 py-2">
                            <ComboBox
                              field="kod_tovara"
                              value={editState.kod_tovara}
                              onChange={v => setEditState(s => s && ({ ...s, kod_tovara: v }))}
                              placeholder="КОД_ТОВАРА"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <ComboBox
                              field="gruppa_tovara"
                              value={editState.gruppa_tovara}
                              onChange={v => setEditState(s => s && ({ ...s, gruppa_tovara: v }))}
                              placeholder="ГРУППА_ТОВАРА"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <ComboBox
                              field="cvet"
                              value={editState.cvet}
                              onChange={v => setEditState(s => s && ({ ...s, cvet: v }))}
                              placeholder="ЦВЕТ"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <ComboBox
                              field="profil_perechen"
                              value={editState.profil_perechen}
                              onChange={v => setEditState(s => s && ({ ...s, profil_perechen: v }))}
                              placeholder="профиль_перечень"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded"
                                title="Сохранить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded"
                                title="Отмена"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-gray-700">{item.kod_tovara ?? <span className="text-red-400">—</span>}</td>
                          <td className="px-4 py-3 text-gray-700">{item.gruppa_tovara ?? <span className="text-red-400">—</span>}</td>
                          <td className="px-4 py-3 text-gray-700">{item.cvet ?? <span className="text-red-400">—</span>}</td>
                          <td className="px-4 py-3 text-gray-700">{item.profil_perechen ?? <span className="text-red-400">—</span>}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => startEdit(item)}
                              className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium transition"
                            >
                              Изменить
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Показано {items.length} из {total.toLocaleString('ru')} товаров
          </div>
        </div>
      </div>
    </div>
  );
}
