'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiClient } from '@/lib/api';
import {
  ComposableMap, Geographies, Geography, Marker, Line,
} from 'react-simple-maps';
import { MapPin, TrendingUp, ChevronLeft, ChevronRight, BarChart3, DollarSign, Zap } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RegionData  { name: string; volume: number; pct: number; rank: number; plan: number }
interface WhData      { name: string; volume: number; regions: { name: string; volume: number }[] }
interface MapData     { regions: RegionData[]; warehouses: WhData[]; total: number; period: string }
interface Tooltip     { x: number; y: number; name: string; rd: RegionData }

// ─── GADM NAME_1 → Russian region name in DB ─────────────────────────────────
const GADM_TO_DB: Record<string, string | null> = {
  'Andijon':         'Андижон',
  'Buxoro':          'Бухоро',
  "Farg'ona":        'Фаргона',
  'Jizzax':          'Жиззах',
  'Namangan':        'Наманган',
  'Navoiy':          'Навоий',
  'Qaraqalpaqstan':  'Кораколпокистон',
  'Qashqadaryo':     'Кашкадарё',
  "Samarqand'":      'Самарканд',
  'Samarqand':       'Самарканд',
  'Sirdaryo':        null,
  'Surxondaryo':     'Сурхандарё',
  'Toshkent':        'Тошкент обл',
  'ToshkentShahri':  'Тошкент',
  'Xorazm':          'Хоразм',
};

// ─── Warehouse geographic coordinates [lon, lat] ─────────────────────────────
const WH_GEO: Record<string, { coords: [number, number]; label: string }> = {
  TOSHKENT:  { coords: [69.85, 41.26], label: 'Ташкент' },
  NAMANGAN:  { coords: [71.67, 40.99], label: 'Наманган' },
  SAMARQAND: { coords: [66.98, 39.65], label: 'Самарканд' },
  BUXORO:    { coords: [64.43, 39.77], label: 'Бухара' },
  XORAZM:   { coords: [60.62, 41.55], label: 'Хорезм' },
};

// ─── Region centroid coordinates for flow line endpoints ─────────────────────
const REGION_CENTROID: Record<string, [number, number]> = {
  'Андижон':         [72.34, 40.75],
  'Бухоро':          [64.43, 39.77],
  'Фаргона':         [71.77, 40.39],
  'Жиззах':          [67.84, 40.12],
  'Наманган':        [71.67, 40.99],
  'Навоий':          [65.38, 40.08],
  'Кораколпокистон': [59.60, 43.23],
  'Кашкадарё':       [65.80, 38.86],
  'Самарканд':       [66.98, 39.65],
  'Тошкент обл':     [69.60, 41.00],
  'Сурхандарё':      [67.27, 37.93],
  'Тошкент':         [69.85, 41.26],
  'Хоразм':          [60.62, 41.55],
  'Кукон':           [70.94, 40.53],
};

// ─── Cities that have no GADM Level-1 polygon (shown as city markers) ─────────
// shape: 'circle' = round, 'diamond' = rotated square
const EXTRA_CITIES: { name: string; coords: [number, number]; label: string; shape: 'circle' | 'diamond' }[] = [
  { name: 'Тошкент', coords: [69.24, 41.30], label: 'Ташкент г.', shape: 'circle' },
  { name: 'Кукон',   coords: [70.94, 40.53], label: 'Кукон',      shape: 'circle' },
];

// ─── Heat-map colour: dark-blue → green → orange → red ───────────────────────
function heatColor(pct: number, maxPct: number): string {
  if (!maxPct || pct === 0) return '#1e293b';
  const t = Math.min(pct / maxPct, 1);
  const stops: [number, number, number][] = [
    [30,  64, 175],
    [21, 128,  61],
    [161, 161,  11],
    [234,  88,  12],
    [185,  28,  28],
  ];
  const idx = t * (stops.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, stops.length - 1);
  const blend = idx - lo;
  const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * blend);
  const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * blend);
  const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * blend);
  return `rgb(${r},${g},${b})`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

