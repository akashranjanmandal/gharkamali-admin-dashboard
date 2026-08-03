'use client';
// Spreadsheet-style column headers for admin tables: click a header to sort
// asc/desc, click the funnel icon for a per-column search box. Works
// client-side on the rows currently loaded by the page.
//
// Usage:
//   const COLS: Col[] = [
//     { key: 'booking_number', label: 'Booking #' },
//     { key: 'customer', label: 'Customer', get: r => r.customer?.name },
//     { key: 'created_at', label: 'Date', type: 'date' },
//     { key: 'total_amount', label: 'Amount', type: 'number' },
//   ];
//   const ctl = useTableControls(COLS);
//   const rows = ctl.process(loadedRows);
//   <thead><tr>{COLS.map(c => <Th key={c.key} col={c} ctl={ctl} />)}<th>Actions</th></tr></thead>
import { useEffect, useRef, useState } from 'react';
import { IconFilter, IconChevronUp, IconChevronDown } from '@tabler/icons-react';

export interface Col {
  key: string;
  label: string;
  /** Value accessor; defaults to row[key]. Used for BOTH filtering and sorting. */
  get?: (row: any) => any;
  /** Sort/compare semantics; default 'string'. */
  type?: 'string' | 'number' | 'date';
  /** Set false to render a plain header (no sort/filter) — e.g. Actions. */
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableControls {
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  toggleSort: (key: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, v: string) => void;
  process: (rows: any[]) => any[];
}

export function useTableControls(cols: Col[]): TableControls {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortKey(null); // third click clears the sort
  };
  const setFilter = (key: string, v: string) => setFilters(f => ({ ...f, [key]: v }));

  const valueOf = (col: Col, row: any) => (col.get ? col.get(row) : row?.[col.key]);

  const compare = (col: Col, a: any, b: any) => {
    const av = valueOf(col, a), bv = valueOf(col, b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last
    if (bv == null) return -1;
    if (col.type === 'number') return (Number(av) || 0) - (Number(bv) || 0);
    if (col.type === 'date') return new Date(av).getTime() - new Date(bv).getTime();
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base', numeric: true });
  };

  const process = (rows: any[]) => {
    let out = rows;
    for (const c of cols) {
      const q = (filters[c.key] || '').trim().toLowerCase();
      if (q) out = out.filter(r => String(valueOf(c, r) ?? '').toLowerCase().includes(q));
    }
    if (sortKey) {
      const col = cols.find(c => c.key === sortKey);
      if (col) out = [...out].sort((a, b) => compare(col, a, b) * (sortDir === 'asc' ? 1 : -1));
    }
    return out;
  };

  return { sortKey, sortDir, toggleSort, filters, setFilter, process };
}

export function Th({ col, ctl }: { col: Col; ctl: TableControls }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sortable = col.sortable !== false;
  const filterable = col.filterable !== false;
  const active = ctl.sortKey === col.key;
  const filterVal = ctl.filters[col.key] || '';

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  return (
    <th ref={boxRef} style={{ position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span
          onClick={sortable ? () => ctl.toggleSort(col.key) : undefined}
          style={{ cursor: sortable ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 2 }}
          title={sortable ? 'Click to sort' : undefined}
        >
          {col.label}
          {sortable && (
            <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0, opacity: active ? 1 : 0.28 }}>
              <IconChevronUp size={11} style={{ marginBottom: -3, color: active && ctl.sortDir === 'asc' ? 'var(--forest)' : 'inherit', opacity: active && ctl.sortDir === 'desc' ? 0.3 : 1 }} />
              <IconChevronDown size={11} style={{ color: active && ctl.sortDir === 'desc' ? 'var(--forest)' : 'inherit', opacity: active && ctl.sortDir === 'asc' ? 0.3 : 1 }} />
            </span>
          )}
        </span>
        {filterable && (
          <span onClick={() => setOpen(o => !o)} title="Filter this column"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: filterVal ? 'var(--forest)' : 'inherit', opacity: filterVal ? 1 : 0.45 }}>
            <IconFilter size={13} fill={filterVal ? 'var(--forest)' : 'none'} />
          </span>
        )}
      </span>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, padding: 8,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10,
          boxShadow: '0 10px 28px rgba(0,0,0,0.14)', display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <input
            ref={inputRef}
            value={filterVal}
            onChange={e => ctl.setFilter(col.key, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setOpen(false); }}
            placeholder={`Filter ${col.label}…`}
            style={{ width: 150, padding: '7px 9px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.78rem', outline: 'none', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}
          />
          {filterVal && (
            <button onClick={() => { ctl.setFilter(col.key, ''); setOpen(false); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 2 }}>✕</button>
          )}
        </div>
      )}
    </th>
  );
}
