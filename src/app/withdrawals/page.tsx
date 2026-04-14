'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

type WithdrawalRequest = {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  bank_account: string;
  bank_ifsc: string;
  bank_name: string;
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
  gardener?: { id: number; name: string; phone: string; city: string };
  processor?: { id: number; name: string };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(234,179,8,0.1)', color: '#eab308' },
  approved: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  processed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
};

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.withdrawals({ status: statusFilter || undefined, page, limit: 20 });
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load withdrawal requests'); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: number, status: string) => {
    const notes = status === 'rejected' ? prompt('Reason for rejection:') : undefined;
    setProcessingId(id);
    try {
      await AdminAPI.updateWithdrawal(id, { status, admin_notes: notes });
      toast.success(`Withdrawal ${status}`);
      fetchData();
    } catch { toast.error('Failed to update withdrawal'); }
    setProcessingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Payout / Withdrawals</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage gardener withdrawal requests — {total} total
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.85rem' }}
        >
          <option value="">All Status</option>
          <option value="pending">🟡 Pending</option>
          <option value="approved">🔵 Approved</option>
          <option value="processed">🟢 Processed</option>
          <option value="rejected">🔴 Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No withdrawal requests found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ID', 'Gardener', 'Phone', 'Amount', 'Bank', 'IFSC', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>#{r.id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>{r.gardener?.name || '—'}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{r.gardener?.phone || '—'}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#22c55e' }}>₹{Number(r.amount).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{r.bank_name}<br/>{r.bank_account}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.bank_ifsc}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button disabled={processingId === r.id} onClick={() => handleAction(r.id, 'approved')} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: processingId === r.id ? 0.5 : 1 }}>Approve</button>
                          <button disabled={processingId === r.id} onClick={() => handleAction(r.id, 'processed')} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: processingId === r.id ? 0.5 : 1 }}>Process</button>
                          <button disabled={processingId === r.id} onClick={() => handleAction(r.id, 'rejected')} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: processingId === r.id ? 0.5 : 1 }}>Reject</button>
                        </div>
                      )}
                      {r.status !== 'pending' && r.processor && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {r.processor.name}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
