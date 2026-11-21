'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

type PanelUser = {
  id: number; name: string; phone: string; email?: string;
  role: string; is_active: boolean; permissions?: Record<string, boolean> | null; last_login?: string;
};

const ROLE_META: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  admin:      { label: 'Super Admin',      desc: 'Full access to everything, including roles & settings', color: '#7c2d12', bg: '#ffedd5' },
  supervisor: { label: 'Operations',       desc: 'Field ops: assigned jobs, gardeners, attendance',        color: '#1d4ed8', bg: '#dbeafe' },
  accounts:   { label: 'Accounting',       desc: 'Payments, invoices, finance reports & exports',          color: '#15803d', bg: '#dcfce7' },
  sales:      { label: 'Sales',            desc: 'Leads, follow-ups, customers and bookings',              color: '#b45309', bg: '#fef3c7' },
  business:   { label: 'Business Manager', desc: 'Read-only business dashboards and summaries',            color: '#7c3aed', bg: '#ede9fe' },
};
const ACTION_LABEL: Record<string, string> = { view: 'View', manage: 'Manage', export: 'Export' };

const fmtDT = (v?: string) => {
  if (!v) return 'Never';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'users' | 'matrix'>('users');
  const [modal, setModal] = useState<'create' | PanelUser | null>(null);
  const [form, setForm] = useState<any>({});
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: usersData, isLoading } = useQuery({ queryKey: ['panel-users'], queryFn: AdminAPI.panelUsers });
  const users: PanelUser[] = Array.isArray(usersData) ? (usersData as any) : [];

  const { data: cfg } = useQuery({ queryKey: ['rbac-config'], queryFn: AdminAPI.rbacConfig });
  const catalog: { key: string; label: string }[] = (cfg as any)?.catalog || [];
  const roles: string[] = (cfg as any)?.roles || [];
  const actions: string[] = (cfg as any)?.actions || ['view', 'manage', 'export'];
  const adminOnly: string[] = (cfg as any)?.admin_only_modules || [];
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>> | null>(null);
  useEffect(() => { if ((cfg as any)?.matrix && !matrix) setMatrix((cfg as any).matrix); }, [cfg, matrix]);

  const saveUserMut = useMutation({
    mutationFn: (p: { id?: number; body: any }) => p.id ? AdminAPI.updatePanelUser(p.id, p.body) : AdminAPI.createPanelUser(p.body),
    onSuccess: () => { toast.success('Saved'); setModal(null); qc.invalidateQueries({ queryKey: ['panel-users'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const saveMatrixMut = useMutation({
    mutationFn: () => AdminAPI.saveRbacConfig(matrix),
    onSuccess: () => { toast.success('Permissions saved — applies within 30 seconds'); qc.invalidateQueries({ queryKey: ['rbac-config'] }); qc.invalidateQueries({ queryKey: ['rbac-me'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCell = (role: string, module: string, action: string) => {
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      next[role] = next[role] || {};
      const acts: string[] = next[role][module] || [];
      next[role][module] = acts.includes(action) ? acts.filter((a: string) => a !== action) : [...acts, action];
      if (!next[role][module].length) delete next[role][module];
      return next;
    });
  };

  const openCreate = () => { setForm({ name: '', phone: '', email: '', password: '', role: 'sales' }); setModal('create'); };
  const openEdit = (u: PanelUser) => { setForm({ name: u.name, email: u.email || '', role: u.role, password: '' }); setModal(u); };

  const card: React.CSSProperties = { background: '#fff', borderRadius: 20, border: '1px solid var(--border)' };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Team &amp; Roles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            Staff accounts, their roles, and what each role can see and do. Permissions are enforced on the server for every request.
          </p>
        </div>
        {tab === 'users'
          ? <button className="btn btn-primary" onClick={openCreate}>+ Add staff member</button>
          : <button className="btn btn-primary" onClick={() => saveMatrixMut.mutate()} disabled={saveMatrixMut.isPending || !matrix}>Save permissions</button>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('users')}>Staff accounts ({users.length})</button>
        <button className={`btn btn-sm ${tab === 'matrix' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('matrix')}>Role permissions</button>
      </div>

      {tab === 'users' ? (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted, #f6f7f6)', textAlign: 'left' }}>
                  {['Name', 'Phone', 'Role', 'Last login', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : users.map(u => {
                  const m = ROLE_META[u.role] || ROLE_META.sales;
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)', opacity: u.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700 }}>{u.name}{u.email ? <div style={{ fontWeight: 500, fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div> : null}</td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{u.phone}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>{m.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDT(u.last_login)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', color: u.is_active ? '#15803d' : '#b91c1c' }}>{u.is_active ? 'Active' : 'Deactivated'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)} style={{ marginRight: 6 }}>Edit</button>
                        {u.is_active
                          ? <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Deactivate ${u.name}? They will no longer be able to log in; their history stays.`) && saveUserMut.mutate({ id: u.id, body: { is_active: false } })}>Deactivate</button>
                          : <button className="btn btn-sm btn-primary" onClick={() => saveUserMut.mutate({ id: u.id, body: { is_active: true } })}>Reactivate</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Baseline per role — <strong>View</strong> opens the section, <strong>Manage</strong> allows create/edit/approve, <strong>Export</strong> allows downloads.
            Super Admin always has everything; Operations (supervisors) keep their existing field-ops access. Team, Settings and Audit stay Super-Admin-only.
          </p>
          {matrix && roles.map(role => {
            const m = ROLE_META[role] || ROLE_META.sales;
            return (
              <div key={role} style={{ ...card, padding: 18, marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ background: m.bg, color: m.color, fontWeight: 800, fontSize: '0.8rem', borderRadius: 999, padding: '5px 14px' }}>{m.label}</span>
                  <span style={{ marginLeft: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.desc}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.66rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section</th>
                        {actions.map(a => <th key={a} style={{ padding: '6px 14px', fontSize: '0.66rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{ACTION_LABEL[a] || a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.filter(mod => !adminOnly.includes(mod.key)).map(mod => {
                        const acts: string[] = matrix[role]?.[mod.key] || [];
                        return (
                          <tr key={mod.key} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{mod.label}</td>
                            {actions.map(a => (
                              <td key={a} style={{ padding: '7px 14px', textAlign: 'center' }}>
                                <input type="checkbox" checked={acts.includes(a)} onChange={() => toggleCell(role, mod.key, a)} style={{ width: 16, height: 16, accentColor: 'var(--forest)', cursor: 'pointer' }} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Create / edit staff modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 16 }}>{modal === 'create' ? 'Add staff member' : `Edit ${(modal as PanelUser).name}`}</h2>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Name *</label>
              <input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} />
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Mobile number (login ID) *</label>
                <input className="input" inputMode="numeric" maxLength={10} value={form.phone || ''} onChange={e => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </div>
            )}
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Email (optional)</label>
              <input className="input" value={form.email || ''} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Role *</label>
              <select className="input" value={form.role || 'sales'} onChange={e => f('role', e.target.value)}>
                {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{ROLE_META[form.role]?.desc}</p>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>{modal === 'create' ? 'Password *' : 'New password (leave blank to keep current)'}</label>
              <input className="input" type="text" value={form.password || ''} onChange={e => f('password', e.target.value)} placeholder="min 6 characters" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={saveUserMut.isPending}
                onClick={() => {
                  if (modal === 'create') saveUserMut.mutate({ body: form });
                  else saveUserMut.mutate({ id: (modal as PanelUser).id, body: { name: form.name, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) } });
                }}>
                {modal === 'create' ? 'Create account' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