// ─── Page component ───────────────────────────────────────────────────────────
export default function MapPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [year,    setYear]   = useState(2025);
  const [month,   setMonth]  = useState(0);
  const [gruppa,  setGruppa] = useState('');
  const [kod,     setKod]    = useState('');
  const [groups,  setGroups] = useState<string[]>([]);
  const [codes,   setCodes]  = useState<string[]>([]);
  const [data,    setData]   = useState<MapData | null>(null);
  const [market,  setMarket] = useState<{ usd_uzs: number | null; aluminum_price: number | null; aluminum_unit: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hover,   setHover]  = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  // Fetch all filter options on login
  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.getRegionMapFilters()
      .then(f => { setGroups(f.groups); setCodes(f.codes); })
      .catch(console.error);
    // Market data (cached 1h on backend)
    apiClient.getMarketData()
      .then(m => setMarket({ usd_uzs: m.usd_uzs, aluminum_price: m.aluminum_price, aluminum_unit: m.aluminum_unit }))
      .catch(console.error);
  }, [isAuthenticated]);

  // Re-fetch codes when gruppa changes (reset kod)
  useEffect(() => {
    if (!isAuthenticated) return;
    setKod('');
    apiClient.getRegionMapFilters(gruppa || undefined)
      .then(f => setCodes(f.codes))
      .catch(console.error);
  }, [gruppa, isAuthenticated]);

  const load = useCallback(async (y: number, m: number, g: string, k: string) => {
    setLoading(true);
    try {
      const r = await apiClient.getRegionMap({
        year: y, month: m,
        gruppa: g || undefined,
        kod:    k || undefined,
      });
      setData(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load(year, month, gruppa, kod);
  }, [isAuthenticated, year, month, gruppa, kod, load]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  // Index region data by name
  const regionMap: Record<string, RegionData> = {};
  (data?.regions || []).forEach(r => { regionMap[r.name] = r; });
  const maxPct = data?.regions.length ? Math.max(...data.regions.map(r => r.pct)) : 1;

  // Build animated flow lines: warehouse → top-4 regions by volume
  const flows: { from: [number,number]; to: [number,number]; opacity: number }[] = [];
  data?.warehouses.forEach(wh => {
    const wc = WH_GEO[wh.name];
    if (!wc) return;
    wh.regions.slice(0, 4).forEach(reg => {
      const rc = REGION_CENTROID[reg.name];
      if (!rc) return;
      if (Math.hypot(wc.coords[0] - rc[0], wc.coords[1] - rc[1]) < 0.5) return;
      flows.push({ from: wc.coords, to: rc, opacity: Math.max(0.2, reg.volume / (wh.volume || 1)) });
    });
  });

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* CSS for flow & pulse animations */}
      <style>{`
        .flow-line { stroke-dasharray: 8 5; animation: flowmarch 2s linear infinite; }
        @keyframes flowmarch { to { stroke-dashoffset: -52; } }
        .wh-pulse { animation: whpulse 2.5s ease-out infinite; }
        @keyframes whpulse { 0% { r: 10; opacity: 0.6; } 100% { r: 24; opacity: 0; } }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">Карта продаж · Узбекистан</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {data ? `${fmt(data.total)} кг · ${data.period}` : 'Загрузка...'}
            </p>
          </div>

          {/* Market data pills */}
          {market && (
            <div className="flex items-center gap-1.5 ml-3">
              {market.usd_uzs && (
                <div className="flex items-center gap-1 w-36 bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1.5
                                hover:border-green-600/50 transition-colors cursor-default"
                     title="Курс ЦБ РУз">
                  <DollarSign className="w-3 h-3 text-green-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-green-400 leading-none truncate">
                      {fmt(market.usd_uzs)} сум
                    </p>
                    <p className="text-[9px] text-gray-600 leading-none mt-0.5">USD/UZS</p>
                  </div>
                </div>
              )}
              {market.aluminum_price && (
                <div className="flex items-center gap-1 w-36 bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1.5
                                hover:border-blue-600/50 transition-colors cursor-default"
                     title="Цена алюминия LME">
                  <Zap className="w-3 h-3 text-blue-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-blue-300 leading-none truncate">
                      ${fmt(market.aluminum_price)} LME
                    </p>
                    <p className="text-[9px] text-gray-600 leading-none mt-0.5">{market.aluminum_unit}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
            <button onClick={() => setYear(y => y - 1)} className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold w-9 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="text-gray-400 hover:text-white">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month buttons */}
          <div className="flex gap-0.5 flex-wrap">
            <button
              onClick={() => setMonth(0)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                month === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Год
            </button>
            {MONTHS_RU.map((m, i) => (
              <button key={i} onClick={() => setMonth(i + 1)}
                className={`px-1.5 py-1 rounded text-xs font-medium transition-colors ${
                  month === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Group filter */}
          {groups.length > 0 && (
            <select
              value={gruppa}
              onChange={e => setGruppa(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2 py-1 border border-gray-700
                         focus:outline-none focus:border-blue-500 max-w-[160px] truncate"
            >
              <option value="">Все группы</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* KOD_TOVARA filter (scoped to selected group) */}
          {codes.length > 0 && (
            <select
              value={kod}
              onChange={e => setKod(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2 py-1 border border-gray-700
                         focus:outline-none focus:border-blue-500 max-w-[160px] truncate"
            >
              <option value="">{gruppa ? 'Все коды группы' : 'Все товары'}</option>
              {codes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Reset button — shown when any filter active */}
          {(gruppa || kod) && (
            <button
              onClick={() => { setGruppa(''); setKod(''); }}
              className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 border border-red-800/40
                         rounded-lg px-2 py-1 transition-colors"
            >
              ✕ Сбросить
            </button>
          )}

          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Map ── */}
        <div className="flex-1 relative flex items-center justify-center bg-gray-950 min-w-0">
          {mounted && (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 1700, center: [63, 41.5] }}
              width={800}
              height={460}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Region fills */}
              <Geographies geography="/uz-regions.json">
                {({ geographies }: { geographies: import('react-simple-maps').GeographyFeature[] }) =>
                  geographies.map((geo: import('react-simple-maps').GeographyFeature) => {
                    const gadmName = geo.properties.NAME_1 as string;
                    const dbName   = GADM_TO_DB[gadmName] ?? null;
                    const rd       = dbName ? regionMap[dbName] : null;
                    const fill     = rd ? heatColor(rd.pct, maxPct) : '#1e293b';
                    const isHov    = hover === dbName && !!dbName;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke={isHov ? '#93c5fd' : '#334155'}
                        strokeWidth={isHov ? 2 : 0.6}
                        style={{
                          default:  { outline: 'none', cursor: dbName ? 'pointer' : 'default', transition: 'fill 0.3s, stroke 0.15s' },
                          hover:    { outline: 'none' },
                          pressed:  { outline: 'none' },
                        }}
                        onMouseEnter={(e: React.MouseEvent) => {
                          if (!dbName) return;
                          setHover(dbName);
                          if (rd) setTooltip({ x: e.clientX, y: e.clientY, name: dbName, rd });
                        }}
                        onMouseMove={(e: React.MouseEvent) => {
                          setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                        }}
                        onMouseLeave={() => { setHover(null); setTooltip(null); }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* Animated flow lines */}
              {flows.map((f, i) => (
                <Line
                  key={i}
                  from={f.from}
                  to={f.to}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeOpacity={f.opacity * 0.7}
                  strokeLinecap="round"
                  className="flow-line"
                />
              ))}

              {/* Warehouse markers with pulse rings */}
              {data?.warehouses.map(wh => {
                const wc = WH_GEO[wh.name];
                if (!wc) return null;
                return (
                  <Marker key={wh.name} coordinates={wc.coords}>
                    <circle r={22} fill="none" stroke="#3b82f6" strokeWidth={1} className="wh-pulse" />
                    <circle r={9}  fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1.5} />
                    <circle r={4}  fill="#93c5fd" />
                    <text y={22} textAnchor="middle" fontSize={8.5} fill="#7dd3fc"
                      fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {wc.label}
                    </text>
                  </Marker>
                );
              })}

              {/* Extra city markers (no visible GADM polygon: Тошкент-шаҳар, Кукон) */}
              {EXTRA_CITIES.map(city => {
                const rd   = regionMap[city.name];
                const fill = rd ? heatColor(rd.pct, maxPct) : '#334155';
                const stroke = hover === city.name ? '#93c5fd' : '#60a5fa';
                const handlers = {
                  onMouseEnter: (e: React.MouseEvent) => {
                    setHover(city.name);
                    if (rd) setTooltip({ x: e.clientX, y: e.clientY, name: city.name, rd });
                  },
                  onMouseMove: (e: React.MouseEvent) => {
                    setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                  },
                  onMouseLeave: () => { setHover(null); setTooltip(null); },
                };
                return (
                  <Marker key={`city-${city.name}`} coordinates={city.coords}>
                    {city.shape === 'circle' ? (
                      <circle
                        r={9}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={1.5}
                        style={{ cursor: 'pointer', transition: 'fill 0.3s' }}
                        {...handlers}
                      />
                    ) : (
                      <polygon
                        points="0,-8 7,0 0,8 -7,0"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={1.5}
                        style={{ cursor: 'pointer', transition: 'fill 0.3s' }}
                        {...handlers}
                      />
                    )}
                    <text y={20} textAnchor="middle" fontSize={8.5} fill="#93c5fd"
                      fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {city.label}
                    </text>
                  </Marker>
                );
              })}

              {/* Top-3 golden pulse dots */}
              {data?.regions.filter(r => r.rank <= 3).map(reg => {
                const c = REGION_CENTROID[reg.name];
                if (!c) return null;
                return (
                  <Marker key={`top-${reg.name}`} coordinates={c}>
                    <circle r={5} fill="#fbbf24">
                      <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </Marker>
                );
              })}
            </ComposableMap>
          )}

          {/* Hover tooltip */}
          {tooltip && (
            <div
              className="fixed pointer-events-none z-50 bg-gray-900 border border-blue-500/50 rounded-xl
                         px-4 py-3 shadow-2xl backdrop-blur-sm"
              style={{ left: tooltip.x + 14, top: tooltip.y - 72 }}
            >
              <p className="font-bold text-white text-sm">{tooltip.name}</p>
              <p className="text-blue-300 text-xl font-bold leading-tight">
                {fmt(tooltip.rd.volume)}
                <span className="text-sm text-blue-400 ml-1">кг</span>
              </p>
              {tooltip.rd.plan > 0 && (
                <p className="text-emerald-400 text-sm font-semibold leading-tight">
                  План: {fmt(tooltip.rd.plan)}
                  <span className="text-xs text-emerald-500 ml-1">кг</span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({tooltip.rd.plan > 0 ? Math.round(tooltip.rd.volume / tooltip.rd.plan * 100) : 0}%)
                  </span>
                </p>
              )}
              <p className="text-gray-400 text-xs">
                #{tooltip.rd.rank} место · {tooltip.rd.pct}% от итого
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2
                          bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500">Низкие</span>
            <div className="flex rounded overflow-hidden">
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                <div key={i} className="w-7 h-3"
                  style={{ background: heatColor(t * (maxPct || 1), maxPct || 1) }} />
              ))}
            </div>
            <span className="text-xs text-gray-500">Высокие</span>
          </div>

          {/* No-data overlay */}
          {!loading && data && data.total === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-600 text-lg font-medium">Нет данных за выбранный период</p>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-64 bg-gray-900/80 border-l border-gray-800 overflow-y-auto flex flex-col shrink-0">

          {/* Total */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Итого</p>
            <p className="text-2xl font-bold">
              {data ? fmt(data.total) : '—'}
              <span className="text-sm text-gray-400 font-normal ml-1">кг</span>
            </p>
          </div>

          {/* Region ranking */}
          <div className="flex-1 px-3 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Регионы
            </p>
            <div className="space-y-1.5">
              {(data?.regions || []).map(reg => (
                <div
                  key={reg.name}
                  className={`rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150 ${
                    hover === reg.name
                      ? 'bg-blue-900/40 border border-blue-500/40 scale-[1.01]'
                      : 'bg-gray-800/40 hover:bg-gray-800/70'
                  }`}
                  onMouseEnter={() => setHover(reg.name)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${
                        reg.rank === 1 ? 'text-yellow-400'
                        : reg.rank <= 3 ? 'text-blue-400'
                        : 'text-gray-600'
                      }`}>
                        #{reg.rank}
                      </span>
                      <span className="text-xs text-gray-200 truncate max-w-[105px]">{reg.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{reg.pct}%</span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(reg.pct / maxPct) * 100}%`,
                        background: heatColor(reg.pct, maxPct),
                      }}
                    />
                  </div>
                  <div className="flex gap-2 text-xs mt-0.5">
                    <span className="text-gray-300">Факт: {fmt(reg.volume)} кг</span>
                    {reg.plan > 0 && (
                      <>
                        <span className="text-emerald-400">План: {fmt(reg.plan)} кг</span>
                        <span className="text-emerald-500">Выполнение: {Math.round(reg.volume / reg.plan * 100)}%</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {(!data || data.regions.length === 0) && (
                <p className="text-gray-600 text-sm text-center py-8">Нет данных</p>
              )}
            </div>
          </div>

          {/* Warehouses summary */}
          {data && data.warehouses.length > 0 && (
            <div className="px-3 py-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Склады
              </p>
              <div className="space-y-1.5">
                {data.warehouses.map(wh => (
                  <div key={wh.name} className="bg-gray-800/40 rounded-lg px-2.5 py-2">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-semibold text-blue-300">
                        {WH_GEO[wh.name]?.label || wh.name}
                      </span>
                      <span className="text-xs text-gray-500">{fmt(wh.volume)} кг</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto pr-1">
                      {wh.regions.map(r => (
                        <div key={r.name} className="flex justify-between text-xs text-gray-600">
                          <span className="truncate max-w-[110px]">{r.name}</span>
                          <span>{fmt(r.volume)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
