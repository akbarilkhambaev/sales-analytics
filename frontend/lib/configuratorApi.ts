/**
 * Configurator API client
 *
 * Fetches product data from Django REST endpoints and maps
 * snake_case API fields to the camelCase TypeScript interfaces
 * used by the configurator page.
 */

import type {
  Series,
  ProfileColor,
  GlassOption,
  Accessory,
  MaterialRates,
} from '@/app/configurator/types';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api') + '/configurator';

// ─── Raw API shapes (what Django actually returns) ────────────────────────────

interface ApiMaterialRates {
  frame_per_m: number;
  frame_colored_per_m: number;
  frame_laminated_per_m: number;
  sash_per_m: number;
  sash_colored_per_m: number;
  sash_laminated_per_m: number;
  imposta_per_m: number;
  imposta_colored_per_m: number;
  imposta_laminated_per_m: number;
  glass_per_sqm: number;
  hardware_per_opening: number;
  hardware_per_sliding: number;
  seal_per_m: number;
  install_base: number;
}

interface ApiSeries {
  id: number;
  id_code: string;
  name: string;
  material: 'PVC' | 'aluminum';
  description: string;
  features: string[];
  categories: ('window' | 'door' | 'sliding')[];
  min_width: number;
  max_width: number;
  min_height: number;
  max_height: number;
  price_per_sqm: number;
  rates: ApiMaterialRates;
  is_active: boolean;
  sort_order: number;
}

interface ApiProfileColor {
  id: number;
  id_code: string;
  name: string;
  color_type: 'ral' | 'lamination';
  tier: 'white' | 'colored' | 'laminated';
  hex: string;
  highlight_hex: string;
  shadow_hex: string;
  texture: string | null;
  materials: ('PVC' | 'aluminum')[];
  is_active: boolean;
  sort_order: number;
}

interface ApiGlassOption {
  id: number;
  id_code: string;
  name: string;
  spec: string;
  description: string;
  u_value: string;
  price_modifier: string; // Django DecimalField serialises as string
  is_active: boolean;
  sort_order: number;
}

interface ApiAccessory {
  id: number;
  id_code: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  price_mode: 'fixed' | 'per_width' | 'per_height' | 'per_perimeter';
  is_active: boolean;
  sort_order: number;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapSeries(s: ApiSeries): Series {
  return {
    id: s.id_code,
    name: s.name,
    material: s.material,
    description: s.description,
    features: s.features,
    categories: s.categories,
    min_width: s.min_width,
    max_width: s.max_width,
    min_height: s.min_height,
    max_height: s.max_height,
    price_per_sqm: s.price_per_sqm,
    rates: s.rates as MaterialRates, // field names are identical
  };
}

function mapColor(c: ApiProfileColor): ProfileColor {
  return {
    id: c.id_code,
    name: c.name,
    type: c.color_type,
    tier: c.tier,
    hex: c.hex,
    highlightHex: c.highlight_hex,
    shadowHex: c.shadow_hex,
    texture: c.texture ?? undefined,
    materials: c.materials,
  };
}

function mapGlass(g: ApiGlassOption): GlassOption {
  return {
    id: g.id_code,
    name: g.name,
    spec: g.spec,
    description: g.description,
    u_value: g.u_value,
    price_modifier: parseFloat(g.price_modifier),
  };
}

function mapAccessory(a: ApiAccessory): Accessory {
  return {
    id: a.id_code,
    name: a.name,
    category: a.category,
    price: a.price,
    unit: a.unit,
    price_mode: a.price_mode,
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Configurator API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchSeries(): Promise<Series[]> {
  const data = await getJson<ApiSeries[]>('/series/?ordering=sort_order');
  return data.map(mapSeries);
}

export async function fetchColors(material?: 'PVC' | 'aluminum'): Promise<ProfileColor[]> {
  const qs = material ? `?material=${material}&ordering=sort_order` : '?ordering=sort_order';
  const data = await getJson<ApiProfileColor[]>(`/colors/${qs}`);
  return data.map(mapColor);
}

export async function fetchGlassOptions(): Promise<GlassOption[]> {
  const data = await getJson<ApiGlassOption[]>('/glass/?ordering=sort_order');
  return data.map(mapGlass);
}

export async function fetchAccessories(): Promise<Accessory[]> {
  const data = await getJson<ApiAccessory[]>('/accessories/?ordering=sort_order');
  return data.map(mapAccessory);
}

/** Load all configurator data in parallel */
export async function fetchConfiguratorData(): Promise<{
  series: Series[];
  colors: ProfileColor[];
  glassOptions: GlassOption[];
  accessories: Accessory[];
}> {
  const [series, colors, glassOptions, accessories] = await Promise.all([
    fetchSeries(),
    fetchColors(),
    fetchGlassOptions(),
    fetchAccessories(),
  ]);
  return { series, colors, glassOptions, accessories };
}
