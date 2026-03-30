'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminGardenersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gardeners', filter, page, search],
    queryFn: () => AdminAPI.gardeners({ status: filter === 'all' ? undefined : filter, page, limit: 20, search: search || undefined }),
  });

  const gardeners: any[] = (data as any)?.gardeners ?? [];
  const total = (data as any)?.total ?? gardeners.length;
  const pages = Math.ceil(total / 20);

  const approveMut = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) => AdminAPI.approveGardener(id, approved),
    onSuccess: (_, { approved }) => { toast.success(approved ? 'Gardener approved!' : 'Gardener rejected'); qc.invalidateQueries({ queryKey: ['admin-gardeners'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteGardener(id),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Gardener deleted');
      qc.invalidateQueries({ queryKey: ['admin-gardeners'] });
      setConfirmDelete(null);
    },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const FILTERS = ['all', 'active', 'pending', 'inactive'];

  const statusBadge = (g: any) => {
    if (!g.is_approved) return <span className="badge badge-yellow">Pending</span>;
    if (g.is_active) return <span className="badge badge-green">Active</span>;
    return <span className="badge badge-gray">Inactive</span>;
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gardeners</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total gardeners</p>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name or phone…"
            style={{ width: 220, marginBottom: 0 }}
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Search</button>
          {search && (
            <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>
          )}
        </form>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 14, marginBottom: 20, width: 'fit-content', border: '1px solid var(--border)' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
            padding: '7px 16px', borderRadius: 10, border: 'none',
            background: filter === f ? 'var(--forest)' : 'transparent',
            color: filter === f ? '#fff' : 'var(--text-muted)',
            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Poppins', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Gardener</th>
                <th>Phone</th>
                <th>Zone</th>
                <th>Exp.</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(null).map((_, i) => (
                    <tr key={i}><td colSpan={8}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>
                  ))
                : gardeners.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No gardeners found</td></tr>
                  : gardeners.map((g: any) => (
                      <tr key={g.id}>
                        {/* Avatar + Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, overflow: 'hidden' }}>
                              {g.profile_image ? <img src={g.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : g.name?.[0]}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{g.name}</div>
                          </div>
                        </td>
                        <td>+91 {g.phone}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{g.gardenerProfile?.zones?.[0]?.name ?? '—'}</td>
                        <td style={{ fontSize: '0.82rem' }}>{g.gardenerProfile?.experience_years ?? 0} yrs</td>
                        <td>{g.gardenerProfile?.avg_rating ? <span style={{ fontWeight: 700 }}>{Number(g.gardenerProfile.avg_rating).toFixed(1)} ★</span> : '—'}</td>
                        <td>{statusBadge(g)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {g.created_at && new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {!g.is_approved && (
                              <>
                                <button onClick={() => approveMut.mutate({ id: g.id, approved: true })} disabled={approveMut.isPending} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(22,163,74,0.1)', color: '#14532d', border: 'none', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Approve</button>
                                <button onClick={() => approveMut.mutate({ id: g.id, approved: false })} disabled={approveMut.isPending} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(220,38,38,0.08)', color: 'var(--error)', border: 'none', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Reject</button>
                              </>
                            )}
                            <button
                              onClick={() => setConfirmDelete(g)}
                              style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1.5px solid rgba(220,38,38,0.2)', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ color: '#dc2626' }}>⚠️ Delete Gardener</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0, overflow: 'hidden' }}>
                  {confirmDelete.profile_image ? <img src={confirmDelete.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : confirmDelete.name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{confirmDelete.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>+91 {confirmDelete.phone}</div>
                </div>
              </div>
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.5 }}>
                <strong>This action is permanent and cannot be undone.</strong><br />
                All profile data and zone assignments will be deleted. If this gardener has active/pending bookings, deletion will be blocked — reassign them first.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                style={{ padding: '10px 20px', borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: deleteMut.isPending ? 0.6 : 1 }}
              >
                {deleteMut.isPending ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
