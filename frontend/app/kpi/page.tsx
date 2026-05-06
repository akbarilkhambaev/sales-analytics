'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Plus, ChevronLeft, ChevronRight,
  Edit3, CheckCircle2, AlertCircle, XCircle,
  Award, Settings, RefreshCw, X, Save, Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPIItem {
  id: number;
  name: string;
  unit: string;
  unit_display: string;
  weight: number;
  target: number;
  fact: number;
  fact_auto: number | null;
  fact_manual: number | null;
  completion_pct: number;
  capped_completion: number;
  is_valid: boolean;
  payout_amount: number;
  min_threshold_pct: number;
  max_threshold_pct: number;
  notes: string;
}

interface KPISummaryRecord {
  id: number;
  manager_id: number;
  manager_name: string;
  template_name: string;
  base_salary: number;
  fix_ratio: number;
  fix_payout: number;
  bonus_payout: number;
  status: string;
  status_display: string;
  total_weighted_pct: number;
  total_payout: number;
  items: KPIItem[];
}

interface KPITemplate {
  id: number;
  name: string;
  items: { id: number; name: string; unit: string; unit_display: string; weight: number; min_threshold: number; max_threshold: number; default_target: number | null }[];
}

interface Manager { id: number; username: string; full_name: string; }

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: authHeaders(), ...opts });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return undefined as T;
  return r.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                 'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function completionColor(pct: number, isValid: boolean) {
  if (!isValid) return 'text-red-500';
  if (pct >= 100) return 'text-green-600';
  if (pct >= 85)  return 'text-blue-600';
  return 'text-orange-500';
}

