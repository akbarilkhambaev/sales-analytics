'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'series' | 'glass' | 'colors' | 'accessories';

interface AdminRates {
  frame_per_m: number; frame_colored_per_m: number; frame_laminated_per_m: number;
  sash_per_m: number;  sash_colored_per_m: number;  sash_laminated_per_m: number;
  imposta_per_m: number; imposta_colored_per_m: number; imposta_laminated_per_m: number;
  glass_per_sqm: number;
  hardware_per_opening: number; hardware_per_sliding: number;
  seal_per_m: number; install_base: number;
}

interface AdminSeries {
  id: number; id_code: string; name: string; material: string;
  description: string; features: string[]; categories: string[];
  min_width: number; max_width: number; min_height: number; max_height: number;
  price_per_sqm: number; is_active: boolean; sort_order: number;
  rates: AdminRates;
}

interface AdminGlass {
  id: number; id_code: string; name: string; spec: string;
  description: string; u_value: string; price_modifier: string;
  is_active: boolean; sort_order: number;
}

interface AdminColor {
  id: number; id_code: string; name: string; color_type: string; tier: string;
  hex: string; highlight_hex: string; shadow_hex: string; texture: string | null;
  materials: string[]; is_active: boolean; sort_order: number;
}

interface AdminAccessory {
  id: number; id_code: string; name: string; category: string;
  price: number; unit: string; price_mode: string;
  is_active: boolean; sort_order: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api') + '/configurator';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiMutate<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Form state types ─────────────────────────────────────────────────────────

interface SeriesForm {
  id_code: string; name: string; material: string; description: string;
  features: string;
  cat_window: boolean; cat_door: boolean; cat_sliding: boolean;
  min_width: string; max_width: string; min_height: string; max_height: string;
  price_per_sqm: string; is_active: boolean; sort_order: string;
  frame_per_m: string; frame_colored_per_m: string; frame_laminated_per_m: string;
  sash_per_m: string;  sash_colored_per_m: string;  sash_laminated_per_m: string;
  imposta_per_m: string; imposta_colored_per_m: string; imposta_laminated_per_m: string;
  glass_per_sqm: string; hardware_per_opening: string; hardware_per_sliding: string;
  seal_per_m: string; install_base: string;
}

interface GlassForm {
  id_code: string; name: string; spec: string; description: string;
  u_value: string; price_modifier: string; is_active: boolean; sort_order: string;
}

interface ColorForm {
  id_code: string; name: string; color_type: string; tier: string;
  hex: string; highlight_hex: string; shadow_hex: string; texture: string;
  mat_pvc: boolean; mat_alu: boolean;
  is_active: boolean; sort_order: string;
}

interface AccessoryForm {
  id_code: string; name: string; category: string;
  price: string; unit: string; price_mode: string;
  is_active: boolean; sort_order: string;
}

type AnyForm =
  | { tab: 'series';      isNew: boolean; data: SeriesForm    }
  | { tab: 'glass';       isNew: boolean; data: GlassForm     }
  | { tab: 'colors';      isNew: boolean; data: ColorForm     }
  | { tab: 'accessories'; isNew: boolean; data: AccessoryForm };

// ─── Empty states ─────────────────────────────────────────────────────────────

const EMPTY_SERIES: SeriesForm = {
  id_code: '', name: '', material: 'PVC', description: '', features: '',
  cat_window: true, cat_door: false, cat_sliding: false,
  min_width: '400', max_width: '2500', min_height: '400', max_height: '2500',
  price_per_sqm: '1200000', is_active: true, sort_order: '99',
  frame_per_m: '0', frame_colored_per_m: '0', frame_laminated_per_m: '0',
  sash_per_m: '0', sash_colored_per_m: '0', sash_laminated_per_m: '0',
  imposta_per_m: '0', imposta_colored_per_m: '0', imposta_laminated_per_m: '0',
  glass_per_sqm: '420000', hardware_per_opening: '0', hardware_per_sliding: '0',
  seal_per_m: '0', install_base: '0',
};

const EMPTY_GLASS: GlassForm = {
  id_code: '', name: '', spec: '', description: '', u_value: '',
  price_modifier: '1.00', is_active: true, sort_order: '99',
};

const EMPTY_COLOR: ColorForm = {
  id_code: '', name: '', color_type: 'ral', tier: 'white',
  hex: '#F1F0EB', highlight_hex: '#FFFFFF', shadow_hex: '#D4D3CE', texture: '',
  mat_pvc: true, mat_alu: true, is_active: true, sort_order: '99',
};

const EMPTY_ACC: AccessoryForm = {
  id_code: '', name: '', category: '', price: '0', unit: 'шт',
  price_mode: 'fixed', is_active: true, sort_order: '99',
};

// ─── Converters: AdminXxx → FormState ────────────────────────────────────────

function toSeriesForm(s: AdminSeries): SeriesForm {
  return {
    id_code: s.id_code, name: s.name, material: s.material,
    description: s.description, features: s.features.join('\n'),
    cat_window: s.categories.includes('window'),
    cat_door: s.categories.includes('door'),
    cat_sliding: s.categories.includes('sliding'),
    min_width: String(s.min_width), max_width: String(s.max_width),
    min_height: String(s.min_height), max_height: String(s.max_height),
    price_per_sqm: String(s.price_per_sqm),
    is_active: s.is_active, sort_order: String(s.sort_order),
    frame_per_m: String(s.rates.frame_per_m),
    frame_colored_per_m: String(s.rates.frame_colored_per_m),
    frame_laminated_per_m: String(s.rates.frame_laminated_per_m),
    sash_per_m: String(s.rates.sash_per_m),
    sash_colored_per_m: String(s.rates.sash_colored_per_m),
    sash_laminated_per_m: String(s.rates.sash_laminated_per_m),
    imposta_per_m: String(s.rates.imposta_per_m),
    imposta_colored_per_m: String(s.rates.imposta_colored_per_m),
    imposta_laminated_per_m: String(s.rates.imposta_laminated_per_m),
    glass_per_sqm: String(s.rates.glass_per_sqm),
    hardware_per_opening: String(s.rates.hardware_per_opening),
    hardware_per_sliding: String(s.rates.hardware_per_sliding),
    seal_per_m: String(s.rates.seal_per_m),
    install_base: String(s.rates.install_base),
  };
}

function seriesFormToBody(f: SeriesForm, isNew: boolean) {
  const cats: string[] = [];
  if (f.cat_window) cats.push('window');
  if (f.cat_door)   cats.push('door');
  if (f.cat_sliding) cats.push('sliding');
  const base = {
    name: f.name, material: f.material, description: f.description,
    features: f.features.split('\n').map(s => s.trim()).filter(Boolean),
    categories: cats,
    min_width: +f.min_width, max_width: +f.max_width,
    min_height: +f.min_height, max_height: +f.max_height,
    price_per_sqm: +f.price_per_sqm, is_active: f.is_active, sort_order: +f.sort_order,
    rates: {
      frame_per_m: +f.frame_per_m, frame_colored_per_m: +f.frame_colored_per_m, frame_laminated_per_m: +f.frame_laminated_per_m,
      sash_per_m: +f.sash_per_m, sash_colored_per_m: +f.sash_colored_per_m, sash_laminated_per_m: +f.sash_laminated_per_m,
      imposta_per_m: +f.imposta_per_m, imposta_colored_per_m: +f.imposta_colored_per_m, imposta_laminated_per_m: +f.imposta_laminated_per_m,
      glass_per_sqm: +f.glass_per_sqm, hardware_per_opening: +f.hardware_per_opening, hardware_per_sliding: +f.hardware_per_sliding,
      seal_per_m: +f.seal_per_m, install_base: +f.install_base,
    },
  };
  return isNew ? { ...base, id_code: f.id_code } : base;
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none transition-colors';
const lbl = 'block text-xs font-medium text-gray-500 mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={lbl}>{label}</label>{children}</div>;
}

function NumInput({ value, onChange, step }: { value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <input type="number" step={step ?? '1'} value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs text-right focus:border-blue-400 focus:outline-none" />
  );
}

function FormFooter({ onCancel, saving, isNew }: { onCancel: () => void; saving: boolean; isNew: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
      <button type="button" onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
        Отмена
      </button>
      <button type="submit" disabled={saving}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {isNew ? 'Создать' : 'Сохранить'}
      </button>
    </div>
  );
}

// ─── Series form ──────────────────────────────────────────────────────────────

function SeriesFormView({ initial, isNew, onSubmit, onCancel, saving }: {
  initial: SeriesForm; isNew: boolean;
  onSubmit: (f: SeriesForm) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<SeriesForm>(initial);
  const set = (k: keyof SeriesForm, v: unknown) => setF(p => ({ ...p, [k]: v }));

  const RATE_ROWS: { key: string; label: string }[] = [
    { key: 'frame',    label: 'Рама (пог.м)' },
    { key: 'sash',     label: 'Створка (пог.м)' },
    { key: 'imposta',  label: 'Импост (пог.м)' },
  ];

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Код серии (id_code)">
          <input className={inp} value={f.id_code} readOnly={!isNew}
            onChange={e => set('id_code', e.target.value)} required placeholder="akfa-60"
            style={!isNew ? { background: '#f8f9fa', cursor: 'default' } : undefined} />
        </Field>
        <Field label="Название">
          <input className={inp} value={f.name} onChange={e => set('name', e.target.value)} required placeholder="AKFA 60" />
        </Field>
        <Field label="Материал">
          <select className={inp} value={f.material} onChange={e => set('material', e.target.value)}>
            <option value="PVC">ПВХ</option>
            <option value="aluminum">Алюминий</option>
          </select>
        </Field>
        <Field label="Справочная цена (сум/м²)">
          <input type="number" className={inp} value={f.price_per_sqm} onChange={e => set('price_per_sqm', e.target.value)} />
        </Field>
      </div>
      <Field label="Описание">
        <input className={inp} value={f.description} onChange={e => set('description', e.target.value)} />
      </Field>
      <Field label="Характеристики (по одной на строку)">
        <textarea className={inp} rows={3} value={f.features}
          onChange={e => set('features', e.target.value)} placeholder={'60мм профиль\n3 камеры'} />
      </Field>

      {/* Categories */}
      <div>
        <div className={lbl}>Категории</div>
        <div className="flex gap-5">
          {([['cat_window','Окна'],['cat_door','Двери'],['cat_sliding','Раздвижные']] as const).map(([k, name]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} />
              {name}
            </label>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <div className={lbl}>Размеры (мм)</div>
        <div className="grid grid-cols-4 gap-2">
          {([['min_width','Мин. ш.'],['max_width','Макс. ш.'],['min_height','Мин. в.'],['max_height','Макс. в.']] as const).map(([k, name]) => (
            <div key={k}>
              <div className="text-xs text-gray-400 mb-0.5">{name}</div>
              <input type="number" className={inp} value={f[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Sort + Active */}
      <div className="flex items-center gap-6">
        <div className="w-24">
          <Field label="Порядок">
            <input type="number" className={inp} value={f.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mt-4">
          <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />
          <span className="text-sm">Активна</span>
        </label>
      </div>

      {/* Rates */}
      <div>
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Ставки материалов (сум)
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 rounded">
              <th className="text-left py-2 px-2 font-medium text-gray-500 w-36">Позиция</th>
              <th className="py-2 px-1 font-medium text-gray-500">Белый</th>
              <th className="py-2 px-1 font-medium text-gray-500">Цветной</th>
              <th className="py-2 px-1 font-medium text-gray-500">Ламинация</th>
            </tr>
          </thead>
          <tbody>
            {RATE_ROWS.map(({ key, label }) => (
              <tr key={key} className="border-t border-gray-100">
                <td className="py-1.5 px-2 text-gray-600">{label}</td>
                {(['', '_colored', '_laminated'] as const).map(suffix => {
                  const k = `${key}_per_m${suffix}` as keyof SeriesForm;
                  return (
                    <td key={suffix} className="px-1 py-1">
                      <NumInput value={f[k] as string} onChange={v => set(k, v)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {([
            ['glass_per_sqm', 'Стекло (сум/м²)'],
            ['hardware_per_opening', 'Фурнитура П/О'],
            ['hardware_per_sliding', 'Фурнитура раздвиж.'],
            ['seal_per_m', 'Уплотнитель (пог.м)'],
            ['install_base', 'Монтаж (изделие)'],
          ] as const).map(([k, name]) => (
            <div key={k}>
              <div className="text-xs text-gray-400 mb-0.5">{name}</div>
              <NumInput value={f[k]} onChange={v => set(k, v)} />
            </div>
          ))}
        </div>
      </div>

      <FormFooter onCancel={onCancel} saving={saving} isNew={isNew} />
    </form>
  );
}

// ─── Glass form ───────────────────────────────────────────────────────────────

function GlassFormView({ initial, isNew, onSubmit, onCancel, saving }: {
  initial: GlassForm; isNew: boolean;
  onSubmit: (f: GlassForm) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<GlassForm>(initial);
  const set = (k: keyof GlassForm, v: unknown) => setF(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID код">
          <input className={inp} value={f.id_code} readOnly={!isNew}
            onChange={e => set('id_code', e.target.value)} required placeholder="double"
            style={!isNew ? { background: '#f8f9fa', cursor: 'default' } : undefined} />
        </Field>
        <Field label="Название">
          <input className={inp} value={f.name} onChange={e => set('name', e.target.value)} required />
        </Field>
        <Field label="Спецификация">
          <input className={inp} value={f.spec} onChange={e => set('spec', e.target.value)} placeholder="4-12-4-12-4" />
        </Field>
        <Field label="U-value">
          <input className={inp} value={f.u_value} onChange={e => set('u_value', e.target.value)} placeholder="1.8 Вт/м²К" />
        </Field>
        <Field label="Коэфф. цены (×)">
          <input type="number" step="0.05" className={inp} value={f.price_modifier}
            onChange={e => set('price_modifier', e.target.value)} />
        </Field>
        <Field label="Порядок">
          <input type="number" className={inp} value={f.sort_order} onChange={e => set('sort_order', e.target.value)} />
        </Field>
      </div>
      <Field label="Описание">
        <input className={inp} value={f.description} onChange={e => set('description', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />
        <span className="text-sm">Активен</span>
      </label>
      <FormFooter onCancel={onCancel} saving={saving} isNew={isNew} />
    </form>
  );
}

// ─── Color form ───────────────────────────────────────────────────────────────

function ColorFormView({ initial, isNew, onSubmit, onCancel, saving }: {
  initial: ColorForm; isNew: boolean;
  onSubmit: (f: ColorForm) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<ColorForm>(initial);
  const set = (k: keyof ColorForm, v: unknown) => setF(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID код">
          <input className={inp} value={f.id_code} readOnly={!isNew}
            onChange={e => set('id_code', e.target.value)} required placeholder="ral-9016"
            style={!isNew ? { background: '#f8f9fa', cursor: 'default' } : undefined} />
        </Field>
        <Field label="Название">
          <input className={inp} value={f.name} onChange={e => set('name', e.target.value)} required />
        </Field>
        <Field label="Тип">
          <select className={inp} value={f.color_type} onChange={e => set('color_type', e.target.value)}>
            <option value="ral">RAL</option>
            <option value="lamination">Ламинация</option>
          </select>
        </Field>
        <Field label="Ценовой тир">
          <select className={inp} value={f.tier} onChange={e => set('tier', e.target.value)}>
            <option value="white">Белый</option>
            <option value="colored">Цветной RAL</option>
            <option value="laminated">Ламинированный</option>
          </select>
        </Field>
      </div>
      {/* Hex colors */}
      <div className="grid grid-cols-3 gap-3">
        {([['hex','Основной'],['highlight_hex','Блик'],['shadow_hex','Тень']] as const).map(([k, name]) => (
          <Field key={k} label={name}>
            <div className="flex items-center gap-2">
              <input type="color" value={f[k]}
                onChange={e => set(k, e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0" />
              <input className={inp} value={f[k]} onChange={e => set(k, e.target.value)} />
            </div>
          </Field>
        ))}
      </div>
      <Field label="Текстура (путь, для ламинаций)">
        <input className={inp} value={f.texture} onChange={e => set('texture', e.target.value)}
          placeholder="/textures/lamination/file.png" />
      </Field>
      <div className="flex items-center gap-8">
        <div>
          <div className={lbl}>Материалы</div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={f.mat_pvc} onChange={e => set('mat_pvc', e.target.checked)} /> ПВХ
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={f.mat_alu} onChange={e => set('mat_alu', e.target.checked)} /> Алюминий
            </label>
          </div>
        </div>
        <div className="w-20">
          <Field label="Порядок">
            <input type="number" className={inp} value={f.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mt-4">
          <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />
          <span className="text-sm">Активен</span>
        </label>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} isNew={isNew} />
    </form>
  );
}

// ─── Accessory form ───────────────────────────────────────────────────────────

function AccessoryFormView({ initial, isNew, onSubmit, onCancel, saving }: {
  initial: AccessoryForm; isNew: boolean;
  onSubmit: (f: AccessoryForm) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<AccessoryForm>(initial);
  const set = (k: keyof AccessoryForm, v: unknown) => setF(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID код">
          <input className={inp} value={f.id_code} readOnly={!isNew}
            onChange={e => set('id_code', e.target.value)} required placeholder="handle-std"
            style={!isNew ? { background: '#f8f9fa', cursor: 'default' } : undefined} />
        </Field>
        <Field label="Название">
          <input className={inp} value={f.name} onChange={e => set('name', e.target.value)} required />
        </Field>
        <Field label="Категория">
          <input className={inp} value={f.category} onChange={e => set('category', e.target.value)}
            placeholder="handle, sill, net, seal…" />
        </Field>
        <Field label="Режим цены">
          <select className={inp} value={f.price_mode} onChange={e => set('price_mode', e.target.value)}>
            <option value="fixed">Фиксированная (за шт)</option>
            <option value="per_width">По ширине (пог.м)</option>
            <option value="per_height">По высоте (пог.м)</option>
            <option value="per_perimeter">По периметру (пог.м)</option>
          </select>
        </Field>
        <Field label="Цена (сум)">
          <input type="number" className={inp} value={f.price} onChange={e => set('price', e.target.value)} />
        </Field>
        <Field label="Единица">
          <input className={inp} value={f.unit} onChange={e => set('unit', e.target.value)}
            placeholder="шт, пог.м, компл" />
        </Field>
        <div className="w-24">
          <Field label="Порядок">
            <input type="number" className={inp} value={f.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />
        <span className="text-sm">Активен</span>
      </label>
      <FormFooter onCancel={onCancel} saving={saving} isNew={isNew} />
    </form>
  );
}

// ─── Form modal shell ─────────────────────────────────────────────────────────

function FormModal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-8 pb-4 px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CatalogAdminPanel({
  onClose, onDataChanged,
}: {
  onClose: () => void;
  onDataChanged: () => void;
}) {
  const [tab,     setTab]     = useState<AdminTab>('series');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [form,    setForm]    = useState<AnyForm | null>(null);
  const [delItem, setDelItem] = useState<{ tab: AdminTab; idCode: string } | null>(null);

  const [seriesItems, setSeriesItems] = useState<AdminSeries[]>([]);
  const [glassItems,  setGlassItems]  = useState<AdminGlass[]>([]);
  const [colorItems,  setColorItems]  = useState<AdminColor[]>([]);
  const [accItems,    setAccItems]    = useState<AdminAccessory[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, g, c, a] = await Promise.all([
        apiFetch<AdminSeries[]>('/series/all/'),
        apiFetch<AdminGlass[]>('/glass/all/'),
        apiFetch<AdminColor[]>('/colors/all/'),
        apiFetch<AdminAccessory[]>('/accessories/all/'),
      ]);
      setSeriesItems(s);
      setGlassItems(g);
      setColorItems(c);
      setAccItems(a);
    } catch {
      setError('Не удалось загрузить данные каталога');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Toggle is_active ────────────────────────────────────────────────────────
  async function toggle(resource: string, idCode: string, current: boolean) {
    try {
      await apiMutate('PATCH', `/${resource}/${idCode}/`, { is_active: !current });
      await loadAll();
      onDataChanged();
    } catch {
      setError('Ошибка при обновлении');
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function doDelete() {
    if (!delItem) return;
    const resourceMap: Record<AdminTab, string> = {
      series: 'series', glass: 'glass', colors: 'colors', accessories: 'accessories',
    };
    setSaving(true);
    try {
      await apiMutate('DELETE', `/${resourceMap[delItem.tab]}/${delItem.idCode}/`);
      setDelItem(null);
      await loadAll();
      onDataChanged();
    } catch {
      setError('Ошибка при удалении');
    } finally {
      setSaving(false);
    }
  }

  // ── Save handlers ───────────────────────────────────────────────────────────
  async function saveForm(body: unknown, resource: string, idCode: string, isNew: boolean) {
    setSaving(true);
    setError(null);
    try {
      if (isNew) await apiMutate('POST', `/${resource}/`, body);
      else       await apiMutate('PUT',  `/${resource}/${idCode}/`, body);
      setForm(null);
      await loadAll();
      onDataChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleSeries(f: SeriesForm) {
    await saveForm(seriesFormToBody(f, form!.isNew), 'series', f.id_code, form!.isNew);
  }
  async function handleGlass(f: GlassForm) {
    const body = {
      name: f.name, spec: f.spec, description: f.description,
      u_value: f.u_value, price_modifier: f.price_modifier,
      is_active: f.is_active, sort_order: +f.sort_order,
      ...(form!.isNew ? { id_code: f.id_code } : {}),
    };
    await saveForm(body, 'glass', f.id_code, form!.isNew);
  }
  async function handleColor(f: ColorForm) {
    const mats: string[] = [];
    if (f.mat_pvc) mats.push('PVC');
    if (f.mat_alu) mats.push('aluminum');
    const body = {
      name: f.name, color_type: f.color_type, tier: f.tier,
      hex: f.hex, highlight_hex: f.highlight_hex, shadow_hex: f.shadow_hex,
      texture: f.texture || null,
      materials: mats, is_active: f.is_active, sort_order: +f.sort_order,
      ...(form!.isNew ? { id_code: f.id_code } : {}),
    };
    await saveForm(body, 'colors', f.id_code, form!.isNew);
  }
  async function handleAcc(f: AccessoryForm) {
    const body = {
      name: f.name, category: f.category, price: +f.price,
      unit: f.unit, price_mode: f.price_mode,
      is_active: f.is_active, sort_order: +f.sort_order,
      ...(form!.isNew ? { id_code: f.id_code } : {}),
    };
    await saveForm(body, 'accessories', f.id_code, form!.isNew);
  }

  // ── Open forms ──────────────────────────────────────────────────────────────
  function openNew() {
    if (tab === 'series')      setForm({ tab: 'series',      isNew: true, data: EMPTY_SERIES });
    else if (tab === 'glass')  setForm({ tab: 'glass',       isNew: true, data: EMPTY_GLASS  });
    else if (tab === 'colors') setForm({ tab: 'colors',      isNew: true, data: EMPTY_COLOR  });
    else                       setForm({ tab: 'accessories', isNew: true, data: EMPTY_ACC    });
  }

  function openEdit(item: AdminSeries | AdminGlass | AdminColor | AdminAccessory) {
    if (tab === 'series') {
      setForm({ tab: 'series', isNew: false, data: toSeriesForm(item as AdminSeries) });
    } else if (tab === 'glass') {
      const g = item as AdminGlass;
      setForm({ tab: 'glass', isNew: false, data: {
        id_code: g.id_code, name: g.name, spec: g.spec, description: g.description,
        u_value: g.u_value, price_modifier: g.price_modifier,
        is_active: g.is_active, sort_order: String(g.sort_order),
      }});
    } else if (tab === 'colors') {
      const c = item as AdminColor;
      setForm({ tab: 'colors', isNew: false, data: {
        id_code: c.id_code, name: c.name, color_type: c.color_type, tier: c.tier,
        hex: c.hex, highlight_hex: c.highlight_hex, shadow_hex: c.shadow_hex,
        texture: c.texture ?? '',
        mat_pvc: c.materials.includes('PVC'), mat_alu: c.materials.includes('aluminum'),
        is_active: c.is_active, sort_order: String(c.sort_order),
      }});
    } else {
      const a = item as AdminAccessory;
      setForm({ tab: 'accessories', isNew: false, data: {
        id_code: a.id_code, name: a.name, category: a.category,
        price: String(a.price), unit: a.unit, price_mode: a.price_mode,
        is_active: a.is_active, sort_order: String(a.sort_order),
      }});
    }
  }

  // ── Row component ────────────────────────────────────────────────────────────
  const resourceMap: Record<AdminTab, string> = {
    series: 'series', glass: 'glass', colors: 'colors', accessories: 'accessories',
  };

  function RowActions({ item, resTab }: { item: AdminSeries | AdminGlass | AdminColor | AdminAccessory; resTab: AdminTab }) {
    return (
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button"
          onClick={() => toggle(resourceMap[resTab], item.id_code, item.is_active)}
          title={item.is_active ? 'Деактивировать' : 'Активировать'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            item.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'
          }`}>
          {item.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => openEdit(item)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Редактировать">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => setDelItem({ tab: resTab, idCode: item.id_code })}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Удалить">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; count: number }[] = [
    { id: 'series',      label: 'Серии',        count: seriesItems.length },
    { id: 'glass',       label: 'Стекло',        count: glassItems.length  },
    { id: 'colors',      label: 'Цвета',         count: colorItems.length  },
    { id: 'accessories', label: 'Аксессуары',    count: accItems.length    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-gray-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Управление каталогом</h2>
            <p className="text-xs text-gray-400 mt-0.5">Серии · Стекло · Цвета · Аксессуары</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-2 shrink-0 bg-white">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {!loading && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
          {error
            ? <span className="text-xs text-red-600 truncate mr-2">{error}</span>
            : <span className="text-xs text-gray-400">{tabs.find(t => t.id === tab)?.count ?? '…'} записей</span>
          }
          <button onClick={() => { setError(null); openNew(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Загрузка…
            </div>
          ) : (
            <>
              {/* Series list */}
              {tab === 'series' && (
                <div className="divide-y divide-gray-50">
                  {seriesItems.map(s => (
                    <div key={s.id_code}
                      className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400">
                          {s.material === 'PVC' ? 'ПВХ' : 'Алюминий'} ·{' '}
                          {s.price_per_sqm.toLocaleString('ru-RU')} сум/м² ·{' '}
                          <span className="font-mono">{s.id_code}</span>
                        </div>
                      </div>
                      <RowActions item={s} resTab="series" />
                    </div>
                  ))}
                </div>
              )}

              {/* Glass list */}
              {tab === 'glass' && (
                <div className="divide-y divide-gray-50">
                  {glassItems.map(g => (
                    <div key={g.id_code}
                      className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${!g.is_active ? 'opacity-50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${g.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{g.name}</div>
                        <div className="text-xs text-gray-400">
                          {g.spec} · U={g.u_value} · ×{g.price_modifier}
                        </div>
                      </div>
                      <RowActions item={g} resTab="glass" />
                    </div>
                  ))}
                </div>
              )}

              {/* Colors list */}
              {tab === 'colors' && (
                <div className="divide-y divide-gray-50">
                  {colorItems.map(c => (
                    <div key={c.id_code}
                      className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                      <div className="w-8 h-8 rounded-lg border border-gray-200 shrink-0"
                        style={{ background: c.hex }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                        <div className="text-xs text-gray-400">
                          {c.tier === 'white' ? 'Белый' : c.tier === 'colored' ? 'Цветной' : 'Ламинация'} ·{' '}
                          {c.color_type.toUpperCase()} · <span className="font-mono">{c.hex}</span>
                        </div>
                      </div>
                      <RowActions item={c} resTab="colors" />
                    </div>
                  ))}
                </div>
              )}

              {/* Accessories list */}
              {tab === 'accessories' && (
                <div className="divide-y divide-gray-50">
                  {accItems.map(a => (
                    <div key={a.id_code}
                      className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${!a.is_active ? 'opacity-50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-400">
                          {a.category} · {a.price.toLocaleString('ru-RU')} сум/{a.unit} ·{' '}
                          {a.price_mode === 'fixed' ? 'фикс.' : a.price_mode === 'per_width' ? 'по ширине' : a.price_mode === 'per_height' ? 'по высоте' : 'по перим.'}
                        </div>
                      </div>
                      <RowActions item={a} resTab="accessories" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Form modal */}
      {form && (
        <FormModal
          title={form.isNew
            ? { series: 'Новая серия', glass: 'Новый стеклопакет', colors: 'Новый цвет', accessories: 'Новый аксессуар' }[form.tab]
            : { series: 'Редактировать серию', glass: 'Редактировать стеклопакет', colors: 'Редактировать цвет', accessories: 'Редактировать аксессуар' }[form.tab]
          }
          onClose={() => setForm(null)}
        >
          {form.tab === 'series'      && <SeriesFormView    initial={form.data} isNew={form.isNew} onSubmit={handleSeries} onCancel={() => setForm(null)} saving={saving} />}
          {form.tab === 'glass'       && <GlassFormView     initial={form.data} isNew={form.isNew} onSubmit={handleGlass}  onCancel={() => setForm(null)} saving={saving} />}
          {form.tab === 'colors'      && <ColorFormView     initial={form.data} isNew={form.isNew} onSubmit={handleColor}  onCancel={() => setForm(null)} saving={saving} />}
          {form.tab === 'accessories' && <AccessoryFormView initial={form.data} isNew={form.isNew} onSubmit={handleAcc}    onCancel={() => setForm(null)} saving={saving} />}
        </FormModal>
      )}

      {/* Delete confirmation */}
      {delItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/40"
          onClick={() => setDelItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Удалить запись?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Будет удалено: <span className="font-mono font-medium text-gray-800">{delItem.idCode}</span>.
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDelItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={doDelete} disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
