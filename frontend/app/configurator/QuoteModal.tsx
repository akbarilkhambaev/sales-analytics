'use client';

import { useRef } from 'react';
import SVGPreview from './SVGPreview';
import type { Series, GlassOption, ConstructionTemplate, Accessory, ProfileColor, Category, MaterialBreakdown } from './types';
import { calcAccPrice, calcAccQtyLabel } from './utils';
import { X, Printer, CheckCircle } from 'lucide-react';

interface Props {
  series: Series;
  width: number;
  height: number;
  glass: GlassOption | null;
  construction: ConstructionTemplate | null;
  accessories: Accessory[];
  breakdown: MaterialBreakdown;
  total: number;
  area: number;
  orderNo: string;
  dateStr: string;
  color: ProfileColor | null;
  productType: Category | 'all';
  onClose: () => void;
}

export default function QuoteModal({
  series, width, height, glass, construction, accessories,
  breakdown, total, area,
  orderNo, dateStr, color, productType,
  onClose,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Заявка ${orderNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1d4ed8; }
    .brand { font-size: 20px; font-weight: 800; color: #1d4ed8; letter-spacing: 1px; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .meta { text-align: right; }
    .meta .order-no { font-size: 15px; font-weight: 700; color: #111; }
    .meta .date { font-size: 11px; color: #6b7280; margin-top: 4px; }
    h2 { font-size: 15px; font-weight: 700; color: #111; margin: 20px 0 10px; border-left: 3px solid #1d4ed8; padding-left: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .preview-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .preview-box svg { width: 100%; height: auto; }
    .info-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
    .info-row:last-child { border-bottom: none; }
    .info-row .key { color: #6b7280; }
    .info-row .val { font-weight: 600; color: #111; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .amount { font-family: monospace; text-align: right; }
    .total-row { background: #eff6ff; }
    .total-row td { font-size: 14px; font-weight: 800; color: #1d4ed8; padding: 10px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-purple { background: #ede9fe; color: #7c3aed; }
    @media print {
      body { padding: 20px; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  }

  const matLabel = series.material === 'aluminum' ? 'Алюминий' : 'ПВХ';
  const catLabel = productType === 'window'  ? 'Окно'
                 : productType === 'door'    ? 'Дверь'
                 : productType === 'sliding' ? 'Раздвижная система'
                 : 'Окно / Дверь';

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Заявка сформирована</h2>
              <p className="text-xs text-gray-400">№ {orderNo} · {dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Сохранить PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable receipt body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ── Printable area ── */}
          <div ref={printRef}>

            {/* Branded header */}
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1d4ed8' }}>
              <div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: 1 }}>AKFA</div>
                <div className="brand-sub" style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Конфигуратор оконных конструкций</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="order-no" style={{ fontSize: 15, fontWeight: 700 }}>Заявка № {orderNo}</div>
                <div className="date" style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{dateStr}</div>
              </div>
            </div>

            {/* Two columns: SVG + params */}
            <div className="grid gap-4 mb-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

              {/* SVG preview */}
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Схема изделия</div>
                <SVGPreview series={series} width={width} height={height} glass={glass} construction={construction} color={color} />
              </div>

              {/* Parameters */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-1.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Параметры</div>

                <InfoRow k="Серия"       v={series.name} />
                <InfoRow k="Тип"         v={catLabel} />
                <InfoRow k="Материал"    v={matLabel} badge={series.material === 'aluminum' ? 'purple' : 'blue'} />
                <InfoRow k="Ширина"      v={`${width} мм`}  mono />
                <InfoRow k="Высота"      v={`${height} мм`} mono />
                <InfoRow k="Площадь"     v={`${area.toFixed(3)} м²`} mono />
                <InfoRow k="Периметр"    v={`${((width + height) * 2 / 1000).toFixed(2)} м`} mono />
                {glass && <InfoRow k="Стеклопакет"  v={`${glass.name} (${glass.spec})`} />}
                {glass && <InfoRow k="Теплопередача" v={`U = ${glass.u_value}`} mono />}
                {construction && <InfoRow k="Конструкция" v={construction.name} />}
                {color && <InfoRow k="Цвет профиля" v={color.name} />}
              </div>
            </div>

            {/* Price breakdown table */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Расчёт стоимости (расход материалов)</div>
            <table className="w-full text-sm mb-4" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16 }}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold border-b border-gray-200" style={{ width: '55%' }}>Наименование</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold border-b border-gray-200">Количество</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold border-b border-gray-200">Сумма, сум</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">Рамный профиль</div>
                    <div className="text-xs text-gray-400">{series.name} · внешняя рама</div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.framePerim.toFixed(2)} м</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.frameCost.toLocaleString('ru-RU')}</td>
                </tr>

                {breakdown.sashCost > 0 && (
                  <tr>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">Профиль створок</div>
                      <div className="text-xs text-gray-400">{breakdown.openingCount + breakdown.slidingCount} створка{(breakdown.openingCount + breakdown.slidingCount) > 1 ? 'и' : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.sashPerim.toFixed(2)} м</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.sashCost.toLocaleString('ru-RU')}</td>
                  </tr>
                )}

                {breakdown.impostCost > 0 && (
                  <tr>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">Импосты / штапики</div>
                      <div className="text-xs text-gray-400">Горизонтальные и вертикальные разделители</div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.impostLength.toFixed(2)} м</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.impostCost.toLocaleString('ru-RU')}</td>
                  </tr>
                )}

                <tr>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">Стеклопакет</div>
                    <div className="text-xs text-gray-400">{glass ? `${glass.name} · ${glass.spec}` : 'Базовый'}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.glassArea.toFixed(3)} м²</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.glassCost.toLocaleString('ru-RU')}</td>
                </tr>

                {breakdown.hardwareCost > 0 && (
                  <tr>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">Фурнитура</div>
                      <div className="text-xs text-gray-400">
                        {breakdown.openingCount > 0 && `П/О: ${breakdown.openingCount} шт`}
                        {breakdown.openingCount > 0 && breakdown.slidingCount > 0 && ' · '}
                        {breakdown.slidingCount > 0 && `Раздв.: ${breakdown.slidingCount} шт`}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.openingCount + breakdown.slidingCount} шт</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.hardwareCost.toLocaleString('ru-RU')}</td>
                  </tr>
                )}

                <tr>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">Уплотнители</div>
                    <div className="text-xs text-gray-400">По периметру рамы и створок</div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{breakdown.sealLength.toFixed(2)} м</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.sealCost.toLocaleString('ru-RU')}</td>
                </tr>

                <tr>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">Монтаж</div>
                    <div className="text-xs text-gray-400">Базовая стоимость монтажа</div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">1 шт</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{breakdown.installCost.toLocaleString('ru-RU')}</td>
                </tr>

                {accessories.map(acc => (
                  <tr key={acc.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{acc.name}</div>
                      {acc.price_mode !== 'fixed' && (
                        <div className="text-xs text-gray-400">
                          {acc.price.toLocaleString('ru-RU')} с/{acc.unit}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">
                      {calcAccQtyLabel(acc, width, height)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                      {calcAccPrice(acc, width, height).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50">
                  <td colSpan={2} className="px-3 py-3 text-sm font-bold text-gray-700">ИТОГО К ОПЛАТЕ</td>
                  <td className="px-3 py-3 text-right text-base font-extrabold text-blue-700 font-mono">
                    {total.toLocaleString('ru-RU')} сум
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="px-3 py-2 text-xs text-gray-400">Эффективная цена</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-500">
                    {breakdown.effectivePricePerSqm.toLocaleString('ru-RU')} сум/м²
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Footer note */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <span className="shrink-0 font-bold">⚠</span>
              <span>Данный расчёт является предварительным. Окончательная стоимость уточняется при оформлении заказа с учётом условий монтажа и доставки.</span>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">AKFA · Система конфигурации изделий</span>
              <span className="text-xs text-gray-400">{dateStr} · № {orderNo}</span>
            </div>

          </div>
          {/* end printable area */}
        </div>

        {/* Modal footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-3 flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Сохранить PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini helper ─────────────────────────────────────────────────────────────

function InfoRow({ k, v, mono, badge }: { k: string; v: string; mono?: boolean; badge?: 'blue' | 'purple' }) {
  return (
    <div className="flex justify-between items-center text-sm py-0.5">
      <span className="text-gray-500 text-xs">{k}</span>
      {badge ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          badge === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>{v}</span>
      ) : (
        <span className={`text-gray-800 text-xs font-medium ${mono ? 'font-mono' : ''}`}>{v}</span>
      )}
    </div>
  );
}
