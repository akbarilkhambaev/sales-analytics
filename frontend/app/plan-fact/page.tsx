'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Target, Download, Home } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { PlanFactResponse, PlanFactRow, PlanFactFilters } from '@/lib/types';

// ----------------------------------------------------------------------------

const now = new Date();
const CUR_DATE = now.toISOString().split('T')[0]; // YYYY-MM-DD
const PREV_DATE = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const DEFAULTS: PlanFactFilters = {
  sales_prev_from:   `${now.getFullYear() - 1}-01-01`,
  sales_prev_to:     PREV_DATE,
  sales_curr_from:   `${now.getFullYear()}-01-01`,
  sales_curr_to:     CUR_DATE,
  plan_from:         `${now.getFullYear()}-01-01`,
  plan_to:           CUR_DATE,
  sellout_prev_from: `${now.getFullYear() - 1}-01-01`,
  sellout_prev_to:   PREV_DATE,
  sellout_curr_from: `${now.getFullYear()}-01-01`,
  sellout_curr_to:   CUR_DATE,
};

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return '\u2014';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
}
function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '\u2014';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function pctClass(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'text-gray-400';
  if (n > 0) return 'text-green-700 font-semibold';
  if (n < 0) return 'text-red-600 font-semibold';
  return 'text-gray-500';
}

// --- Period picker component -------------------------------------------------

interface PeriodPickerProps {
  label: string;
  colorClass: string;
  fromKey: keyof PlanFactFilters;
  toKey: keyof PlanFactFilters;
  filters: PlanFactFilters;
  onChange: (key: keyof PlanFactFilters, value: string) => void;
}