function progressBar(pct: number, isValid: boolean) {
  if (!isValid) return 'bg-red-400';
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 85)  return 'bg-blue-500';
  return 'bg-orange-400';
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function Ring({ pct, isValid, size = 64 }: { pct: number; isValid: boolean; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const capped = Math.min(pct, 120);
  const offset = circ - (capped / 120) * circ;
  const color = isValid ? (pct >= 100 ? '#16a34a' : pct >= 85 ? '#2563eb' : '#f97316') : '#ef4444';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

// ─── Manager KPI Card ─────────────────────────────────────────────────────────

function ManagerCard({
  record, onEditFact, onDelete, onStatusChange, isAdmin,
}: {
  record: KPISummaryRecord;
  onEditFact: (record: KPISummaryRecord) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, newStatus: string) => void;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = record.total_weighted_pct;
  const allValid = record.items.every((i) => i.is_valid);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm uppercase">
              {record.manager_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{record.manager_name}</p>
              <p className="text-[11px] text-gray-400">{record.template_name}</p>
            </div>
          </div>
          {/* Ring + delete */}
          <div className="flex items-start gap-1 flex-shrink-0">
            <div className="relative">
              <Ring pct={pct} isValid={allValid} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700 rotate-0">
                {Math.round(pct)}%
              </span>
            </div>
            {isAdmin && (
              confirmDelete ? (
                <div className="flex flex-col gap-1 ml-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600">
                    Да
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">
                    Нет
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  className="ml-1 mt-1 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Salary breakdown */}
        {(() => {
          const bonusPayout = record.bonus_payout;
          const hasBonus = bonusPayout > 0;
          return (
            <div className="mt-4 space-y-1.5">
              {/* Base row */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>База</span>
                <span className="font-semibold text-gray-600">{fmt(record.base_salary)}</span>
              </div>
              {/* Фикса row — always */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Фикса ({Math.round(record.fix_ratio * 100)}%)
                </span>
                <span className="font-semibold text-blue-600">{fmt(record.fix_payout)}</span>
              </div>
              {/* Бонус row — выполнение × доля бонуса × фикса */}
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1 ${hasBonus ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${hasBonus ? 'bg-green-400' : 'bg-gray-300'}`} />
                  Бонус (KPI)
                </span>
                <span className={`font-semibold ${hasBonus ? 'text-green-600' : 'text-gray-400'}`}>
                  {hasBonus ? `+${fmt(bonusPayout)}` : fmt(0)}
                </span>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Итого</span>
                <span className={`text-sm font-bold ${hasBonus ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {fmt(record.total_payout)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Status badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`
            text-[10px] px-2 py-0.5 rounded-full font-semibold
            ${record.status === 'closed' ? 'bg-gray-100 text-gray-500'
              : record.status === 'active' ? 'bg-blue-50 text-blue-600'
              : 'bg-yellow-50 text-yellow-600'}
          `}>
            {record.status_display}
          </span>
          {!allValid && (
            <span className="text-[10px] text-red-500 flex items-center gap-0.5">
              <XCircle className="w-3 h-3" /> Есть невыполненные пункты
            </span>
          )}
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-4">
          <div className="pt-3 space-y-3">
            {record.items.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    {item.is_valid
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />
                    }
                    <span className={`font-bold ${completionColor(item.completion_pct, item.is_valid)}`}>
                      {item.completion_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressBar(item.completion_pct, item.is_valid)}`}
                    style={{ width: `${Math.min(item.capped_completion, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>
                    {fmt(item.fact)} / {fmt(item.target)} {item.unit_display}
                    <span className="ml-1 text-gray-300">
                      (доля {Math.round(item.weight * 100)}%)
                    </span>
                  </span>
                  <span className={`font-medium ${completionColor(item.completion_pct, item.is_valid)}`}>
                    {fmt(item.payout_amount)}
                  </span>
                </div>
                {!item.is_valid && (
                  <p className="text-[10px] text-red-400">
                    Мин. порог {item.min_threshold_pct}% не достигнут — пункт не засчитывается
                  </p>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditFact(record); }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Ввести факт
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = record.status === 'closed' ? 'active' : 'closed';
                onStatusChange(record.id, next);
              }}
              className={`mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                record.status === 'closed'
                  ? 'border-green-200 text-green-600 hover:bg-green-50'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {record.status === 'closed' ? '✓ Реактивировать' : 'Закрыть период'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edit Fact Modal ──────────────────────────────────────────────────────────

function EditFactModal({
  record, onClose, onSaved,
}: {
  record: KPISummaryRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [facts, setFacts] = useState<Record<number, string>>(
    Object.fromEntries(record.items.map((i) => [i.id, i.fact_manual != null ? String(i.fact_manual) : '']))
  );
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [itemId, val] of Object.entries(facts)) {
        await apiFetch(`${API}/kpi/records/${record.id}/update-item/`, {
          method: 'PATCH',
          body: JSON.stringify({ item_id: Number(itemId), fact_manual: val === '' ? null : Number(val) }),
        });
      }
      onSaved();
      onClose();
    } catch {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      await apiFetch(`${API}/kpi/records/${record.id}/auto-fill/`, { method: 'POST' });
      onSaved();
      onClose();
    } catch {
      alert('Ошибка при автозаполнении');
    } finally {
      setAutoFilling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-bold text-gray-900">Ввод факта</h2>
            <p className="text-xs text-gray-400">{record.manager_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {record.items.map((item) => (
            <div key={item.id}>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                {item.name} <span className="normal-case font-normal text-gray-400">({item.unit_display})</span>
              </label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-0.5">Авто (из данных)</p>
                  <input
                    disabled
                    value={item.fact_auto != null ? item.fact_auto : '—'}
                    className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-700 mb-0.5 font-semibold">Ручной ввод</p>
                  <input
                    type="number"
                    value={facts[item.id] ?? ''}
                    onChange={(e) => setFacts({ ...facts, [item.id]: e.target.value })}
                    placeholder={`Таргет: ${fmt(item.target)}`}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-6 pb-5 pt-2">
          <button
            onClick={handleAutoFill}
            disabled={autoFilling}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${autoFilling ? 'animate-spin' : ''}`} />
            Автозаполнить
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New KPI Record Modal ─────────────────────────────────────────────────────

function NewRecordModal({
  templates, managers, defaultPeriod, onClose, onCreated,
}: {
  templates: KPITemplate[];
  managers: Manager[];
  defaultPeriod: { type: string; year: number; number: number };
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    manager_id: '',
    template_id: '',
    period_type: defaultPeriod.type,
    period_year: defaultPeriod.year,
    period_number: defaultPeriod.number,
    base_salary: '',
    fix_ratio: '0.60',
    status: 'active',
  });
  const [targets, setTargets] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = templates.find((t) => t.id === Number(form.template_id));

  // При выборе шаблона — подставить планы из default_target
  const handleTemplateChange = (templateId: string) => {
    setForm({ ...form, template_id: templateId });
    const tpl = templates.find((t) => t.id === Number(templateId));
    if (tpl) {
      const prefilled: Record<number, string> = {};
      tpl.items.forEach((ti) => {
        if (ti.default_target != null) prefilled[ti.id] = String(ti.default_target);
      });
      setTargets(prefilled);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.manager_id || !form.template_id || !form.base_salary) {
      setError('Заполните все обязательные поля');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch(`${API}/kpi/records/create-from-template/`, {
        method: 'POST',
        body: JSON.stringify({ ...form, targets }),
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      try { setError((JSON.parse((err as Error).message) as { error?: string })?.error || (err as Error).message); }
      catch { setError((err as Error).message); }
    } finally {
      setSaving(false);
    }
  };

  const PERIOD_OPTIONS: Record<string, number[]> =  {
    month:   Array.from({ length: 12 }, (_, i) => i + 1),
    quarter: [1, 2, 3, 4],
    year:    [1],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-900">Новая запись KPI</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Менеджер *</label>
              <select required value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Выберите —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Шаблон KPI *</label>
              <select required value={form.template_id} onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Выберите шаблон —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Тип периода</label>
              <select value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value, period_number: 1 })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="month">Месяц</option>
                <option value="quarter">Квартал</option>
                <option value="year">Год</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Год</label>
              <input type="number" min={2020} max={2030} value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">
                {form.period_type === 'month' ? 'Месяц' : form.period_type === 'quarter' ? 'Квартал' : 'Период'}
              </label>
              <select value={form.period_number} onChange={(e) => setForm({ ...form, period_number: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(PERIOD_OPTIONS[form.period_type] || []).map((n) => (
                  <option key={n} value={n}>
                    {form.period_type === 'month' ? MONTHS[n - 1] : form.period_type === 'quarter' ? `Q${n}` : String(form.period_year)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Базовая зарплата *</label>
              <input type="number" required min={0} value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                placeholder="например: 9216000"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Фикса (доля) — гарантированная выплата
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="number" min={0} max={1} step={0.01}
                  value={form.fix_ratio}
                  onChange={(e) => setForm({ ...form, fix_ratio: e.target.value })}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  = <span className="font-semibold text-blue-600">
                    {new Intl.NumberFormat('ru-RU').format(
                      Math.round(Number(form.base_salary || 0) * Number(form.fix_ratio || 0))
                    )} сум
                  </span>{' '}
                  <span className="text-xs text-gray-400">всегда выплачивается</span>
                </span>
              </div>
            </div>
          </div>

          {/* Targets per template item */}
          {selectedTemplate && selectedTemplate.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Таргеты по пунктам</p>
              <div className="space-y-2">
                {selectedTemplate.items.map((ti) => (
                  <div key={ti.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 flex-1">{ti.name}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={0}
                        value={targets[ti.id] ?? ''}
                        onChange={(e) => setTargets({ ...targets, [ti.id]: e.target.value })}
                        placeholder="0"
                        className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                      <span className="text-xs text-gray-400 w-8">{ti.unit_display}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Отмена</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Создание...' : 'Создать KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KPIPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const now = new Date();
  const [periodType, setPeriodType]     = useState('month');
  const [periodYear, setPeriodYear]     = useState(now.getFullYear());
  const [periodNumber, setPeriodNumber] = useState(now.getMonth() + 1);

  const [records, setRecords]       = useState<KPISummaryRecord[]>([]);
  const [templates, setTemplates]   = useState<KPITemplate[]>([]);
  const [managers, setManagers]     = useState<Manager[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editRecord, setEditRecord] = useState<KPISummaryRecord | null>(null);
  const [newModal, setNewModal]     = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<KPISummaryRecord[]>(
        `${API}/kpi/summary/?period_type=${periodType}&period_year=${periodYear}&period_number=${periodNumber}`
      );
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [periodType, periodYear, periodNumber]);

  const loadMeta = useCallback(async () => {
    const [tmpl, mgrs] = await Promise.all([
      apiFetch<{ results?: KPITemplate[]; } | KPITemplate[]>(`${API}/kpi/templates/`),
      apiFetch<Manager[]>(`${API}/kpi/managers/`),
    ]);
      setTemplates(Array.isArray(tmpl) ? tmpl : ((tmpl as { results: KPITemplate[] }).results ?? []));
    setManagers(mgrs);
  }, []);

  useEffect(() => { if (isAuthenticated) { loadSummary(); loadMeta(); } }, [isAuthenticated, loadSummary, loadMeta]);

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${API}/kpi/records/${id}/`, { method: 'DELETE' });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`${API}/kpi/records/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setRecords((prev) => prev.map((r) =>
        r.id === id ? { ...r, status: newStatus, status_display: newStatus === 'closed' ? 'Закрыт' : 'Активный' } : r
      ));
    } catch (e) { console.error(e); }
  };

  // Period navigation
  const shiftPeriod = (delta: number) => {
    if (periodType === 'month') {
      let m = periodNumber + delta;
      let y = periodYear;
      if (m < 1)  { m = 12; y--; }
      if (m > 12) { m = 1;  y++; }
      setPeriodNumber(m); setPeriodYear(y);
    } else if (periodType === 'quarter') {
      let q = periodNumber + delta;
      let y = periodYear;
      if (q < 1) { q = 4; y--; }
      if (q > 4) { q = 1; y++; }
      setPeriodNumber(q); setPeriodYear(y);
    } else {
      setPeriodYear((y) => y + delta);
    }
  };

  const periodLabel = () => {
    if (periodType === 'month')   return `${MONTHS[periodNumber - 1]} ${periodYear}`;
    if (periodType === 'quarter') return `Q${periodNumber} ${periodYear}`;
    return String(periodYear);
  };

  const totalPayout = records.reduce((s, r) => s + r.total_payout, 0);

  if (authLoading) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">KPI Менеджеров</h1>
              <p className="text-xs text-gray-500">
                {records.length} записей • Итого выплат: <span className="font-semibold text-emerald-600">{fmt(totalPayout)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Period type */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              {['month', 'quarter', 'year'].map((t) => (
                <button key={t} onClick={() => { setPeriodType(t); setPeriodNumber(1); }}
                  className={`px-3 py-2 transition-colors ${periodType === t ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {t === 'month' ? 'Месяц' : t === 'quarter' ? 'Квартал' : 'Год'}
                </button>
              ))}
            </div>

            {/* Period navigation */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1">
              <button onClick={() => shiftPeriod(-1)} className="p-1 rounded hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">{periodLabel()}</span>
              <button onClick={() => shiftPeriod(1)} className="p-1 rounded hover:bg-gray-100">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {isAdmin && (
              <>
                <button onClick={() => router.push('/kpi/templates')}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <Settings className="w-4 h-4" /> Шаблоны
                </button>
                <button onClick={() => setNewModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold">
                  <Plus className="w-4 h-4" /> KPI
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Award className="w-14 h-14 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Нет KPI записей за {periodLabel()}</p>
            {isAdmin && (
              <button onClick={() => setNewModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold">
                <Plus className="w-4 h-4" /> Создать первую запись
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {records.map((rec) => (
              <ManagerCard key={rec.id} record={rec} onEditFact={setEditRecord} onDelete={handleDelete} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>

      {/* Edit fact modal */}
      {editRecord && (
        <EditFactModal record={editRecord} onClose={() => setEditRecord(null)} onSaved={loadSummary} />
      )}

      {/* New record modal */}
      {newModal && (
        <NewRecordModal
          templates={templates}
          managers={managers}
          defaultPeriod={{ type: periodType, year: periodYear, number: periodNumber }}
          onClose={() => setNewModal(false)}
          onCreated={loadSummary}
        />
      )}
    </div>
  );
}
