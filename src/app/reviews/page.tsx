'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.reviews({ status: statusFilter || undefined, page, limit: 20 });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load reviews'); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateReview = async (id: number, status: string, admin_notes?: string) => {
    try {
      await AdminAPI.updateReview(id, { status, admin_notes });
      toast.success(`Review ${status}`);
      fetchReviews();
    } catch { toast.error('Failed to update review'); }
  };

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Reviews</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {total} total reviews
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.85rem' }}
        >
          <option value="">All Status</option>
          <option value="pending">🟡 Pending</option>
          <option value="approved">🟢 Approved</option>
          <option value="rejected">🔴 Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No reviews found</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{r.customer?.name || 'Unknown'}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: r.status === 'approved' ? 'rgba(34,197,94,0.1)' : r.status === 'pending' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', color: r.status === 'approved' ? '#22c55e' : r.status === 'pending' ? '#eab308' : '#ef4444' }}>
                      {r.status}
                    </span>
                  </div>
                  <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: '2px' }}>{stars(r.rating)}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{r.rating}/5</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {r.booking && <div>Booking: {r.booking.booking_number}</div>}
                  {r.gardener && <div>Gardener: {r.gardener.name}</div>}
                  <div>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {r.comment && (
                <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.75rem', fontStyle: 'italic' }}>"{r.comment}"</p>
              )}
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => updateReview(r.id, 'approved')} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✓ Approve
                  </button>
                  <button onClick={() => updateReview(r.id, 'rejected')} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
          <span style={{ padding: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
