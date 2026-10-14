'use client';

/** 價格走勢小圖：綠色＝比第一筆低、紅色＝比第一筆高；虛線為目標價 */
export function Sparkline({ points, target, className = 'h-10 w-24' }: { points: number[]; target?: number | null; className?: string }) {
  const w = 100;
  const h = 40;
  if (points.length === 0) return <div className={className} aria-hidden />;
  const pts = points.length === 1 ? [points[0], points[0]] : points;
  const all = target != null ? [...pts, target] : pts;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => (i / (pts.length - 1)) * (w - 6) + 3;
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 8);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const color = last < first ? '#059669' : last > first ? '#dc2626' : '#6b7280';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      {target != null && (
        <line x1="0" x2={w} y1={y(target)} y2={y(target)} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="2.5" fill={color} />
    </svg>
  );
}
