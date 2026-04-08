'use client';

import React from 'react';
import type {
  Series, GlassOption, ProfileColor,
  ConstructionTemplate, OpeningType, ArchType, LayoutRow,
} from './types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  series: Series | null;
  width: number;
  height: number;
  glass: GlassOption | null;
  construction: ConstructionTemplate | null;
  color?: ProfileColor | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function archRiseFor(arch: ArchType, cw: number, ch: number): number {
  const coeff = arch === 'full' ? 0.45 : 0.22;
  return Math.min(cw * coeff, ch * 0.88);
}

function archOutlinePath(
  cx: number, cy: number, cw: number, rise: number, bottom: number,
): string {
  return `M${cx},${cy + rise} A${cw / 2},${rise} 0 0 1 ${cx + cw},${cy + rise} L${cx + cw},${bottom} L${cx},${bottom} Z`;
}

// ─── Opening indicators ───────────────────────────────────────────────────────

interface OpeningProps {
  opening: OpeningType;
  gx: number; gy: number; gw: number; gh: number;
  shHex: string; handleFill: string;
}

function OpeningLines({ opening, gx, gy, gw, gh, shHex, handleFill }: OpeningProps) {
  const mx = gx + gw / 2;
  const my = gy + gh / 2;
  const sw = '0.85';
  const da = '4,3';
  const op = '0.65';

  switch (opening) {
    case 'fixed':
      return (
        <>
          <line x1={gx + 6}      y1={gy + 6}      x2={gx + gw - 6} y2={gy + gh - 6} stroke={shHex} strokeWidth="0.7" opacity="0.2" />
          <line x1={gx + gw - 6} y1={gy + 6}      x2={gx + 6}      y2={gy + gh - 6} stroke={shHex} strokeWidth="0.7" opacity="0.2" />
        </>
      );
    case 'tilt-turn':
      return (
        <>
          <line x1={gx}      y1={gy}      x2={mx} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <line x1={gx + gw} y1={gy}      x2={mx} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <line x1={gx}      y1={gy + gh} x2={mx} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <rect x={gx + gw - 7} y={my - 9} width={4} height={18} fill={handleFill} rx="1.5" />
          <rect x={gx + gw - 7} y={my - 3} width={4} height={6}  fill={shHex}      rx="1"   opacity="0.4" />
        </>
      );
    case 'tilt-only':
      return (
        <>
          <line x1={gx}      y1={gy + gh} x2={mx} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <line x1={gx + gw} y1={gy + gh} x2={mx} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <rect x={mx - 8} y={gy + gh - 7} width={16} height={4} fill={handleFill} rx="1" />
        </>
      );
    case 'left-turn':
      return (
        <>
          <line x1={gx + gw} y1={gy}      x2={gx + 3} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <line x1={gx + gw} y1={gy + gh} x2={gx + 3} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <rect x={gx + gw - 7} y={my - 9} width={4} height={18} fill={handleFill} rx="1.5" />
        </>
      );
    case 'right-turn':
      return (
        <>
          <line x1={gx}      y1={gy}      x2={gx + gw - 3} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <line x1={gx}      y1={gy + gh} x2={gx + gw - 3} y2={my} stroke={shHex} strokeWidth={sw} strokeDasharray={da} opacity={op} />
          <rect x={gx + 3}   y={my - 9}   width={4}         height={18} fill={handleFill} rx="1.5" />
        </>
      );
    case 'sliding-left':
      return (
        <text x={mx} y={my + 4} textAnchor="middle"
          fontSize={Math.max(11, gw * 0.1)} fill={shHex} opacity="0.7" fontWeight="bold">←</text>
      );
    case 'sliding-right':
      return (
        <text x={mx} y={my + 4} textAnchor="middle"
          fontSize={Math.max(11, gw * 0.1)} fill={shHex} opacity="0.7" fontWeight="bold">→</text>
      );
    default:
      return null;
  }
}

// ─── Default layout fallback ──────────────────────────────────────────────────

