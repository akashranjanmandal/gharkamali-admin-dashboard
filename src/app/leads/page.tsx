'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type Lead = {
  id: number; name?: string; phone?: string; email?: string; city?: string;
  service?: string; source?: string; sheet_date?: string; raw?: string;
  status: string; notes?: string; follow_up_on?: string;
  createdAt?: string; created_at?: string;
};

const STATUSES = [
  { key: 'new',            label: 'New',            color: '#2563eb', bg: '#dbeafe' },
  { key: 'contacted',      label: 'Contacted',      color: '#b45309', bg: '#fef3c7' },
  { key: 'follow_up',      label: 'Follow-up',      color: '#7c3aed', bg: '#ede9fe' },
  { key: 'booked',         label: 'Booked',         color: '#15803d', bg: '#dcfce7' },
  { key: 'not_interested', label: 'Not interested', color: '#52525b', bg: '#e4e4e7' },
  { key: 'invalid',        label: 'Invalid',        color: '#b91c1c', bg: '#fee2e2' },
];
const statusMeta = (s: string) => STATUSES.find(x => x.key === s) || STATUSES[0];

const leadDate = (l: Lead) => l.sheet_date || l.createdAt || l.created_at || '';
const fmtDT = (v?: string) => {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const dayKey = (v: string) => String(v).slice(0, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function LeadsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: AdminAPI.leads,
    refetchInterval: 120_000, // keep it live — backend re-syncs from the sheet
  });
  const leads: Lead[] = Array.isArray((data as any)?.leads) ? (data as any).leads : [];
  const sync = (data as any)?.sync;
  const liveSheetUrl: string = (data as any)?.sheet_url || '';

  const syncMut = useMutation({
    mutationFn: AdminAPI.syncLeads,
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['admin-leads'] });
      const s = r?.sync || r;
      if (s?.ok === false) toast.error(s.error || 'Sync failed');
      else toast.success(`Synced — ${s?.added ?? 0} new, ${s?.updated ?? 0} updated`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (p: { id: number; body: any }) => AdminAPI.updateLead(p.id, p.body),
    onSuccess: (lead: any) => {
      qc.invalidateQueries({ queryKey: ['admin-leads'] });
      setSelected(prev => (prev && prev.id === lead?.id ? { ...prev, ...lead } : prev));
    },
    onError: (e: any) => toast.error(e.message),
  });
  const configMut = useMutation({
    mutationFn: () => AdminAPI.saveLeadsConfig(sheetUrl),
    onSuccess: () => { toast.success('Sheet connected'); setShowConfig(false); setSheetUrl(''); qc.invalidateQueries({ queryKey: ['admin-leads'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Derived stats ──
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const s of STATUSES) c[s.key] = 0;
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [leads]);
  const conversion = leads.length ? Math.round(((counts.booked || 0) / leads.length) * 100) : 0;
  const followUpsDue = useMemo(() => leads.filter(l => l.follow_up_on && l.follow_up_on <= todayStr() && !['booked', 'not_interested', 'invalid'].includes(l.status)).length, [leads]);

  // Leads per day — last 30 days.
  const perDay = useMemo(() => {
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const m = new Map(days.map(d => [d, 0]));
    for (const l of leads) {
      const k = dayKey(leadDate(l));
      if (m.has(k)) m.set(k, (m.get(k) || 0) + 1);
    }
    return { labels: days.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), values: days.map(d => m.get(d) || 0) };
  }, [leads]);

  // Top sources (fall back to cities when the sheet has no source column).
  const topGroups = useMemo(() => {
    const bySource = new Map<string, number>();
    const byCity = new Map<string, number>();
    for (const l of leads) {
      if (l.source) bySource.set(l.source, (bySource.get(l.source) || 0) + 1);
      if (l.city) byCity.set(l.city, (byCity.get(l.city) || 0) + 1);
    }
    const pick = bySource.size ? bySource : byCity;
    const label = bySource.size ? 'Leads by source' : 'Leads by city';
    const sorted = [...pick.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { label, labels: sorted.map(x => x[0]), values: sorted.map(x => x[1]) };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (statusFilter === 'due') {
        if (!(l.follow_up_on && l.follow_up_on <= todayStr() && !['booked', 'not_interested', 'invalid'].includes(l.status))) return false;
      } else if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.phone, l.email, l.city, l.service, l.source, l.notes].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [leads, statusFilter, search]);

  const openLead = (l: Lead) => { setSelected(l); setEditNotes(l.notes || ''); setEditFollowUp(l.follow_up_on || ''); };
  const rawFields = useMemo(() => {
    if (!selected?.raw) return [] as [string, string][];
    try { return Object.entries(JSON.parse(selected.raw)).filter(([, v]) => String(v).trim() !== '') as [string, string][]; } catch { return []; }
  }, [selected]);

  const card: React.CSSProperties = { background: '#fff', borderRadius: 20, border: '1px solid var(--border)', padding: 20 };

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Leads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            Live from the lead sheet — updates automatically every 2 minutes.{' '}
            {sync?.at ? <>Last sync {fmtDT(new Date(sync.at).toISOString())}{sync.ok === false ? '' : ` · ${sync.total} rows`}.</> : null}
            {liveSheetUrl && <> <a href={liveSheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)', fontWeight: 700 }}>Open sheet ↗</a></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowConfig(s => !s)}>Sheet settings</button>
          <button className="btn btn-primary" onClick={() => syncMut.mutate()} disabled={syncMut.isPending || isFetching}>
            {syncMut.isPending ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {/* Sheet problem / settings */}
      {sync && sync.ok === false && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: '14px 18px', fontSize: '0.85rem', fontWeight: 600, marginBottom: 16 }}>
          Couldn&apos;t read the sheet: {sync.error}
        </div>
      )}
      {showConfig && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Connected Google Sheet</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            The sheet must be shared as <strong>Anyone with the link → Viewer</strong> (Share button in Google Sheets).
            Paste the full sheet link below, including the tab (gid) you want.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 280 }} placeholder={liveSheetUrl || 'https://docs.google.com/spreadsheets/d/…'} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
            <button className="btn btn-primary" onClick={() => configMut.mutate()} disabled={configMut.isPending || !sheetUrl.trim()}>Connect</button>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total leads', value: counts.all, color: 'var(--forest)' },
          { label: 'New', value: counts.new, color: '#2563eb' },
          { label: 'Contacted', value: counts.contacted, color: '#b45309' },
          { label: 'Follow-ups due', value: followUpsDue, color: '#7c3aed' },
          { label: 'Booked', value: counts.booked, color: '#15803d' },
          { label: 'Conversion', value: `${conversion}%`, color: 'var(--forest)' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{k.label}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: k.color, marginTop: 2 }}>{k.value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, gridColumn: 'span 1' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Leads — last 30 days</div>
          <Line
            height={190}
            data={{ labels: perDay.labels, datasets: [{ data: perDay.values, borderColor: '#03411a', backgroundColor: 'rgba(3,65,26,0.08)', fill: true, tension: 0.35, pointRadius: 0 }] }}
            options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8 } } }, maintainAspectRatio: false }}
          />
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Status breakdown</div>
          <div style={{ maxWidth: 230, margin: '0 auto' }}>
            <Doughnut
              data={{ labels: STATUSES.map(s => s.label), datasets: [{ data: STATUSES.map(s => counts[s.key] || 0), backgroundColor: STATUSES.map(s => s.color), borderWidth: 0 }] }}
              options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: '62%' }}
            />
          </div>
        </div>
        {topGroups.labels.length > 0 && (
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>{topGroups.label}</div>
            <Bar
              height={190}
              data={{ labels: topGroups.labels, datasets: [{ data: topGroups.values, backgroundColor: '#03411a', borderRadius: 6 }] }}
              options={{ indexAxis: 'y' as const, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, maintainAspectRatio: false }}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {[{ key: 'all', label: `All (${counts.all})` }, { key: 'due', label: `Follow-ups due (${followUpsDue})` }, ...STATUSES.map(s => ({ key: s.key, label: `${s.label} (${counts[s.key] || 0})` }))].map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`btn btn-sm ${statusFilter === t.key ? 'btn-primary' : 'btn-outline'}`}>{t.label}</button>
        ))}
        <input className="input" style={{ marginLeft: 'auto', width: 240 }} placeholder="Search name / phone / city…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted, #f6f7f6)', textAlign: 'left' }}>
                {['Date', 'Name', 'Phone', 'City', 'Interested in', 'Source', 'Status', 'Follow-up', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading leads…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No leads match.</td></tr>
              ) : filtered.map(l => {
                const m = statusMeta(l.status);
                const due = l.follow_up_on && l.follow_up_on <= todayStr() && !['booked', 'not_interested', 'invalid'].includes(l.status);
                return (
                  <tr key={l.id} onClick={() => openLead(l)} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDT(leadDate(l))}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700 }}>{l.name || '—'}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{l.phone || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>{l.city || '—'}</td>
                    <td style={{ padding: '11px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.service || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>{l.source || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>{m.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: due ? '#b91c1c' : 'var(--text-muted)', fontWeight: due ? 800 : 500 }}>
                      {l.follow_up_on ? new Date(l.follow_up_on + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}{due ? ' · due' : ''}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{l.notes ? '📝' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead drawer / modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '86vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.15rem' }}>{selected.name || 'Lead'}</h2>
              <button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>
              {fmtDT(leadDate(selected))}{selected.phone ? <> · <a href={`tel:+91${selected.phone}`} style={{ color: 'var(--forest)', fontWeight: 700 }}>{selected.phone}</a> · <a href={`https://wa.me/91${selected.phone}`} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 700 }}>WhatsApp</a></> : null}
            </div>

            {/* Status buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {STATUSES.map(s => (
                <button key={s.key}
                  onClick={() => updateMut.mutate({ id: selected.id, body: { status: s.key } })}
                  disabled={updateMut.isPending}
                  className="btn btn-sm"
                  style={{ background: selected.status === s.key ? s.color : s.bg, color: selected.status === s.key ? '#fff' : s.color, fontWeight: 700, border: 'none' }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Follow-up + notes */}
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Follow-up date</label>
              <input type="date" className="input" value={editFollowUp} onChange={e => setEditFollowUp(e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Notes</label>
              <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Called at 4pm, asked to call back tomorrow…" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 18 }}
              disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({ id: selected.id, body: { notes: editNotes, follow_up_on: editFollowUp || null } }, { onSuccess: () => toast.success('Saved') })}>
              Save notes & follow-up
            </button>

            {/* Everything from the sheet */}
            {rawFields.length > 0 && (
              <div style={{ background: 'var(--bg-muted, #f6f7f6)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>From the sheet</div>
                {rawFields.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px dashed var(--border)', fontSize: '0.82rem' }}>
                    <span style={{ minWidth: 140, color: 'var(--text-muted)', fontWeight: 600 }}>{k}</span>
                    <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
