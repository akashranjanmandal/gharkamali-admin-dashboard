'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function RewardsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ gardener_id: '', type: 'reward', amount: '', reason: '', booking_id: '' });
  const { data } = useQuery({ queryKey: ['admin-rewards'], queryFn: () => AdminAPI.rewards({}) });
  const rewards: any[] = (data as any)?.items ?? Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];

  const saveMut = useMutation({
    mutationFn: () => AdminAPI.createReward({ gardener_id: parseInt(form.gardener_id), type: form.type, amount: parseFloat(form.amount), reason: form.reason, ...(form.booking_id?{booking_id:parseInt(form.booking_id)}:{}) }),
    onSuccess: () => { toast.success('Reward created!'); setModal(false); qc.invalidateQueries({ queryKey: ['admin-rewards'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Rewards & Penalties</h1></div><button onClick={()=>setModal(true)} className="btn btn-primary">+ Create Reward</button></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Gardener</th><th>Type</th><th>Amount</th><th>Reason</th><th>Booking</th><th>Date</th></tr></thead>
            <tbody>
              {rewards.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No rewards yet</td></tr>:
                rewards.map((r:any)=>(
                  <tr key={r.id}>
                    <td style={{fontWeight:600,fontSize:'0.875rem'}}>{r.gardener?.name||`ID: ${r.gardener_id}`}</td>
                    <td><span className={`badge ${r.type==='reward'?'badge-green':'badge-red'}`}>{r.type}</span></td>
                    <td style={{fontWeight:700,color:r.type==='reward'?'var(--success)':'var(--error)'}}>{r.type==='reward'?'+':'-'}₹{r.amount}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.reason}</td>
                    <td style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{r.booking?.booking_number||'—'}</td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{r.created_at&&new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:20}}>Create Reward / Penalty</h2>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Gardener ID *</label><input type="number" className="input" value={form.gardener_id} onChange={e=>setForm(p=>({...p,gardener_id:e.target.value}))} placeholder="Enter gardener user ID" /></div>
            <div className="form-row">
              <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Type</label><select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{appearance:'none'}}><option value="reward">Reward</option><option value="penalty">Penalty</option></select></div>
              <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Amount (₹) *</label><input type="number" className="input" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Reason *</label><input className="input" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="e.g. Excellent service quality" /></div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Booking ID (optional)</label><input type="number" className="input" value={form.booking_id} onChange={e=>setForm(p=>({...p,booking_id:e.target.value}))} /></div>
            <div style={{display:'flex',gap:10,marginTop:8}}><button onClick={()=>setModal(false)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending||!form.gardener_id||!form.amount||!form.reason} className="btn btn-primary" style={{flex:2}}>{saveMut.isPending?'Creating…':'Create'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