const DEFAULT_ROWS: LayoutRow[] = [
  { cells: [{ opening: 'tilt-turn', widthFr: 1 }], heightFr: 1 },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function SVGPreview({
  series, width, height, glass, construction, color,
}: Props) {
  const VW = 280, VH = 240, PAD = 18, LABEL_H = 22;

  const aw = VW - PAD * 2;
  const ah = VH - PAD * 2 - LABEL_H;
  const ar = height / (width || 1);
  let fw: number, fh: number;
  if (ar > ah / aw) { fh = ah; fw = fh / ar; }
  else              { fw = aw; fh = aw * ar; }
  const ox = PAD + (aw - fw) / 2;
  const oy = PAD + (ah - fh) / 2;

  // ── Colours ──────────────────────────────────────────────────────────────
  const isAlum     = series?.material === 'aluminum';
  const baseHex    = color?.hex          ?? (isAlum ? '#c8d0d8' : '#f0f0ed');
  const hiHex      = color?.highlightHex ?? (isAlum ? '#dde4ea' : '#ffffff');
  const shHex      = color?.shadowHex    ?? (isAlum ? '#8e9aa4' : '#c8c8c4');
  const hasTexture = color?.type === 'lamination' && !!color?.texture;
  const handleFill = isAlum ? '#b0b8c1' : '#e0e0dc';
  const gc = glass?.id === 'energy' ? '#7dd3fc' : glass?.id === 'double' ? '#bfdbfe' : '#dbeafe';

  const ft = Math.max(7, Math.min(13, fw * 0.062));

  const uid    = `sv-${series?.id ?? 'x'}-${construction?.id ?? 'n'}-${color?.id ?? 'd'}`;
  const gradId = `${uid}-g`;
  const shadId = `${uid}-s`;
  const glsId  = `${uid}-gl`;
  const patId  = `${uid}-p`;

  if (!series) {
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
        <rect width={VW} height={VH} fill="#f9fafb" rx="8" />
        <text x={VW / 2} y={VH / 2 - 8}  textAnchor="middle" fontSize="13" fill="#9ca3af">Выберите серию</text>
        <text x={VW / 2} y={VH / 2 + 10} textAnchor="middle" fontSize="11" fill="#d1d5db">для предпросмотра</text>
      </svg>
    );
  }

  // ── Build cell positions ──────────────────────────────────────────────────
  const rows = construction?.rows ?? DEFAULT_ROWS;
  const totalHFr = rows.reduce((s, r) => s + r.heightFr, 0);

  interface CellInfo {
    cx: number; cy: number; cw: number; ch: number;
    opening: OpeningType; arch?: ArchType;
    isLeft: boolean; isRight: boolean; isTop: boolean; isBot: boolean;
  }

  const cells: CellInfo[] = [];
  let curY = oy;
  rows.forEach((row, ri) => {
    const rh = (row.heightFr / totalHFr) * fh;
    const totalWFr = row.cells.reduce((s, c) => s + c.widthFr, 0);
    let curX = ox;
    row.cells.forEach((cell, ci) => {
      const cw = (cell.widthFr / totalWFr) * fw;
      cells.push({
        cx: curX, cy: curY, cw, ch: rh,
        opening: cell.opening, arch: cell.arch,
        isLeft: ci === 0, isRight: ci === row.cells.length - 1,
        isTop: ri === 0,  isBot: ri === rows.length - 1,
      });
      curX += cw;
    });
    curY += rh;
  });

  // ── Arch (top row only, single full-width cell) ───────────────────────────
  const topRow     = rows[0];
  const topArchCell = (topRow.cells.length === 1 && topRow.cells[0].arch) ? topRow.cells[0] : null;
  const topRow_h   = (topRow.heightFr / totalHFr) * fh;
  const archRise   = topArchCell ? archRiseFor(topArchCell.arch!, fw, topRow_h) : 0;

  // ── Glass rect for regular cells ──────────────────────────────────────────
  function glassRect(c: CellInfo) {
    return {
      gx: c.cx + (c.isLeft  ? ft     : ft / 2),
      gy: c.cy + (c.isTop   ? ft     : ft / 2),
      gw: c.cw - (c.isLeft  ? ft     : ft / 2) - (c.isRight ? ft     : ft / 2),
      gh: c.ch - (c.isTop   ? ft     : ft / 2) - (c.isBot   ? ft     : ft / 2),
    };
  }

  // ── Row separators (between rows) ────────────────────────────────────────
  const rowSepYs: number[] = [];
  let sy = oy;
  for (let ri = 0; ri < rows.length - 1; ri++) {
    sy += (rows[ri].heightFr / totalHFr) * fh;
    rowSepYs.push(sy);
  }

  // ── Column separators (within each row) ──────────────────────────────────
  interface ColSep { x: number; y: number; h: number; }
  const colSeps: ColSep[] = [];
  let rY = oy;
  rows.forEach(row => {
    const rh = (row.heightFr / totalHFr) * fh;
    if (row.cells.length > 1) {
      const totalWFr = row.cells.reduce((s, c) => s + c.widthFr, 0);
      let cx = ox;
      row.cells.slice(0, -1).forEach(cell => {
        cx += (cell.widthFr / totalWFr) * fw;
        colSeps.push({ x: cx, y: rY, h: rh });
      });
    }
    rY += rh;
  });

  // ── Outer frame ───────────────────────────────────────────────────────────
  const outerPath = topArchCell ? archOutlinePath(ox, oy, fw, archRise, oy + fh) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={hiHex} />
          <stop offset="40%"  stopColor={baseHex} />
          <stop offset="100%" stopColor={shHex} />
        </linearGradient>
        <filter id={shadId} x="-12%" y="-10%" width="135%" height="135%">
          <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#00000033" />
        </filter>
        <linearGradient id={glsId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.35" />
          <stop offset="40%"  stopColor={gc}    stopOpacity="0.80" />
          <stop offset="100%" stopColor={gc}    stopOpacity="0.60" />
        </linearGradient>
        {hasTexture && (
          <pattern id={patId} patternUnits="userSpaceOnUse" width="60" height="60">
            <image href={color!.texture} x="0" y="0" width="60" height="60"
              preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>

      {/* Background */}
      <rect width={VW} height={VH} fill="#f1f5f9" rx="8" />

      {/* Outer frame fill + shadow */}
      {outerPath
        ? <path d={outerPath} fill={`url(#${gradId})`} stroke={shHex} strokeWidth="1" filter={`url(#${shadId})`} />
        : <rect x={ox} y={oy} width={fw} height={fh} fill={`url(#${gradId})`} stroke={shHex} strokeWidth="1" rx="2" filter={`url(#${shadId})`} />
      }

      {/* Texture overlay */}
      {hasTexture && (outerPath
        ? <path d={outerPath} fill={`url(#${patId})`} opacity="0.55" />
        : <rect x={ox} y={oy} width={fw} height={fh} fill={`url(#${patId})`} opacity="0.55" rx="2" />
      )}

      {/* Outer bevel */}
      {topArchCell ? (
        <>
          <path d={`M${ox},${oy + archRise} A${fw / 2},${archRise} 0 0 1 ${ox + fw},${oy + archRise}`}
            fill="none" stroke={hiHex} strokeWidth="1.5" opacity="0.9" />
          <line x1={ox}      y1={oy + archRise} x2={ox}      y2={oy + fh} stroke={hiHex} strokeWidth="1.5" opacity="0.8" />
          <line x1={ox}      y1={oy + fh}       x2={ox + fw} y2={oy + fh} stroke={shHex} strokeWidth="2"   opacity="0.9" />
          <line x1={ox + fw} y1={oy + archRise} x2={ox + fw} y2={oy + fh} stroke={shHex} strokeWidth="2"   opacity="0.9" />
        </>
      ) : (
        <>
          <line x1={ox}      y1={oy}    x2={ox + fw} y2={oy}      stroke={hiHex} strokeWidth="1.5" opacity="0.9" />
          <line x1={ox}      y1={oy}    x2={ox}      y2={oy + fh} stroke={hiHex} strokeWidth="1.5" opacity="0.8" />
          <line x1={ox}      y1={oy + fh} x2={ox + fw} y2={oy + fh} stroke={shHex} strokeWidth="2"   opacity="0.9" />
          <line x1={ox + fw} y1={oy}    x2={ox + fw} y2={oy + fh} stroke={shHex} strokeWidth="2"   opacity="0.9" />
          <line x1={ox + ft} y1={oy + ft} x2={ox + fw - ft} y2={oy + ft}     stroke={shHex} strokeWidth="0.7" opacity="0.28" />
          <line x1={ox + ft} y1={oy + ft} x2={ox + ft}      y2={oy + fh - ft} stroke={shHex} strokeWidth="0.7" opacity="0.28" />
        </>
      )}

      {/* Row separators */}
      {rowSepYs.map((sepY, i) => (
        <g key={i}>
          <rect x={ox} y={sepY - ft / 2} width={fw} height={ft} fill={`url(#${gradId})`} />
          {hasTexture && <rect x={ox} y={sepY - ft / 2} width={fw} height={ft} fill={`url(#${patId})`} opacity="0.55" />}
          <line x1={ox} y1={sepY - ft / 2} x2={ox + fw} y2={sepY - ft / 2} stroke={shHex} strokeWidth="0.7" opacity="0.35" />
          <line x1={ox} y1={sepY + ft / 2} x2={ox + fw} y2={sepY + ft / 2} stroke={hiHex} strokeWidth="0.7" opacity="0.35" />
        </g>
      ))}

      {/* Column separators */}
      {colSeps.map((sep, i) => (
        <g key={i}>
          <rect x={sep.x - ft / 2} y={sep.y} width={ft} height={sep.h} fill={`url(#${gradId})`} />
          {hasTexture && <rect x={sep.x - ft / 2} y={sep.y} width={ft} height={sep.h} fill={`url(#${patId})`} opacity="0.55" />}
          <line x1={sep.x - ft / 2} y1={sep.y} x2={sep.x - ft / 2} y2={sep.y + sep.h} stroke={shHex} strokeWidth="0.7" opacity="0.35" />
          <line x1={sep.x + ft / 2} y1={sep.y} x2={sep.x + ft / 2} y2={sep.y + sep.h} stroke={hiHex} strokeWidth="0.7" opacity="0.35" />
        </g>
      ))}

      {/* Glass cells */}
      {cells.map((c, i) => {
        if (c.arch) {
          const rise   = archRiseFor(c.arch, c.cw, c.ch);
          const grx    = Math.max(2, (c.cw - 2 * ft) / 2);
          const gry    = Math.max(2, rise - ft);
          const gx     = c.cx + ft;
          const gw     = c.cw - 2 * ft;
          const gyBase = c.cy + rise;
          const gBot   = c.cy + c.ch - (c.isBot ? ft : ft / 2);
          const glassPath = `M${gx},${gyBase} A${grx},${gry} 0 0 1 ${gx + gw},${gyBase} L${gx + gw},${gBot} L${gx},${gBot} Z`;
          return (
            <g key={i}>
              <path d={glassPath} fill={`url(#${glsId})`} />
              <path d={`M${gx},${gyBase} A${grx},${gry} 0 0 1 ${gx + gw},${gyBase}`}
                fill="none" stroke={shHex} strokeWidth="0.8" opacity="0.4" />
              <OpeningLines opening={c.opening} gx={gx} gy={gyBase} gw={gw} gh={gBot - gyBase}
                shHex={shHex} handleFill={handleFill} />
              <line x1={gx + 4} y1={gyBase + 6} x2={gx + 4} y2={gBot - 6}
                stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
            </g>
          );
        }

        const { gx, gy, gw, gh } = glassRect(c);
        return (
          <g key={i}>
            <rect x={gx} y={gy} width={gw} height={gh} fill={`url(#${glsId})`} />
            <OpeningLines opening={c.opening} gx={gx} gy={gy} gw={gw} gh={gh}
              shHex={shHex} handleFill={handleFill} />
            <line x1={gx + 4} y1={gy + 4} x2={gx + 4} y2={gy + gh - 4}
              stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
            <line x1={gx + gw / 3} y1={gy + 4} x2={gx + gw / 3 + 8} y2={gy + 4}
              stroke="white" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Dimension label */}
      <text x={VW / 2} y={oy + fh + 16} textAnchor="middle" fontSize="10" fill="#6b7280"
        fontFamily="system-ui, sans-serif">
        {width} × {height} мм
      </text>
    </svg>
  );
}
