'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: AdminAPI.plans });
  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];
  const saveMut = useMutation({ mutationFn: () => modal.id ? AdminAPI.updatePlan(modal.id, form) : AdminAPI.createPlan(form), onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-plans'] }); }, onError: (e: any) => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: (id: number) => AdminAPI.deletePlan(id), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-plans'] }); }, onError: (e: any) => toast.error(e.message) });
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Service Plans</h1></div><button onClick={() => { setForm({name:'',plan_type:'subscription',price:'',visits_per_month:'',max_plants:'',duration_days:'30'}); setModal({new:true}); }} className="btn btn-primary">+ New Plan</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {isLoading?Array(4).fill(null).map((_,i)=><div key={i} className="skeleton" style={{height:180,borderRadius:20}}/>):items.map((item:any)=>(
          <div key={item.id} style={{background:'#fff',borderRadius:20,padding:'22px',border:'1px solid var(--border)'}}>
            <span className={`badge ${item.plan_type==='subscription'?'badge-green':'badge-yellow'}`}>{item.plan_type}</span>
            <h3 style={{fontWeight:700,fontSize:'1rem',margin:'12px 0 6px'}}>{item.name}</h3>
            <div style={{fontSize:'1.8rem',fontWeight:900,color:'var(--forest)',marginBottom:8}}>₹{item.price?.toLocaleString('en-IN')}<span style={{fontSize:'0.8rem',fontWeight:500,color:'var(--text-muted)'}}>{item.plan_type==='subscription'?'/mo':'/visit'}</span></div>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:16}}>{item.visits_per_month} visits/mo · {item.max_plants} plants max</div>
            <div style={{display:'flex',gap:8}}><button onClick={() => { setForm({...item}); setModal(item); }} className="btn btn-sm btn-outline" style={{flex:1}}>Edit</button><button onClick={()=>window.confirm('Delete?')&&deleteMut.mutate(item.id)} className="btn btn-sm btn-danger">Del</button></div>
          </div>
        ))}
      </div>
      {modal&&(<div className="modal-overlay" onClick={()=>setModal(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
        <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:20}}>{modal.new?'New Plan':'Edit Plan'}</h2>
        <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Name *</label><input className="input" value={form.name||''} onChange={e=>f('name',e.target.value)} /></div>
        <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Type</label><select className="input" value={form.plan_type||'subscription'} onChange={e=>f('plan_type',e.target.value)} style={{appearance:'none'}}><option value="subscription">Subscription</option><option value="ondemand">On-Demand</option></select></div>
        <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Price (₹)</label><input type="number" className="input" value={form.price||''} onChange={e=>f('price',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Visits/Month</label><input type="number" className="input" value={form.visits_per_month||''} onChange={e=>f('visits_per_month',e.target.value)} /></div></div>
        <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Max Plants</label><input type="number" className="input" value={form.max_plants||''} onChange={e=>f('max_plants',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Duration Days</label><input type="number" className="input" value={form.duration_days||''} onChange={e=>f('duration_days',e.target.value)} /></div></div>
        <div style={{display:'flex',gap:10,marginTop:8}}><button onClick={()=>setModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary" style={{flex:2}}>Save</button></div>
      </div></div>)}
    </AdminLayout>
  );
}