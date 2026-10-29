'use client';
// Wallet & Cashback — the customer wallet ledger (cashback + top-ups, paise on
// the backend). Admins tune the cashback tiers/validity, make goodwill credits,
// and watch the programme's liability. Money itself only moves through payment
// fulfillment and the ledger — nothing here recalculates amounts client-side.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

const inr = (paise: any) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const TYPE_BADGE: Record<string, string> = { cashback: 'badge-green', topup: 'badge-blue', admin: 'badge-yellow', refund: 'badge-gray', migration: 'badge-gray' };

export default function WalletAdminPage() {
  const qc = useQueryClient();

  const { data: summary } = useQuery({ queryKey: ['wallet-summary'], queryFn: AdminAPI.walletSummary });
  const s: any = summary || {};
  const recent: any[] = Array.isArray(s.recent) ? s.recent : [];

  // ── Cashback config ─────────────────────────────────────────────────────────
  const { data: cfgData } = useQuery({ queryKey: ['wallet-config'], queryFn: AdminAPI.walletConfig });
  const [cfgEdit, setCfgEdit] = useState<any>(null);
  const cfg = cfgEdit ?? (cfgData as any) ?? { enabled: true, tiers: [], validity_days: 30 };
  const setTier = (i: number, k: string, v: string) => {
    const tiers = cfg.tiers.map((t: any, j: number) => (j === i ? { ...t, [k]: v } : t));
    setCfgEdit({ ...cfg, tiers });
  };
  const saveCfgMut = useMutation({
    mutationFn: () => AdminAPI.saveWalletConfig({
      enabled: cfg.enabled !== false,
      validity_days: Number(cfg.validity_days),
      tiers: cfg.tiers.map((t: any) => ({ min_order: Number(t.min_order), cashback: Number(t.cashback) })),
    }),
    onSuccess: () => { toast.success('Cashback settings saved'); setCfgEdit(null); qc.invalidateQueries({ queryKey: ['wallet-config'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Manual goodwill credit ──────────────────────────────────────────────────
  const [credit, setCredit] = useState({ phone: '', amount: '', note: '', validity_days: '' });
  const [creditBusy, setCreditBusy] = useState(false);
  const giveCredit = async () => {
    if (!credit.phone.trim() || !credit.amount || !credit.note.trim()) {
      return toast.error('Phone, amount and a note are required');
    }
    setCreditBusy(true);
    try {
      // Find the customer by phone, then credit by id.
      const found: any = await AdminAPI.customers({ search: credit.phone.trim(), limit: 5 });
      const items: any[] = found?.items || (Array.isArray(found) ? found : []);
      const exact = items.find((c: any) => String(c.phone || '').endsWith(credit.phone.trim())) || items[0];
      if (!exact) { toast.error('No customer found with that phone'); return; }
      const r: any = await AdminAPI.walletCredit({
        user_id: exact.id,
        amount: Number(credit.amount),
        note: credit.note.trim(),
        validity_days: credit.validity_days ? Number(credit.validity_days) : null,
      });
      toast.success(r?.message || 'Credited');
      setCredit({ phone: '', amount: '', note: '', validity_days: '' });
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
    } catch (e: any) { toast.error(e.message); }
    finally { setCreditBusy(false); }
  };

  const KPI = ({ label, value, sub, color }: any) => (
    <div className="card" style={{ padding: '16px 20px', flex: '1 1 180px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: color || 'var(--forest)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const fmtDate = (v: any) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <AdminLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Wallet &amp; Cashback</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Customers earn tiered cashback when an order is paid; each cashback credit expires after the validity period. Wallet money applies to their next payments automatically when they choose &ldquo;Use wallet&rdquo;.
        </p>
      </div>

      {/* Programme health */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPI label="Outstanding Balance" value={inr(s.outstanding_paise)} sub="Live liability — unspent, unexpired" color="#d97706" />
        <KPI label="Cashback Issued (All-Time)" value={inr(s.cashback_issued_paise)} />
        <KPI label="Cashback This Month" value={inr(s.cashback_month_paise)} color="#2563eb" />
        <KPI label="Redeemed (Spent)" value={inr(s.redeemed_paise)} color="#16a34a" />
        <KPI label="Expired Unused" value={inr(s.expired_unused_paise)} sub="Breakage — never owed again" color="#9ca3af" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(300px, 420px)', gap: 16, alignItems: 'start', marginBottom: 20 }}>
        {/* Cashback tiers */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 4 }}>Cashback Tiers</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            The highest tier at or below the paid order total applies. One cashback per order, credited when the payment succeeds.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
            <input type="checkbox" checked={cfg.enabled !== false} onChange={(e) => setCfgEdit({ ...cfg, enabled: e.target.checked })} />
            Cashback programme enabled
          </label>
          {(cfg.tiers || []).map((t: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 70 }}>Order ≥ ₹</span>
              <input className="input" type="number" value={t.min_order} onChange={(e) => setTier(i, 'min_order', e.target.value)} style={{ width: 110 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>→ cashback ₹</span>
              <input className="input" type="number" value={t.cashback} onChange={(e) => setTier(i, 'cashback', e.target.value)} style={{ width: 90 }} />
              <button className="btn btn-sm" style={{ color: '#dc2626' }} onClick={() => setCfgEdit({ ...cfg, tiers: cfg.tiers.filter((_: any, j: number) => j !== i) })}>✕</button>
            </div>
          ))}
          <button className="btn btn-sm" style={{ marginBottom: 14 }} onClick={() => setCfgEdit({ ...cfg, tiers: [...(cfg.tiers || []), { min_order: '', cashback: '' }] })}>+ Add tier</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cashback valid for</span>
            <input className="input" type="number" value={cfg.validity_days} onChange={(e) => setCfgEdit({ ...cfg, validity_days: e.target.value })} style={{ width: 80 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>days from the day it is added</span>
          </div>
          <button className="btn btn-primary" disabled={!cfgEdit || saveCfgMut.isPending} onClick={() => saveCfgMut.mutate()}>
            {saveCfgMut.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {/* Manual credit */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 4 }}>Give Wallet Credit</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Goodwill / compensation credit to one customer. The note is kept on the ledger entry.
          </p>
          <input className="input" placeholder="Customer phone" value={credit.phone} onChange={(e) => setCredit({ ...credit, phone: e.target.value })} style={{ width: '100%', marginBottom: 8 }} />
          <input className="input" type="number" placeholder="Amount (₹)" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} style={{ width: '100%', marginBottom: 8 }} />
          <input className="input" placeholder="Note (required — e.g. refund for visit #123)" value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} style={{ width: '100%', marginBottom: 8 }} />
          <input className="input" type="number" placeholder="Validity days (empty = never expires)" value={credit.validity_days} onChange={(e) => setCredit({ ...credit, validity_days: e.target.value })} style={{ width: '100%', marginBottom: 12 }} />
          <button className="btn btn-primary" disabled={creditBusy} onClick={giveCredit}>{creditBusy ? 'Crediting…' : 'Credit Wallet'}</button>
        </div>
      </div>

      {/* Recent ledger credits */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', fontWeight: 800 }}>Recent Wallet Credits</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Left</th><th>Expires</th><th>Note</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No wallet credits yet</td></tr>}
              {recent.map((c: any) => (
                <tr key={c.id}>
                  <td>{fmtDate(c.created_at ?? c.createdAt)}</td>
                  <td>{c.user?.name || `#${c.user_id}`}<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.user?.phone}</div></td>
                  <td><span className={`badge ${TYPE_BADGE[c.type] || 'badge-gray'}`}>{c.type}</span></td>
                  <td style={{ fontWeight: 700 }}>{inr(c.amount_paise)}</td>
                  <td>{inr(c.remaining_paise)}</td>
                  <td>{c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                  <td style={{ maxWidth: 280, fontSize: '0.78rem' }}>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
