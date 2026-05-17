'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = { pending: 'badge-yellow', assigned: 'badge-blue', in_progress: 'badge-orange', completed: 'badge-green', cancelled: 'badge-gray', failed: 'badge-red', en_route: 'badge-blue', arrived: 'badge-orange' };
  return <span className={`badge ${m[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
}

export default function MyBookingsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sup-bookings', status, page],
    queryFn: () => SupervisorAPI.bookings({ status, page, limit: 20 }),
  });
  const bookings: any[] = (data as any)?.bookings || [];
  const total: number = (data as any)?.total || 0;

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Bookings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} bookings for your team</p>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
            className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}>
            {(s || 'All').replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Booking #</th><th>Customer</th><th>Gardener</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {isLoading ? Array(4).fill(null).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton skel-text" /></td></tr>)
                : bookings.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No bookings</td></tr>
                : bookings.map((b: any) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{b.booking_number}</td>
                    <td>{b.customer?.name || '—'}<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.customer?.phone}</div></td>
                    <td>{b.gardener?.name || '—'}</td>
                    <td>{b.scheduled_date}</td>
                    <td>{b.scheduled_time || '—'}</td>
                    <td style={{ fontWeight: 700 }}>₹{b.total_amount}</td>
                    <td><StatusBadge s={b.status} /></td>
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
    </SupervisorLayout>
  );
}
