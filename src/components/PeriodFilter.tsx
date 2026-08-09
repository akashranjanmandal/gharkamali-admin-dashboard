'use client';
// Period filter shown in the table header of admin pages — the display-side
// twin of ExportButton's period menu. Emits { from, to } (YYYY-MM-DD) or null
// for "All time"; pages pass the value to their list API as from_date/to_date
// (paginated endpoints) or filter rows client-side (plain lists).
import { useState } from 'react';

export type Period = { from: string; to: string } | null;

const pad = (n: number) => String(n).padStart(2, '0');
const monthRange = (y: number, m: number): Period => ({
  from: `${y}-${pad(m)}-01`,
  to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`,
});
const yearRange = (y: number): Period => ({ from: `${y}-01-01`, to: `${y}-12-31` });

/** Client-side helper for non-paginated lists: keep rows inside the period. */
export function inPeriod(row: any, period: Period, dateField = 'created_at'): boolean {
  if (!period) return true;
  const v = row?.[dateField] ?? row?.created_at ?? row?.createdAt;
  if (!v) return false;
  const d = new Date(v);
  if (isNaN(d.getTime())) return false;
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return day >= period.from && day <= period.to;
}

export default function PeriodFilter({ onChange }: { onChange: (p: Period) => void }) {
  const now = new Date();
  // Records can't exist in the future — cap every picker at today (BUG-03).
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const thisMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [mode, setMode] = useState('all');
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const apply = (m: string, opts?: { month?: string; year?: string; from?: string; to?: string }) => {
    setMode(m);
    const mm = opts?.month ?? month;
    const yy = opts?.year ?? year;
    if (m === 'all') onChange(null);
    else if (m === 'this_month') onChange(monthRange(now.getFullYear(), now.getMonth() + 1));
    else if (m === 'last_month') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      onChange(monthRange(d.getFullYear(), d.getMonth() + 1));
    } else if (m === 'this_year') onChange(yearRange(now.getFullYear()));
    else if (m === 'month') {
      const [y2, m2] = mm.split('-').map(Number);
      if (y2 && m2) onChange(monthRange(y2, m2));
    } else if (m === 'year') {
      const y2 = Number(yy);
      if (y2 > 1900 && y2 < 2200) onChange(yearRange(y2));
    } else if (m === 'range') {
      const f = opts?.from ?? from;
      const t = opts?.to ?? to;
      if (f || t) onChange({ from: f || '1970-01-01', to: t || '2099-12-31' });
      else onChange(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 10,
    fontFamily: 'inherit', fontSize: '0.8rem', background: '#fff', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={mode} onChange={e => apply(e.target.value)} style={inputStyle}>
        <option value="all">📅 All time</option>
        <option value="this_month">This month</option>
        <option value="last_month">Last month</option>
        <option value="this_year">This year</option>
        <option value="month">Month…</option>
        <option value="year">Year…</option>
        <option value="range">Custom range…</option>
      </select>
      {mode === 'month' && (
        <input type="month" value={month} max={thisMonthStr} style={inputStyle}
          onChange={e => { setMonth(e.target.value); apply('month', { month: e.target.value }); }} />
      )}
      {mode === 'year' && (
        <input type="number" min={2020} max={now.getFullYear()} value={year} style={{ ...inputStyle, width: 90 }}
          onChange={e => { setYear(e.target.value); apply('year', { year: e.target.value }); }} />
      )}
      {mode === 'range' && (<>
        <input type="date" value={from} max={to || todayStr} style={inputStyle}
          onChange={e => { setFrom(e.target.value); apply('range', { from: e.target.value }); }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
        <input type="date" value={to} min={from || undefined} max={todayStr} style={inputStyle}
          onChange={e => { setTo(e.target.value); apply('range', { to: e.target.value }); }} />
      </>)}
    </div>
  );
}
