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
  const items: any[] = Array.isArray(data as any) ? (data as any) : [];
  const saveMut = useMutation({ mutationFn: () => modal.id ? AdminAPI.updatePlan(modal.id, form) : AdminAPI.createPlan(form), onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-plans'] }); }, onError: (e: any) => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: (id: number) => AdminAPI.deletePlan(id), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-plans'] }); }, onError: (e: any) => toast.error(e.message) });
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const features = Array.isArray(form.features) ? form.features : [];

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Service Plans</h1></div><button onClick={() => { setForm({name:'',tagline:'',features:[],plan_type:'subscription',price:'',visits_per_month:'',max_plants:'',duration_days:'30',weekend_surge_price:0}); setModal({new:true}); }} className="btn btn-primary">+ New Plan</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {isLoading?Array(4).fill(null).map((_,i)=><div key={i} className="skeleton" style={{height:180,borderRadius:20}}/>):items.map((item:any)=>(
          <div key={item.id} style={{background:'#fff',borderRadius:20,padding:'22px',border:'1px solid var(--border)'}}>
            <span className={`badge ${item.plan_type==='subscription'?'badge-green':'badge-yellow'}`}>{item.plan_type}</span>
            <h3 style={{fontWeight:700,fontSize:'1rem',margin:'12px 0 6px'}}>{item.name}</h3>
             <div style={{fontSize:'1.8rem',fontWeight:900,color:'var(--forest)',marginBottom:8}}>₹{item.price?.toLocaleString('en-IN')}<span style={{fontSize:'0.8rem',fontWeight:500,color:'var(--text-muted)'}}>{item.plan_type==='subscription'?'/mo':'/visit'}</span></div>
             <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:4}}>{item.visits_per_month} visits/mo · {item.max_plants} plants max</div>
             {item.tagline && <div style={{fontSize:'0.72rem',color:'var(--forest)',fontWeight:600,marginBottom:8}}>{item.tagline}</div>}
             {item.features && Array.isArray(item.features) && item.features.length > 0 && (
               <div style={{margin:'12px 0',padding:'10px',background:'rgba(11,61,46,0.04)',borderRadius:12}}>
                 {item.features.map((feat:string,idx:number)=>(
                   <div key={idx} style={{fontSize:'0.7rem',display:'flex',alignItems:'center',gap:6,marginBottom:4,color:'var(--text-2)'}}>
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                     {feat}
                   </div>
                 ))}
               </div>
             )}
             {item.plan_type === 'subscription' && (
               <div style={{fontSize:'0.72rem',fontWeight:600,color:'var(--err)',marginBottom:16,display:'flex',alignItems:'center',gap:4}}>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                 Weekend Surge: ₹{item.weekend_surge_price || 0}
               </div>
             )}
             {!item.plan_type.includes('subscription') && <div style={{marginBottom:16}} />}
            <div style={{display:'flex',gap:8}}><button onClick={() => { setForm({...item}); setModal(item); }} className="btn btn-sm btn-outline" style={{flex:1}}>Edit</button><button onClick={()=>window.confirm('Delete?')&&deleteMut.mutate(item.id)} className="btn btn-sm btn-danger">Del</button></div>
          </div>
        ))}
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.new?'New Plan':'Edit Plan'}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input className="input" value={form.name||''} onChange={e=>f('name',e.target.value)} /></div>
              <div className="form-group"><label>Tagline (e.g. Billed monthly · Cancel anytime)</label><input className="input" value={form.tagline||''} onChange={e=>f('tagline',e.target.value)} /></div>
              <div className="form-group">
                <label>Features (One item per line)</label>
                <textarea className="input" rows={4} style={{resize:'vertical'}} value={features.join('\n')} onChange={e=>f('features', e.target.value.split('\n').filter(s=>s.trim()))} placeholder="Example:&#10;8 expert visits/month&#10;Up to 10 plants&#10;Live GPS tracking" />
              </div>
              <div className="form-group"><label>Type</label><select className="input" value={form.plan_type||'subscription'} onChange={e=>f('plan_type',e.target.value)} style={{appearance:'none'}}><option value="subscription">Subscription</option><option value="ondemand">On-Demand</option></select></div>
              <div className="form-row"><div className="form-group"><label>Price (₹)</label><input type="number" className="input" value={form.price||''} onChange={e=>f('price',e.target.value)} /></div><div className="form-group"><label>Visits / Month</label><input type="number" className="input" value={form.visits_per_month||''} onChange={e=>f('visits_per_month',e.target.value)} /></div></div>
              <div className="form-row"><div className="form-group"><label>Max Plants</label><input type="number" className="input" value={form.max_plants||''} onChange={e=>f('max_plants',e.target.value)} /></div><div className="form-group"><label>Duration (days)</label><input type="number" className="input" value={form.duration_days||''} onChange={e=>f('duration_days',e.target.value)} /></div></div>
              {form.plan_type === 'subscription' && (
                <div className="form-group">
                  <label>Weekend Surge Price (₹ extra per weekend visit)</label>
                  <input type="number" className="input" value={form.weekend_surge_price || 0} onChange={e=>f('weekend_surge_price', e.target.value)} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}