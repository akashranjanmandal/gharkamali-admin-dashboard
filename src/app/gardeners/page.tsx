'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconUser, IconStar, IconMapPin, IconCalendar, IconBriefcase, IconCash, IconBuildingBank, IconPhone } from '@tabler/icons-react';

export default function AdminGardenersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gardeners', filter, page, search],
    queryFn: () => AdminAPI.gardeners({ status: filter === 'all' ? undefined : filter, page, limit: 20, search: search || undefined }),
  });

  const { data: gardenerDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-gardener-detail', selectedId],
    queryFn: () => selectedId ? AdminAPI.gardenerDetail(selectedId) : null,
    enabled: !!selectedId
  });

  const { data: supervisorsRaw } = useQuery({ queryKey: ['admin-supervisors'], queryFn: AdminAPI.supervisors });
  const supervisors: any[] = Array.isArray(supervisorsRaw) ? supervisorsRaw : [];

  const [supervisorId, setSupervisorId] = useState<string>('');

  const gardenersRaw: any[] = (data as any)?.gardeners ?? [];
  const total = (data as any)?.total ?? gardenersRaw.length;
  const pages = Math.ceil(total / 20);

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => AdminAPI.updateGardener(id, data),
    onSuccess: () => { toast.success('Profile updated'); qc.invalidateQueries({ queryKey: ['admin-gardeners'] }); qc.invalidateQueries({ queryKey: ['admin-gardener-detail', selectedId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) => AdminAPI.approveGardener(id, approved),
    onSuccess: (_, { approved }) => { toast.success(approved ? 'Gardener approved!' : 'Gardener rejected'); qc.invalidateQueries({ queryKey: ['admin-gardeners'] }); setSelectedId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteGardener(id),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Gardener deleted');
      qc.invalidateQueries({ queryKey: ['admin-gardeners'] });
      setConfirmDelete(null);
      setSelectedId(null);
    },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleExport = () => {
    const exportData = gardenersRaw.map(g => ({
      ID: g.id,
      Name: g.name,
      Phone: g.phone,
      Experience: g.gardenerProfile?.experience_years || 0,
      Rating: g.gardenerProfile?.avg_rating || 5.0,
      Jobs: g.gardenerProfile?.completed_jobs || 0,
      Earnings: g.gardenerProfile?.total_earnings || 0,
      Status: !g.is_approved ? 'Pending' : g.is_active ? 'Active' : 'Inactive'
    }));
    exportToCSV(exportData, `Gardeners_${new Date().toISOString().split('T')[0]}`);
  };

  const FILTERS = ['all', 'active', 'pending', 'inactive'];

  const statusBadge = (g: any) => {
    if (!g.is_approved) return <span className="badge badge-yellow">Pending</span>;
    if (g.is_active) return <span className="badge badge-green">Active</span>;
    return <span className="badge badge-gray">Inactive</span>;
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gardeners</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total service partners</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export Report
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', flex: 1, minWidth: 260, display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search by name or phone…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`btn btn-sm ${filter === f ? 'btn-forest' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Gardener</th><th>Phone</th><th>Experience</th><th>Jobs</th><th>Rating</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {isLoading ? Array(6).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>)}</tr>) :
                gardenersRaw.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No gardeners found</td></tr> :
                gardenersRaw.map((g: any) => (
                  <tr key={g.id} onClick={() => setSelectedId(g.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--forest)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {g.profile_image ? <img src={g.profile_image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : g.name?.[0]}
                        </div>
                        <div style={{ fontWeight: 700 }}>{g.name}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>+91 {g.phone}</td>
                    <td style={{ fontSize: '0.82rem' }}>{g.gardenerProfile?.experience_years ?? 0} yrs</td>
                    <td style={{ fontWeight: 600 }}>{g.gardenerProfile?.completed_jobs ?? 0}</td>
                    <td>{g.gardenerProfile?.rating ? <span style={{ fontWeight: 700 }}>{Number(g.gardenerProfile.rating).toFixed(1)} ★</span> : '—'}</td>
                    <td>{statusBadge(g)}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(g.id); }}>View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button>
        </div>}
      </div>

      {selectedId && (
        <div className="modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Partner Profile</h3>
              <button className="modal-close" onClick={() => setSelectedId(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              {isDetailLoading ? <div className="skeleton" style={{ height: 400, width: '100%', borderRadius: 12 }} /> : gardenerDetail ? (
                <div>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'center' }}>
                    <div style={{ width: 90, height: 90, borderRadius: 28, background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', fontWeight: 800, overflow: 'hidden' }}>
                      {gardenerDetail.profile_image ? <img src={gardenerDetail.profile_image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : gardenerDetail.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{gardenerDetail.name}</h2>
                        {statusBadge(gardenerDetail)}
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}><IconPhone size={17} /> +91 {gardenerDetail.phone}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}><IconBriefcase size={17} /> {gardenerDetail.gardenerProfile?.experience_years ?? 0} Years Experience</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}><IconCalendar size={17} /> Joined {new Date(gardenerDetail.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    <div className="card" style={{ padding: 16, textAlign: 'center', border: 'none', background: 'var(--bg)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Completed</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{gardenerDetail.gardenerProfile?.completed_jobs ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', border: 'none', background: 'var(--bg)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Rating</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-dark)' }}>{gardenerDetail.gardenerProfile?.rating ? Number(gardenerDetail.gardenerProfile.rating).toFixed(1) : '5.0'} ★</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', border: 'none', background: 'var(--bg)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Earnings</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--forest)' }}>₹{(gardenerDetail.gardenerProfile?.total_earnings ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', border: 'none', background: 'var(--bg)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Available</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{gardenerDetail.gardenerProfile?.is_available ? 'YES' : 'NO'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>Biometric & Details</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Working City</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gardenerDetail.city || 'Noida'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned Zones</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gardenerDetail.gardenerProfile?.zones?.map((z: any) => z.name).join(', ') || 'Global'}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border)', marginTop: 10, paddingTop: 14 }}>
                           <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--forest)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Assign Supervisor</label>
                           <div style={{ display: 'flex', gap: 8 }}>
                             <select className="input" style={{ flex: 1, height: 38, fontSize: '0.85rem' }} value={supervisorId || gardenerDetail.gardenerProfile?.supervisor_id || ''} onChange={e => setSupervisorId(e.target.value)}>
                               <option value="">No Supervisor Assigned</option>
                               {supervisors.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                             </select>
                             <button className="btn btn-sm btn-forest" onClick={() => updateMut.mutate({ id: gardenerDetail.id, data: { supervisor_id: supervisorId } })} disabled={updateMut.isPending || (supervisorId === (gardenerDetail.gardenerProfile?.supervisor_id?.toString() || ''))}>Update</button>
                           </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>Financial info</h4>
                      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <IconBuildingBank size={18} style={{ color: 'var(--forest)' }} />
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Bank Account Details</div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 4 }}>A/C: {gardenerDetail.gardenerProfile?.bank_account || 'XXXXXXXXXXXX'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 4 }}>IFSC: {gardenerDetail.gardenerProfile?.bank_ifsc || 'XXXX000XXXX'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{gardenerDetail.gardenerProfile?.bank_name || 'Bank of India'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Partner details not found</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedId(null)}>Close</button>
              {!gardenerDetail?.is_approved ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-danger-outline" onClick={() => approveMut.mutate({ id: gardenerDetail?.id, approved: false })} disabled={approveMut.isPending}>Reject</button>
                  <button className="btn btn-forest" onClick={() => approveMut.mutate({ id: gardenerDetail?.id, approved: true })} disabled={approveMut.isPending}>Approve Partner</button>
                </div>
              ) : (
                <button className="btn btn-danger-ghost" onClick={() => setConfirmDelete(gardenerDetail)}>Delete Profile</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ color: '#dc2626' }}>⚠️ Delete Gardener</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 16 }}>Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong>?</p>
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: 14, fontSize: '0.85rem', color: '#991b1b' }}> This action cannot be undone. All history, earnings, and zone assignments will be lost. </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} className="btn btn-danger" disabled={deleteMut.isPending}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
