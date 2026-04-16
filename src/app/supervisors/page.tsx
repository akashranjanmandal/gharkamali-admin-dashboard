'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function SupervisorsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: supervisorsData, isLoading } = useQuery({ queryKey: ['admin-supervisors'], queryFn: AdminAPI.supervisors });
  const supervisors: any[] = Array.isArray(supervisorsData as any) ? (supervisorsData as any) : [];
  
  const { data: gardenersData } = useQuery({ queryKey: ['admin-gardeners-all'], queryFn: () => AdminAPI.gardeners({ limit: 500, status: 'active' }) });
  const allGardeners = (gardenersData as any)?.gardeners || [];

  const saveMut = useMutation({ 
    mutationFn: () => modal.id ? AdminAPI.updateSupervisor(modal.id, form) : AdminAPI.createSupervisor(form), 
    onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-supervisors'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });

  const toggleGardener = (id: number) => {
    const current = form.gardener_ids || [];
    if (current.includes(id)) {
      setForm((p: any) => ({ ...p, gardener_ids: current.filter((x: number) => x !== id) }));
    } else {
      setForm((p: any) => ({ ...p, gardener_ids: [...current, id] }));
    }
  };

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Supervisors</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{supervisors.length} supervisors</p></div><button onClick={()=>{setForm({name:'',phone:'',email:'',password:'',gardener_ids:[]});setModal({new:true});}} className="btn btn-primary">+ New Supervisor</button></div>
      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Supervisor</th><th>Phone</th><th>Zones</th><th>Team</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading?Array(4).fill(null).map((_,i)=><tr key={i}><td colSpan={6}><div className="skeleton skel-text" style={{ width: '100%' }}/></td></tr>):
                supervisors.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No supervisors yet</td></tr>:
                supervisors.map((s:any)=>(
                  <tr key={s.id}>
                    <td><div style={{fontWeight:700,fontSize:'0.875rem'}}>{s.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{s.email||'—'}</div></td>
                    <td>+91 {s.phone}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{s.zones?.map((z:any)=>z.name).join(', ')||'—'}</td>
                    <td style={{fontSize:'0.82rem'}}>{s.team?.map((t: any) => allGardeners.find((g: any) => g.id === t.user_id)?.name).filter(Boolean).join(', ') || '—'}</td>
                    <td><span className={`badge ${s.is_active?'badge-green':'badge-gray'}`}>{s.is_active?'Active':'Inactive'}</span></td>
                    <td><button onClick={()=>{setForm({...s, gardener_ids: s.team?.map((t: any) => t.user_id) || []});setModal(s);}} className="btn btn-sm btn-outline">Edit Team</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{modal.new?'New Supervisor':'Manage Supervisor & Team'}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '0 4px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Basic Information</h4>
                <div className="form-row"><div className="form-group"><label>Name *</label><input className="input" value={form.name||''} onChange={e=>setForm((p:any)=>({...p,name:e.target.value}))} /></div><div className="form-group"><label>Phone *</label><input type="tel" className="input" value={form.phone||''} onChange={e=>setForm((p:any)=>({...p,phone:e.target.value}))} /></div></div>
                <div className="form-group"><label>Email</label><input type="email" className="input" value={form.email||''} onChange={e=>setForm((p:any)=>({...p,email:e.target.value}))} /></div>
                {modal.new&&<div className="form-group"><label>Password *</label><input type="password" className="input" value={form.password||''} onChange={e=>setForm((p:any)=>({...p,password:e.target.value}))} /></div>}
                
                {!modal.new && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Assign Gardeners to Team</h4>
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 12, padding: 8 }}>
                      {allGardeners.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: 12 }}>No active gardeners found.</p> : 
                        allGardeners.map((g: any) => (
                          <div key={g.id} onClick={() => toggleGardener(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer', background: form.gardener_ids?.includes(g.id) ? 'var(--forest-light)' : 'transparent', borderRadius: 8, marginBottom: 4, transition: 'all 0.2s' }}>
                            <input type="checkbox" checked={form.gardener_ids?.includes(g.id)} readOnly style={{ cursor: 'pointer' }} />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{g.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {g.phone}</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
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
