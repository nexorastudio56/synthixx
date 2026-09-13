"use client";

import { useId } from "react";

export interface Point { label: string; value: number }

/* Data-viz palette (works in light + dark). */
export const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

/** Vertical bar chart (inline SVG, theme-aware via currentColor on labels). */
export function BarChart({ data, height = 180, prefix = "" }: { data: Point[]; height?: number; prefix?: string }) {
  if (data.length === 0) return <Empty />;
  const w = Math.max(data.length * 56, 240);
  const pad = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (w - pad.left - pad.right) / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} className="text-muted" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = pad.left + i * bw + bw * 0.2;
        const y = pad.top + (chartH - h);
        return (
          <g key={i}>
            <rect className="sk-grow-bar" style={{ animationDelay: `${i * 60}ms` }} x={x} y={y} width={bw * 0.6} height={Math.max(h, 1)} rx={4} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            <text x={x + bw * 0.3} y={y - 4} textAnchor="middle" fontSize="10" fill="currentColor">
              {prefix}{formatNum(d.value)}
            </text>
            <text x={x + bw * 0.3} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor">
              {truncate(d.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Line + area chart. */
export function LineChart({ data, height = 180, prefix = "" }: { data: Point[]; height?: number; prefix?: string }) {
  const gid = useId();
  if (data.length === 0) return <Empty />;
  const w = Math.max(data.length * 56, 240);
  const pad = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (w - pad.left - pad.right) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + chartH - (d.value / max) * chartH;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${pad.top + chartH} L${pts[0][0]},${pad.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} className="text-muted" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity="0.25" />
          <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path className="sk-draw" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} d={line} fill="none" stroke={CHART_COLORS[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" fill={CHART_COLORS[0]} />
          <text x={p[0]} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor">{truncate(data[i].label)}</text>
        </g>
      ))}
      <text x={pts[0][0]} y={pts[0][1] - 8} fontSize="10" fill="currentColor">{prefix}{formatNum(data[0].value)}</text>
      <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 8} textAnchor="end" fontSize="10" fill="currentColor">{prefix}{formatNum(data[data.length - 1].value)}</text>
    </svg>
  );
}

/** Donut chart with legend. */
export function DonutChart({ data, size = 160 }: { data: Point[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <Empty />;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const seg = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth="16" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <ul className="space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted">{d.label}</span>
            <span className="font-medium">{formatNum(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return <div className="flex h-32 items-center justify-center text-sm text-muted">No data yet</div>;
}

function truncate(s: string) {
  return s.length > 8 ? s.slice(0, 7) + "…" : s;
}

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
