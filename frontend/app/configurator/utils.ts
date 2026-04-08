import type { Accessory, Series, GlassOption, ProfileColor, ConstructionTemplate, LayoutRow, MaterialBreakdown } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Нахлёст профиля по каждой стороне ячейки (мм) — вычитается из размера стекла */
const GLASS_DEDUCT_MM = 70;

/** Одностворчатый П/О по умолчанию если конструкция не выбрана */
const DEFAULT_ROWS: LayoutRow[] = [
  { cells: [{ opening: 'tilt-turn', widthFr: 1 }], heightFr: 1 },
];

// ─── Material breakdown ───────────────────────────────────────────────────────

/**
 * Рассчитывает стоимость изделия по фактическому расходу материалов.
 * Размеры принимаются в мм, результат — в sum.
 */
export function calcMaterialBreakdown(
  widthMm: number,
  heightMm: number,
  construction: ConstructionTemplate | null,
  series: Series,
  glass: GlassOption | null,
  color: ProfileColor | null,
): MaterialBreakdown {
  const W = widthMm  / 1000;   // м
  const H = heightMm / 1000;   // м
  const { rates } = series;

  const rows       = construction?.rows ?? DEFAULT_ROWS;
  const totalHFr   = rows.reduce((s, r) => s + r.heightFr, 0);
  const dedM       = GLASS_DEDUCT_MM / 1000;

  // ── Рамный периметр ─────────────────────────────────────────────────────
  const framePerim = 2 * (W + H);

  // ── Обходим все ряды и ячейки ──────────────────────────────────────────
  let impostLength  = 0;
  let sashPerim     = 0;
  let glassArea     = 0;
  let sealLength    = 0;
  let openingCount  = 0;
  let slidingCount  = 0;

  rows.forEach((row, ri) => {
    const rowH     = (row.heightFr / totalHFr) * H;
    const totalWFr = row.cells.reduce((s, c) => s + c.widthFr, 0);

    // Горизонтальный импост между рядами (ширина изделия целиком)
    if (ri > 0) impostLength += W;

    // Вертикальные импосты внутри ряда
    impostLength += (row.cells.length - 1) * rowH;

    row.cells.forEach(cell => {
      const cellW = (cell.widthFr / totalWFr) * W;

      // Площадь стекла (вычитаем нахлёп с обеих сторон)
      const glW = Math.max(0, cellW - dedM);
      const glH = Math.max(0, rowH  - dedM);
      glassArea += glW * glH;

      const isSlidingCell = cell.opening === 'sliding-left' || cell.opening === 'sliding-right';
      const isOpen        = cell.opening !== 'fixed';

      if (isOpen) {
        // Периметр профиля створки
        const sp = 2 * (cellW + rowH);
        sashPerim += sp;

        // Уплотнитель: 2 контура по периметру створки
        sealLength += sp * 2;

        if (isSlidingCell) slidingCount++;
        else               openingCount++;
      } else {
        // Глухая — уплотнитель по периметру стекла
        sealLength += 2 * (glW + glH);
      }
    });
  });

  // Уплотнитель по периметру рамы
  sealLength += framePerim;

  // ── Стоимости ──────────────────────────────────────────────────────────
  // Выбираем ставки профиля по ценовому тиру цвета
  const tier = color?.tier ?? 'white';
  const frameRate  = tier === 'laminated' ? rates.frame_laminated_per_m
                   : tier === 'colored'   ? rates.frame_colored_per_m
                   : rates.frame_per_m;
  const sashRate   = tier === 'laminated' ? rates.sash_laminated_per_m
                   : tier === 'colored'   ? rates.sash_colored_per_m
                   : rates.sash_per_m;
  const impostRate = tier === 'laminated' ? rates.imposta_laminated_per_m
                   : tier === 'colored'   ? rates.imposta_colored_per_m
                   : rates.imposta_per_m;

  const glassMod = glass?.price_modifier ?? 1.0;

  const frameCost    = Math.round(framePerim    * frameRate);
  const sashCost     = Math.round(sashPerim     * sashRate);
  const impostCost   = Math.round(impostLength  * impostRate);
  const glassCost    = Math.round(glassArea     * rates.glass_per_sqm * glassMod);
  const hardwareCost = Math.round(
    openingCount * rates.hardware_per_opening +
    slidingCount * rates.hardware_per_sliding,
  );
  const sealCost     = Math.round(sealLength    * rates.seal_per_m);
  const installCost  = Math.round(rates.install_base);

  const subtotal       = frameCost + sashCost + impostCost + glassCost + hardwareCost + sealCost + installCost;
  const colorSurcharge = 0; // учтён в тировых ставках профиля
  const total          = subtotal;

  const area                = W * H;
  const effectivePricePerSqm = area > 0 ? Math.round(total / area) : 0;

  return {
    framePerim, sashPerim, impostLength, glassArea,
    sealLength, openingCount, slidingCount,
    frameCost, sashCost, impostCost, glassCost,
    hardwareCost, sealCost, installCost, colorSurcharge,
    subtotal, total, effectivePricePerSqm,
  };
}

/**
 * Returns the quantity multiplier for an accessory based on the window dimensions.
 * Units are always in metres (mm → m conversion happens here).
 */
export function calcAccQty(acc: Accessory, width: number, height: number): number {
  switch (acc.price_mode) {
    case 'per_width':     return width  / 1000;
    case 'per_height':    return height / 1000;
    case 'per_perimeter': return (width + height) * 2 / 1000;
    default:              return 1;
  }
}

/** Total cost of a single accessory line. */
export function calcAccPrice(acc: Accessory, width: number, height: number): number {
  return Math.round(acc.price * calcAccQty(acc, width, height));
}

/** Human-readable quantity label: "1.20 пог.м" or "1 шт" etc. */
export function calcAccQtyLabel(acc: Accessory, width: number, height: number): string {
  if (acc.price_mode === 'fixed') return `1 ${acc.unit}`;
  return `${calcAccQty(acc, width, height).toFixed(2)} ${acc.unit}`;
}
