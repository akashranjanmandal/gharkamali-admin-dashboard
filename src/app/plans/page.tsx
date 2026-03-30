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
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Service Plans</h1></div><button onClick={() => { setForm({name:'',tagline:'',price_subtitle:'Every month',plan_summary:'',button_text:'Select',features:[],plan_type:'subscription',price:'',visits_per_month:'',max_plants:'',duration_days:'30',weekend_surge_price:0,is_best_value:0}); setModal({new:true}); }} className="btn btn-primary">+ New Plan</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {isLoading?Array(4).fill(null).map((_,i)=><div key={i} className="skeleton" style={{height:180,borderRadius:20}}/>):items.map((item:any)=>(
          <div key={item.id} style={{background:'#fff',borderRadius:24,border:'1px solid var(--border)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{background:item.is_best_value?'#88a43c':'#f9f3e5',padding:'24px 20px',textAlign:'center',position:'relative'}}>
              {item.is_best_value === 1 && <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',background:'#4a5d23',color:'#fff',fontSize:'0.6rem',fontWeight:700,padding:'2px 8px',borderBottomLeftRadius:4,borderBottomRightRadius:4}}>Best Value</div>}
              <h3 style={{fontWeight:700,fontSize:'1.1rem',margin:'0 0 16px',color:item.is_best_value?'#fff':'var(--text)'}}>{item.name}</h3>
              <div style={{fontSize:'2.2rem',fontWeight:900,color:item.is_best_value?'#fff':'var(--text)',lineHeight:1}}>₹{item.price?.toLocaleString('en-IN')}</div>
              <div style={{fontSize:'0.75rem',color:item.is_best_value?'rgba(255,255,255,0.8)':'var(--text-muted)',marginTop:4}}>{item.price_subtitle || (item.plan_type==='subscription'?'Every month':'One-time')}</div>
              <div style={{fontSize:'0.82rem',fontWeight:600,color:item.is_best_value?'#fff':'var(--text)',marginTop:12}}>{item.plan_summary || `Up to ${item.max_plants} Plants`}</div>
            </div>
            <div style={{padding:20,flex:1,display:'flex',flexDirection:'column'}}>
              {item.features && Array.isArray(item.features) && (
                <div style={{margin:'0 0 20px',textAlign:'center'}}>
                  {item.features.map((feat:string,idx:number)=>(
                    <div key={idx} style={{fontSize:'0.78rem',marginBottom:8,color:'var(--text-2)',lineHeight:1.4}}>
                      {feat}
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:'auto',display:'flex',gap:8}}>
                <button onClick={() => { setForm({...item}); setModal(item); }} className="btn btn-sm btn-outline" style={{flex:1}}>Edit</button>
                <button onClick={()=>window.confirm('Delete?')&&deleteMut.mutate(item.id)} className="btn btn-sm btn-danger">Del</button>
              </div>
            </div>
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
              <div className="form-row">
                <div className="form-group"><label>Price Subtitle (e.g. Every month)</label><input className="input" value={form.price_subtitle||''} onChange={e=>f('price_subtitle',e.target.value)} /></div>
                <div className="form-group"><label>Plan Summary (e.g. Up to 20 Plants)</label><input className="input" value={form.plan_summary||''} onChange={e=>f('plan_summary',e.target.value)} /></div>
              </div>
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                <input type="checkbox" id="is_best_value" checked={form.is_best_value===1} onChange={e=>f('is_best_value',e.target.checked?1:0)} />
                <label htmlFor="is_best_value" style={{marginBottom:0,cursor:'pointer'}}>Show "Best Value" tag (Sets green theme)</label>
              </div>
              <div className="form-group">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:5}}><label style={{marginBottom:0}}>Features (One item per line)</label><button type="button" onClick={()=>f('features',['2 visits per month','Up to 20 Plants','Regular pruning','Soil aeration','Monitoring (Plant Health)','Basic pest check','Balcony cleaning','5% discount on add-ons','Additional Plants in Subscription: ₹40 per plant per month','Repotting (upto 12inch) ₹30 per plant','Repotting (above 12inch) ₹75 per plant','Perfect for Maintaining a Small Garden Balcony','1 Free Plant'])} style={{fontSize:'0.65rem',color:'var(--forest)',background:'none',border:'none',cursor:'pointer',fontWeight:600,textDecoration:'underline'}}>Load Standard Template</button></div>
                <textarea className="input" rows={6} style={{resize:'vertical'}} value={features.join('\n')} onChange={e=>f('features', e.target.value.split('\n').filter(s=>s.trim()))} placeholder="Example:&#10;8 expert visits/month&#10;Up to 10 plants&#10;Live GPS tracking" />
              </div>
              <div className="form-row">
                <div className="form-group"><label>Type</label><select className="input" value={form.plan_type||'subscription'} onChange={e=>f('plan_type',e.target.value)} style={{appearance:'none'}}><option value="subscription">Subscription</option><option value="ondemand">On-Demand</option></select></div>
                <div className="form-group"><label>Button Text</label><input className="input" value={form.button_text||'Select'} onChange={e=>f('button_text',e.target.value)} /></div>
              </div>
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