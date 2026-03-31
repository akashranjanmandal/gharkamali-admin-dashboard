'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconCalendar, IconMapPin, IconUser, IconLeaf, IconStar, IconMessageCircle } from '@tabler/icons-react';

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reassignModal, setReassignModal] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gardenerId, setGardenerId] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-bookings', status, page, search, dateFrom, dateTo], 
    queryFn: () => AdminAPI.bookings({ 
      status: status || undefined, 
      page, 
      limit: 20, 
      search: search || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined
    }) 
  });

  const { data: bookingDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-booking-detail', selectedId],
    queryFn: () => selectedId ? AdminAPI.bookingDetail(selectedId) : null,
    enabled: !!selectedId
  });

  const { data: gardenersRaw } = useQuery({ queryKey: ['admin-gardeners-list'], queryFn: () => AdminAPI.gardeners({ status: 'active', limit: 100 }) });
  
  const bookingsRaw: any[] = (data as any)?.bookings ?? [];
  
  // Client-side "all columns" filtering
  const bookings = bookingsRaw.filter(b => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      b.booking_number?.toLowerCase().includes(term) ||
      b.customer?.name?.toLowerCase().includes(term) ||
      b.customer?.phone?.includes(term) ||
      b.gardener?.name?.toLowerCase().includes(term) ||
      b.zone?.name?.toLowerCase().includes(term) ||
      b.status?.toLowerCase().includes(term)
    );
  });

  const total = (data as any)?.total ?? bookings.length;
  const pages = Math.ceil(total / 20);
  const rawGard: any = gardenersRaw; const gardeners: any[] = Array.isArray(rawGard?.gardeners) ? rawGard.gardeners : Array.isArray(rawGard) ? rawGard : [];

  const reassignMut = useMutation({
    mutationFn: () => AdminAPI.reassignBooking(reassignModal.id, parseInt(gardenerId), reason),
    onSuccess: () => { toast.success('Booking reassigned'); setReassignModal(null); setGardenerId(''); setReason(''); qc.invalidateQueries({ queryKey: ['admin-bookings'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const STATUS_OPTS = ['', 'pending', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'failed'];

  const handleExport = () => {
    const exportData = bookings.map(b => ({
      ID: b.id,
      BookingNumber: b.booking_number,
      Customer: b.customer?.name,
      Phone: b.customer?.phone,
      Gardener: b.gardener?.name || 'Unassigned',
      Zone: b.zone?.name,
      ScheduledDate: b.scheduled_date,
      Status: b.status,
      Amount: b.total_amount,
    }));
    exportToCSV(exportData, `Bookings_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Bookings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total service bookings</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search booking # or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>-</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input" style={{ width: 'auto', minWidth: 160 }}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Booking #</th><th>Customer</th><th>Gardener</th><th>Zone</th><th>Date</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>) :
                bookings.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No bookings found</td></tr> :
                bookings.map((b: any) => (
                  <tr key={b.id} onClick={() => setSelectedId(b.id)} style={{ cursor: 'pointer' }}>
                    <td><span style={{ fontWeight: 700, color: 'var(--forest)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{b.booking_number}</span></td>
                    <td><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.customer?.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {b.customer?.phone}</div></td>
                    <td>{b.gardener ? <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.gardener.name}</div> : <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>Unassigned</span>}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{b.zone?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{b.scheduled_date && new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td><span className={`badge badge-${b.status === 'completed' ? 'green' : b.status === 'cancelled' || b.status === 'failed' ? 'red' : b.status === 'pending' ? 'yellow' : 'blue'}`}>{b.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontWeight: 700 }}>₹{b.total_amount?.toLocaleString('en-IN')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-xs btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}>View</button>
                      {!['completed', 'cancelled', 'failed'].includes(b.status) && (
                        <button onClick={(e) => { e.stopPropagation(); setReassignModal(b); }} className="btn btn-xs btn-outline">Reassign</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages>1&&<div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center',justifyContent:'center'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn btn-sm btn-ghost">← Prev</button>
          <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Page {page}/{pages}</span>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="btn btn-sm btn-ghost">Next →</button>
        </div>}
      </div>

      {/* Reassign Modal */}
      {reassignModal && (
        <div className="modal-overlay" onClick={()=>setReassignModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reassign Booking</h3>
              <button className="modal-close" onClick={()=>setReassignModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{color:'var(--text-muted)',fontSize:'0.82rem',marginBottom:16}}><span style={{fontFamily:'monospace',fontWeight:700,color:'var(--forest)'}}>{reassignModal.booking_number}</span> · Current: {reassignModal.gardener?.name ?? 'Unassigned'}</p>
              <div className="form-group">
                <label>Select New Gardener *</label>
                <select className="input" value={gardenerId} onChange={e=>setGardenerId(e.target.value)} style={{appearance:'none'}}>
                  <option value="">Choose a gardener…</option>
                  {gardeners.map((g:any)=><option key={g.id} value={g.id}>{g.name} — {g.zone?.name ?? 'No zone'}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <input className="input" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Original gardener called sick" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setReassignModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={()=>reassignMut.mutate()} disabled={!gardenerId||reassignMut.isPending} className="btn btn-primary">{reassignMut.isPending?'Reassigning…':'Confirm Reassign'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Booking Details Modal */}
      {selectedId && (
        <div className="modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>Booking <span style={{ fontFamily: 'monospace', color: 'var(--forest)' }}>#{bookingDetail?.booking_number}</span></h3>
              <button className="modal-close" onClick={() => setSelectedId(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              {isDetailLoading ? <div className="skeleton" style={{ height: 400, width: '100%', borderRadius: 12 }} /> : bookingDetail ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>STATUS</div>
                      <span className={`badge badge-${bookingDetail.status === 'completed' ? 'green' : (bookingDetail.status === 'cancelled' || bookingDetail.status === 'failed') ? 'red' : 'blue'}`}>{bookingDetail.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SCHEDULED DATE</div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><IconCalendar size={14} /> {new Date(bookingDetail.scheduled_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
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
                      <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
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
                </div>
              ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Booking data not found</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedId(null)}>Close</button>
              {bookingDetail && !['completed', 'cancelled', 'failed'].includes(bookingDetail.status) && (
                <button className="btn btn-primary" onClick={() => { setSelectedId(null); setReassignModal(bookingDetail); }}>Reassign Gardener</button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
