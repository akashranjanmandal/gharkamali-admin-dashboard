'use client';
// Tip Management — online-only tips (gateway-verified) and audited payouts.
// The backend ledger is the source of truth; this page never computes money
// client-side beyond formatting paise for display.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

const inr = (paise: any) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const TIP_STATUS_BADGE: Record<string, string> = { successful: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', cancelled: 'badge-gray', refunded: 'badge-red' };
const PAYOUT_BADGE: Record<string, string> = { draft: 'badge-gray', approved: 'badge-blue', processing: 'badge-yellow', paid: 'badge-green', failed: 'badge-red', cancelled: 'badge-gray' };

export default function TipsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'tips' | 'payouts' | 'settings'>('tips');
  const [status, setStatus] = useState('');
  const [gardenerId, setGardenerId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]); // tip ids for a payout draft
  const [payModal, setPayModal] = useState<any>(null);    // payout being confirmed paid
  const [payRef, setPayRef] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');

  const { data: summary } = useQuery({ queryKey: ['tip-summary'], queryFn: AdminAPI.tipSummary });
  const s: any = summary || {};

  const { data: gardenersData } = useQuery({ queryKey: ['admin-gardeners-active'], queryFn: () => AdminAPI.gardeners({ status: 'active', limit: 100 }) });
  const gardeners: any[] = (gardenersData as any)?.items || (Array.isArray(gardenersData) ? gardenersData : []);

  const { data: tipsData, isLoading } = useQuery({
    queryKey: ['admin-tips', status, gardenerId, search, page],
    queryFn: () => AdminAPI.tips({ status: status || undefined, gardener_id: gardenerId || undefined, search: search || undefined, page, limit: 20 }),
    enabled: tab === 'tips',
  });
  const tips: any[] = (tipsData as any)?.items || [];
  const pages = (tipsData as any)?.pages ?? 1;

  const { data: payoutsData } = useQuery({ queryKey: ['admin-tip-payouts'], queryFn: () => AdminAPI.tipPayouts(), enabled: tab === 'payouts' });
  const payouts: any[] = Array.isArray(payoutsData) ? payoutsData : [];

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-tips'] }); qc.invalidateQueries({ queryKey: ['admin-tip-payouts'] }); qc.invalidateQueries({ queryKey: ['tip-summary'] }); };

  const createPayoutMut = useMutation({
    mutationFn: () => AdminAPI.createTipPayout(Number(gardenerId), selected),
    onSuccess: (r: any) => { toast.success(r?.message || 'Payout draft created'); setSelected([]); refresh(); setTab('payouts'); },
    onError: (e: any) => toast.error(e.message),
  });
  const approveMut = useMutation({ mutationFn: (id: number) => AdminAPI.approveTipPayout(id), onSuccess: () => { toast.success('Payout approved'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const cancelMut = useMutation({ mutationFn: (id: number) => AdminAPI.cancelTipPayout(id), onSuccess: () => { toast.success('Payout cancelled — tips freed'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const paidMut = useMutation({
    mutationFn: () => AdminAPI.confirmTipPayoutPaid(payModal.id, { payout_reference: payRef, payment_method: payMethod }),
    onSuccess: () => { toast.success('Payout marked paid'); setPayModal(null); setPayRef(''); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reverse = async (t: any) => {
    const reason = window.prompt(`Reverse tip #${t.id} (${inr(t.amount_paise)}) — enter the reason (required, audited):`);
    if (!reason?.trim()) return;
    try { const r: any = await AdminAPI.reverseTip(t.id, reason.trim()); toast.success(r?.message || 'Reversed'); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  // Settings tab
  const { data: cfgData } = useQuery({ queryKey: ['tip-config'], queryFn: AdminAPI.tipConfig, enabled: tab === 'settings' });
  const [cfgEdit, setCfgEdit] = useState<any>(null);
  const cfg = cfgEdit ?? (cfgData as any) ?? { suggested: [], min: 10, max: 5000 };
  const saveCfgMut = useMutation({
    mutationFn: () => AdminAPI.saveTipConfig({ suggested: String(cfg.suggested).split(',').map((n: string) => parseInt(n.trim())).filter(Boolean), min: Number(cfg.min), max: Number(cfg.max) }),
    onSuccess: () => { toast.success('Tip settings saved'); setCfgEdit(null); qc.invalidateQueries({ queryKey: ['tip-config'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Export: every tip with gateway + payout references for reconciliation.
  const fetchAllTips = () => fetchAllPages((p, limit) => AdminAPI.tips({ page: p, limit }), (r: any) => r?.items || []);
  const mapExportRow = (t: any) => ({
    TipID: t.id, Date: t.verified_at ?? t.created_at ?? t.createdAt,
    Customer: t.customer?.name, CustomerPhone: t.customer?.phone,
    Gardener: t.gardener?.name, GardenerPhone: t.gardener?.phone,
    Visit: t.booking?.booking_number, 'Amount (₹)': Number(t.amount_paise || 0) / 100,
    Status: t.status, GatewayOrderID: t.gateway_order_id, GatewayPaymentID: t.gateway_payment_id || '',
    PayoutID: t.payout?.id || '', PayoutStatus: t.payout?.status || (t.status === 'successful' ? 'pending' : ''),
    PayoutReference: t.payout?.payout_reference || '',
  });

  const KPI = ({ label, value, sub, color }: any) => (
    <div className="card" style={{ padding: '16px 20px', flex: '1 1 180px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: color || 'var(--forest)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const selectable = (t: any) => t.status === 'successful' && !t.payout;
  const toggleTip = (t: any) => setSelected((prev) => prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Tip Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Online tips only — verified server-side; GharKaMali pays gardeners through audited payouts. No cash workflow exists.
          </p>
        </div>
        <ExportButton filename="Tips" fetchAll={fetchAllTips} mapRow={mapExportRow} dateField="verified_at" />
      </div>

      {/* Summary cards — straight from the ledger */}
      <div className="stack-sm" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPI label="Successful Tips" value={inr(s.successful_paise)} sub={`${s.successful_count ?? 0} verified`} />
        <KPI label="Pending Attempts" value={s.pending_attempts ?? 0} sub="Not verified — never counted" color="#d97706" />
        <KPI label="Pending Gardener Payout" value={inr(s.unallocated_paise)} sub="Verified, not yet allocated" color="#2563eb" />
        <KPI label="In-flight Payouts" value={inr(s.in_flight_paise)} sub="Draft / approved / processing" color="#9333ea" />
        <KPI label="Paid to Gardeners" value={inr(s.paid_out_paise)} sub="Confirmed payouts only" color="#16a34a" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['tips', 'payouts', 'settings'] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'tips' ? 'Tips' : t === 'payouts' ? 'Payouts' : 'Settings'}
          </button>
        ))}
      </div>

      {tab === 'tips' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" placeholder="Search customer name/phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 240 }} />
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
              <option value="">All statuses</option>
              {['successful', 'pending', 'failed', 'cancelled', 'refunded'].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select className="input" value={gardenerId} onChange={(e) => { setGardenerId(e.target.value); setPage(1); setSelected([]); }} style={{ maxWidth: 220 }}>
              <option value="">All gardeners</option>
              {gardeners.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {selected.length > 0 && gardenerId && (
              <button className="btn btn-sm btn-primary" disabled={createPayoutMut.isPending} onClick={() => createPayoutMut.mutate()}>
                {createPayoutMut.isPending ? 'Creating…' : `Create payout (${selected.length} tip${selected.length > 1 ? 's' : ''})`}
              </button>
            )}
            {selected.length > 0 && !gardenerId && <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Pick a gardener filter to create a payout</span>}
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th></th><th>Tip</th><th>Customer</th><th>Gardener</th><th>Visit</th><th>Amount</th><th>Status</th><th>Payout</th><th>Gateway Ref</th><th>Actions</th></tr></thead>
                <tbody>
                  {isLoading ? <tr><td colSpan={10}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr> :
                    !tips.length ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No tips yet</td></tr> :
                    tips.map((t: any) => (
                      <tr key={t.id}>
                        <td>{selectable(t) && (!gardenerId || Number(gardenerId) === t.gardener?.id) ? (
                          <input type="checkbox" checked={selected.includes(t.id)} onChange={() => { if (!gardenerId) setGardenerId(String(t.gardener?.id || '')); toggleTip(t); }} />
                        ) : null}</td>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem' }}>#{t.id}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {(t.verified_at ?? t.created_at) ? new Date(String(t.verified_at ?? t.created_at).replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>
                        <td><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.customer?.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.customer?.phone}</div></td>
                        <td><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.gardener?.name}</div></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.booking?.booking_number || '—'}</td>
                        <td style={{ fontWeight: 800 }}>{inr(t.amount_paise)}</td>
                        <td><span className={`badge badge-sm ${TIP_STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                        <td>{t.payout ? <span className={`badge badge-sm ${PAYOUT_BADGE[t.payout.status] || 'badge-gray'}`}>#{t.payout.id} {t.payout.status}</span> : (t.status === 'successful' ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>unallocated</span> : null)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.gateway_payment_id || t.gateway_order_id || '—'}</td>
                        <td>{t.status === 'successful' && t.payout?.status !== 'paid' && (
                          <button className="btn btn-xs btn-danger" onClick={() => reverse(t)}>Reverse</button>
                        )}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button>
            </div>}
          </div>
        </>
      )}

      {tab === 'payouts' && (
        <div className="card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Payout</th><th>Gardener</th><th>Amount</th><th>Tips</th><th>Status</th><th>Reference</th><th>Actions</th></tr></thead>
              <tbody>
                {!payouts.length ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No payouts yet — select unallocated tips on the Tips tab</td></tr> :
                  payouts.map((p: any) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{p.id}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.created_at ? new Date(String(p.created_at).replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.gardener?.name}</td>
                      <td style={{ fontWeight: 800 }}>{inr(p.amount_paise)}</td>
                      <td>{p.allocations?.length ?? 0}</td>
                      <td><span className={`badge badge-sm ${PAYOUT_BADGE[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{p.payout_reference || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {p.status === 'draft' && <button className="btn btn-xs btn-primary" onClick={() => approveMut.mutate(p.id)}>Approve</button>}
                          {['approved', 'processing'].includes(p.status) && <button className="btn btn-xs btn-primary" onClick={() => { setPayModal(p); setPayRef(''); }}>Mark Paid</button>}
                          {['draft', 'approved'].includes(p.status) && <button className="btn btn-xs btn-outline" onClick={() => window.confirm('Cancel this payout? Its tips become payable again.') && cancelMut.mutate(p.id)}>Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: 560, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Customer tip options</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Suggested amounts (₹, comma-separated)</label>
            <input className="input" value={Array.isArray(cfg.suggested) ? cfg.suggested.join(', ') : cfg.suggested}
              onChange={(e) => setCfgEdit({ ...cfg, suggested: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="form-group" style={{ margin: 0 }}><label>Minimum (₹)</label><input className="input" type="number" value={cfg.min} onChange={(e) => setCfgEdit({ ...cfg, min: e.target.value })} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Maximum (₹)</label><input className="input" type="number" value={cfg.max} onChange={(e) => setCfgEdit({ ...cfg, max: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary" disabled={!cfgEdit || saveCfgMut.isPending} onClick={() => saveCfgMut.mutate()}>
            {saveCfgMut.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Mark-paid modal — reference is mandatory, per the no-unconfirmed-paid rule */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Mark Payout #{payModal.id} Paid — {inr(payModal.amount_paise)}</h3>
              <button className="modal-close" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Bank / UPI reference *</label>
                <input className="input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / UPI txn id" style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label>Method</label>
                <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Only mark Paid after the transfer is confirmed — this is audited and the gardener sees it immediately.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!payRef.trim() || paidMut.isPending} onClick={() => paidMut.mutate()}>
                {paidMut.isPending ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
