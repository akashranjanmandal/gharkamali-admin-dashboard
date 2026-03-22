'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminComplaintsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('open');
  const [modal, setModal] = useState<any>(null);
  const [resolution, setResolution] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['admin-complaints', status], queryFn: () => AdminAPI.complaints({ status: status||undefined }) });
  const complaints: any[] = (data as any)?.items ?? Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];

  const resolveMut = useMutation({
    mutationFn: () => AdminAPI.updateComplaint(modal.id, { status: 'resolved', resolution_notes: resolution }),
    onSuccess: () => { toast.success('Complaint resolved'); setModal(null); setResolution(''); qc.invalidateQueries({ queryKey: ['admin-complaints'] }); },
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
            <thead><tr><th>Customer</th><th>Type</th><th>Priority</th><th>Booking</th><th>Filed</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading?Array(5).fill(null).map((_,i)=><tr key={i}><td colSpan={6}><div className="skeleton skel-text"/></td></tr>):
                complaints.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No {status} complaints</td></tr>:
                complaints.map((c:any)=>(
                  <tr key={c.id}>
                    <td><div style={{fontWeight:600,fontSize:'0.875rem'}}>{c.customer?.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>+91 {c.customer?.phone}</div></td>
                    <td style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{c.type?.replace(/_/g,' ')}</td>
                    <td><span className={`badge ${PRIORITY_COLOR[c.priority]||'badge-gray'}`}>{c.priority}</span></td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)',fontFamily:'monospace'}}>{c.booking?.booking_number||'—'}</td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{c.created_at&&new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    <td>{status!=='resolved'&&status!=='closed'&&<button onClick={()=>{setModal(c);setResolution('');}} className="btn btn-sm btn-outline">Resolve</button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:8}}>Resolve Complaint</h2>
            <p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginBottom:20}}>{modal.type?.replace(/_/g,' ')} · {modal.customer?.name}</p>
            <div style={{padding:'12px 14px',background:'var(--bg)',borderRadius:12,marginBottom:20,fontSize:'0.875rem'}}>{modal.description}</div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Resolution Notes *</label><textarea className="input" rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe how you resolved this..." style={{resize:'vertical'}} /></div>
            <div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>resolveMut.mutate()} disabled={!resolution.trim()||resolveMut.isPending} className="btn btn-primary" style={{flex:2}}>{resolveMut.isPending?'Resolving…':'Mark Resolved'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
