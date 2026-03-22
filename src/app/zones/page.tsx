'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

const EMPTY = { name:'',city:'',state:'',base_price:'',price_per_plant:'',min_plants:'1',radius_km:'5',center_latitude:'',center_longitude:'',is_active:true };

export default function ZonesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const { data, isLoading } = useQuery({ queryKey: ['admin-zones'], queryFn: AdminAPI.zones });
  const zones: any[] = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];

  const saveMut = useMutation({
    mutationFn: () => modal.id ? AdminAPI.updateZone(modal.id, { ...form, base_price: parseFloat(form.base_price), price_per_plant: parseFloat(form.price_per_plant), min_plants: parseInt(form.min_plants), radius_km: parseFloat(form.radius_km), center_latitude: parseFloat(form.center_latitude), center_longitude: parseFloat(form.center_longitude) }) : AdminAPI.createZone({ ...form, base_price: parseFloat(form.base_price), price_per_plant: parseFloat(form.price_per_plant), min_plants: parseInt(form.min_plants), radius_km: parseFloat(form.radius_km), center_latitude: parseFloat(form.center_latitude), center_longitude: parseFloat(form.center_longitude) }),
    onSuccess: () => { toast.success(modal.id ? 'Zone updated' : 'Zone created'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-zones'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = useMutation({ mutationFn: (id: number) => AdminAPI.deleteZone(id), onSuccess: () => { toast.success('Zone deleted'); qc.invalidateQueries({ queryKey: ['admin-zones'] }); }, onError: (e: any) => toast.error(e.message) });

  const openNew = () => { setForm(EMPTY); setModal({ new: true }); };
  const openEdit = (z: any) => { setForm({ name:z.name,city:z.city,state:z.state,base_price:z.base_price,price_per_plant:z.price_per_plant,min_plants:z.min_plants,radius_km:z.radius_km,center_latitude:z.center_latitude,center_longitude:z.center_longitude,is_active:z.is_active }); setModal(z); };
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Service Zones</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{zones.length} zones configured</p></div><button onClick={openNew} className="btn btn-primary">+ New Zone</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {isLoading?Array(4).fill(null).map((_,i)=><div key={i} className="skeleton" style={{height:180,borderRadius:20}}/>):
          zones.map((z:any)=>(
            <div key={z.id} style={{background:'#fff',borderRadius:20,padding:'22px',border:`1px solid ${z.is_active?'var(--border)':'rgba(220,38,38,0.2)'}`,position:'relative',opacity:z.is_active?1:0.75}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div><h3 style={{fontWeight:700,fontSize:'1rem'}}>{z.name}</h3><div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>{z.city}, {z.state}</div></div>
                <span className={`badge ${z.is_active?'badge-green':'badge-red'}`}>{z.is_active?'Active':'Off'}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {[{l:'Base Price',v:`₹${z.base_price}`},{l:'Per Plant',v:`₹${z.price_per_plant}`},{l:'Min Plants',v:z.min_plants},{l:'Radius',v:`${z.radius_km}km`}].map(s=>(
                  <div key={s.l} style={{background:'var(--bg)',borderRadius:10,padding:'8px 10px'}}><div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{s.l}</div><div style={{fontWeight:700,fontSize:'0.875rem'}}>{s.v}</div></div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>openEdit(z)} className="btn btn-sm btn-outline" style={{flex:1}}>Edit</button>
                <button onClick={()=>window.confirm(`Delete zone "${z.name}"?`)&&deleteMut.mutate(z.id)} className="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:20}}>{modal.new?'New Zone':'Edit Zone: '+modal.name}</h2>
            <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Zone Name *</label><input className="input" value={form.name} onChange={e=>f('name',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>City *</label><input className="input" value={form.city} onChange={e=>f('city',e.target.value)} /></div></div>
            <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>State</label><input className="input" value={form.state} onChange={e=>f('state',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Radius (km)</label><input type="number" className="input" value={form.radius_km} onChange={e=>f('radius_km',e.target.value)} /></div></div>
            <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Base Price (₹)</label><input type="number" className="input" value={form.base_price} onChange={e=>f('base_price',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Price per Plant (₹)</label><input type="number" className="input" value={form.price_per_plant} onChange={e=>f('price_per_plant',e.target.value)} /></div></div>
            <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Center Lat</label><input type="number" step="any" className="input" value={form.center_latitude} onChange={e=>f('center_latitude',e.target.value)} /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Center Lng</label><input type="number" step="any" className="input" value={form.center_longitude} onChange={e=>f('center_longitude',e.target.value)} /></div></div>
            <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" id="za" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} style={{width:16,height:16}} /><label htmlFor="za" style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}} style={{marginBottom:0}}>Zone Active</label></div>
            <div style={{display:'flex',gap:10,marginTop:4}}><button onClick={()=>setModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending||!form.name||!form.city} className="btn btn-primary" style={{flex:2}}>{saveMut.isPending?'Saving…':modal.new?'Create Zone':'Save Changes'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
