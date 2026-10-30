'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminAddonsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-addons'], queryFn: AdminAPI.addons });
  const rawItems: any = data; const allItems: any[] = Array.isArray(rawItems) ? rawItems : Array.isArray(rawItems?.items) ? rawItems.items : [];
  // Delete is a soft-delete on the backend (is_active = false) so past bookings keep
  // their add-on history — show inactive ones greyed out with a Restore option.
  const items = [...allItems].sort((a, b) => Number(b.is_active !== false) - Number(a.is_active !== false));
  const saveMut = useMutation({ mutationFn: () => modal.id ? AdminAPI.updateAddon(modal.id, form) : AdminAPI.createAddon(form), onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-addons'] }); }, onError: (e: any) => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: (id: number) => AdminAPI.deleteAddon(id), onSuccess: () => { toast.success('Add-on removed — it no longer shows to customers'); qc.invalidateQueries({ queryKey: ['admin-addons'] }); }, onError: (e: any) => toast.error(e.message) });
  const restoreMut = useMutation({ mutationFn: (item: any) => AdminAPI.updateAddon(item.id, { name: item.name, price: item.price, description: item.description || undefined, duration_mins: item.duration_mins || undefined, is_active: true }), onSuccess: () => { toast.success('Add-on restored'); qc.invalidateQueries({ queryKey: ['admin-addons'] }); }, onError: (e: any) => toast.error(e.message) });
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><h1 className="page-title">Add-Ons</h1><button onClick={() => { setForm({name:'',description:'',price:'',duration_mins:''}); setModal({new:true}); }} className="btn btn-primary">+ New Add-On</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {isLoading?Array(4).fill(null).map((_,i)=><div key={i} className="skeleton" style={{height:160,borderRadius:20}}/>):items.map((item:any)=>(
          <div key={item.id} style={{background:'#fff',borderRadius:20,padding:'20px',border:'1px solid var(--border)',opacity:item.is_active===false?0.55:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
              <h3 style={{fontWeight:700,fontSize:'0.95rem'}}>{item.name}</h3>
              {item.is_active===false&&<span style={{fontSize:'0.68rem',fontWeight:700,color:'#991b1b',background:'#fee2e2',borderRadius:999,padding:'3px 10px',whiteSpace:'nowrap'}}>Removed</span>}
            </div>
            {item.description&&<p style={{fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.6,marginBottom:10}}>{item.description}</p>}
            <div style={{fontSize:'1.6rem',fontWeight:900,color:'var(--forest)',marginBottom:14}}>+₹{item.price?.toLocaleString('en-IN')}</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => { setForm({...item}); setModal(item); }} className="btn btn-sm btn-outline" style={{flex:1}}>Edit</button>
              {item.is_active===false
                ? <button onClick={()=>restoreMut.mutate(item)} disabled={restoreMut.isPending} className="btn btn-sm btn-primary">Restore</button>
                : <button onClick={()=>window.confirm('Remove this add-on? Customers will no longer see it; past bookings keep it.')&&deleteMut.mutate(item.id)} disabled={deleteMut.isPending} className="btn btn-sm btn-danger">Del</button>}
            </div>
          </div>
        ))}
      </div>
      {modal&&(<div className="modal-overlay" onClick={()=>setModal(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
        <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:20}}>{modal.new?'New Add-On':'Edit Add-On'}</h2>
        <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Name *</label><input className="input" value={form.name||''} onChange={e=>f('name',e.target.value)} /></div>
        <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Description</label><textarea className="input" value={form.description||''} onChange={e=>f('description',e.target.value)} rows={2} style={{resize:'vertical'}} /></div>
        <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Price (₹) *</label><input type="number" className="input" value={form.price||''} onChange={e=>f('price',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Duration (mins)</label><input type="number" className="input" value={form.duration_mins||''} onChange={e=>f('duration_mins',e.target.value)} /></div></div>
        <div style={{display:'flex',gap:10,marginTop:8}}><button onClick={()=>setModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary" style={{flex:2}}>Save</button></div>
      </div></div>)}
    </AdminLayout>
  );
}