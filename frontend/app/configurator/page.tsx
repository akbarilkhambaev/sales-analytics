'use client';

import { useState, useEffect } from 'react';
import SVGPreview from './SVGPreview';
import QuoteModal from './QuoteModal';
import {
  CONSTRUCTION_TEMPLATES,
  DIMENSION_PRESETS,
  DEFAULT_COLOR,
} from './mockData';
import { fetchConfiguratorData } from '@/lib/configuratorApi';
import { useAuth } from '@/lib/AuthContext';
import CatalogAdminPanel from './CatalogAdminPanel';
import type { Series, GlassOption, ConstructionTemplate, Accessory, Category, ProfileColor } from './types';
import { calcAccPrice, calcAccQty, calcMaterialBreakdown } from './utils';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  Layers,
  LayoutGrid,
  Ruler,
  Sliders,
  ShoppingBag,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Palette,
  Settings2,
} from 'lucide-react';

// ─── Stepper config ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Серия',        icon: Layers      },
  { label: 'Конструкция',  icon: LayoutGrid  },
  { label: 'Размеры',      icon: Ruler       },
  { label: 'Стекло',       icon: Sliders     },
  { label: 'Цвет',         icon: Palette     },
  { label: 'Аксессуары',   icon: ShoppingBag },
];

const COLOR_TABS = [
  { id: 'all',        label: 'Все'         },
  { id: 'ral',        label: 'RAL'         },
  { id: 'lamination', label: 'Ламинации'   },
] as const;
type ColorTabId = typeof COLOR_TABS[number]['id'];

