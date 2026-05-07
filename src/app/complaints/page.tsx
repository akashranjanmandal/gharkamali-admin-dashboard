'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminComplaintsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState('open');
  const [modal, setModal] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const { data: supervisorData } = useQuery({ queryKey: ['admin-supervisors'], queryFn: () => AdminAPI.supervisors() });
  const supervisors: any[] = Array.isArray(supervisorData) ? supervisorData : (supervisorData as any)?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', status],
    queryFn: () => AdminAPI.complaints({ status })
  });
  const complaints: any[] = (data as any)?.complaints || (Array.isArray(data) ? data : []);
  const total = (data as any)?.total ?? complaints.length;

  const updateMut = useMutation({
    mutationFn: (payload: any) => AdminAPI.updateComplaint(modal.id, payload),
    onSuccess: () => { toast.success('Complaint updated'); setModal(null); setResolution(''); qc.invalidateQueries({ queryKey: ['admin-complaints'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const STATUS_TABS = ['open','in_review','resolved','closed'];
  const PRIORITY_COLOR: Record<string,string> = { low:'badge-green', medium:'badge-yellow', high:'badge-red' };

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}><h1 className="page-title">Complaints</h1></div>
      <div style={{display:'flex',gap:4,background:'#fff',padding:4,borderRadius:14,marginBottom:20,width:'fit-content',border:'1px solid var(--border)'}}>
        {STATUS_TABS.map(s=><button key={s} onClick={()=>setStatus(s)} style={{padding:'7px 16px',borderRadius:10,border:'none',background:status===s?'var(--forest)':'transparent',color:status===s?'#fff':'var(--text-muted)',fontWeight:600,fontSize:'0.8rem',cursor:'pointer',fontFamily:'Poppins',textTransform:'capitalize'}}>{s.replace(/_/g,' ')}</button>)}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Type</th><th>Priority</th><th>Booking</th><th>Assigned To</th><th>Filed</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading?Array(5).fill(null).map((_,i)=><tr key={i}><td colSpan={7}><div className="skeleton skel-text"/></td></tr>):
                complaints.length===0?<tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No {status} complaints</td></tr>:
                complaints.map((c:any)=>(
                  <tr key={c.id}>
                    <td><div style={{fontWeight:600,fontSize:'0.875rem'}}>{c.customer?.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>+91 {c.customer?.phone}</div></td>
                    <td style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{c.type?.replace(/_/g,' ')}</td>
                    <td><span className={`badge ${PRIORITY_COLOR[c.priority]||'badge-gray'}`}>{c.priority}</span></td>
                    <td>
                      {c.booking_id ? (
                        <button
                          onClick={() => router.push(`/bookings/${c.booking_id}`)}
                          style={{background:'none',border:'1px solid var(--forest)',color:'var(--forest)',borderRadius:6,padding:'3px 10px',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',fontFamily:'monospace'}}
                        >
                          {c.booking?.booking_number || `#${c.booking_id}`}
                        </button>
                      ) : <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>—</span>}
                    </td>
                    <td style={{fontSize:'0.82rem'}}>{c.assignedTo?.name || <span style={{color:'var(--text-muted)'}}>Unassigned</span>}</td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{c.created_at&&new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    <td>
                      <button onClick={()=>{setModal(c);setResolution(c.resolution_notes||'');}} className="btn btn-sm btn-outline">Update / Resolve</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Complaint #{modal.id}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <p style={{color:'var(--text-muted)',fontSize:'0.82rem',margin:0,textTransform:'capitalize'}}>{modal.type?.replace(/_/g,' ')} · {modal.customer?.name}</p>
                {modal.booking_id && (
                  <button
                    onClick={()=>{setModal(null); router.push(`/bookings/${modal.booking_id}`);}}
                    style={{display:'inline-flex',alignItems:'center',gap:5,background:'var(--forest)',color:'#fff',border:'none',borderRadius:7,padding:'5px 12px',fontSize:'0.78rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}
                  >
                    🧾 View Order {modal.booking?.booking_number ? `· ${modal.booking.booking_number}` : `#${modal.booking_id}`}
                  </button>
                )}
              </div>
              <div style={{padding:'12px 14px',background:'var(--bg)',borderRadius:10,marginBottom:16,fontSize:'0.875rem',color:'var(--text-2)',lineHeight:1.6}}>{modal.description}</div>
              
              <div className="form-group">
                <label>Assign to Supervisor</label>
                <select 
                  className="input" 
                  value={modal.assigned_to || ''} 
                  onChange={e => updateMut.mutate({ assigned_to: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} (+91 {s.phone})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Resolution Notes</label>
                <textarea className="input" rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe how you resolved this…" style={{resize:'vertical'}} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
              <button 
                onClick={()=>updateMut.mutate({ status: 'resolved', resolution_notes: resolution })} 
                disabled={!resolution.trim()||updateMut.isPending} 
                className="btn btn-primary"
              >
                {updateMut.isPending ? 'Processing...' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
