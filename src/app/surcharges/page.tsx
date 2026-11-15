'use client';
// One-time service surcharges — admin rules that apply automatically to every
// one-time booking in the chosen zones (fixed ₹ or % of the gardening service
// charge, optional visit-date window). Customers see each as its own line.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { inr } from '@/lib/oneTimePricing';

const EMPTY = {
  name: '', reason: '', type: 'fixed' as 'fixed' | 'percentage', value: '',
  zone_scope: 'all' as 'all' | 'selected', zone_ids: [] as number[],
  starts_on: '', ends_on: '', is_active: true,
};
const STATUS_BADGE: Record<string, string> = { active: 'badge-green', scheduled: 'badge-blue', expired: 'badge-gray', disabled: 'badge-red' };
const ACTION_LABEL: Record<string, string> = { create: 'Created', update: 'Edited', enable: 'Enabled', disable: 'Disabled', delete: 'Removed' };
const fmtDate = (d?: string | null) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function SurchargesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['surcharges'], queryFn: AdminAPI.surcharges });
  const rows: any[] = Array.isArray(data) ? data : [];
  const { data: zonesData } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const zones: any[] = Array.isArray(zonesData) ? zonesData : [];
  const zoneName = (id: number) => zones.find((z) => z.id === id)?.name || `Zone #${id}`;
  const { data: audit } = useQuery({
    queryKey: ['pricing-audit', 'surcharge'],
    queryFn: () => AdminAPI.pricingAudit({ entity_type: 'surcharge', limit: 100 }),
    enabled: historyOpen,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['surcharges'] }); qc.invalidateQueries({ queryKey: ['pricing-audit'] }); };
  const close = () => { setModal(null); setForm(EMPTY); };
  const payload = () => ({
    name: form.name.trim(), reason: form.reason.trim() || null, type: form.type, value: Number(form.value),
    zone_scope: form.zone_scope, zone_ids: form.zone_scope === 'selected' ? form.zone_ids : null,
    starts_on: form.starts_on || null, ends_on: form.ends_on || null, is_active: form.is_active,
  });
  const saveMut = useMutation({
    mutationFn: () => (modal?.id ? AdminAPI.updateSurcharge(modal.id, payload()) : AdminAPI.createSurcharge(payload())),
    onSuccess: () => { toast.success(modal?.id ? 'Surcharge updated' : 'Surcharge created'); close(); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (r: any) => AdminAPI.updateSurcharge(r.id, { is_active: !r.is_active }),
    onSuccess: (_d, r: any) => { toast.success(r.is_active ? 'Surcharge switched off' : 'Surcharge switched on'); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteSurcharge(id),
    onSuccess: () => { toast.success('Surcharge removed'); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: any) => {
    setForm({
      name: r.name || '', reason: r.reason || '', type: r.type, value: String(r.value ?? ''),
      zone_scope: r.zone_scope, zone_ids: r.zone_ids || [],
      starts_on: r.starts_on ? String(r.starts_on).slice(0, 10) : '', ends_on: r.ends_on ? String(r.ends_on).slice(0, 10) : '',
      is_active: !!r.is_active,
    });
    setModal(r);
  };
  const f = (k: keyof typeof EMPTY, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const toggleZone = (id: number) => f('zone_ids', form.zone_ids.includes(id) ? form.zone_ids.filter((x) => x !== id) : [...form.zone_ids, id]);
  const valueNum = Number(form.value);
  const formError =
    !form.name.trim() ? 'Name is required'
      : !(valueNum > 0) ? 'Amount must be more than 0'
        : form.type === 'percentage' && valueNum > 100 ? 'Percentage cannot be more than 100'
          : form.zone_scope === 'selected' && !form.zone_ids.length ? 'Pick at least one zone'
            : form.starts_on && form.ends_on && form.ends_on < form.starts_on ? 'End date is before the start date'
              : null;

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Surcharges</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Extra charges added automatically to one-time gardening bookings in the zones you choose.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setHistoryOpen(true)}>Change history</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal({ new: true }); }}>+ New Surcharge</button>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: '#166534', lineHeight: 1.6 }}>
        While a surcharge is <strong>on</strong>, every new one-time booking in its zones gets it as a <strong>separate line</strong> on the website, app,
        checkout and invoice — never hidden in the service price. A percentage is taken on the gardening service charge. The date range is matched against the
        visit date. Bookings already made keep whatever they were charged.
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Surcharge</th><th>Amount</th><th>Zones</th><th>Visit dates</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>}
              {!isLoading && !rows.length && <tr><td colSpan={6} style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>No surcharges yet. Bookings are charged the normal zone price.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div style={{ fontWeight: 700 }}>{r.name}</div>{r.reason && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.reason}</div>}</td>
                  <td style={{ fontWeight: 700 }}>{r.type === 'percentage' ? `${Number(r.value)}% of service` : inr(r.value, Number(r.value) % 1 ? 2 : 0)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{r.zone_scope === 'all' ? 'All zones' : (r.zone_ids || []).map(zoneName).join(', ')}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {!r.starts_on && !r.ends_on ? 'Any date' : `${r.starts_on ? fmtDate(r.starts_on) : 'Now'} – ${r.ends_on ? fmtDate(r.ends_on) : 'no end'}`}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleMut.mutate(r)} disabled={toggleMut.isPending}>{r.is_active ? 'Switch off' : 'Switch on'}</button>{' '}
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>Edit</button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Remove surcharge "${r.name}"? New bookings stop getting it; existing bookings keep theirs.`) && deleteMut.mutate(r.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, width: '95vw' }}>
            <div className="modal-header">
              <h3>{modal.new ? 'New Surcharge' : `Edit: ${modal.name}`}</h3>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Name * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(shown to customers)</span></label>
                  <input className="input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Peak demand" maxLength={100} />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input className="input" value={form.reason} onChange={(e) => f('reason', e.target.value)} placeholder="e.g. Festive season" maxLength={255} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select className="input" value={form.type} onChange={(e) => f('type', e.target.value)}>
                    <option value="fixed">Fixed amount (₹)</option>
                    <option value="percentage">Percentage of service charge (%)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{form.type === 'percentage' ? 'Percentage *' : 'Amount (₹) *'}</label>
                  <input className="input" type="number" min="0.01" step="0.01" value={form.value} onChange={(e) => f('value', e.target.value)} placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 99'} />
                </div>
              </div>
              <div className="form-group">
                <label>Zones *</label>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, margin: 0 }}><input type="radio" checked={form.zone_scope === 'all'} onChange={() => f('zone_scope', 'all')} /> All zones</label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, margin: 0 }}><input type="radio" checked={form.zone_scope === 'selected'} onChange={() => f('zone_scope', 'selected')} /> Selected zones</label>
                </div>
                {form.zone_scope === 'selected' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {zones.map((z) => (
                      <button key={z.id} type="button" onClick={() => toggleZone(z.id)} className={`btn btn-sm ${form.zone_ids.includes(z.id) ? 'btn-primary' : 'btn-outline'}`}>
                        {z.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Visits from <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <input className="input" type="date" value={form.starts_on} onChange={(e) => f('starts_on', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Visits until <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <input className="input" type="date" value={form.ends_on} onChange={(e) => f('ends_on', e.target.value)} />
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => f('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--forest)' }} />
                Surcharge on
              </label>
              {formError && <div style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: 10 }}>⚠ {formError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={!!formError || saveMut.isPending} onClick={() => saveMut.mutate()}>
                {saveMut.isPending ? 'Saving…' : modal.new ? 'Create Surcharge' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, width: '95vw' }}>
            <div className="modal-header">
              <h3>Surcharge history</h3>
              <button className="modal-close" onClick={() => setHistoryOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {!audit && <div style={{ color: 'var(--text-muted)' }}>Loading…</div>}
              {Array.isArray(audit) && !audit.length && <div style={{ color: 'var(--text-muted)' }}>No changes recorded yet.</div>}
              {Array.isArray(audit) && audit.map((a: any) => {
                const s = a.after_value || a.before_value || {};
                return (
                  <div key={a.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.82rem' }}>{ACTION_LABEL[a.action] || a.action}: {s.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at || a.createdAt).toLocaleString('en-IN')} · {a.actor?.name || (a.actor_id ? `User #${a.actor_id}` : 'System')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.type === 'percentage' ? `${Number(s.value)}% of service` : inr(s.value)} · {s.zone_scope === 'all' ? 'All zones' : (s.zone_ids || []).map(zoneName).join(', ')}
                      {a.before_value && a.after_value && Number(a.before_value.value) !== Number(a.after_value.value) ? ` · was ${a.before_value.type === 'percentage' ? `${a.before_value.value}%` : inr(a.before_value.value)}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
