'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function SLAPage() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<any>({});
  const [editConfig, setEditConfig] = useState(false);

  const { data: configRaw } = useQuery({ queryKey: ['sla-config'], queryFn: AdminAPI.slaConfig });
  const { data: breachesRaw } = useQuery({ queryKey: ['sla-breaches'], queryFn: () => AdminAPI.slaBreaches({}) });
  const rawBr: any = breachesRaw; const breaches: any[] = Array.isArray(rawBr?.breaches) ? rawBr.breaches : Array.isArray(rawBr) ? rawBr : [];

  const saveMut = useMutation({ mutationFn: () => AdminAPI.updateSlaConfig(config), onSuccess: () => { toast.success('SLA config updated'); setEditConfig(false); qc.invalidateQueries({ queryKey: ['sla-config'] }); }, onError: (e: any) => toast.error(e.message) });
  const resolveMut = useMutation({ mutationFn: (id: number) => AdminAPI.resolveBreach(id), onSuccess: () => { toast.success('Breach resolved'); qc.invalidateQueries({ queryKey: ['sla-breaches'] }); }, onError: (e: any) => toast.error(e.message) });

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}><h1 className="page-title">SLA Monitor</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>Service Level Agreement configuration and breach tracking</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:20}}>
        <div className="card">
          <div className="card-header"><h2 style={{fontWeight:700,fontSize:'0.95rem'}}>SLA Configuration</h2><button onClick={()=>{setConfig(configRaw||{});setEditConfig(e=>!e);}} className="btn btn-sm btn-outline">{editConfig?'Cancel':'Edit'}</button></div>
          <div className="card-body">
            {editConfig?(
              <>
                {['max_response_minutes','max_completion_hours','penalty_amount','reward_on_time_amount','rating_threshold'].map(key=>(
                  <div key={key} className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}} style={{textTransform:'capitalize'}}>{key.replace(/_/g,' ')}</label><input type="number" className="input" value={config[key]||''} onChange={e=>setConfig((p:any)=>({...p,[key]:e.target.value}))} /></div>
                ))}
                <button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary" style={{width:'100%'}}>{saveMut.isPending?'Saving…':'Save Config'}</button>
              </>
            ):(
              <div>
                {configRaw&&Object.entries(configRaw).map(([k,v]:any)=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.875rem'}}>
                    <span style={{color:'var(--text-muted)',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
                    <span style={{fontWeight:700}}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2 style={{fontWeight:700,fontSize:'0.95rem'}}>SLA Breaches</h2><span style={{fontSize:'0.78rem',color:'var(--error)',fontWeight:600}}>{breaches.filter((b:any)=>!b.resolved).length} unresolved</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking #</th><th>Gardener</th><th>Breach Type</th><th>Occurred</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {breaches.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'28px'}}>No SLA breaches 🎉</td></tr>:
                  breaches.map((b:any)=>(
                    <tr key={b.id}>
                      <td style={{fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--forest)'}}>{b.booking?.booking_number||'—'}</td>
                      <td>{b.gardener?.name||'—'}</td>
                      <td style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{b.breach_type?.replace(/_/g,' ')}</td>
                      <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.occurred_at&&new Date(b.occurred_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td><span className={`badge ${b.resolved?'badge-green':'badge-red'}`}>{b.resolved?'Resolved':'Open'}</span></td>
                      <td>{!b.resolved&&<button onClick={()=>resolveMut.mutate(b.id)} className="btn btn-sm btn-outline">Resolve</button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:900px){div[style*="grid-template-columns: 1fr 2fr"]{grid-template-columns:1fr !important;}}`}</style>
    </AdminLayout>
  );
}
