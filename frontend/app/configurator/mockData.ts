import type { Series, GlassOption, Accessory, DimensionPreset, ProfileColor, ConstructionTemplate } from './types';

// ─── Profile colors ───────────────────────────────────────────────────────────
// highlightHex = lighter tint (+30% lightness) for top/left bevel
// shadowHex    = darker tint  (-25% lightness) for bottom/right bevel

export const PROFILE_COLORS: ProfileColor[] = [
  // ── RAL — белые и светлые ──────────────────────────────────────────────────
  {
    id: 'ral-9016', name: 'RAL 9016 Белый транспортный', type: 'ral',
    hex: '#F1F0EB', highlightHex: '#FFFFFF', shadowHex: '#D4D3CE',
    tier: 'white', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-9003', name: 'RAL 9003 Сигнальный белый', type: 'ral',
    hex: '#ECEDE8', highlightHex: '#FFFFFF', shadowHex: '#CFCFCB',
    tier: 'white', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-9010', name: 'RAL 9010 Чисто белый', type: 'ral',
    hex: '#F5F4EF', highlightHex: '#FFFFFF', shadowHex: '#D8D7D2',
    tier: 'white', materials: ['PVC', 'aluminum'],
  },
  // ── RAL — серые и чёрные ───────────────────────────────────────────────────
  {
    id: 'ral-7016', name: 'RAL 7016 Антрацит', type: 'ral',
    hex: '#383E42', highlightHex: '#545D63', shadowHex: '#1E2326',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-7035', name: 'RAL 7035 Светло-серый', type: 'ral',
    hex: '#CBD0CC', highlightHex: '#E0E4E1', shadowHex: '#A8ADA9',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-7040', name: 'RAL 7040 Оконно-серый', type: 'ral',
    hex: '#9DA3A6', highlightHex: '#B8BDC0', shadowHex: '#787E81',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-9005', name: 'RAL 9005 Чёрный', type: 'ral',
    hex: '#1C1C1C', highlightHex: '#333333', shadowHex: '#0A0A0A',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  // ── RAL — коричневые ───────────────────────────────────────────────────────
  {
    id: 'ral-8017', name: 'RAL 8017 Шоколадный', type: 'ral',
    hex: '#442F20', highlightHex: '#5E4132', shadowHex: '#2A1C13',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-8019', name: 'RAL 8019 Серо-коричневый', type: 'ral',
    hex: '#3D3635', highlightHex: '#574F4E', shadowHex: '#231F1F',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  // ── RAL — зелёные ─────────────────────────────────────────────────────────
  {
    id: 'ral-6005', name: 'RAL 6005 Зелёный мох', type: 'ral',
    hex: '#1F4037', highlightHex: '#2D5C4F', shadowHex: '#102418',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  {
    id: 'ral-6009', name: 'RAL 6009 Пихтовый зелёный', type: 'ral',
    hex: '#27352A', highlightHex: '#384C3C', shadowHex: '#141C16',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  // ── RAL — синие ───────────────────────────────────────────────────────────
  {
    id: 'ral-5010', name: 'RAL 5010 Горечавково-синий', type: 'ral',
    hex: '#0E4C8A', highlightHex: '#1A6BB5', shadowHex: '#072E54',
    tier: 'colored', materials: ['PVC', 'aluminum'],
  },
  // ── Ламинации Renolit / AkzoNobel ─────────────────────────────────────────
  // Металлик / браш
  {
    id: 'lam-metbrush-platin', name: 'Metbrush Platin (Платина)', type: 'lamination',
    hex: '#B8C0C8', highlightHex: '#D4DAE0', shadowHex: '#8A9198',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/1004_Metbrush_platin.png',
  },
  {
    id: 'lam-metbrush-quarzgrau', name: 'Metbrush Quarzgrau (Кварцевый серый)', type: 'lamination',
    hex: '#9AA0A8', highlightHex: '#B4BAC0', shadowHex: '#6E7478',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/1005_Metbrush_quarzgrau.png',
  },
  {
    id: 'lam-metbrush-anthrazit', name: 'Metbrush Anthrazitgrau (Антрацит браш)', type: 'lamination',
    hex: '#4A5058', highlightHex: '#606870', shadowHex: '#2C3038',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/1006_Metbrush_anthrazitgrau.png',
  },
  {
    id: 'lam-alux-anthrazit', name: 'Alux Anthrazit (Алюкс антрацит)', type: 'lamination',
    hex: '#3A3F45', highlightHex: '#545960', shadowHex: '#202428',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/1012_Alux_Anthrazit.png',
  },
  {
    id: 'lam-xbrush-stahlblau', name: 'X-Brush Stahlblau (Стальной синий)', type: 'lamination',
    hex: '#4A5E72', highlightHex: '#627A90', shadowHex: '#2E3E50',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/1022_x_brush_stahlblau.jpg',
  },
  // Антрацитовые оттенки
  {
    id: 'lam-anthrazitgrau-6003', name: 'Anthrazitgrau F470-6003 (Антрацитовый)', type: 'lamination',
    hex: '#3E4448', highlightHex: '#585E64', shadowHex: '#262A2C',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/anthrazitgrau_F470_6003.png',
  },
  {
    id: 'lam-sn508-anthracite', name: 'SN508 Anthracite Grey (Тёмно-серый)', type: 'lamination',
    hex: '#545A60', highlightHex: '#6E7480', shadowHex: '#383E42',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/SN508_Anthracite_Grey.png',
  },
  // Дубовые серии
  {
    id: 'lam-staufer-mocca', name: 'Staufereiche Mocca (Дуб мокко)', type: 'lamination',
    hex: '#5C3A1E', highlightHex: '#7A502A', shadowHex: '#3A2210',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/2048_Staufereiche_mocca.png',
  },
  {
    id: 'lam-turner-oak-malt', name: 'Turner Oak Malt (Дуб светлый)', type: 'lamination',
    hex: '#8A6040', highlightHex: '#A87C54', shadowHex: '#5A3C26',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/3001_Turner_Oak_malt.png',
  },
  {
    id: 'lam-sheffield-alpine', name: 'Sheffield Oak Alpine (Шеффилд альпийский)', type: 'lamination',
    hex: '#B0905C', highlightHex: '#C8A870', shadowHex: '#7A6040',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/3002_Sheffield_Oak_Alpine.png',
  },
  {
    id: 'lam-sheffield-concrete', name: 'Sheffield Oak Concrete (Шеффилд бетон)', type: 'lamination',
    hex: '#8A8074', highlightHex: '#A09888', shadowHex: '#5E5848',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/3003_Sheffield_Oak_Concrete.png',
  },
  {
    id: 'lam-newcastle-khaki', name: 'Newcastle Oak Khaki (Дуб хаки)', type: 'lamination',
    hex: '#7A6848', highlightHex: '#9A8462', shadowHex: '#504830',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/3077_Newcatle_Oak_khaki.png',
  },
  {
    id: 'lam-sheffield-grey', name: 'Sheffield Oak Grey F501 (Шеффилд серый)', type: 'lamination',
    hex: '#848880', highlightHex: '#A0A49C', shadowHex: '#5A5E58',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/F501_Sheffield_Oak_grey.png',
  },
  // Тёмные породы
  {
    id: 'lam-kitami-dark', name: 'Kitami Dark F470-9026 (Тёмная вишня)', type: 'lamination',
    hex: '#28241C', highlightHex: '#40382C', shadowHex: '#141008',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/Kitami_dark_F470_9026.png',
  },
  {
    id: 'lam-staufer-kolonial', name: 'Staufereiche Kolonial ST540 (Дуб колониал)', type: 'lamination',
    hex: '#6A4C2C', highlightHex: '#8A6640', shadowHex: '#422E18',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/ST540_Staufereiche_kolonial.png',
  },
  {
    id: 'lam-tropea-coffee', name: 'Tropea Oak Coffee F470-3007 (Тропея кофе)', type: 'lamination',
    hex: '#6E4828', highlightHex: '#8C5E38', shadowHex: '#462E16',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/Tropea_Oak_coffee_F470_3007.png',
  },
  {
    id: 'lam-turner-walnut', name: 'Turner Oak Walnut F476-9036 (Дуб орех)', type: 'lamination',
    hex: '#5E3A1E', highlightHex: '#7A5030', shadowHex: '#3A2210',
    tier: 'laminated', materials: ['PVC', 'aluminum'],
    texture: '/textures/lamination/Turner_Oak_walnut_F476_9036.png',
  },
];

// Default color (белый ПВХ)
export const DEFAULT_COLOR = PROFILE_COLORS[0];

export const SERIES: Series[] = [
  {
    id: 'akfa-60',
    name: 'AKFA 60',
    categories: ['window', 'door'],
    material: 'PVC',
    description: 'Классическая ПВХ система — окна и двери для жилых помещений',
    features: ['60мм профиль', '3 камеры', 'Стальное армирование'],
    min_width: 400,  max_width: 2500,
    min_height: 400, max_height: 2500,
    price_per_sqm: 1_200_000,
    rates: {
      // Рамный профиль: белый / цветной / ламинация
      frame_per_m:             130_000,
      frame_colored_per_m:     163_000,
      frame_laminated_per_m:   195_000,
      // Профиль створки
      sash_per_m:              100_000,
      sash_colored_per_m:      125_000,
      sash_laminated_per_m:    150_000,
      // Импост
      imposta_per_m:           110_000,
      imposta_colored_per_m:   138_000,
      imposta_laminated_per_m: 165_000,
      // Общие
      glass_per_sqm:           420_000,
      hardware_per_opening:    160_000,
      hardware_per_sliding:     90_000,
      seal_per_m:               18_000,
      install_base:            120_000,
    },
  },
  {
    id: 'akfa-70',
    name: 'AKFA 70',
    categories: ['window', 'door'],
    material: 'PVC',
    description: 'Усиленная ПВХ система с пятикамерным профилем — окна и двери',
    features: ['70мм профиль', '5 камер', 'Повышенная шумоизоляция'],
    min_width: 400,  max_width: 2800,
    min_height: 400, max_height: 2800,
    price_per_sqm: 1_650_000,
    rates: {
      frame_per_m:             180_000,
      frame_colored_per_m:     225_000,
      frame_laminated_per_m:   270_000,
      sash_per_m:              138_000,
      sash_colored_per_m:      173_000,
      sash_laminated_per_m:    207_000,
      imposta_per_m:           155_000,
      imposta_colored_per_m:   194_000,
      imposta_laminated_per_m: 233_000,
      glass_per_sqm:           420_000,
      hardware_per_opening:    220_000,
      hardware_per_sliding:    120_000,
      seal_per_m:               25_000,
      install_base:            150_000,
    },
  },
  {
    id: 'akfa-alu-60',
    name: 'AKFA Alu 60',
    categories: ['window', 'door'],
    material: 'aluminum',
    description: 'Алюминиевая система с термомостом — окна, двери, фасады',
    features: ['60мм алюминий', 'Термомост', 'Архитектурные решения'],
    min_width: 600,  max_width: 4000,
    min_height: 600, max_height: 3500,
    price_per_sqm: 2_800_000,
    rates: {
      frame_per_m:             380_000,
      frame_colored_per_m:     475_000,
      frame_laminated_per_m:   570_000,
      sash_per_m:              290_000,
      sash_colored_per_m:      363_000,
      sash_laminated_per_m:    435_000,
      imposta_per_m:           320_000,
      imposta_colored_per_m:   400_000,
      imposta_laminated_per_m: 480_000,
      glass_per_sqm:           420_000,
      hardware_per_opening:    420_000,
      hardware_per_sliding:    250_000,
      seal_per_m:               32_000,
      install_base:            280_000,
    },
  },
  {
    id: 'akfa-sliding',
    name: 'AKFA Sliding',
    categories: ['sliding'],
    material: 'aluminum',
    description: 'Раздвижная алюминиевая система для панорамного остекления',
    features: ['Раздвижная система', 'До 6м ширины', 'Роллерный механизм'],
    min_width: 1200, max_width: 6000,
    min_height: 1800, max_height: 3000,
    price_per_sqm: 3_200_000,
    rates: {
      frame_per_m:             460_000,
      frame_colored_per_m:     575_000,
      frame_laminated_per_m:   690_000,
      sash_per_m:              340_000,
      sash_colored_per_m:      425_000,
      sash_laminated_per_m:    510_000,
      imposta_per_m:           360_000,
      imposta_colored_per_m:   450_000,
      imposta_laminated_per_m: 540_000,
      glass_per_sqm:           420_000,
      hardware_per_opening:    380_000,
      hardware_per_sliding:    380_000,
      seal_per_m:               40_000,
      install_base:            400_000,
    },
  },
];

export const GLASS_OPTIONS: GlassOption[] = [
  {
    id: 'single',
    name: 'Однокамерный',
    spec: '4-16-4',
    description: 'Базовое остекление',
    u_value: '2.8 Вт/м²К',
    price_modifier: 1.0,
  },
  {
    id: 'double',
    name: 'Двухкамерный',
    spec: '4-12-4-12-4',
    description: 'Улучшенная теплоизоляция',
    u_value: '1.8 Вт/м²К',
    price_modifier: 1.35,
  },
  {
    id: 'energy',
    name: 'Энергосберегающий',
    spec: '4-16Ar-4 i',
    description: 'Аргон + i-покрытие',
    u_value: '1.1 Вт/м²К',
    price_modifier: 1.7,
  },
];

// ─── Construction templates ───────────────────────────────────────────────────

export const CONSTRUCTION_TEMPLATES: ConstructionTemplate[] = [
  // ── Окна ─────────────────────────────────────────────────────────────────
  {
    id: 'w-fixed',
    name: 'Глухое',
    description: 'Нераскрывающееся остекление',
    rows: [{ cells: [{ opening: 'fixed', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.0,
  },
  {
    id: 'w-1-tt',
    name: 'Одностворчатое П/О',
    description: 'Поворотно-откидное открывание',
    rows: [{ cells: [{ opening: 'tilt-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.0,
  },
  {
    id: 'w-2-lt',
    name: 'Двухстворчатое П/О + Глухое',
    description: 'Поворотное левое + глухое правое',
    rows: [{ cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'fixed', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.03,
  },
  {
    id: 'w-2-rt',
    name: 'Двухстворчатое Глухое + П/О',
    description: 'Глухое левое + поворотное правое',
    rows: [{ cells: [{ opening: 'fixed', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.03,
  },
  {
    id: 'w-2-tt',
    name: 'Двухстворчатое П/О + П/О',
    description: 'Обе створки поворотно-откидные',
    rows: [{ cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.05,
  },
  {
    id: 'w-2-transom',
    name: 'Двухстворчатое с фрамугой',
    description: 'Фрамуга вверху + две П/О створки',
    rows: [
      { cells: [{ opening: 'fixed', widthFr: 1 }], heightFr: 0.28, isTransom: true },
      { cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 0.72 },
    ],
    categories: ['window'],
    price_modifier: 1.08,
  },
  {
    id: 'w-3-ftf',
    name: 'Трёхстворчатое Глух.+П/О+Глух.',
    description: 'Центральная П/О, боковые глухие',
    rows: [{ cells: [{ opening: 'fixed', widthFr: 1 }, { opening: 'tilt-turn', widthFr: 1 }, { opening: 'fixed', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.07,
  },
  {
    id: 'w-3-tft',
    name: 'Трёхстворчатое П/О+Глух.+П/О',
    description: 'Боковые П/О, центральная глухая',
    rows: [{ cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'fixed', widthFr: 2 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.08,
  },
  {
    id: 'w-3-transom',
    name: 'Трёхстворчатое с фрамугой',
    description: 'Фрамуга вверху + три створки (П/О+Гл.+П/О)',
    rows: [
      { cells: [{ opening: 'fixed', widthFr: 1 }], heightFr: 0.25, isTransom: true },
      { cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'fixed', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 0.75 },
    ],
    categories: ['window'],
    price_modifier: 1.12,
  },
  {
    id: 'w-arch-fixed',
    name: 'Арочное глухое',
    description: 'Глухое с полукруглым верхом',
    rows: [{ cells: [{ opening: 'fixed', widthFr: 1, arch: 'full' }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.15,
  },
  {
    id: 'w-arch-tt',
    name: 'Арочное П/О',
    description: 'Поворотно-откидное с арочным верхом',
    rows: [{ cells: [{ opening: 'tilt-turn', widthFr: 1, arch: 'full' }], heightFr: 1 }],
    categories: ['window'],
    price_modifier: 1.15,
  },
  {
    id: 'w-arch-2',
    name: 'Арочная фрамуга + двухстворчатое',
    description: 'Полуарка вверху + два П/О внизу',
    rows: [
      { cells: [{ opening: 'fixed', widthFr: 1, arch: 'semi' }], heightFr: 0.30, isTransom: true },
      { cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 0.70 },
    ],
    categories: ['window'],
    price_modifier: 1.18,
  },
  // ── Двери ─────────────────────────────────────────────────────────────────
  {
    id: 'd-single',
    name: 'Однопольная дверь',
    description: 'Одно распашное полотно',
    rows: [{ cells: [{ opening: 'right-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['door'],
    price_modifier: 1.0,
  },
  {
    id: 'd-double',
    name: 'Двупольная дверь',
    description: 'Двустворчатая распашная дверь',
    rows: [{ cells: [{ opening: 'left-turn', widthFr: 1 }, { opening: 'right-turn', widthFr: 1 }], heightFr: 1 }],
    categories: ['door'],
    price_modifier: 1.08,
  },
  {
    id: 'd-with-transom',
    name: 'Дверь с фрамугой',
    description: 'Дверь + неподвижная фрамуга сверху',
    rows: [
      { cells: [{ opening: 'fixed', widthFr: 1 }], heightFr: 0.22, isTransom: true },
      { cells: [{ opening: 'right-turn', widthFr: 1 }], heightFr: 0.78 },
    ],
    categories: ['door'],
    price_modifier: 1.10,
  },
  {
    id: 'd-sidelight',
    name: 'Дверь с боковым досветом',
    description: 'Неподвижный досвет + распашная дверь',
    rows: [{ cells: [{ opening: 'fixed', widthFr: 1 }, { opening: 'right-turn', widthFr: 2 }], heightFr: 1 }],
    categories: ['door'],
    price_modifier: 1.15,
  },
  // ── Раздвижные ────────────────────────────────────────────────────────────
  {
    id: 's-2',
    name: 'Раздвижное 2-секционное',
    description: 'Две секции — раздвигаются в стороны',
    rows: [{ cells: [{ opening: 'sliding-right', widthFr: 1 }, { opening: 'sliding-left', widthFr: 1 }], heightFr: 1 }],
    categories: ['sliding'],
    price_modifier: 1.0,
  },
  {
    id: 's-3',
    name: 'Раздвижное 3-секционное',
    description: 'Три секции, центральная фиксированная',
    rows: [{ cells: [{ opening: 'sliding-right', widthFr: 1 }, { opening: 'fixed', widthFr: 1 }, { opening: 'sliding-left', widthFr: 1 }], heightFr: 1 }],
    categories: ['sliding'],
    price_modifier: 1.10,
  },
];

export const ACCESSORIES: Accessory[] = [
  // ── Фиксированные (за штуку / комплект) ──────────────────────────────────
  { id: 'handle-std',   name: 'Ручка стандарт',             category: 'handle',      price:  15_000, unit: 'шт',     price_mode: 'fixed'        },
  { id: 'handle-prem',  name: 'Ручка премиум',               category: 'handle',      price:  45_000, unit: 'шт',     price_mode: 'fixed'        },
  { id: 'net',          name: 'Москитная сетка',             category: 'net',         price:  55_000, unit: 'шт',     price_mode: 'fixed'        },
  { id: 'child-lock',   name: 'Детская блокировка',          category: 'lock',        price:  12_000, unit: 'шт',     price_mode: 'fixed'        },
  { id: 'slope-set',    name: 'Откосы (комплект)',           category: 'slope',       price: 120_000, unit: 'компл',  price_mode: 'fixed'        },
  { id: 'roller-blind', name: 'Тканевая штора',              category: 'blind',       price: 150_000, unit: 'шт',     price_mode: 'fixed'        },
  // ── Погонные по ширине ────────────────────────────────────────────────────
  { id: 'sill-300',     name: 'Подоконник 300мм',           category: 'sill',        price:  65_000, unit: 'пог.м',  price_mode: 'per_width'    },
  { id: 'sill-400',     name: 'Подоконник 400мм',           category: 'sill',        price:  85_000, unit: 'пог.м',  price_mode: 'per_width'    },
  { id: 'sill-600',     name: 'Подоконник 600мм',           category: 'sill',        price: 120_000, unit: 'пог.м',  price_mode: 'per_width'    },
  { id: 'flash',        name: 'Отлив нержавейка',           category: 'flash',       price:  40_000, unit: 'пог.м',  price_mode: 'per_width'    },
  // ── Погонные по высоте ────────────────────────────────────────────────────
  { id: 'espag-std',    name: 'Эспаньолет стандарт',        category: 'espagnolette', price:  95_000, unit: 'пог.м',  price_mode: 'per_height'   },
  { id: 'espag-prem',   name: 'Эспаньолет премиум (сталь)', category: 'espagnolette', price: 145_000, unit: 'пог.м',  price_mode: 'per_height'   },
  // ── Погонные по периметру ─────────────────────────────────────────────────
  { id: 'seal-extra',   name: 'Доп. уплотнитель (периметр)', category: 'seal',       price:  18_000, unit: 'пог.м',  price_mode: 'per_perimeter'},
];

export const DIMENSION_PRESETS: DimensionPreset[] = [
  { label: '600×600',   width: 600,  height: 600  },
  { label: '900×1200',  width: 900,  height: 1200 },
  { label: '1000×1200', width: 1000, height: 1200 },
  { label: '1200×1400', width: 1200, height: 1400 },
  { label: '1400×1500', width: 1400, height: 1500 },
  { label: '2000×1800', width: 2000, height: 1800 },
];
