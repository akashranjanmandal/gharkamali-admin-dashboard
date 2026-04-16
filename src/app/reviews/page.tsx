'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  IconStar, 
  IconFilter, 
  IconChevronLeft, 
  IconChevronRight, 
  IconCheck, 
  IconX, 
  IconUser, 
  IconCalendar, 
  IconGardenCart,
  IconMessageCircle,
  IconClock
} from '@tabler/icons-react';

type Review = {
  id: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  customer?: { id: number; name: string; phone: string; city: string };
  gardener?: { id: number; name: string };
  booking?: { id: number; booking_number: string };
};

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter, page],
    queryFn: () => AdminAPI.reviews({ 
      status: statusFilter || undefined, 
      page, 
      limit: 20 
    })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }: { id: number, status: string, admin_notes?: string }) => 
      AdminAPI.updateReview(id, { status, admin_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review updated successfully');
    },
    onError: () => {
      toast.error('Failed to update review');
    }
  });

  const reviews: Review[] = data?.reviews || (Array.isArray(data) ? data : []);
  const total = data?.total || (Array.isArray(data) ? data.length : 0);
  const totalPages = Math.ceil(total / 20);

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {Array(5).fill(0).map((_, i) => (
          <IconStar 
            key={i} 
            size={16} 
            fill={i < rating ? 'var(--gold)' : 'none'} 
            stroke={i < rating ? 'var(--gold)' : 'var(--text-muted)'} 
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="badge badge-green">Approved</span>;
      case 'pending': return <span className="badge badge-yellow">Pending</span>;
      case 'rejected': return <span className="badge badge-red">Rejected</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Reviews & Feedback</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {total} customer reviews across all services
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <IconFilter size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input"
              style={{ paddingLeft: 38, minWidth: 160 }}
            >
              <option value="">All Statuses</option>
              <option value="pending">🟡 Pending</option>
              <option value="approved">🟢 Approved</option>
              <option value="rejected">🔴 Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer / Date</th>
                <th>Feedback</th>
                <th>Rating</th>
                <th>Entity / Subject</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}><div className="skeleton skel-text" style={{ width: '100%' }} /></td>
                  </tr>
                ))
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No reviews found matching your criteria.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.customer?.name || 'Guest User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconCalendar size={12} />
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontStyle: r.comment ? 'italic' : 'normal', color: r.comment ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {r.comment ? `"${r.comment}"` : 'No comment provided'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {renderStars(r.rating)}
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{r.rating}/5</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {r.booking && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                            <IconGardenCart size={14} style={{ color: 'var(--forest)' }} />
                            <span>#{r.booking.booking_number}</span>
                          </div>
                        )}
                        {r.gardener && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                            <IconUser size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>{r.gardener.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            className="btn btn-xs btn-primary" 
                            title="Approve"
                            onClick={() => updateMutation.mutate({ id: r.id, status: 'approved' })}
                          >
                            <IconCheck size={14} /> Approve
                          </button>
                          <button 
                            className="btn btn-xs btn-danger" 
                            title="Reject"
                            onClick={() => updateMutation.mutate({ id: r.id, status: 'rejected' })}
                          >
                            <IconX size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconCheck size={14} /> Handled
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              className="page-btn"
            >
              <IconChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 8px' }}>
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)} 
              className="page-btn"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats Overlay (Optional - matching premium look) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 24 }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconStar size={24} />
          </div>
          <div>
            <div className="stat-label">Avg. Rating</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>4.8</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(237, 207, 135, 0.1)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconMessageCircle size={24} />
          </div>
          <div>
            <div className="stat-label">Comments</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{total}</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(37, 99, 235, 0.05)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClock size={24} />
          </div>
          <div>
            <div className="stat-label">Pending Action</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              {reviews.filter(r => r.status === 'pending').length}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
