'use client';
/**
 * Theme-aware SVG charts. Every colour is a CSS token (series-N, chart-grid, chart-label…),
 * so charts re-render correctly in light and dark with no chart-level colour code.
 * Specs (dataviz method): ≤24px bars with 4px data-end radius, 2px lines, ≥8px dots with a
 * surface ring, hairline grid, legend for ≥2 series, hover tooltip on every mark, table view.
 * Categorical slots are assigned in fixed order and follow the entity, never its rank.
 */
import { ReactNode, useRef, useState } from 'react';

export interface Datum { label: string; value: number | null; note?: string }
type Tip = { x: number; y: number; title: string; lines: string[] } | null;

const fmt = (v: number, unit = '') => `${Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit}`;
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
/** Bar path: square at the baseline, 4px rounded data-end. */
function hbarPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}
function vbarPath(x: number, base: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, h, w / 2);
  const top = base - h;
  return `M${x},${base} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${base} Z`;
}

function ChartFrame({ title, children, tip, table }: { title: string; children: ReactNode; tip: Tip; table: ReactNode }) {
  return (
    <figure className="chart" style={{ margin: 0 }} aria-label={title}>
      {children}
      {tip && (
        <div className="chart-tooltip" role="status" style={{ left: `${tip.x}%`, top: `${tip.y}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}>
          <strong>{tip.title}</strong>
          {tip.lines.map((l) => <div key={l}>{l}</div>)}
        </div>
      )}
      <details className="chart-table">
        <summary>View as table</summary>
        {table}
      </details>
    </figure>
  );
}

/** Horizontal bars: magnitude by category. `suppressed` (value null) renders as a dashed placeholder. */
export function HBarChart({ title, data, unit = '', series = 1, max, labelWidth = 170 }: { title: string; data: Datum[]; unit?: string; series?: number; max?: number; labelWidth?: number }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 640, rowH = 30, barH = 16, top = 6, right = 64;
  const H = top + data.length * rowH + 22;
  const plotW = W - labelWidth - right;
  const m = max ?? niceMax(Math.max(0, ...data.map((d) => d.value ?? 0)));
  const ticks = [0, m / 2, m];
  return (
    <ChartFrame title={title} tip={tip} table={<SimpleTable rows={data.map((d) => [d.label, d.value === null ? 'Suppressed' : fmt(d.value, unit)])} head={['Category', 'Value']} />}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value === null ? 'suppressed' : fmt(d.value, unit)}`).join(', ')}`} onMouseLeave={() => setTip(null)}>
        {ticks.map((t) => {
          const x = labelWidth + (t / m) * plotW;
          return <g key={t}><line className="grid-line" x1={x} x2={x} y1={top} y2={H - 20} /><text className="axis-label" x={x} y={H - 6} textAnchor="middle">{fmt(t, unit)}</text></g>;
        })}
        {data.map((d, i) => {
          const y = top + i * rowH + (rowH - barH) / 2;
          const w = d.value === null ? plotW * 0.18 : Math.max(2, (d.value / m) * plotW);
          const show = () => setTip({ x: ((labelWidth + w) / W) * 100, y: (y / H) * 100, title: d.label, lines: [d.value === null ? 'Suppressed (below minimum group size)' : fmt(d.value, unit), ...(d.note ? [d.note] : [])] });
          return (
            <g key={d.label} onMouseEnter={show} onFocus={show} onBlur={() => setTip(null)} tabIndex={0} aria-label={`${d.label}: ${d.value === null ? 'suppressed' : fmt(d.value, unit)}`}>
              <rect x={0} y={y - 6} width={W} height={barH + 12} fill="transparent" />
              <text className="category-label" x={labelWidth - 10} y={y + barH / 2 + 4} textAnchor="end">{d.label.length > 24 ? `${d.label.slice(0, 23)}…` : d.label}</text>
              {d.value === null
                ? <rect className="suppressed" x={labelWidth} y={y} width={w} height={barH} rx={3} />
                : <path className={`mark series-${series}`} d={hbarPath(labelWidth, y, w, barH)} />}
              <text className="value-label" x={labelWidth + w + 6} y={y + barH / 2 + 4}>{d.value === null ? '—' : fmt(d.value, unit)}</text>
            </g>
          );
        })}
        <line className="axis-line" x1={labelWidth} x2={labelWidth} y1={top} y2={H - 20} />
      </svg>
    </ChartFrame>
  );
}

/** Vertical columns: magnitude over ordered categories (e.g. years). */
export function ColumnChart({ title, data, unit = '', series = 1, highlightLast = false }: { title: string; data: Datum[]; unit?: string; series?: number; highlightLast?: boolean }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 640, H = 250, left = 48, bottom = 30, top = 20, right = 8;
  const plotH = H - top - bottom, plotW = W - left - right;
  const m = niceMax(Math.max(0, ...data.map((d) => d.value ?? 0)));
  const band = plotW / Math.max(1, data.length);
  const bw = Math.min(24, band * 0.6);
  const ticks = [0, m / 2, m];
  const base = top + plotH;
  return (
    <ChartFrame title={title} tip={tip} table={<SimpleTable rows={data.map((d) => [d.label, d.value === null ? 'Suppressed' : fmt(d.value, unit)])} head={['Period', 'Value']} />}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onMouseLeave={() => setTip(null)}>
        {ticks.map((t) => { const y = base - (t / m) * plotH; return <g key={t}><line className="grid-line" x1={left} x2={W - right} y1={y} y2={y} /><text className="axis-label" x={left - 8} y={y + 4} textAnchor="end">{fmt(t)}</text></g>; })}
        {data.map((d, i) => {
          const x = left + i * band + (band - bw) / 2;
          const h = d.value ? (d.value / m) * plotH : 0;
          const labelled = highlightLast ? i === data.length - 1 || h === Math.max(...data.map((z) => ((z.value ?? 0) / m) * plotH)) : false;
          const show = () => setTip({ x: ((x + bw / 2) / W) * 100, y: ((base - h) / H) * 100, title: d.label, lines: [d.value === null ? 'Suppressed' : fmt(d.value, unit)] });
          return (
            <g key={d.label} onMouseEnter={show} onFocus={show} onBlur={() => setTip(null)} tabIndex={0} aria-label={`${d.label}: ${d.value === null ? 'suppressed' : fmt(d.value, unit)}`}>
              <rect x={left + i * band} y={top} width={band} height={plotH} fill="transparent" />
              {d.value !== null && h > 0 && <path className={`mark series-${series}`} d={vbarPath(x, base, bw, h)} />}
              {labelled && d.value !== null && <text className="value-label" x={x + bw / 2} y={base - h - 6} textAnchor="middle">{fmt(d.value, unit)}</text>}
              <text className="axis-label" x={x + bw / 2} y={H - 8} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
        <line className="axis-line" x1={left} x2={W - right} y1={base} y2={base} />
      </svg>
    </ChartFrame>
  );
}

export interface LineSeries { name: string; slot: number; values: Array<number | null> }

/** Lines over time. One shared axis only (no dual axes). Legend + end labels + crosshair tooltip. */
export function LineChart({ title, periods, series, unit = '', min = 0, max }: { title: string; periods: string[]; series: LineSeries[]; unit?: string; min?: number; max?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 640, H = 260, left = 50, right = 64, top = 16, bottom = 34;
  const plotW = W - left - right, plotH = H - top - bottom;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const hi = max ?? niceMax(Math.max(...all));
  const x = (i: number) => left + (periods.length === 1 ? plotW / 2 : (i / (periods.length - 1)) * plotW);
  const y = (v: number) => top + plotH - ((v - min) / (hi - min)) * plotH;
  const ticks = [min, (min + hi) / 2, hi];
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - left) / plotW) * (periods.length - 1));
    setHover(Math.max(0, Math.min(periods.length - 1, i)));
  };
  const tip: Tip = hover === null ? null : { x: (x(hover) / W) * 100, y: 12, title: periods[hover], lines: series.map((s) => `${s.name}: ${s.values[hover] === null ? '—' : fmt(s.values[hover]!, unit)}`) };
  return (
    <ChartFrame title={title} tip={tip} table={<SimpleTable head={['Period', ...series.map((s) => s.name)]} rows={periods.map((p, i) => [p, ...series.map((s) => (s.values[i] === null ? '—' : fmt(s.values[i]!, unit)))])} />}>
      {series.length > 1 && (
        <div className="legend" aria-hidden="true">{series.map((s) => <span key={s.name} className="legend-item"><span className={`legend-swatch swatch-${s.slot}`} />{s.name}</span>)}</div>
      )}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line className="grid-line" x1={left} x2={W - right} y1={y(t)} y2={y(t)} /><text className="axis-label" x={left - 8} y={y(t) + 4} textAnchor="end">{fmt(t, unit)}</text></g>)}
        {periods.map((p, i) => <text key={p} className="axis-label" x={x(i)} y={H - 10} textAnchor="middle">{p}</text>)}
        {hover !== null && <line className="axis-line" x1={x(hover)} x2={x(hover)} y1={top} y2={top + plotH} />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter(Boolean) as Array<readonly [number, number]>;
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
          const last = pts[pts.length - 1];
          const lastV = [...s.values].reverse().find((v) => v !== null) as number;
          return (
            <g key={s.name}>
              <path className={`line-mark series-${s.slot}`} d={d} style={{ fill: 'none' }} />
              {pts.map((p, i) => <circle key={i} className={`dot-mark series-${s.slot}`} cx={p[0]} cy={p[1]} r={hover !== null && pts[i] && Math.abs(p[0] - x(hover)) < 1 ? 5 : 4} style={{ stroke: 'var(--surface)' }} />)}
              {last && <text className="value-label" x={last[0] + 9} y={last[1] + 4}>{fmt(lastV, unit)}</text>}
            </g>
          );
        })}
        <line className="axis-line" x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} />
      </svg>
    </ChartFrame>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap mt-1"><table className="table">
      <thead><tr>{head.map((h, i) => <th key={h} className={i ? 'num' : ''}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i ? 'num' : ''}>{c}</td>)}</tr>)}</tbody>
    </table></div>
  );
}
