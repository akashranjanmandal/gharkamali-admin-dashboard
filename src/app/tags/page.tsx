'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function TagsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', description: '', color: '#22c55e', is_active: true });
  const { data: tagsData, isLoading } = useQuery({ queryKey: ['admin-tags'], queryFn: AdminAPI.tags });
  const tags: any[] = Array.isArray(tagsData) ? tagsData : [];

  const saveMut = useMutation({
    mutationFn: () => modal.id ? AdminAPI.updateTag(modal.id, form) : AdminAPI.createTag(form),
    onSuccess: () => { toast.success('Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-tags'] }); },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteTag(id),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries({ queryKey: ['admin-tags'] }); },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><h1 className="page-title">Tags</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{tags.length} tags</p></div>
        <button onClick={()=>{setForm({name:'',description:'',color:'#22c55e',is_active:true});setModal({new:true});}} className="btn btn-primary">+ New Tag</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Description</th><th>Color</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading?Array(4).fill(null).map((_,i)=><tr key={i}><td colSpan={5}><div className="skeleton skel-text" style={{ width: '100%' }}/></td></tr>):
                tags.length===0?<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No tags yet</td></tr>:
                tags.map((t:any)=>(
                  <tr key={t.id}>
                    <td><div style={{fontWeight:700,fontSize:'0.875rem'}}>{t.name}</div></td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{t.description||'—'}</td>
                    <td><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><div style={{width:16,height:16,borderRadius:'50%',background:t.color}}></div>{t.color}</div></td>
                    <td><span className={`badge ${t.is_active?'badge-green':'badge-gray'}`}>{t.is_active?'Active':'Inactive'}</span></td>
                    <td><button onClick={()=>{setForm({...t});setModal(t);}} className="btn btn-sm btn-outline">Edit</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>{setModal(null);setForm({name:'',description:'',color:'#22c55e',is_active:true});}}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>{modal.new?'New Tag':'Edit Tag'}</h3><button onClick={()=>{setModal(null);setForm({name:'',description:'',color:'#22c55e',is_active:true});}} className="modal-close">×</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gap:'1rem'}}>
                <div><label>Name *</label><input type="text" value={form.name} onChange={(e)=>setForm(p=>({...p,name:e.target.value}))} placeholder="Tag name" /></div>
                <div><label>Description</label><textarea value={form.description} onChange={(e)=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description" rows={3}></textarea></div>
                <div><label>Color</label><input type="color" value={form.color} onChange={(e)=>setForm(p=>({...p,color:e.target.value}))} /></div>
                <div><label><input type="checkbox" checked={form.is_active} onChange={(e)=>setForm(p=>({...p,is_active:e.target.checked}))} /> Active</label></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>{setModal(null);setForm({name:'',description:'',color:'#22c55e',is_active:true});}} className="btn btn-outline">Cancel</button>
              <button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}