function PeriodPicker({ label, colorClass, fromKey, toKey, filters, onChange }: PeriodPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-xs font-bold uppercase tracking-wide ${colorClass}`}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={filters[fromKey] as string}
          max={filters[toKey] as string}
          onChange={e => onChange(fromKey, e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white w-[145px]"
        />
        <span className="text-gray-400 text-xs">&mdash;</span>
        <input
          type="date"
          value={filters[toKey] as string}
          min={filters[fromKey] as string}
          onChange={e => onChange(toKey, e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white w-[145px]"
        />
      </div>
    </div>
  );
}

// --- Main page ---------------------------------------------------------------

export default function PlanFactPage() {
  const [filters, setFilters] = useState<PlanFactFilters>(DEFAULTS);
  const [data,    setData]    = useState<PlanFactResponse | null>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const setFilter = useCallback((key: keyof PlanFactFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getPlanFactTable(filters);
      setData(result);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0434\u0430\u043d\u043d\u044b\u0445');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportCsv = () => {
    if (!data) return;
    const L = data.labels;
    const headers = [
      '\u041f\u0440\u043e\u0434\u0443\u043a\u0446\u0438\u044f',
      `\u041f\u0440\u043e\u0434\u0430\u0436\u0438 ${L.sales_prev}`, '\u0394%',
      `\u041f\u0440\u043e\u0434\u0430\u0436\u0438 ${L.sales_curr}`, '% \u043a \u043f\u043b\u0430\u043d\u0443',
      `\u041f\u041b\u0410\u041d ${L.plan} (\u043f\u0435\u0440\u0438\u043e\u0434)`, `\u041f\u041b\u0410\u041d ${L.plan} (\u043c\u0435\u0441\u044f\u0447.)`,
      `SELLOUT ${L.sellout_prev}`, `SELLOUT ${L.sellout_curr}`,
    ];
    const toRow = (r: PlanFactRow) => [
      r.product, r.sales_prev, r.diff_pct_sales ?? '',
      r.sales_curr, r.diff_pct_plan ?? '',
      r.plan_period, r.plan_monthly,
      r.sellout_prev, r.sellout_curr,
    ];
    const csv = [headers, ...[...data.rows, data.totals].map(toRow)]
      .map(row => row.map(v => `"${v}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'plan-fact.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRow = (row: PlanFactRow, type: 'normal' | 'group' | 'grand' = 'normal') => {
    const base =
      type === 'grand'  ? 'bg-gray-800 text-white font-bold border-t-2 border-gray-600' :
      type === 'group'  ? 'bg-blue-700 text-white font-semibold text-xs' :
      'hover:bg-blue-50 transition-colors border-b border-gray-100';
    return (
      <tr key={`${type}-${row.product}`} className={base}>
        <td className="px-3 py-2 text-sm whitespace-nowrap">{row.product}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums">{fmt(row.sales_prev)}</td>
        <td className={`px-3 py-2 text-sm text-center ${type === 'normal' ? pctClass(row.diff_pct_sales) : ''}`}>{fmtPct(row.diff_pct_sales)}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums">{fmt(row.sales_curr)}</td>
        <td className={`px-3 py-2 text-sm text-center ${type === 'normal' ? pctClass(row.diff_pct_plan) : ''}`}>{fmtPct(row.diff_pct_plan)}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums text-blue-300">{fmt(row.plan_period)}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums text-blue-200">{fmt(row.plan_monthly)}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums text-orange-300">{fmt(row.sellout_prev)}</td>
        <td className="px-3 py-2 text-sm text-right tabular-nums text-orange-200">{fmt(row.sellout_curr)}</td>
      </tr>
    );
  };

  // Группировка строк по группе
  const renderGroupedRows = () => {
    if (!data) return null;
    const rowsByGroup: Record<string, PlanFactRow[]> = {};
    for (const row of data.rows) {
      const g = row.gruppa_tovara || '\u0411ез группы';
      if (!rowsByGroup[g]) rowsByGroup[g] = [];
      rowsByGroup[g].push(row);
    }
    const result: React.ReactNode[] = [];
    for (const g of data.groups_order) {
      const grpRows = rowsByGroup[g] ?? [];
      // Заголовок группы
      result.push(
        <tr key={`header-${g}`} className="bg-gray-700 text-white">
          <td colSpan={9} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
            {g}
          </td>
        </tr>
      );
      // Строки товаров
      grpRows.forEach(row => result.push(renderRow(row, 'normal')));
      // Итог по группе
      if (data.group_totals[g]) {
        result.push(renderRow(data.group_totals[g], 'group'));
      }
    }
    // Гранд-итог
    result.push(renderRow(data.totals, 'grand'));
    return result;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8" /> {'\u041f\u043b\u0430\u043d-\u0444\u0430\u043a\u0442'}
            </h1>
            <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
              <Home className="w-5 h-5" /> {'\u0413\u043b\u0430\u0432\u043d\u0430\u044f'}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {'\u041f\u0435\u0440\u0438\u043e\u0434\u044b \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u0441\u0442\u043e\u043b\u0431\u0446\u0430'}
          </p>
          <div className="flex flex-wrap gap-5 mb-4">
            <PeriodPicker
              label={'\u041f\u0440\u043e\u0434\u0430\u0436\u0438 (\u043f\u0440\u0435\u0434. \u0433\u043e\u0434)'}
              colorClass="text-gray-600"
              fromKey="sales_prev_from" toKey="sales_prev_to"
              filters={filters} onChange={setFilter}
            />
            <PeriodPicker
              label={'\u041f\u0440\u043e\u0434\u0430\u0436\u0438 (\u0442\u0435\u043a. \u0433\u043e\u0434)'}
              colorClass="text-gray-800"
              fromKey="sales_curr_from" toKey="sales_curr_to"
              filters={filters} onChange={setFilter}
            />
            <PeriodPicker
              label={'\u041f\u041b\u0410\u041d'}
              colorClass="text-blue-600"
              fromKey="plan_from" toKey="plan_to"
              filters={filters} onChange={setFilter}
            />
            <PeriodPicker
              label={`SELLOUT (\u043f\u0440\u0435\u0434. \u0433\u043e\u0434)`}
              colorClass="text-orange-500"
              fromKey="sellout_prev_from" toKey="sellout_prev_to"
              filters={filters} onChange={setFilter}
            />
            <PeriodPicker
              label={`SELLOUT (\u0442\u0435\u043a. \u0433\u043e\u0434)`}
              colorClass="text-orange-700"
              fromKey="sellout_curr_from" toKey="sellout_curr_to"
              filters={filters} onChange={setFilter}
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : '\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b'}
            </button>
            {loaded && data && (
              <button
                onClick={exportCsv}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> CSV
              </button>
            )}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>

        {/* Row count */}
        {loaded && data && (
          <p className="text-sm text-gray-400 mb-3">{'\u0421\u0442\u0440\u043e\u043a'}: {data.rows.length}</p>
        )}

        {/* Placeholder */}
        {!loaded && !loading && (
          <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{'\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043f\u0435\u0440\u0438\u043e\u0434\u044b \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b\u00bb'}</p>
            <p className="text-sm mt-1">{'\u041a\u0430\u0436\u0434\u044b\u0439 \u0441\u0442\u043e\u043b\u0431\u0435\u0446 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442 \u0441\u0432\u043e\u0439 \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u044b\u0439 \u0434\u0438\u0430\u043f\u0430\u0437\u043e\u043d \u0434\u0430\u0442'}</p>
          </div>
        )}

        {/* Spinner */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-400">
            <div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0434\u0430\u043d\u043d\u044b\u0445\u2026'}</p>
          </div>
        )}

        {/* Table */}
        {loaded && data && !loading && (
          <div className="bg-white rounded-xl shadow-md">
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-800 text-white text-xs tracking-wide">
                    <th className="px-3 py-3 text-left min-w-[140px]">{'\u041f\u0440\u043e\u0434\u0443\u043a\u0446\u0438\u044f'}</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">
                      {'\u041f\u0440\u043e\u0434\u0430\u0436\u0438'}<br/>
                      <span className="font-normal opacity-75">{data.labels.sales_prev}</span>
                    </th>
                    <th className="px-3 py-3 text-center">&Delta;%</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">
                      {'\u041f\u0440\u043e\u0434\u0430\u0436\u0438'}<br/>
                      <span className="font-normal opacity-75">{data.labels.sales_curr}</span>
                    </th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">% {'\u043a \u043f\u043b\u0430\u043d\u0443'}</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-blue-300">
                      {'\u041f\u041b\u0410\u041d (\u043f\u0435\u0440.)'}<br/>
                      <span className="font-normal opacity-75">{data.labels.plan}</span>
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-blue-200">
                      {'\u041f\u041b\u0410\u041d (\u043c\u0435\u0441.)'}<br/>
                      <span className="font-normal opacity-75">{data.labels.plan_monthly}</span>
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-orange-300">
                      SELLOUT<br/>
                      <span className="font-normal opacity-75">{data.labels.sellout_prev}</span>
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-orange-200">
                      SELLOUT<br/>
                      <span className="font-normal opacity-75">{data.labels.sellout_curr}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderGroupedRows()}
                </tbody>
              </table>
            </div>
            {data.rows.length === 0 && (
              <p className="text-center text-gray-400 py-10">
                {'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0437\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043f\u0435\u0440\u0438\u043e\u0434'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
