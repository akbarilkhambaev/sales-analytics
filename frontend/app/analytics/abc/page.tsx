'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Home, TrendingUp, RefreshCw } from 'lucide-react';
import FullscreenButton from '@/components/FullscreenButton';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { apiClient } from '@/lib/api';

interface ABCItem {
  rank: number;
  name: string;
  volume: number;
  pct: number;
  cumulative: number;
  category: 'A' | 'B' | 'C';
}

interface ABCSummary {
  a_count: number; b_count: number; c_count: number;
  a_volume: number; b_volume: number; c_volume: number;
  a_pct: number; b_pct: number; c_pct: number;
}

const GROUPBY_OPTIONS = [
  { value: 'gruppa_tovara', label: 'По группам товаров' },
  { value: 'region', label: 'По регионам' },
  { value: 'kod_tovara', label: 'По кодам товаров' },
  { value: 'cvet', label: 'По цвету' },
  { value: 'tovary', label: 'По товарам' },
];

const CAT_COLORS: Record<string, string> = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };
const CAT_BG: Record<string, string> = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-amber-100 text-amber-800', C: 'bg-red-100 text-red-800' };

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
}

export default function ABCPage() {
  const curYear = new Date().getFullYear();
  const [groupby, setGroupby] = useState('kod_tovara');
  const [startDate, setStartDate] = useState(`${curYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ABCItem[]>([]);
  const [summary, setSummary] = useState<ABCSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState<'all' | 'A' | 'B' | 'C'>('all');

  const load = useCallback(async (gb: string, sd: string, ed: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getABCAnalysis({ groupby: gb, start_date: sd, end_date: ed });
      setItems(data.items.map((item) => ({
        rank: item.rank,
        name: item.name,
        volume: item.volume,
        pct: item.pct,
        cumulative: item.cumulative,
        category: item.category,
      })));
      setSummary({
        a_count: data.summary.a_count,
        b_count: data.summary.b_count,
        c_count: data.summary.c_count,
        a_volume: data.summary.a_volume,
        b_volume: data.summary.b_volume,
        c_volume: data.summary.c_volume,
        a_pct: data.summary.a_pct,
        b_pct: data.summary.b_pct,
        c_pct: data.summary.c_pct,
      });
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(groupby, startDate, endDate); }, []);  // eslint-disable-line

  const filtered = filterCat === 'all' ? items : items.filter((item) => item.category === filterCat);

  const pieData = summary ? [
    { name: 'A', value: summary.a_pct, count: summary.a_count },
    { name: 'B', value: summary.b_pct, count: summary.b_count },
    { name: 'C', value: summary.c_pct, count: summary.c_count },
  ] : [];

  const barData = items.slice(0, 20).map((item) => ({
    name: item.name.length > 20 ? `${item.name.slice(0, 18)}...` : item.name,
    volume: item.volume,
    category: item.category,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7" />
            <div>
              <h1 className="text-2xl font-bold">ABC-Анализ</h1>
              <p className="text-sm text-violet-200">Классификация по объёму продаж</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FullscreenButton size="sm" />
            <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-sm transition">
              <Home className="w-4 h-4" /> Главная
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Группировка</label>
            <select
              value={groupby}
              onChange={(e) => setGroupby(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
            >
              {GROUPBY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">С</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">По</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none" />
          </div>
          <button
            onClick={() => load(groupby, startDate, endDate)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Применить
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map((cat) => (
              <div key={cat} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 cursor-pointer transition ${filterCat === cat ? 'ring-2 ring-offset-1' : ''}`}
                style={{ borderLeftColor: CAT_COLORS[cat] }}
                onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xl font-bold px-3 py-0.5 rounded-full ${CAT_BG[cat]}`}>{cat}</span>
                  <span className="text-2xl font-bold text-gray-800">{summary[`${cat.toLowerCase() as 'a' | 'b' | 'c'}_pct`]}%</span>
                </div>
                <p className="text-sm text-gray-500">{summary[`${cat.toLowerCase() as 'a' | 'b' | 'c'}_count`]} позиций</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{fmt(summary[`${cat.toLowerCase() as 'a' | 'b' | 'c'}_volume`])} кг</p>
                <p className="text-xs text-gray-400 mt-2">
                  {cat === 'A' ? '20% позиций → 80% объёма' : cat === 'B' ? 'следующие 15% объёма' : 'оставшиеся 5% объёма'}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Доля категорий</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {pieData.map((entry, index) => <Cell key={index} fill={CAT_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Топ-20 по объёму</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${fmt(Number(v))} кг`, 'Объём']} />
                <Bar dataKey="volume" radius={[0, 3, 3, 0]}>
                  {barData.map((entry, index) => <Cell key={index} fill={CAT_COLORS[entry.category]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-700">
              {filtered.length} позиций {filterCat !== 'all' ? `(категория ${filterCat})` : ''}
            </span>
            <div className="flex gap-1">
              {(['all', 'A', 'B', 'C'] as const).map((cat) => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1 text-xs rounded-full transition ${filterCat === cat ? 'bg-violet-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  {cat === 'all' ? 'Все' : cat}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Наименование</th>
                  <th className="px-4 py-3 text-right">Объём (кг)</th>
                  <th className="px-4 py-3 text-right">% от итога</th>
                  <th className="px-4 py-3 text-right">Накоп. %</th>
                  <th className="px-4 py-3 text-center">Категория</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Загрузка...</td></tr>
                ) : filtered.map((item) => (
                  <tr key={item.rank} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{item.rank}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{fmt(item.volume)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{item.pct}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(item.cumulative, 100)}%`, backgroundColor: CAT_COLORS[item.category] }} />
                        </div>
                        <span className="text-gray-600 w-12 text-right">{item.cumulative}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CAT_BG[item.category]}`}>{item.category}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              Итого: {fmt(total)} кг
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