const CATEGORY_FILTERS: { id: Category | 'all'; label: string }[] = [
  { id: 'all',      label: 'Все'         },
  { id: 'window',   label: 'Окна'        },
  { id: 'door',     label: 'Двери'       },
  { id: 'sliding',  label: 'Раздвижные'  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [step, setStep]               = useState(0);
  const [catFilter, setCatFilter]     = useState<Category | 'all'>('all');

  // Configurator state
  const [series,       setSeries]      = useState<Series | null>(null);
  const [construction, setConstruction] = useState<ConstructionTemplate | null>(null);
  const [width,        setWidth]       = useState(1000);
  const [height,       setHeight]      = useState(1200);
  const [glass,        setGlass]       = useState<GlassOption | null>(null);
  const [accessories,  setAccessories] = useState<Accessory[]>([]);
  const [showModal,   setShowModal]   = useState(false);
  const [quoteNo,     setQuoteNo]     = useState('');
  const [quoteDate,   setQuoteDate]   = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [color,       setColor]       = useState<ProfileColor>(DEFAULT_COLOR);
  const [colorTab,    setColorTab]    = useState<ColorTabId>('all');
  const [showAdmin,   setShowAdmin]   = useState(false);

  // Data from API
  const [seriesList,    setSeriesList]    = useState<Series[]>([]);
  const [profileColors, setProfileColors] = useState<ProfileColor[]>([DEFAULT_COLOR]);
  const [glassOptions,  setGlassOptions]  = useState<GlassOption[]>([]);
  const [accessoryList, setAccessoryList] = useState<Accessory[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);

  useEffect(() => {
    fetchConfiguratorData()
      .then(({ series, colors, glassOptions: glass, accessories }) => {
        setSeriesList(series);
        setGlassOptions(glass);
        setAccessoryList(accessories);
        if (colors.length > 0) {
          setProfileColors(colors);
          setColor(colors[0]);
        }
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, []);

  // Price calculation
  const area      = (width / 1000) * (height / 1000);
  const breakdown = series
    ? calcMaterialBreakdown(width, height, construction, series, glass, color)
    : null;
  const accsTotal = accessories.reduce((sum, a) => sum + calcAccPrice(a, width, height), 0);
  const total     = (breakdown?.total ?? 0) + accsTotal;

  const filteredSeries = catFilter === 'all' ? seriesList : seriesList.filter(s => s.categories.includes(catFilter as Category));
  const effectiveCategory: Category = catFilter !== 'all'
    ? catFilter
    : series?.categories.includes('sliding') ? 'sliding' : 'window';
  const availableTemplates = CONSTRUCTION_TEMPLATES.filter(t => t.categories.includes(effectiveCategory));

  // Derived lists
  const filteredColors = profileColors.filter(c => {
    if (colorTab !== 'all' && c.type !== colorTab) return false;
    return true;
  });

  // Step validation
  const canGoNext = [
    () => series !== null,
    () => construction !== null,
    () => {
      if (!series) return false;
      return width  >= series.min_width  && width  <= series.max_width
          && height >= series.min_height && height <= series.max_height;
    },
    () => glass !== null,
    () => true,  // color always valid
    () => true,  // accessories always valid
  ];

  // Handlers
  function selectSeries(s: Series) {
    if (series?.id === s.id) return;
    setSeries(s);
    setConstruction(null);
    setGlass(null);
    setAccessories([]);
    // reset dimensions to a sensible middle value
    const midW = Math.round((s.min_width  + s.max_width)  / 2 / 50) * 50;
    const midH = Math.round((s.min_height + s.max_height) / 2 / 50) * 50;
    setWidth(midW);
    setHeight(midH);
  }

  function clampWidth (v: number) {
    if (!series) return v;
    return Math.min(series.max_width,  Math.max(series.min_width,  v));
  }
  function clampHeight(v: number) {
    if (!series) return v;
    return Math.min(series.max_height, Math.max(series.min_height, v));
  }

  function toggleAccessory(acc: Accessory) {
    setAccessories(prev =>
      prev.some(a => a.id === acc.id)
        ? prev.filter(a => a.id !== acc.id)
        : [...prev, acc]
    );
  }

  function handleSave() {
    const ts = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    setQuoteNo(`KON-${ts.getFullYear().toString().slice(-2)}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getMilliseconds(), 3)}`);
    setQuoteDate(ts.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }));
    setShowModal(true);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Preview zoom modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { setShowPreview(false); setPreviewZoom(1); }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl flex w-full max-w-5xl max-h-[92vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => { setShowPreview(false); setPreviewZoom(1); }}
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: large SVG */}
            <div className="flex-1 flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-0 overflow-hidden">

              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Схема изделия
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 px-1.5 py-1 shadow-sm">
                  <button
                    onClick={() => setPreviewZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Уменьшить"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-gray-600 w-10 text-center select-none">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Увеличить"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-0.5" />
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Сбросить"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Zoomable SVG area */}
              <div
                className="flex-1 overflow-auto flex items-center justify-center min-h-0 cursor-zoom-in"
                onWheel={e => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.15 : 0.15;
                  setPreviewZoom(z => Math.min(4, Math.max(0.5, +(z + delta).toFixed(2))));
                }}
                onDoubleClick={() => setPreviewZoom(1)}
                style={{ scrollbarWidth: 'thin' }}
              >
                <div
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease',
                    width: '100%',
                    maxWidth: 520,
                    flexShrink: 0,
                  }}
                >
                  <SVGPreview
                    series={series}
                    width={width}
                    height={height}
                    glass={glass}
                    construction={construction}
                    color={color}
                  />
                </div>
              </div>

              {/* Hint */}
              <div className="text-center text-xs text-gray-400 mt-3 shrink-0">
                Колесо мыши для масштабирования · двойной клик для сброса
              </div>
            </div>

            {/* Right: info panel */}
            <div className="w-72 shrink-0 border-l border-gray-100 p-8 flex flex-col justify-between">
              <div>
                {series && (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{series.name}</h3>
                    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium mb-6 ${
                      series.material === 'aluminum'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {series.material === 'aluminum' ? 'Алюминий' : 'ПВХ'}
                    </span>

                    <div className="space-y-4">
                      <InfoBlock label="Ширина"   value={`${width} мм`}  mono />
                      <InfoBlock label="Высота"   value={`${height} мм`} mono />
                      <InfoBlock label="Площадь"  value={`${area.toFixed(3)} м²`} mono />
                      <InfoBlock label="Периметр" value={`${((width + height) * 2 / 1000).toFixed(2)} м`} mono />
                      {glass && <InfoBlock label="Стеклопакет" value={glass.name} />}
                      {construction && <InfoBlock label="Конструкция" value={construction.name} />}
                      {color && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Цвет профиля</div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow"
                              style={{
                                backgroundColor: color.hex,
                                backgroundImage: color.texture ? `url(${color.texture})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                            <span className="text-sm font-medium text-gray-800">{color.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-1">Стоимость</div>
                <div className="text-2xl font-extrabold text-blue-700">
                  {total.toLocaleString('ru-RU')}
                  <span className="text-sm font-normal text-gray-400 ml-1">сум</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quote modal */}
      {showModal && series && breakdown && (
        <QuoteModal
          series={series}
          width={width}
          height={height}
          glass={glass}
          construction={construction}
          accessories={accessories}
          breakdown={breakdown}
          total={total}
          area={area}
          orderNo={quoteNo}
          dateStr={quoteDate}
          color={color}
          productType={catFilter}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Catalog admin panel (ADMIN only) */}
      {showAdmin && isAdmin && (
        <CatalogAdminPanel
          onClose={() => setShowAdmin(false)}
          onDataChanged={() => {
            fetchConfiguratorData().then(({ series: s, colors, glassOptions: g, accessories: a }) => {
              setSeriesList(s);
              setGlassOptions(g);
              setAccessoryList(a);
              if (colors.length > 0) setProfileColors(colors);
            }).catch(console.error);
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Конфигуратор изделий</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Выберите серию, укажите размеры и получите расчёт стоимости
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0 mt-0.5"
          >
            <Settings2 className="w-4 h-4" />
            Управление
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => { if (done) setStep(i); }}
                  disabled={!done}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors ${
                    done   ? 'bg-blue-600 border-blue-600 text-white cursor-pointer' :
                    active ? 'bg-white border-blue-600 text-blue-600' :
                             'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : (i + 1)}
                  </div>
                  <span className={`text-sm hidden sm:block ${
                    active ? 'font-semibold text-blue-600' :
                    done   ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: step content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col">

          {/* ─ STEP 0: Series selection ─ */}
          {step === 0 && (
            <div className="flex-1">
              <div className="flex gap-2 mb-5">
                {CATEGORY_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setCatFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      catFilter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {dataLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border-2 border-gray-100 rounded-xl animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSeries.map(item => (
                  <div
                    key={item.id}
                    onClick={() => selectSeries(item)}
                    className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      series?.id === item.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    {series?.id === item.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                          item.material === 'aluminum'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.material === 'aluminum' ? 'Алюминий' : 'ПВХ'}
                        </span>
                        {item.categories.includes('window')  && <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Окна</span>}
                        {item.categories.includes('door')    && <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Двери</span>}
                        {item.categories.includes('sliding') && <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Раздвижные</span>}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">{item.description}</p>

                    <div className="space-y-1 mb-3">
                      {item.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />{f}
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-gray-400 mb-1">
                      {item.min_width}–{item.max_width} × {item.min_height}–{item.max_height} мм
                    </div>
                    <div className="text-sm font-bold text-gray-800">
                      {item.price_per_sqm.toLocaleString('ru-RU')} сум/м²
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ STEP 1: Construction template ─ */}
          {step === 1 && series && (
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-4">Выберите конструкцию изделия</p>
              {availableTemplates.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  Нет доступных конструкций для выбранной категории.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableTemplates.map(tmpl => (
                    <div
                      key={tmpl.id}
                      onClick={() => setConstruction(tmpl)}
                      className={`relative p-2 border-2 rounded-xl cursor-pointer transition-all ${
                        construction?.id === tmpl.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {construction?.id === tmpl.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center z-10">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <SVGPreview
                        series={series}
                        width={width}
                        height={height}
                        glass={null}
                        construction={tmpl}
                        color={color}
                      />
                      <div className="text-[11px] font-semibold text-gray-700 text-center leading-tight mt-1 px-0.5">
                        {tmpl.name}
                      </div>
                      {tmpl.price_modifier > 1 && (
                        <div className="text-[10px] text-emerald-600 font-medium text-center">
                          +{Math.round((tmpl.price_modifier - 1) * 100)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ STEP 2: Dimensions ─ */}
          {step === 2 && series && (
            <div className="flex-1 max-w-lg">
              {/* Series info reminder */}
              <div className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{series.name}</div>
                  <div className="text-xs text-gray-500">
                    Допустимые размеры: {series.min_width}–{series.max_width} × {series.min_height}–{series.max_height} мм
                  </div>
                </div>
              </div>

              {/* Width */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ширина (мм)</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setWidth(w => clampWidth(w - 50))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                  ><Minus className="w-3.5 h-3.5" /></button>

                  <input
                    type="number"
                    value={width}
                    min={series.min_width}
                    max={series.max_width}
                    step={50}
                    onChange={e => setWidth(clampWidth(Number(e.target.value)))}
                    className="flex-1 text-center border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    onClick={() => setWidth(w => clampWidth(w + 50))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                  ><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <input
                  type="range"
                  min={series.min_width} max={series.max_width} step={50} value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{series.min_width}</span><span>{series.max_width}</span>
                </div>
              </div>

              {/* Height */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Высота (мм)</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setHeight(h => clampHeight(h - 50))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                  ><Minus className="w-3.5 h-3.5" /></button>

                  <input
                    type="number"
                    value={height}
                    min={series.min_height}
                    max={series.max_height}
                    step={50}
                    onChange={e => setHeight(clampHeight(Number(e.target.value)))}
                    className="flex-1 text-center border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    onClick={() => setHeight(h => clampHeight(h + 50))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                  ><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <input
                  type="range"
                  min={series.min_height} max={series.max_height} step={50} value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{series.min_height}</span><span>{series.max_height}</span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="mb-5">
                <div className="text-sm font-medium text-gray-700 mb-2">Стандартные размеры</div>
                <div className="flex flex-wrap gap-2">
                  {DIMENSION_PRESETS
                    .filter(p =>
                      p.width  >= series.min_width  && p.width  <= series.max_width &&
                      p.height >= series.min_height && p.height <= series.max_height
                    )
                    .map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setWidth(p.width); setHeight(p.height); }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          width === p.width && height === p.height
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Area / perimeter info */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Площадь</span>
                  <span className="font-mono font-medium text-gray-800">{area.toFixed(3)} м²</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Периметр</span>
                  <span className="font-mono font-medium text-gray-800">
                    {((width + height) * 2 / 1000).toFixed(2)} м
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─ STEP 3: Glass ─ */}
          {step === 3 && (
            <div className="flex-1 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {glassOptions.map(g => (
                  <div
                    key={g.id}
                    onClick={() => setGlass(g)}
                    className={`p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      glass?.id === g.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-semibold text-gray-900">{g.name}</div>
                      {glass?.id === g.id && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="text-xs font-mono text-blue-600 mb-1">{g.spec}</div>
                    <div className="text-xs text-gray-500 mb-2">{g.description}</div>
                    <div className="text-xs text-gray-400">U = {g.u_value}</div>
                    {g.price_modifier > 1 && (
                      <div className="text-xs text-emerald-600 mt-2 font-medium">
                        +{Math.round((g.price_modifier - 1) * 100)}% к цене
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ STEP 4: Color ─ */}
          {step === 4 && (
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-4">Выберите цвет профиля</p>

              {/* Color type tabs */}
              <div className="flex gap-2 mb-5">
                {COLOR_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setColorTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      colorTab === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Color swatches grid */}
              {filteredColors.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  Нет цветов по выбранному фильтру.
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredColors.map(c => {
                  const selected = color.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setColor(c)}
                      className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Swatch circle */}
                      <div
                        className="w-9 h-9 rounded-full shrink-0 border-2 border-white shadow-md relative overflow-hidden"
                        style={{
                          backgroundColor: c.hex,
                          backgroundImage: c.texture ? `url(${c.texture})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        {selected && (
                          <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      {/* Name + badge */}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate leading-tight">{c.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            c.tier === 'white'     ? 'bg-gray-100 text-gray-500'  :
                            c.tier === 'colored'   ? 'bg-blue-100 text-blue-600'  :
                                                     'bg-amber-100 text-amber-700'
                          }`}>
                            {c.tier === 'white'     ? 'Белый'    :
                             c.tier === 'colored'   ? 'Цветной'  : 'Ламинация'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* ─ STEP 5: Accessories ─ */}
          {step === 5 && (
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-4">
                Выберите дополнительные опции (можно несколько или пропустить)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accessoryList.map(acc => {
                  const selected = accessories.some(a => a.id === acc.id);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleAccessory(acc)}
                      className={`flex items-center justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                    <div>
                        <div className="text-sm font-medium text-gray-900">{acc.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {acc.price_mode === 'fixed'
                            ? acc.unit
                            : `${acc.price.toLocaleString('ru-RU')} с/${acc.unit}`
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <div className="text-right">
                          {acc.price_mode !== 'fixed' && (
                            <div className="text-xs text-gray-400 font-mono">
                              {calcAccQty(acc, width, height).toFixed(2)} {acc.unit}
                            </div>
                          )}
                          <div className="text-sm font-semibold text-gray-700">
                            {calcAccPrice(acc, width, height).toLocaleString('ru-RU')}
                            <span className="text-xs font-normal text-gray-400 ml-0.5">с</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                          selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Назад
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext[step]()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Далее <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!series}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />Сохранить заявку
              </button>
            )}
          </div>
        </div>

        {/* ── Right: preview + price ───────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-l border-gray-100 bg-gray-50 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* SVG Preview */}
            <div
              className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
              onClick={() => series && setShowPreview(true)}
              title="Нажмите для увеличения"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Превью 2D
                </div>
                {series && (
                  <ZoomIn className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                )}
              </div>
              <SVGPreview
                series={series}
                width={width}
                height={height}
                glass={glass}
                construction={construction}
                color={color}
              />
            </div>

            {/* Configuration summary & price */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Конфигурация
              </div>

              {!series ? (
                <p className="text-sm text-gray-400">Серия не выбрана</p>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <Row label="Серия"    value={series.name} />
                  <Row label="Размер"   value={`${width} × ${height}`} mono />
                  <Row label="Площадь"  value={`${area.toFixed(2)} м²`} mono />
                  {glass && <Row label="Стекло"   value={glass.name} />}
                  {construction && <Row label="Конструкция" value={construction.name} />}
                  {color && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-500">Цвет</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                          style={{
                            backgroundColor: color.hex,
                            backgroundImage: color.texture ? `url(${color.texture})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        <span className="text-gray-800 text-xs">{color.name}</span>
                      </div>
                    </div>
                  )}

                  {accessories.length > 0 && (
                    <div>
                      <div className="text-gray-500 mb-1 text-xs">Аксессуары</div>
                      {accessories.map(a => (
                        <div key={a.id} className="flex justify-between pl-2 text-xs text-gray-600">
                          <span>{a.name}</span>
                          <span className="font-mono">{calcAccPrice(a, width, height).toLocaleString('ru-RU')} с</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {series && (
                <>
                  {breakdown && (
                    <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
                      <Row label="Рамный профиль"  value={`${breakdown.frameCost.toLocaleString('ru-RU')} с`} mono />
                      <Row label="Профиль створок" value={`${breakdown.sashCost.toLocaleString('ru-RU')} с`} mono />
                      {breakdown.impostCost > 0 && (
                        <Row label="Импосты"       value={`${breakdown.impostCost.toLocaleString('ru-RU')} с`} mono />
                      )}
                      <Row label="Стеклопакет"     value={`${breakdown.glassCost.toLocaleString('ru-RU')} с`} mono />
                      <Row label="Фурнитура"       value={`${breakdown.hardwareCost.toLocaleString('ru-RU')} с`} mono />
                      <Row label="Уплотнители"     value={`${breakdown.sealCost.toLocaleString('ru-RU')} с`} mono />
                      <Row label="Монтаж"          value={`${breakdown.installCost.toLocaleString('ru-RU')} с`} mono />
                      {breakdown.colorSurcharge > 0 && (
                        <Row label="Надбавка цвет" value={`+${breakdown.colorSurcharge.toLocaleString('ru-RU')} с`} mono />
                      )}
                      {accsTotal > 0 && (
                        <Row label="Доп. опции"    value={`+${accsTotal.toLocaleString('ru-RU')} с`} mono />
                      )}
                    </div>
                  )}

                  <div className="border-t-2 border-gray-200 mt-3 pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-gray-700">ИТОГО</span>
                      <span className="text-base font-bold text-blue-700">
                        {total.toLocaleString('ru-RU')} сум
                      </span>
                    </div>
                    {breakdown && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Цена/м²</span>
                        <span className="font-mono text-gray-500">
                          {breakdown.effectivePricePerSqm.toLocaleString('ru-RU')} с/м²
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
