'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

export default function MyGardenersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [rewarding, setRewarding] = useState<any>(null);
  const [rewardForm, setRewardForm] = useState({ type: 'reward', amount: '', reason: '' });
  const [zoning, setZoning] = useState<any>(null);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['sup-gardeners', status, search, page],
    queryFn: () => SupervisorAPI.gardeners({ status, search, page, limit: 20 }),
  });
  const gardeners: any[] = (data as any)?.gardeners || [];
  const total: number = (data as any)?.total || 0;

  const { data: geofences } = useQuery({ queryKey: ['public-geofences'], queryFn: SupervisorAPI.geofences });

  const refresh = () => qc.invalidateQueries({ queryKey: ['sup-gardeners'] });

  const approveMut = useMutation({ mutationFn: (id: number) => SupervisorAPI.approveGardener(id), onSuccess: () => { toast.success('Approved'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const rejectMut  = useMutation({ mutationFn: (id: number) => SupervisorAPI.rejectGardener(id),  onSuccess: () => { toast.success('Rejected'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const toggleMut  = useMutation({ mutationFn: ({ id, is_active }: any) => SupervisorAPI.toggleGardener(id, is_active), onSuccess: () => { toast.success('Updated'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const unassignMut = useMutation({ mutationFn: (id: number) => SupervisorAPI.unassignGardener(id), onSuccess: () => { toast.success('Removed from team'); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const updateMut  = useMutation({ mutationFn: () => SupervisorAPI.updateGardener(editing.id, editForm), onSuccess: () => { toast.success('Saved'); setEditing(null); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const rewardMut  = useMutation({ mutationFn: () => SupervisorAPI.giveReward({ gardener_id: rewarding.id, type: rewardForm.type as any, amount: Number(rewardForm.amount), reason: rewardForm.reason }), onSuccess: () => { toast.success('Recorded'); setRewarding(null); setRewardForm({ type: 'reward', amount: '', reason: '' }); }, onError: (e: any) => toast.error(e.message) });
  const zonesMut   = useMutation({ mutationFn: () => SupervisorAPI.assignZones(zoning.id, selectedZones), onSuccess: () => { toast.success('Zones updated'); setZoning(null); refresh(); }, onError: (e: any) => toast.error(e.message) });

  const openEdit = (g: any) => {
    setEditForm({
      name: g.name || '', email: g.email || '', city: g.city || '',
      bio: g.gardenerProfile?.bio || '',
      experience_years: g.gardenerProfile?.experience_years || 0,
      is_available: g.gardenerProfile?.is_available ?? true,
    });
    setEditing(g);
  };
  const openZones = (g: any) => {
    setSelectedZones((g.assignedGeofences || []).map((z: any) => z.geofence?.id).filter(Boolean));
    setZoning(g);
  };

  const openDetail = async (id: number) => {
    try { const r: any = await SupervisorAPI.gardenerDetail(id); setDetail(r); }
    catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">My Gardeners</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total</p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Search name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'pending', 'active', 'inactive'].map(s => (
            <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
              className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Gardener</th><th>Phone</th><th>City</th><th>Exp</th><th>Rating</th><th>Jobs</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(4).fill(null).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton skel-text" /></td></tr>)
                : gardeners.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No gardeners. Add some from "Add Gardener".</td></tr>
                : gardeners.map((g: any) => (
                  <tr key={g.id}>
                    <td><div style={{ fontWeight: 700 }}>{g.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{g.email || '—'}</div></td>
                    <td>+91 {g.phone}</td>
                    <td>{g.city || '—'}</td>
                    <td>{g.gardenerProfile?.experience_years || 0} yr</td>
                    <td>{g.gardenerProfile?.rating ? `⭐ ${Number(g.gardenerProfile.rating).toFixed(1)}` : '—'}</td>
                    <td>{g.gardenerProfile?.completed_jobs || 0}</td>
                    <td>{g.is_approved ? <span className="badge badge-green">Active</span> : g.is_active ? <span className="badge badge-yellow">Pending</span> : <span className="badge badge-gray">Inactive</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button onClick={() => openDetail(g.id)} className="btn btn-sm btn-outline" title="View">View</button>
                        <button onClick={() => openEdit(g)} className="btn btn-sm btn-outline" title="Edit">Edit</button>
                        <button onClick={() => openZones(g)} className="btn btn-sm btn-outline" title="Zones">Zones</button>
                        <button onClick={() => setRewarding(g)} className="btn btn-sm btn-outline" title="Reward / Penalty">R/P</button>
                        {!g.is_approved && g.is_active && (
                          <>
                            <button onClick={() => approveMut.mutate(g.id)} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>Approve</button>
                            <button onClick={() => { if (confirm('Reject this gardener?')) rejectMut.mutate(g.id); }} className="btn btn-sm" style={{ background: 'var(--error)', color: '#fff', border: 'none' }}>Reject</button>
                          </>
                        )}
                        {g.is_approved && (
                          <button onClick={() => toggleMut.mutate({ id: g.id, is_active: !g.is_active })} className="btn btn-sm btn-outline">{g.is_active ? 'Deactivate' : 'Activate'}</button>
                        )}
                        <button onClick={() => { if (confirm('Remove this gardener from your team?')) unassignMut.mutate(g.id); }} className="btn btn-sm" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.15)' }}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing {total === 0 ? 0 : (page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn btn-sm btn-outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* Detail */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header"><h3>{detail.gardener?.name}</h3><button className="modal-close" onClick={() => setDetail(null)}>✕</button></div>
            <div className="modal-body">
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
                <div className="stat-card"><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total</div><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{detail.stats?.totalBookings}</div></div>
                <div className="stat-card"><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Completed</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{detail.stats?.completed}</div></div>
                <div className="stat-card"><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cancelled</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--error)' }}>{detail.stats?.cancelled}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', marginBottom: 14 }}>
                <div><div style={{ color: 'var(--text-muted)' }}>Phone</div><div style={{ fontWeight: 600 }}>+91 {detail.gardener?.phone}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Email</div><div style={{ fontWeight: 600 }}>{detail.gardener?.email || '—'}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>City</div><div style={{ fontWeight: 600 }}>{detail.gardener?.city || '—'}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Experience</div><div style={{ fontWeight: 600 }}>{detail.gardener?.gardenerProfile?.experience_years || 0} years</div></div>
              </div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>Recent Bookings</h4>
              <div style={{ fontSize: '0.82rem' }}>
                {(detail.recentBookings || []).length === 0 && <div style={{ color: 'var(--text-muted)' }}>No bookings</div>}
                {(detail.recentBookings || []).map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.booking_number}</span>
                    <span>{b.customer?.name || '—'}</span>
                    <span>{b.scheduled_date}</span>
                    <span style={{ fontWeight: 700 }}>₹{b.total_amount}</span>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header"><h3>Edit Gardener</h3><button className="modal-close" onClick={() => setEditing(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name</label><input className="input" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input className="input" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>City</label><input className="input" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                <div className="form-group"><label>Experience (yrs)</label><input className="input" type="number" value={editForm.experience_years || 0} onChange={e => setEditForm({ ...editForm, experience_years: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Bio</label><textarea className="input" rows={3} value={editForm.bio || ''} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={!!editForm.is_available} onChange={e => setEditForm({ ...editForm, is_available: e.target.checked })} />
                Available for jobs
              </label>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditing(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="btn btn-primary">{updateMut.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reward */}
      {rewarding && (
        <div className="modal-overlay" onClick={() => setRewarding(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header"><h3>Reward / Penalty — {rewarding.name}</h3><button className="modal-close" onClick={() => setRewarding(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Type</label>
                <select className="input" value={rewardForm.type} onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}>
                  <option value="reward">Reward</option>
                  <option value="penalty">Penalty</option>
                </select>
              </div>
              <div className="form-group"><label>Amount (₹)</label><input className="input" type="number" value={rewardForm.amount} onChange={e => setRewardForm({ ...rewardForm, amount: e.target.value })} /></div>
              <div className="form-group"><label>Reason</label><input className="input" value={rewardForm.reason} onChange={e => setRewardForm({ ...rewardForm, reason: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRewarding(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => { if (!rewardForm.amount) { toast.error('Enter amount'); return; } rewardMut.mutate(); }} disabled={rewardMut.isPending} className="btn btn-primary">{rewardMut.isPending ? 'Saving…' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zones */}
      {zoning && (
        <div className="modal-overlay" onClick={() => setZoning(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header"><h3>Service Zones — {zoning.name}</h3><button className="modal-close" onClick={() => setZoning(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
                {(geofences as any[] | undefined)?.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 8, fontSize: '0.85rem' }}>No zones available</div>}
                {(geofences as any[] | undefined)?.map((gf: any) => (
                  <label key={gf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', borderRadius: 8 }}>
                    <input type="checkbox" checked={selectedZones.includes(gf.id)}
                      onChange={e => setSelectedZones(prev => e.target.checked ? [...prev, gf.id] : prev.filter(id => id !== gf.id))} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gf.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{gf.city}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setZoning(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => zonesMut.mutate()} disabled={zonesMut.isPending} className="btn btn-primary">{zonesMut.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </SupervisorLayout>
  );
}
