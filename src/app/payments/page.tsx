'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function PaymentsAdmin() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-payments', page], 
    queryFn: () => AdminAPI.allPayments({ page }) 
  });
  const payments: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;

  const STATUS_BADGE: Record<string, string> = {
    success: 'badge-green', 
    pending: 'badge-yellow', 
    failure: 'badge-red',
    cancelled: 'badge-gray'
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Transactions Audit</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Full history of PayU payments, wallet top-ups, and subscription charges</p>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(null).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton skel-text" /></td></tr>)
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transactions found.</td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{p.txn_id || 'N/A'}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.user?.name || 'Unknown User'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {p.user?.phone}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: p.status === 'success' ? 'var(--forest)' : 'inherit' }}>
                      ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{p.payment_for?.replace(/_/g, ' ')}</td>
                    <td>
                       <span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`}>{p.status}</span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, gap: 12 }}>
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <div style={{ alignSelf: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Page {page} of {Math.ceil(total / 20)}</div>
          <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </AdminLayout>
  );
}
