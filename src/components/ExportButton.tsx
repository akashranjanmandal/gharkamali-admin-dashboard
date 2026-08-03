'use client';
// Reusable "Export CSV" button with period filters, used by every tabular
// admin page. Opens a small menu: one-click ranges (all / this month / last
// month / this year) plus custom month and custom year pickers. On download it
// fetches ALL rows via the page-supplied fetchAll (not just the visible page),
// filters them by the chosen period on the row's date field, maps each row
// through mapRow and saves a CSV.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IconDownload, IconChevronDown } from '@tabler/icons-react';
import { exportToCSV } from '@/lib/utils';

interface Props {
  /** Base file name, e.g. "Customers" → Customers_2026-07_2026-08-03.csv */
  filename: string;
  /** Fetch EVERY row (use fetchAllPages from lib/utils for paginated APIs). */
  fetchAll: () => Promise<any[]>;
  /** Shape one raw row into the CSV columns. */
  mapRow: (row: any) => Record<string, any>;
  /** Row field holding the record date (default created_at / createdAt). */
  dateField?: string;
  label?: string;
}

export default function ExportButton({ filename, fetchAll, mapRow, dateField = 'created_at', label = 'Export CSV' }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(String(now.getFullYear()));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const rowDate = (r: any): Date | null => {
    const v = r?.[dateField] ?? r?.created_at ?? r?.createdAt;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const run = async (filter: (d: Date | null) => boolean, suffix: string) => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    const t = toast.loading('Preparing export…');
    try {
      const rows = (await fetchAll()).filter(r => filter(rowDate(r)));
      if (!rows.length) { toast.error('No records in the selected period', { id: t }); return; }
      exportToCSV(rows.map(mapRow), `${filename}_${suffix}`);
      toast.success(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}`, { id: t });
    } catch (e: any) {
      toast.error(e?.message || 'Export failed', { id: t });
    } finally {
      setBusy(false);
    }
  };

  const inMonth = (y: number, m: number) => (d: Date | null) => !!d && d.getFullYear() === y && d.getMonth() + 1 === m;
  const inYear = (y: number) => (d: Date | null) => !!d && d.getFullYear() === y;

  const exportAll = () => run(() => true, 'All');
  const exportThisMonth = () => run(inMonth(now.getFullYear(), now.getMonth() + 1), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const exportLastMonth = () => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    run(inMonth(d.getFullYear(), d.getMonth() + 1), `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const exportThisYear = () => run(inYear(now.getFullYear()), String(now.getFullYear()));
  const exportCustomMonth = () => {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) { toast.error('Pick a month first'); return; }
    run(inMonth(y, m), month);
  };
  const exportCustomYear = () => {
    const y = Number(year);
    if (!y || year.length !== 4) { toast.error('Enter a 4-digit year'); return; }
    run(inYear(y), year);
  };

  const item: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)',
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn btn-outline btn-sm" style={{ gap: 6 }} disabled={busy} onClick={() => setOpen(o => !o)}>
        <IconDownload size={16} /> {busy ? 'Exporting…' : label} <IconChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200, minWidth: 240,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', overflow: 'hidden', padding: '6px 0',
        }}>
          <button style={item} onClick={exportAll} onMouseEnter={e => (e.currentTarget.style.background = 'var(--forest-light)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>📄 All entries</button>
          <button style={item} onClick={exportThisMonth} onMouseEnter={e => (e.currentTarget.style.background = 'var(--forest-light)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>🗓 This month</button>
          <button style={item} onClick={exportLastMonth} onMouseEnter={e => (e.currentTarget.style.background = 'var(--forest-light)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>🗓 Last month</button>
          <button style={item} onClick={exportThisYear} onMouseEnter={e => (e.currentTarget.style.background = 'var(--forest-light)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>📅 This year</button>
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
          <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.78rem' }} />
            <button className="btn btn-sm btn-outline" onClick={exportCustomMonth}>Go</button>
          </div>
          <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="number" value={year} min={2020} max={2100} onChange={e => setYear(e.target.value)} placeholder="Year"
              style={{ flex: 1, padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.78rem' }} />
            <button className="btn btn-sm btn-outline" onClick={exportCustomYear}>Go</button>
          </div>
        </div>
      )}
    </div>
  );
}
