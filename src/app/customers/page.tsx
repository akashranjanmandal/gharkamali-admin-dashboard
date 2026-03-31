'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconUser, IconMail, IconPhone, IconWallet, IconCalendar, IconMapPin } from '@tabler/icons-react';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-customers', search, page, dateFrom, dateTo], 
    queryFn: () => AdminAPI.customers({ 
      search: search || undefined, 
      page, 
      limit: 20,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined
    }) 
  });

  const { data: customerDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-customer-detail', selectedId],
    queryFn: () => selectedId ? AdminAPI.customerDetail(selectedId) : null,
    enabled: !!selectedId
  });

  const customersRaw: any[] = (data as any)?.customers ?? [];
  
  // Client-side "all columns" filtering
  const customers = customersRaw.filter(c => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.id?.toString().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  const total = (data as any)?.total ?? customers.length;
  const pages = Math.ceil(total / 20);

  const handleExport = () => {
    const exportData = customers.map(c => ({
      ID: c.id,
      Name: c.name,
      Phone: c.phone,
      Email: c.email,
      Bookings: c.total_bookings,
      TotalSpent: c.total_spent,
      Wallet: c.wallet_balance,
      Joined: c.created_at
    }));
    exportToCSV(exportData, `Customers_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Customers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} registered customers</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Joined From:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Bookings</th><th>Total Spent</th><th>Wallet</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>) :
                customers.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No customers found</td></tr> :
                customers.map((c: any) => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.email || '—'}</div></td>
                    <td style={{ fontWeight: 500 }}>+91 {c.phone}</td>
                    <td style={{ fontWeight: 600, color: 'var(--forest)' }}>{c.total_bookings ?? 0}</td>
                    <td style={{ fontWeight: 700 }}>₹{(c.total_spent ?? 0).toLocaleString('en-IN')}</td>
                    <td>₹{(c.wallet_balance ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{c.created_at && new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>Details</button></td>
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
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Customer Profile</h3>
              <button className="modal-close" onClick={() => setSelectedId(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              {isDetailLoading ? <div className="skeleton" style={{ height: 300, width: '100%', borderRadius: 12 }} /> : customerDetail ? (
                <div>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>
                      {customerDetail.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{customerDetail.name}</h2>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <IconPhone size={16} /> +91 {customerDetail.phone}
                        </div>
                        {customerDetail.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <IconMail size={16} /> {customerDetail.email}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <IconCalendar size={16} /> Joined {new Date(customerDetail.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Bookings</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--forest)' }}>{customerDetail.total_bookings ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Total Spent</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{(customerDetail.total_spent ?? 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Wallet Balance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-dark)' }}>₹{(customerDetail.wallet_balance ?? 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {customerDetail.address && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Primary Address</h4>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                        <IconMapPin size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
                        <div style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{customerDetail.address}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Activity History</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity details available for this customer view.</p>
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Customer details not found</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedId(null)}>Close</button>
              <button className="btn btn-primary">Edit Customer</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
