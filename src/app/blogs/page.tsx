'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminBlogsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-blogs'], queryFn: () => AdminAPI.blogs({}) });
  const rawBl: any = data; const blogs: any[] = Array.isArray(rawBl?.items) ? rawBl.items : Array.isArray(rawBl) ? rawBl : [];

  const saveMut = useMutation({ mutationFn: () => modal.id ? AdminAPI.updateBlog(modal.id, form) : AdminAPI.createBlog(form), onSuccess: () => { toast.success('Blog saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-blogs'] }); }, onError: (e: any) => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: (id: number) => AdminAPI.deleteBlog(id), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-blogs'] }); }, onError: (e: any) => toast.error(e.message) });
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <AdminLayout>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h1 className="page-title">Blog Posts</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{blogs.length} posts</p></div><button onClick={()=>{setForm({title:'',slug:'',excerpt:'',content:'',category:'',is_published:false});setModal({new:true});}} className="btn btn-primary">+ New Post</button></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Slug</th><th>Category</th><th>Views</th><th>Status</th><th>Published</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading?Array(5).fill(null).map((_,i)=><tr key={i}><td colSpan={7}><div className="skeleton skel-text"/></td></tr>):
                blogs.length===0?<tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No blogs yet</td></tr>:
                blogs.map((b:any)=>(
                  <tr key={b.id}>
                    <td><div style={{fontWeight:700,fontSize:'0.875rem',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div></td>
                    <td style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.slug}</td>
                    <td style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{b.category||'—'}</td>
                    <td style={{fontWeight:600}}>{b.view_count||0}</td>
                    <td><span className={`badge ${b.is_published?'badge-green':'badge-gray'}`}>{b.is_published?'Published':'Draft'}</span></td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.created_at&&new Date(b.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                    <td><div style={{display:'flex',gap:6}}><button onClick={()=>{setForm({...b});setModal(b);}} className="btn btn-sm btn-outline">Edit</button><button onClick={()=>window.confirm('Delete?')&&deleteMut.mutate(b.id)} className="btn btn-sm btn-danger">Del</button></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:20}}>{modal.new?'New Blog Post':'Edit Post'}</h2>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Title *</label><input className="input" value={form.title||''} onChange={e=>f('title',e.target.value)} /></div>
            <div className="form-row"><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Slug *</label><input className="input" value={form.slug||''} onChange={e=>f('slug',e.target.value)} placeholder="my-blog-post" /></div><div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Category</label><input className="input" value={form.category||''} onChange={e=>f('category',e.target.value)} /></div></div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Excerpt</label><textarea className="input" value={form.excerpt||''} onChange={e=>f('excerpt',e.target.value)} rows={2} style={{resize:'vertical'}} /></div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Content (HTML)</label><textarea className="input" value={form.content||''} onChange={e=>f('content',e.target.value)} rows={6} style={{resize:'vertical',fontFamily:'monospace'}} /></div>
            <div className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}}>Cover Image URL</label><input className="input" value={form.cover_image||''} onChange={e=>f('cover_image',e.target.value)} /></div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><input type="checkbox" id="pub" checked={!!form.is_published} onChange={e=>f('is_published',e.target.checked)} style={{width:16,height:16}} /><label htmlFor="pub" style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5}} style={{marginBottom:0}}>Published</label></div>
            <div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} className="btn btn-ghost" style={{flex:1}}>Cancel</button><button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending||!form.title||!form.slug} className="btn btn-primary" style={{flex:2}}>{saveMut.isPending?'Saving…':'Save Post'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
