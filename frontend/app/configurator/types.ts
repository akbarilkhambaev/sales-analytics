export type Category = 'window' | 'door' | 'sliding';
export type Material = 'PVC' | 'aluminum';

// ── Construction layout types ────────────────────────────────────────────────

/** Opening type for an individual cell in a construction layout */
export type OpeningType =
  | 'fixed'
  | 'tilt-turn'       // поворотно-откидное
  | 'tilt-only'       // только откидное
  | 'left-turn'       // поворотное (левостороннее: петли слева)
  | 'right-turn'      // поворотное (правостороннее: петли справа)
  | 'sliding-left'    // раздвижная панель → влево
  | 'sliding-right';  // раздвижная панель → вправо

/** Arch shape for the top of a cell */
export type ArchType = 'full' | 'semi';

/** One section (sash / glass pane) within a row */
export interface LayoutCell {
  opening: OpeningType;
  widthFr: number;       // относительная доля ширины среди соседей
  arch?: ArchType;       // арочный верх (только в верхнем ряду)
}

/** One horizontal strip (row) in the construction */
export interface LayoutRow {
  cells: LayoutCell[];
  heightFr: number;      // относительная доля высоты
  isTransom?: boolean;   // визуальная подсказка: тонкая фрамуга
}

/** Full construction template (series-agnostic) */
export interface ConstructionTemplate {
  id: string;
  name: string;
  description: string;
  rows: LayoutRow[];     // сверху вниз
  categories: Category[];
  price_modifier: number;
}

// ── Material cost rates (per series) ──────────────────────────────────────────────────

/**
 * Ставки расхода материалов для серии.
 * Профильные позиции (рама / створка / импост) имеют три ценовых тира:
 *   белый → цветной (RAL) → ламинированный
 * Прочие позиции (стекло, фурнитура, уплотнитель, монтаж) тиром не зависят.
 */
export interface MaterialRates {
  // Рамный профиль
  frame_per_m:            number; // белый
  frame_colored_per_m:    number; // цветной RAL
  frame_laminated_per_m:  number; // ламинация
  // Профиль створки
  sash_per_m:             number;
  sash_colored_per_m:     number;
  sash_laminated_per_m:   number;
  // Импост / штапик
  imposta_per_m:          number;
  imposta_colored_per_m:  number;
  imposta_laminated_per_m: number;
  // Общие позиции
  glass_per_sqm:          number; // базовый стеклопакет, сум/м² (× glass.price_modifier)
  hardware_per_opening:   number; // фурнитура П/О, сум/шт
  hardware_per_sliding:   number; // фурнитура раздвижная, сум/шт
  seal_per_m:             number; // уплотнитель, сум/пог.м
  install_base:           number; // монтаж (фикс. на изделие), сум
}

/** Детальный разбив стоимости по материалам */
export interface MaterialBreakdown {
  // Геометрия
  framePerim: number;       // пог.м рамного профиля
  sashPerim: number;        // пог.м профиля всех створок
  impostLength: number;     // пог.м импостов/штапиков
  glassArea: number;        // м² стекла
  sealLength: number;       // пог.м уплотнитель
  openingCount: number;     // кол-во открываемых створок (П/О)
  slidingCount: number;     // кол-во раздвижных панелей
  // Стоимости
  frameCost: number;
  sashCost: number;
  impostCost: number;
  glassCost: number;
  hardwareCost: number;
  sealCost: number;
  installCost: number;
  colorSurcharge: number;
  subtotal: number;
  total: number;
  effectivePricePerSqm: number; // итог/площадь для сравнения
}

// ── Core product types ───────────────────────────────────────────────────────

export interface Series {
  id: string;
  name: string;
  categories: Category[];      // одна система — несколько типов изделий
  material: Material;
  description: string;
  features: string[];
  min_width: number;
  max_width: number;
  min_height: number;
  max_height: number;
  price_per_sqm: number;       // справочная цена (для показа в карточках серии)
  rates: MaterialRates;        // ставки расхода материалов
}

export interface GlassOption {
  id: string;
  name: string;
  spec: string;
  description: string;
  u_value: string;
  price_modifier: number;
}

export type AccessoryPriceMode = 'fixed' | 'per_width' | 'per_height' | 'per_perimeter';

export interface Accessory {
  id: string;
  name: string;
  category: string;
  price: number;        // цена за единицу (шт / пог.м / м²)
  unit: string;
  price_mode: AccessoryPriceMode;
}

export type ColorType = 'ral' | 'lamination';

/** Ценовой тир профиля: определяет, по какой ставке считается профиль */
export type ColorTier = 'white' | 'colored' | 'laminated';

export interface ProfileColor {
  id: string;
  name: string;
  type: ColorType;           // визуальный тип: RAL или ламинация
  tier: ColorTier;           // ценовой тир: белый / цветной / ламинированный
  hex: string;               // основной цвет для SVG рамы
  highlightHex: string;      // светлая грань (блик)
  shadowHex: string;         // тёмная грань (тень)
  texture?: string;          // путь к PNG тайлу для ламинаций
  materials: ('PVC' | 'aluminum')[];
}

export interface DimensionPreset {
  label: string;
  width: number;
  height: number;
}
