'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function SurgePricingPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ percentage: '', reason: '', zone_ids: [] as number[], plan_ids: [] as number[] });
  const { data: zonesData } = useQuery({ queryKey: ['admin-zones'], queryFn: AdminAPI.zones });
  const zones: any[] = zonesData || [];
  const { data: plansData } = useQuery({ queryKey: ['admin-plans'], queryFn: AdminAPI.plans });
  const plans: any[] = plansData || [];

  const applyMut = useMutation({
    mutationFn: () => AdminAPI.triggerPriceHike(form),
    onSuccess: () => { toast.success('Surge pricing applied!'); setForm({ percentage: '', reason: '', zone_ids: [], plan_ids: [] }); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message)
  });

  const toggleZone = (id: number) => {
    setForm((p: any) => ({ ...p, zone_ids: p.zone_ids.includes(id) ? p.zone_ids.filter((x: any) => x !== id) : [...p.zone_ids, id] }));
  };

  const togglePlan = (id: number) => {
    setForm((p: any) => ({ ...p, plan_ids: p.plan_ids.includes(id) ? p.plan_ids.filter((x: any) => x !== id) : [...p.plan_ids, id] }));
  };

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Surge Pricing</h1>
        <p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>Apply price hikes to zones or plans</p>
      </div>
      <div className="card">
        <div style={{display:'grid',gap:'1rem', padding: 20}}>
          <div><label>Hike Percentage *</label><input type="number" className="input" value={form.percentage} onChange={(e)=>setForm((p: any)=>({...p,percentage:e.target.value}))} placeholder="e.g. 10" /></div>
          <div><label>Reason *</label><input type="text" className="input" value={form.reason} onChange={(e)=>setForm((p: any)=>({...p,reason:e.target.value}))} placeholder="e.g. High demand" /></div>
          <div>
            <label>Apply to Zones</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.5rem',marginTop:'0.5rem'}}>
              {zones.map((z:any)=>(
                <label key={z.id} style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <input type="checkbox" checked={form.zone_ids.includes(z.id)} onChange={()=>toggleZone(z.id)} />
                  {z.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label>Apply to Plans</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.5rem',marginTop:'0.5rem'}}>
              {plans.map((p:any)=>(
                <label key={p.id} style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <input type="checkbox" checked={form.plan_ids.includes(p.id)} onChange={()=>togglePlan(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <button onClick={()=>applyMut.mutate()} disabled={applyMut.isPending || !form.percentage || !form.reason} className="btn btn-primary">
            {applyMut.isPending?'Applying...':'Apply Surge Pricing'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}