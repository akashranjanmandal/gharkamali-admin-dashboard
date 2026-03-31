'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconCreditCard, IconUser, IconCalendar, IconCheck, IconAlertCircle } from '@tabler/icons-react';

export default function PaymentsAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-payments', page, search, status, dateFrom, dateTo], 
    queryFn: () => AdminAPI.allPayments({ 
      page, 
      search: search || undefined, 
      status: status || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined
    }) 
  });
  const payments: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const handleExport = () => {
    const exportData = payments.map(p => ({
      TxnID: p.txn_id || 'N/A',
      Customer: p.user?.name,
      Phone: p.user?.phone,
      Amount: p.amount,
      Purpose: p.payment_for?.replace(/_/g, ' '),
      Status: p.status,
      Type: p.payment_type,
      Date: p.created_at
    }));
    exportToCSV(exportData, `Payments_${new Date().toISOString().split('T')[0]}`);
  };

  const STATUS_BADGE: Record<string, string> = {
    success: 'badge-forest', 
    pending: 'badge-gold', 
    failure: 'badge-danger',
    cancelled: 'badge-outline'
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Transactions Audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full history of payments, wallet top-ups, and marketplace charges</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export Report
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search Txn ID or customer name…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>-</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(null).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j)=><td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>)}</tr>)
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No transactions found.</td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--forest)' }}>{p.txn_id || 'N/A'}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.user?.name || 'Unknown User'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {p.user?.phone}</div>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '0.95rem' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.82rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>{p.payment_for?.replace(/_/g, ' ')}</td>
                    <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-outline'}`}>{p.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-xs btn-ghost">Details</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button>
        </div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Transaction Audit</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 24, padding: 24, background: 'var(--bg)', borderRadius: 20 }}>
                <IconCreditCard size={40} style={{ color: 'var(--forest)', marginBottom: 12 }} />
                <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>₹{parseFloat(selected.amount).toLocaleString('en-IN')}</div>
                <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-outline'}`} style={{ textTransform: 'uppercase' }}>{selected.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TXN ID</span>
                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 800 }}>{selected.txn_id || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CUSTOMER</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{selected.user?.name} (+91 {selected.user?.phone})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PURPOSE</span>
                  <span style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{selected.payment_for?.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>METHOD</span>
                  <span style={{ fontSize: '0.82rem', textTransform: 'uppercase' }}>{selected.payment_method || 'PAYU'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TIMESTAMP</span>
                  <span style={{ fontSize: '0.82rem' }}><IconCalendar size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> {new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' })}</span>
                </div>
                {selected.gateway_response && (
                  <div style={{ marginTop: 8, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.72rem', fontFamily: 'monospace', maxHeight: 100, overflow: 'auto' }}>
                    <strong>Gateway Response:</strong> {JSON.stringify(selected.gateway_response)}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'success' ? (
                <button className="btn btn-forest" style={{ gap: 6 }}><IconCheck size={16} /> Receipt View</button>
              ) : (
                <button className="btn btn-danger-outline" style={{ gap: 6 }}><IconAlertCircle size={16} /> Refund Request</button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
