'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Doughnut, Bar } from 'react-chartjs-2';
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
  const [configMode, setConfigMode] = useState<'private' | 'link'>('private');
  const [sheetUrl, setSheetUrl] = useState('');
  const [webappUrl, setWebappUrl] = useState('');
  // Shared secret between our backend and the Apps Script on the sheet.
  // Editable: if the sheet already has a script with its own TOKEN (e.g. the
  // WhatsApp-bot bridge), paste that value here instead.
  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem('gkm_leads_token');
      if (saved) return saved;
      const t = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('gkm_leads_token', t);
      return t;
    } catch { return 'gkm-' + Math.random().toString(36).slice(2, 12); }
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: AdminAPI.leads,
    refetchInterval: 120_000, // keep it live — backend re-syncs from the sheet
  });
  const leads: Lead[] = Array.isArray((data as any)?.leads) ? (data as any).leads : [];
  const sync = (data as any)?.sync;
  const liveSheetUrl: string = (data as any)?.sheet_url || '';
  const connection: string = (data as any)?.connection || '';

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
    mutationFn: (cfg: { sheet_url?: string; webapp_url?: string; token?: string }) => AdminAPI.saveLeadsConfig(cfg),
    onSuccess: () => { toast.success('Connected — syncing now'); setShowConfig(false); setSheetUrl(''); setWebappUrl(''); qc.invalidateQueries({ queryKey: ['admin-leads'] }); },
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Live from the lead sheet — refreshes every 2 minutes.{' '}
              {sync?.at ? <>Last sync {fmtDT(new Date(sync.at).toISOString())}{sync.ok === false ? '' : ` · ${sync.total} rows`}.</> : null}</span>
            {connection && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                background: connection === 'private' ? '#dcfce7' : '#fef3c7',
                color: connection === 'private' ? '#15803d' : '#b45309',
              }}>{connection === 'private' ? '🔒 Private connection' : 'Link-shared sheet'}</span>
            )}
            {liveSheetUrl && <a href={liveSheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)', fontWeight: 700 }}>Open sheet ↗</a>}
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
          <div style={{ fontWeight: 700, marginBottom: 10 }}>How the panel reads the lead sheet</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button className={`btn btn-sm ${configMode === 'private' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setConfigMode('private')}>Private sheet (recommended)</button>
            <button className={`btn btn-sm ${configMode === 'link' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setConfigMode('link')}>Link-shared sheet</button>
          </div>

          {configMode === 'private' ? (
            <div style={{ fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text-2)' }}>
              <p style={{ marginBottom: 10 }}>
                The sheet stays <strong>fully private</strong> — no link sharing at all. A tiny script on the sheet
                hands the rows only to our server, which must present this secret token. One-time setup (~3 minutes):
              </p>
              <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <li>Open the lead sheet → <strong>Extensions → Apps Script</strong>.</li>
                <li>Delete whatever is in the editor and paste this, then save:
                  <pre style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: '0.72rem', lineHeight: 1.5, overflowX: 'auto', margin: '8px 0', userSelect: 'all' }}>
{`const TOKEN = '${token}';
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return ContentService.createTextOutput('unauthorized');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheets()[0];
  if (p.gid) {
    const hit = ss.getSheets().filter(function (s) { return String(s.getSheetId()) === String(p.gid); });
    if (hit.length) sheet = hit[0];
  }
  return ContentService.createTextOutput(
    JSON.stringify({ values: sheet.getDataRange().getDisplayValues() })
  ).setMimeType(ContentService.MimeType.JSON);
}`}
                  </pre>
                </li>
                <li><strong>Deploy → New deployment → Web app</strong>, set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>, click Deploy and authorise.</li>
                <li>Copy the Web App URL (ends in <code>/exec</code>) and paste it here:</li>
              </ol>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: '0.76rem', color: '#92400e', marginBottom: 12 }}>
                <strong>Sheet already has a script?</strong> (e.g. the WhatsApp-bot bridge) — do NOT delete it. Add only the
                <code> doGet </code> function from above into the existing script (skip the <code>const TOKEN</code> line — it
                already has one), put that script&apos;s existing TOKEN value in the Access token box below, and re-deploy via
                <strong> Deploy → Manage deployments → ✎ → New version</strong> so the URL n8n uses stays the same.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 2, minWidth: 280 }} placeholder="https://script.google.com/macros/s/…/exec" value={webappUrl} onChange={e => setWebappUrl(e.target.value)} />
                <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Access token (TOKEN in the script)" value={token} onChange={e => { setToken(e.target.value); try { localStorage.setItem('gkm_leads_token', e.target.value); } catch {} }} />
                <button className="btn btn-primary" onClick={() => configMut.mutate({ webapp_url: webappUrl.trim(), token: token.trim() })} disabled={configMut.isPending || !webappUrl.trim() || token.trim().length < 8}>
                  {configMut.isPending ? 'Connecting…' : 'Connect privately'}
                </button>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Once connected, you can switch the sheet&apos;s sharing back to <strong>Restricted</strong>. "Anyone" on the
                deployment only means the script URL doesn&apos;t need a Google login — it still refuses anyone without the token,
                and the sheet itself is never shared.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
              <p style={{ marginBottom: 10 }}>
                Simplest option, but the sheet must be shared as <strong>Anyone with the link → Viewer</strong>, so anyone who
                ever gets the link can read it. Prefer the private option for lead data.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 1, minWidth: 280 }} placeholder={liveSheetUrl || 'https://docs.google.com/spreadsheets/d/…'} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
                <button className="btn btn-primary" onClick={() => configMut.mutate({ sheet_url: sheetUrl.trim() })} disabled={configMut.isPending || !sheetUrl.trim()}>Connect</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI row — value in ink, identity carried by the dot, not the number */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total leads', value: counts.all, dot: '#03411a' },
          { label: 'New', value: counts.new, dot: '#2563eb' },
          { label: 'Contacted', value: counts.contacted, dot: '#b45309' },
          { label: 'Follow-ups due', value: followUpsDue, dot: '#7c3aed', alert: followUpsDue > 0 },
          { label: 'Booked', value: counts.booked, dot: '#15803d' },
          { label: 'Conversion', value: `${conversion}%`, dot: '#15803d', sub: `${counts.booked || 0} of ${counts.all || 0} booked` },
        ].map((k: any) => (
          <div key={k.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: k.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: k.alert ? '#b91c1c' : 'var(--text)', marginTop: 4, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{k.value ?? 0}</div>
            {k.sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <style>{`
        .leads-charts { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
        @media (min-width: 1020px) { .leads-charts { grid-template-columns: 3fr 2fr; } }
      `}</style>
      <div className="leads-charts">
        {/* Daily volume — thin rounded bars, one hue, recessive grid */}
        <div style={{ ...card, minWidth: 0 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Leads per day</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Last 30 days · {perDay.values.reduce((s, v) => s + v, 0)} leads</div>
          <div style={{ height: 240 }}>
            <Bar
              data={{
                labels: perDay.labels,
                datasets: [{
                  data: perDay.values, backgroundColor: '#03411a',
                  borderRadius: { topLeft: 3, topRight: 3 }, borderSkipped: 'bottom' as const,
                  barPercentage: 0.62, categoryPercentage: 0.9, maxBarThickness: 18,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1c1f1c', titleFont: { size: 11 }, bodyFont: { size: 12, weight: 'bold' as const },
                    padding: 10, cornerRadius: 8, displayColors: false,
                    callbacks: { label: (c: any) => `${c.parsed.y} lead${c.parsed.y === 1 ? '' : 's'}` },
                  },
                },
                scales: {
                  x: { grid: { display: false }, border: { color: 'rgba(0,0,0,0.08)' }, ticks: { maxTicksLimit: 7, maxRotation: 0, font: { size: 10 }, color: '#8a8f8a' } },
                  y: { beginAtZero: true, border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0, maxTicksLimit: 5, font: { size: 10 }, color: '#8a8f8a' } },
                },
              }}
            />
          </div>
        </div>

        {/* Pipeline — donut with centre total + HTML legend with counts */}
        <div style={{ ...card, minWidth: 0 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Pipeline</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Where every lead stands</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0, margin: '0 auto' }}>
              <Doughnut
                data={{
                  labels: STATUSES.filter(s => counts[s.key] > 0).map(s => s.label),
                  datasets: [{
                    data: STATUSES.filter(s => counts[s.key] > 0).map(s => counts[s.key]),
                    backgroundColor: STATUSES.filter(s => counts[s.key] > 0).map(s => s.color),
                    borderColor: '#fff', borderWidth: 2, hoverOffset: 4,
                  }],
                }}
                options={{
                  maintainAspectRatio: false, cutout: '70%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1c1f1c', padding: 10, cornerRadius: 8, displayColors: false,
                      callbacks: { label: (c: any) => `${c.label}: ${c.parsed} (${counts.all ? Math.round((c.parsed / counts.all) * 100) : 0}%)` },
                    },
                  },
                }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{counts.all}</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 3 }}>Leads</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STATUSES.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', opacity: counts[s.key] ? 1 : 0.4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--text-2)', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{counts[s.key] || 0}</span>
                  <span style={{ width: 38, textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>
                    {counts.all ? Math.round(((counts[s.key] || 0) / counts.all) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sources — thin horizontal bars, labels in ink, one hue */}
      {topGroups.labels.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>{topGroups.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {topGroups.labels.map((label, i) => {
              const max = Math.max(...topGroups.values, 1);
              const v = topGroups.values[i];
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 150, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{label}</span>
                  <div style={{ flex: 1, height: 14, background: 'rgba(0,0,0,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max((v / max) * 100, 2)}%`, height: '100%', background: '#03411a', borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ width: 34, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
