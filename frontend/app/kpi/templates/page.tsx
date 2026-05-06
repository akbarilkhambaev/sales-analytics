'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Plus, Trash2, Edit3, ChevronLeft,
  GripVertical, X, Save, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateItem {
  id?: number;
  name: string;
  unit: string;
  weight: number | string;
  min_threshold: number | string;
  max_threshold: number | string;
  default_target: number | string;
  notes: string;
  order: number;
}

interface KPITemplate {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  items_count: number;
  items: TemplateItem[];
  created_by_name: string | null;
  created_at: string;
}

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

// ─── Unit options ─────────────────────────────────────────────────────────────

const UNITS = [
  { value: 'kg',    label: 'Кг' },
  { value: 'pcs',   label: 'Штук' },
  { value: 'sum',   label: 'Сум' },
  { value: 'usd',   label: 'USD' },
  { value: 'pct',   label: '%' },
  { value: 'other', label: 'Другое' },
];

// ─── Empty item ───────────────────────────────────────────────────────────────

function emptyItem(order: number): TemplateItem {
  return { name: '', unit: 'kg', weight: '', min_threshold: 0.85, max_threshold: 1.20, default_target: '', notes: '', order };
}

// ─── Template Form Modal ──────────────────────────────────────────────────────

function TemplateModal({
  initial, onClose, onSaved,
}: {
  initial?: KPITemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]       = useState(initial?.name ?? '');
  const [desc, setDesc]       = useState(initial?.description ?? '');
  const [active, setActive]   = useState(initial?.is_active ?? true);
  const [items, setItems]     = useState<TemplateItem[]>(
    initial?.items?.length ? initial.items : [emptyItem(0)]
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length)]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i })));

  const updateItem = (idx: number, field: keyof TemplateItem, val: string | number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const totalWeight = items.reduce((s, it) => s + (parseFloat(String(it.weight)) || 0), 0);

  const handleSave = async () => {
    if (!name.trim()) { setError('Введите название шаблона'); return; }
    if (items.some((it) => !it.name.trim())) { setError('Заполните название всех пунктов'); return; }
    const diff = Math.abs(totalWeight - 1);
    if (diff > 0.001) { setError(`Сумма долей бонуса должна равняться 1.0 (сейчас ${totalWeight.toFixed(2)})`); return; }

    setSaving(true); setError('');
    try {
      if (initial) {
        // Update template
        await apiFetch(`${API}/kpi/templates/${initial.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description: desc, is_active: active }),
        });
        // Handle items: delete removed, update existing, create new
        const existingIds = initial.items.map((it) => it.id);
        const keptIds = items.filter((it) => it.id).map((it) => it.id!);
        // Delete removed
        for (const id of existingIds) {
          if (id && !keptIds.includes(id)) {
            await apiFetch(`${API}/kpi/template-items/${id}/`, { method: 'DELETE' });
          }
        }
        // Update/create
        for (const it of items) {
          const payload = { template: initial.id, name: it.name, unit: it.unit,
            weight: it.weight, min_threshold: it.min_threshold,
            max_threshold: it.max_threshold, default_target: it.default_target || null,
            notes: it.notes, order: it.order };
          if (it.id) {
            await apiFetch(`${API}/kpi/template-items/${it.id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
          } else {
            await apiFetch(`${API}/kpi/template-items/`, { method: 'POST', body: JSON.stringify(payload) });
          }
        }
      } else {
        // Create template first
        const created = await apiFetch<{ id: number }>(`${API}/kpi/templates/`, {
          method: 'POST',
          body: JSON.stringify({ name, description: desc, is_active: active }),
        });
        // Create items
        for (const it of items) {
          await apiFetch(`${API}/kpi/template-items/`, {
            method: 'POST',
            body: JSON.stringify({ template: created.id, name: it.name, unit: it.unit,
              weight: it.weight, min_threshold: it.min_threshold,
              max_threshold: it.max_threshold, default_target: it.default_target || null,
              notes: it.notes, order: it.order }),
          });
        }
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-900">
            {initial ? 'Редактировать шаблон' : 'Новый шаблон KPI'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Название *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="например: KPI Менеджер по продажам"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Описание</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" id="active-chk" checked={active} onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 accent-violet-600" />
              <label htmlFor="active-chk" className="text-sm text-gray-700">Активный шаблон</label>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Пункты KPI</p>
              <div className={`text-xs font-semibold ${Math.abs(totalWeight - 1) < 0.001 ? 'text-green-600' : 'text-orange-500'}`}>
                Сумма долей: {totalWeight.toFixed(2)} / 1.00
                {Math.abs(totalWeight - 1) < 0.001 && <CheckCircle2 className="inline w-3.5 h-3.5 ml-1" />}
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder={`Пункт ${idx + 1}: например, Savdo rejasi`}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Ед. изм.</label>
                      <select value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Доля бонуса (0.0–1.0)</label>
                      <input type="number" min={0} max={1} step={0.01}
                        value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                        placeholder="0.60"
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-400 uppercase">План (по умолчанию)</label>
                      <input type="number" min={0} step={1}
                        value={item.default_target} onChange={(e) => updateItem(idx, 'default_target', e.target.value)}
                        placeholder="например: 10000"
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Мин. порог</label>
                      <input type="number" min={0} max={1} step={0.01}
                        value={item.min_threshold} onChange={(e) => updateItem(idx, 'min_threshold', e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Макс. cap</label>
                      <input type="number" min={1} max={2} step={0.01}
                        value={item.max_threshold} onChange={(e) => updateItem(idx, 'max_threshold', e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <input value={item.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                        placeholder="Примечание (необязательно)"
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                    className="flex-shrink-0 self-start p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <Plus className="w-4 h-4" /> Добавить пункт
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Отмена</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Сохранение...' : initial ? 'Обновить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KPITemplatesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<{ open: boolean; template?: KPITemplate }>({ open: false });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push('/login');
    if (isAuthenticated && !isAdmin) router.push('/kpi');
  }, [isAuthenticated, authLoading, isAdmin, router]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<KPITemplate[] | { results: KPITemplate[] }>(`${API}/kpi/templates/`);
      setTemplates(Array.isArray(data) ? data : data.results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) loadTemplates(); }, [isAuthenticated, loadTemplates]);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить шаблон? Все связанные KPI записи будут защищены (PROTECT).')) return;
    try {
      await apiFetch(`${API}/kpi/templates/${id}/`, { method: 'DELETE' });
      loadTemplates();
    } catch (e: any) {
      alert('Нельзя удалить: шаблон используется в записях KPI');
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kpi')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100">
              <Settings className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Шаблоны KPI</h1>
              <p className="text-xs text-gray-500">{templates.length} шаблонов</p>
            </div>
          </div>
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Новый шаблон
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Settings className="w-14 h-14 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Шаблонов ещё нет</p>
            <button onClick={() => setModal({ open: true })}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" /> Создать шаблон
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{tmpl.name}</h3>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          tmpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {tmpl.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                      {tmpl.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{tmpl.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{tmpl.items_count} пунктов</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setModal({ open: true, template: tmpl })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tmpl.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items preview */}
                  {tmpl.items && tmpl.items.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {tmpl.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700 font-medium truncate max-w-[60%]">{it.name}</span>
                          <div className="flex items-center gap-2 text-gray-400 shrink-0">
                            <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold">
                              {Math.round(Number(it.weight) * 100)}%
                            </span>
                            <span>{UNITS.find((u) => u.value === it.unit)?.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-300 mt-3">
                    Создан: {new Date(tmpl.created_at).toLocaleDateString('ru-RU')}
                    {tmpl.created_by_name && ` • ${tmpl.created_by_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <TemplateModal
          initial={modal.template}
          onClose={() => setModal({ open: false })}
          onSaved={loadTemplates}
        />
      )}
    </div>
  );
}
