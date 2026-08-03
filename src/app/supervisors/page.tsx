'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period, inPeriod } from '@/components/PeriodFilter';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
];

const blankForm = () => ({
  name: '', phone: '', email: '', password: '',
  address: '', city: '', state: '', pincode: '',
  geofence_id: '',
  gardener_ids: [] as number[],
});

function validate(form: any, isNew: boolean): string | null {
  if (!form.name?.trim()) return 'Name is required';
  if (!/^\d{10}$/.test(form.phone || '')) return 'Phone must be exactly 10 digits';
  if (isNew && (!form.password || form.password.length < 6)) return 'Password must be at least 6 characters';
  if (!isNew && form.password && form.password.length < 6) return 'Password must be at least 6 characters';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email';
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) return 'Pincode must be 6 digits';
  return null;
}

export default function SupervisorsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>(blankForm());
  const [showPass, setShowPass] = useState(false);
  const [period, setPeriod] = useState<Period>(null);

  const { data: supervisorsData, isLoading } = useQuery({ queryKey: ['admin-supervisors'], queryFn: AdminAPI.supervisors });
  const supervisors: any[] = Array.isArray(supervisorsData as any) ? (supervisorsData as any) : [];
  const visibleSupervisors = supervisors.filter((s: any) => inPeriod(s, period));

  const { data: gardenersData } = useQuery({ queryKey: ['admin-gardeners-all'], queryFn: () => AdminAPI.gardeners({ limit: 500, status: 'active' }) });
  const allGardeners = (gardenersData as any)?.gardeners || [];

  const { data: geofencesData } = useQuery({ queryKey: ['admin-geofences-list'], queryFn: AdminAPI.geofences });
  const geofences: any[] = Array.isArray(geofencesData as any) ? (geofencesData as any) : [];

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name?.trim(),
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        geofence_id: form.geofence_id ? Number(form.geofence_id) : undefined,
        gardener_ids: form.gardener_ids,
      };
      if (form.password) payload.password = form.password;
      return modal.id ? AdminAPI.updateSupervisor(modal.id, payload) : AdminAPI.createSupervisor(payload);
    },
    onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-supervisors'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteSupervisor(id),
    onSuccess: () => { toast.success('Supervisor deleted'); qc.invalidateQueries({ queryKey: ['admin-supervisors'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const err = validate(form, !!modal?.new);
    if (err) { toast.error(err); return; }
    saveMut.mutate();
  };

  const toggleGardener = (id: number) => {
    const current = form.gardener_ids || [];
    setForm((p: any) => ({ ...p, gardener_ids: current.includes(id) ? current.filter((x: number) => x !== id) : [...current, id] }));
  };

  // Export fetches the full (non-paginated) supervisor list.
  const fetchAllSupervisors = async () => {
    const res: any = await AdminAPI.supervisors();
    return Array.isArray(res) ? res : [];
  };
  const mapExportRow = (s: any) => ({
    ID: s.id,
    Name: s.name,
    Phone: s.phone,
    Email: s.email,
    City: s.city,
    Active: s.is_active ? 'Yes' : 'No',
    Created: s.created_at,
  });

  const openNew = () => { setForm(blankForm()); setShowPass(false); setModal({ new: true }); };
  const openEdit = (s: any) => {
    setForm({
      name: s.name || '', phone: s.phone || '', email: s.email || '',
      password: '',
      address: s.address || '', city: s.city || '', state: s.state || '', pincode: s.pincode || '',
      geofence_id: s.geofence_id || '',
      gardener_ids: s.team?.map((t: any) => t.user_id) || [],
    });
    setShowPass(false);
    setModal(s);
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Supervisors</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{visibleSupervisors.length} supervisors · login uses mobile + password</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodFilter onChange={p => setPeriod(p)} />
          <ExportButton filename="Supervisors" fetchAll={fetchAllSupervisors} mapRow={mapExportRow} />
          <button onClick={openNew} className="btn btn-primary">+ New Supervisor</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Supervisor</th><th>Phone</th><th>City</th><th>Team</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(4).fill(null).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>)
                : visibleSupervisors.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>{supervisors.length === 0 ? 'No supervisors yet' : 'No supervisors in the selected period'}</td></tr>
                : visibleSupervisors.map((s: any) => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email || '—'}</div></td>
                    <td>+91 {s.phone}</td>
                    <td>{s.city || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{s.team?.map((t: any) => allGardeners.find((g: any) => g.id === t.user_id)?.name).filter(Boolean).join(', ') || '—'}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(s)} className="btn btn-sm btn-outline">Edit</button>
                        <button onClick={() => { if (confirm(`Delete supervisor "${s.name}"? Their team members will be unassigned.`)) deleteMut.mutate(s.id); }} className="btn btn-sm" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.15)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>{modal.new ? 'New Supervisor' : 'Edit Supervisor'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '0 4px' }}>
                {/* Basic Info */}
                <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Login Credentials</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input className="input" placeholder="e.g. Rajesh Kumar" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(used for login)</span></label>
                    <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg)' }}>
                      <span style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-2)', borderRight: '1.5px solid var(--border)', background: 'var(--bg-subtle)' }}>+91</span>
                      <input type="tel" inputMode="numeric" maxLength={10} placeholder="9999999999" value={form.phone}
                        onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                        style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <input type="email" className="input" placeholder="supervisor@example.com" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>{modal.new ? 'Password *' : 'New Password'} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{modal.new ? '(min 6 chars)' : '(leave blank to keep current)'}</span></label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPass ? 'text' : 'password'} className="input" placeholder={modal.new ? 'At least 6 characters' : '••••••••'} value={form.password}
                        onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} style={{ paddingRight: 38 }} />
                      <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                        {showPass
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 22, marginBottom: 12, letterSpacing: '0.05em' }}>Address (optional)</h4>
                <div className="form-group">
                  <label>Street Address</label>
                  <input className="input" placeholder="House/flat, building, area" value={form.address} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group"><label>City</label><input className="input" placeholder="e.g. Noida" value={form.city} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="form-group">
                    <label>State</label>
                    <select className="input" value={form.state} onChange={e => setForm((p: any) => ({ ...p, state: e.target.value }))}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pincode</label>
                    <input className="input" inputMode="numeric" maxLength={6} placeholder="e.g. 201301" value={form.pincode} onChange={e => setForm((p: any) => ({ ...p, pincode: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                  <div className="form-group">
                    <label>Primary Geofence</label>
                    <select className="input" value={form.geofence_id} onChange={e => setForm((p: any) => ({ ...p, geofence_id: e.target.value }))}>
                      <option value="">No geofence</option>
                      {geofences.map((g: any) => <option key={g.id} value={g.id}>{g.name} — {g.city}</option>)}
                    </select>
                  </div>
                </div>

                {/* Team */}
                <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 22, marginBottom: 12, letterSpacing: '0.05em' }}>Assign Gardeners {modal.new && <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — can be done later)</span>}</h4>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 12, padding: 8 }}>
                  {allGardeners.length === 0
                    ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: 12 }}>No active gardeners found.</p>
                    : allGardeners.map((g: any) => (
                      <div key={g.id} onClick={() => toggleGardener(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer', background: form.gardener_ids?.includes(g.id) ? 'var(--forest-light, rgba(3,65,26,0.08))' : 'transparent', borderRadius: 8, marginBottom: 4, transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={form.gardener_ids?.includes(g.id)} readOnly style={{ cursor: 'pointer' }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{g.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {g.phone}{g.city ? ` · ${g.city}` : ''}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSubmit} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : (modal.new ? 'Create Supervisor' : 'Save Changes')}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
