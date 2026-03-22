'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reassignModal, setReassignModal] = useState<any>(null);
  const [gardenerId, setGardenerId] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['admin-bookings', status, page, search], queryFn: () => AdminAPI.bookings({ status: status||undefined, page, limit: 20, search: search||undefined }) });
  const { data: gardenersRaw } = useQuery({ queryKey: ['admin-gardeners-list'], queryFn: () => AdminAPI.gardeners({ status: 'active', limit: 100 }) });
  const bookings: any[] = (data as any)?.items ?? Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];
  const total = (data as any)?.total ?? bookings.length;
  const pages = Math.ceil(total / 20);
  const rawGard: any = gardenersRaw; const gardeners: any[] = Array.isArray(rawGard?.items) ? rawGard.items : Array.isArray(rawGard) ? rawGard : [];

  const reassignMut = useMutation({
    mutationFn: () => AdminAPI.reassignBooking(reassignModal.id, parseInt(gardenerId), reason),
    onSuccess: () => { toast.success('Booking reassigned'); setReassignModal(null); setGardenerId(''); setReason(''); qc.invalidateQueries({ queryKey: ['admin-bookings'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const STATUS_OPTS = ['','pending','assigned','en_route','arrived','in_progress','completed','cancelled','failed'];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Bookings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total bookings</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <input type="text" placeholder="Search booking # or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none', appearance: 'none', minWidth: 160 }}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s ? s.replace(/_/g,' ') : 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking #</th><th>Customer</th><th>Gardener</th><th>Zone</th><th>Date</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_,i)=><tr key={i}><td colSpan={8}><div className="skeleton skel-text" style={{width:'100%'}}/></td></tr>) :
                bookings.length === 0 ? <tr><td colSpan={8} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No bookings found</td></tr> :
                bookings.map((b:any) => (
                  <tr key={b.id}>
                    <td><span style={{fontWeight:700,color:'var(--forest)',fontFamily:'monospace',fontSize:'0.82rem'}}>{b.booking_number}</span></td>
                    <td><div style={{fontWeight:600,fontSize:'0.85rem'}}>{b.customer?.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>+91 {b.customer?.phone}</div></td>
                    <td>{b.gardener ? <div><div style={{fontWeight:600,fontSize:'0.85rem'}}>{b.gardener.name}</div></div> : <span style={{color:'var(--text-faint)',fontSize:'0.8rem'}}>Unassigned</span>}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{b.zone?.name ?? '—'}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{b.scheduled_date && new Date(b.scheduled_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    <td><span className={`badge badge-${b.status==='completed'?'green':b.status==='cancelled'||b.status==='failed'?'red':b.status==='pending'?'yellow':'blue'}`}>{b.status?.replace(/_/g,' ')}</span></td>
                    <td style={{fontWeight:700}}>₹{b.total_amount?.toLocaleString('en-IN')}</td>
                    <td>
                      {!['completed','cancelled','failed'].includes(b.status) && (
                        <button onClick={() => setReassignModal(b)} className="btn btn-sm btn-outline" style={{fontSize:'0.75rem'}}>Reassign</button>
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
            <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:6}}>Reassign Booking</h2>
            <p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginBottom:20}}>{reassignModal.booking_number} · Current: {reassignModal.gardener?.name ?? 'Unassigned'}</p>
            <div className="form-group">
              <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Select New Gardener *</label>
              <select value={gardenerId} onChange={e=>setGardenerId(e.target.value)}
                style={{width:'100%',padding:'9px 12px',background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:10,fontFamily:'Poppins',fontSize:'0.875rem',outline:'none',appearance:'none'}}>
                <option value="">Choose a gardener…</option>
                {gardeners.map((g:any)=><option key={g.id} value={g.id}>{g.name} — {g.zone?.name ?? 'No zone'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Reason (optional)</label>
              <input className="input" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Original gardener called sick" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setReassignModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
              <button onClick={()=>reassignMut.mutate()} disabled={!gardenerId||reassignMut.isPending} className="btn btn-primary" style={{flex:2,opacity:(!gardenerId||reassignMut.isPending)?0.6:1}}>{reassignMut.isPending?'Reassigning…':'Confirm Reassign'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
