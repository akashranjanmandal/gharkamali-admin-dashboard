'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period, inPeriod } from '@/components/PeriodFilter';

const blankForm = () => ({
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_order_amount: '', max_discount: '', usage_limit: '',
  valid_from: '', valid_to: '', is_active: true, applies_to: 'all',
});

// ISO datetime → YYYY-MM-DD for <input type="date">
const toDateInput = (v: any) => (v ? String(v).slice(0, 10) : '');
// Coupon scope (applies_to) → badge / select labels
const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All', formLabel: 'All (shop, plans & visits)' },
  { value: 'products', label: 'Products', formLabel: 'Shop products' },
  { value: 'subscription', label: 'Monthly plan', formLabel: 'Monthly plan (subscription)' },
  { value: 'booking', label: 'One-time visit', formLabel: 'One-time visit (booking)' },
];
const appliesToLabel = (v: any) => APPLIES_TO_OPTIONS.find(o => o.value === (v || 'all'))?.label || 'All';
const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null);

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>(blankForm());
  const [period, setPeriod] = useState<Period>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: AdminAPI.coupons });
  const items: any[] = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
  const visible = items.filter((c: any) => inPeriod(c, period));

  const buildPayload = () => {
    const num = (v: any) => (v === '' || v == null ? null : Number(v));
    return {
      code: (form.code || '').trim().toUpperCase(),
      description: (form.description || '').trim() || null,
      discount_type: form.discount_type,
      discount_value: num(form.discount_value),
      min_order_amount: num(form.min_order_amount),
      max_discount: num(form.max_discount),
      usage_limit: num(form.usage_limit),
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      is_active: !!form.is_active,
      applies_to: form.applies_to || 'all',
    };
  };

  const saveMut = useMutation({
    mutationFn: () => modal.id ? AdminAPI.updateCoupon(modal.id, buildPayload()) : AdminAPI.createCoupon(buildPayload()),
    onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteCoupon(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openNew = () => { setForm(blankForm()); setModal({ new: true }); };
  const openEdit = (c: any) => {
    setForm({
      code: c.code || '', description: c.description || '',
      discount_type: c.discount_type || 'percentage', discount_value: c.discount_value ?? '',
      min_order_amount: c.min_order_amount ?? '', max_discount: c.max_discount ?? '',
      usage_limit: c.usage_limit ?? '', valid_from: toDateInput(c.valid_from), valid_to: toDateInput(c.valid_to),
      is_active: c.is_active ?? true,
      applies_to: c.applies_to || 'all',
    });
    setModal(c);
  };

  // Export fetches the full (non-paginated) coupon list.
  const fetchAllCoupons = async () => {
    const res: any = await AdminAPI.coupons();
    return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
  };
  const mapExportRow = (c: any) => ({
    ID: c.id,
    Code: c.code,
    Type: c.discount_type,
    Value: c.discount_value,
    MinOrder: c.min_order_amount,
    'Applies To': appliesToLabel(c.applies_to),
    UsageCount: c.usage_count ?? 0,
    UsageLimit: c.usage_limit,
    ValidFrom: c.valid_from,
    ValidTo: c.valid_to,
    Active: c.is_active ? 'Yes' : 'No',
  });

  const discountLabel = (c: any) =>
    c.discount_type === 'percentage'
      ? `${Number(c.discount_value)}% off${c.max_discount ? ` (max ₹${Number(c.max_discount).toLocaleString('en-IN')})` : ''}`
      : `₹${Number(c.discount_value).toLocaleString('en-IN')} off`;

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Coupons</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>Discount codes customers can apply at shop checkout, on monthly plans or one-time visits.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodFilter onChange={p => setPeriod(p)} />
          <ExportButton filename="Coupons" fetchAll={fetchAllCoupons} mapRow={mapExportRow} />
          <button onClick={openNew} className="btn btn-primary">+ New Coupon</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {isLoading ? (
          Array(4).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 20 }} />)
        ) : visible.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: '#fff', borderRadius: 20, border: '1px dashed var(--border)' }}>
            {items.length === 0 ? 'No coupons yet. Create one to offer discounts at checkout.' : 'No coupons in the selected period.'}
          </div>
        ) : visible.map((c: any) => {
          const limitReached = c.usage_limit != null && c.usage_count >= c.usage_limit;
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid var(--border)', opacity: c.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--forest)', fontFamily: 'monospace' }}>{c.code}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                    {appliesToLabel(c.applies_to)}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', background: c.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.06)', color: c.is_active ? '#16a34a' : 'var(--text-muted)' }}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {c.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>{c.description}</p>}
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--forest)', marginBottom: 12 }}>{discountLabel(c)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.72rem', color: 'var(--text-2)', marginBottom: 14 }}>
                {Number(c.min_order_amount) > 0 && <div>Min order: ₹{Number(c.min_order_amount).toLocaleString('en-IN')}</div>}
                <div style={{ color: limitReached ? '#dc2626' : undefined }}>
                  Used: {c.usage_count ?? 0}{c.usage_limit != null ? ` / ${c.usage_limit}` : ' (unlimited)'}{limitReached ? ' — limit reached' : ''}
                </div>
                {(c.valid_from || c.valid_to) && (
                  <div>Valid: {fmtDate(c.valid_from) || '—'} → {fmtDate(c.valid_to) || '—'}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(c)} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Edit</button>
                <button onClick={() => window.confirm(`Delete coupon ${c.code}?`) && deleteMut.mutate(c.id)} className="btn btn-sm btn-danger">Del</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', padding: '24px 24px 28px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 20 }}>{modal.new ? 'New Coupon' : 'Edit Coupon'}</h2>

            <div className="form-group">
              <label style={lbl}>Coupon Code *</label>
              <input className="input" value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }} />
            </div>

            <div className="form-group">
              <label style={lbl}>Description</label>
              <input className="input" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Shown to admins only" />
            </div>

            <div className="form-group">
              <label style={lbl}>Applies to *</label>
              <select className="input" value={form.applies_to || 'all'} onChange={e => f('applies_to', e.target.value)}>
                {APPLIES_TO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.formLabel}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={lbl}>Discount Type *</label>
                <select className="input" value={form.discount_type} onChange={e => f('discount_type', e.target.value)}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (₹)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={lbl}>{form.discount_type === 'percentage' ? 'Percent off *' : 'Amount off (₹) *'}</label>
                <input type="number" className="input" value={form.discount_value} onChange={e => f('discount_value', e.target.value)} placeholder={form.discount_type === 'percentage' ? '10' : '100'} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={lbl}>Min order amount (₹)</label>
                <input type="number" className="input" value={form.min_order_amount} onChange={e => f('min_order_amount', e.target.value)} placeholder="0 = no minimum" />
              </div>
              <div className="form-group">
                <label style={lbl}>Max discount (₹)</label>
                <input type="number" className="input" value={form.max_discount} onChange={e => f('max_discount', e.target.value)} placeholder={form.discount_type === 'percentage' ? 'Cap (optional)' : 'N/A'} disabled={form.discount_type !== 'percentage'} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={lbl}>Total usage limit</label>
                <input type="number" className="input" value={form.usage_limit} onChange={e => f('usage_limit', e.target.value)} placeholder="Blank = unlimited" />
              </div>
              <div className="form-group">
                <label style={lbl}>Status</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={e => f('is_active', e.target.checked)} style={{ width: 16, height: 16 }} />
                  Active
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={lbl}>Valid from</label>
                <input type="date" className="input" value={form.valid_from} onChange={e => f('valid_from', e.target.value)} />
              </div>
              <div className="form-group">
                <label style={lbl}>Valid until</label>
                <input type="date" className="input" value={form.valid_to} onChange={e => f('valid_to', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setModal(null)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary" style={{ flex: 2 }}>
                {saveMut.isPending ? 'Saving…' : 'Save Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 };
