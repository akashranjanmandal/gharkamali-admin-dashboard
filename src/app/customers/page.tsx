'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period } from '@/components/PeriodFilter';
import { Th, useTableControls, type Col } from '@/components/TableHeader';
import { IconSearch, IconX, IconUser, IconMail, IconPhone, IconWallet, IconCalendar, IconMapPin, IconLeaf, IconStar, IconMessageCircle } from '@tabler/icons-react';

// Column definitions for header sort/filter (accessors match the cell renders).
const COLS: Col[] = [
  { key: 'customer', label: 'Customer', get: (c) => `${c.name || ''} ${c.email || ''}` },
  { key: 'phone', label: 'Phone' },
  { key: 'total_bookings', label: 'Bookings', type: 'number', get: (c) => Number(c.total_bookings ?? 0) },
  { key: 'total_spent', label: 'Total Spent', type: 'number', get: (c) => Number(c.total_spent ?? 0) },
  { key: 'wallet_balance', label: 'Wallet', type: 'number', get: (c) => Number(c.wallet_balance ?? 0) },
  { key: 'created_at', label: 'Joined', type: 'date' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const ctl = useTableControls(COLS);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search, page, period],
    queryFn: () => AdminAPI.customers({
      search: search || undefined,
      page,
      limit: 20,
      from_date: period?.from,
      to_date: period?.to
    })
  });

  const { data: customerDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-customer-detail', selectedId],
    queryFn: () => selectedId ? AdminAPI.customerDetail(selectedId) : null,
    enabled: !!selectedId
  });

  const { data: bookingDetail, isLoading: isBookingLoading } = useQuery({
    queryKey: ['admin-booking-detail', selectedBookingId],
    queryFn: () => selectedBookingId ? AdminAPI.bookingDetail(selectedBookingId) : null,
    enabled: !!selectedBookingId
  });

  const customersRaw: any[] = (data as any)?.customers || (Array.isArray(data) ? data : []);
  
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
  const pages = (data as any)?.pages ?? Math.ceil(total / 20);

  // Column-header sort + per-column filter (client-side on loaded rows).
  const rows = ctl.process(customers);

  // Export fetches EVERY customer (all pages), not just the visible 20.
  const fetchAllCustomers = () => fetchAllPages(
    (page, limit) => AdminAPI.customers({ page, limit }),
    (res: any) => res?.customers || (Array.isArray(res) ? res : []),
  );
  const mapExportRow = (c: any) => ({
    ID: c.id,
    Name: c.name,
    Phone: c.phone,
    Email: c.email,
    Bookings: c.total_bookings,
    TotalSpent: c.total_spent,
    Wallet: c.wallet_balance,
    Joined: c.created_at,
  });

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Customers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} registered customers</p>
        </div>
        <ExportButton filename="Customers" fetchAll={fetchAllCustomers} mapRow={mapExportRow} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <PeriodFilter onChange={p => { setPeriod(p); setPage(1); }} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr>{COLS.map(c => <Th key={c.key} col={c} ctl={ctl} />)}<th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>) :
                rows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No customers found</td></tr> :
                rows.map((c: any) => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.email || '—'}</div></td>
                    <td style={{ fontWeight: 500 }}>+91 {c.phone}</td>
                    <td style={{ fontWeight: 600, color: 'var(--forest)' }}>{Number(c.total_bookings ?? 0)}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(c.total_spent ?? 0).toLocaleString('en-IN')}</td>
                    <td>₹{Number(c.wallet_balance ?? 0).toLocaleString('en-IN')}</td>
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
                    <div style={{ width: 84, height: 84, borderRadius: 28, background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 800 }}>
                      {customerDetail.customer?.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{customerDetail.customer?.name}</h2>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <IconPhone size={16} /> +91 {customerDetail.customer?.phone}
                        </div>
                        {customerDetail.customer?.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <IconMail size={16} /> {customerDetail.customer?.email}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <IconCalendar size={16} /> Joined {(customerDetail.customer?.created_at || customerDetail.customer?.createdAt) && new Date(customerDetail.customer?.created_at || customerDetail.customer?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(56, 94, 82, 0.1)', color: 'var(--forest)', padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                        Referral: {customerDetail.customer?.referral_code || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Bookings</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--forest)' }}>{customerDetail.stats?.total_bookings ?? customerDetail.customer?.total_bookings ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Total Spent</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{Number(customerDetail.stats?.total_spent ?? customerDetail.customer?.total_spent ?? 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Wallet Balance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-dark)' }}>₹{Number(customerDetail.customer?.wallet_balance ?? 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {customerDetail.customer?.address && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Primary Address</h4>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                        <IconMapPin size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
                        <div style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                          {customerDetail.customer.address}, {customerDetail.customer.city} {customerDetail.customer.pincode}
                        </div>
                      </div>
                    </div>
                  )}

                  {((customerDetail.subscriptions as any[]) || []).length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Subscriptions & Visits</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {customerDetail.subscriptions.map((s: any) => {
                          const subBookings: any[] = s.bookings || [];
                          const done = subBookings.filter(b => b.status === 'completed').length;
                          const totalVisits = s.visits_total ?? s.plan?.visits_per_month ?? null;
                          const sc = s.status === 'active' ? 'green' : s.status === 'paused' ? 'yellow' : s.status === 'expired' ? 'red' : 'gray';
                          return (
                            <div key={s.id} style={{ border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                              <div style={{ padding: '14px 16px', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--forest)' }}>{s.plan?.name || 'Subscription'}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'} → {s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'} · {s.plant_count ?? 0} plants · ₹{Number(s.amount_paid ?? 0).toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--forest)', lineHeight: 1 }}>{done}{totalVisits != null && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {totalVisits}</span>}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Visits done</div>
                                  </div>
                                  <span className={`badge badge-sm badge-${sc}`}>{s.status}</span>
                                </div>
                              </div>
                              {subBookings.length === 0 ? (
                                <div style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No visits booked yet under this subscription.</div>
                              ) : (
                                <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                                  {subBookings.map(b => (
                                    <div key={b.id} onClick={() => setSelectedBookingId(b.id)}
                                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--forest-light)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                      <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>#{b.booking_number}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          {b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}{b.scheduled_time ? ` · ${b.scheduled_time}` : ''}{b.gardener ? ` · ${b.gardener.name}` : ''}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {b.rating ? <span style={{ fontSize: '0.72rem', color: 'var(--gold-deep)', fontWeight: 700 }}>★ {b.rating}</span> : null}
                                        <span className={`badge badge-sm badge-${b.status === 'completed' ? 'green' : (b.status === 'cancelled' || b.status === 'failed') ? 'red' : 'blue'}`}>{b.status?.replace(/_/g, ' ')}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Recent Activity</h4>
                    <div className="activity-list">
                      {((customerDetail.recentBookings as any[]) || []).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity details available.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {customerDetail.recentBookings.map((b: any) => (
                            <div key={b.id} onClick={() => setSelectedBookingId(b.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 14, cursor: 'pointer', border: '1.5px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--forest)'; e.currentTarget.style.background = 'var(--forest-light)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  Booking #{b.booking_number}
                                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--forest)', opacity: 0.7 }}>• Click to view</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--forest)' }}>₹{Number(b.total_amount).toLocaleString('en-IN')}</div>
                                <div style={{ fontSize: '0.65rem' }}><span className={`badge badge-sm badge-${b.status === 'completed' ? 'green' : 'blue'}`}>{b.status}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

      {/* Booking Details Modal (Synced with bookings page) */}
      {selectedBookingId && (
        <div className="modal-overlay" onClick={() => setSelectedBookingId(null)} style={{ zIndex: 1100 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>Booking <span style={{ fontFamily: 'monospace', color: 'var(--forest)' }}>#{bookingDetail?.booking_number}</span></h3>
              <button className="modal-close" onClick={() => setSelectedBookingId(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              {isBookingLoading ? <div className="skeleton" style={{ height: 400, width: '100%', borderRadius: 12 }} /> : bookingDetail ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>STATUS</div>
                      <span className={`badge badge-${bookingDetail.status === 'completed' ? 'green' : (bookingDetail.status === 'cancelled' || bookingDetail.status === 'failed') ? 'red' : 'blue'}`}>{bookingDetail.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SCHEDULED SLOT</div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconCalendar size={14} /> 
                        {new Date(bookingDetail.scheduled_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        {bookingDetail.scheduled_time && <span style={{ color: 'var(--gold-deep)' }}> at {bookingDetail.scheduled_time}</span>}
                      </div>
                    </div>
                    <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL AMOUNT</div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--forest)' }}>₹{bookingDetail.total_amount?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Customer Details</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{bookingDetail.customer?.name?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{bookingDetail.customer?.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>+91 {bookingDetail.customer?.phone}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                        <IconMapPin size={18} style={{ color: 'var(--forest)', marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: '0.85rem' }}>{bookingDetail.service_address}</div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Gardener Details</h4>
                      {bookingDetail.gardener ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconUser size={24} style={{ color: 'var(--text-muted)' }} /></div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{bookingDetail.gardener.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>+91 {bookingDetail.gardener.phone}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px 16px', border: '2px dashed var(--border)', borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No gardener assigned yet
                        </div>
                      )}
                    </div>
                  </div>

                  {(bookingDetail.addons?.length > 0 || bookingDetail.customer_notes) && (
                    <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 16 }}>
                      {bookingDetail.addons?.length > 0 && (
                        <div style={{ marginBottom: bookingDetail.customer_notes ? 16 : 0 }}>
                          <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Included Addons</h5>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {bookingDetail.addons.map((a: any, i: number) => (
                              <span key={i} className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconLeaf size={12} /> {a.name} (x{a.pivot?.quantity || 1})</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {bookingDetail.customer_notes && (
                        <div>
                          <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Customer Notes</h5>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'start', color: 'var(--text)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            <IconMessageCircle size={16} /> "{bookingDetail.customer_notes}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {bookingDetail.rating && (
                    <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 16 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Customer Feedback</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Array(5).fill(0).map((_, i) => <IconStar key={i} size={18} fill={i < bookingDetail.rating ? 'var(--gold)' : 'none'} stroke={i < bookingDetail.rating ? 'var(--gold)' : 'var(--text-muted)'} />)}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{bookingDetail.rating}/5</span>
                      </div>
                      {bookingDetail.review && <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text)' }}>{bookingDetail.review}</p>}
                    </div>
                  )}

                  <div style={{ marginTop: 24, padding: '20px 0', borderTop: '1.5px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20, letterSpacing: 1 }}>Service Activity Logs</h4>
                    <div style={{ position: 'relative', paddingLeft: 28 }}>
                      <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                      {[
                        { label: 'Booking Received', time: bookingDetail.created_at, status: 'pending' },
                        { label: 'Gardener Assigned', time: bookingDetail.assigned_at, status: 'assigned' },
                        { label: 'Out for Service', time: bookingDetail.en_route_at, status: 'en_route' },
                        { label: 'Gardener Arrived', time: bookingDetail.gardener_arrived_at, status: 'arrived' },
                        { label: 'OTP Verified / Started', time: bookingDetail.otp_verified_at || bookingDetail.started_at, status: 'in_progress' },
                        { label: 'Service Completed', time: bookingDetail.completed_at, status: 'completed' },
                        { label: 'Booking Cancelled', time: bookingDetail.status === 'cancelled' ? (bookingDetail.updated_at || bookingDetail.updatedAt) : null, status: 'cancelled' },
                        { label: 'Booking Failed', time: bookingDetail.status === 'failed' ? (bookingDetail.updated_at || bookingDetail.updatedAt) : null, status: 'failed' },
                      ].filter(e => e.time).sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map((e, index) => (
                        <div key={index} style={{ marginBottom: 18, position: 'relative' }}>
                          <div style={{ position: 'absolute', left: -25, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--forest)', border: '2.5px solid #fff', boxShadow: '0 0 0 1px var(--forest)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>{e.label}</div>
                                {e.status === 'assigned' && bookingDetail.gardener && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Assigned to {bookingDetail.gardener.name}</div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--forest)' }}>{new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(e.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Booking data not found</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedBookingId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
