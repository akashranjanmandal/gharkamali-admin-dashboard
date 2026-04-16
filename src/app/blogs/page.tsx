'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI, getBlogs } from '@/lib/api';

export default function AdminBlogsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-blogs'], queryFn: () => getBlogs({ limit: 100 }) });
  const rawBl: any = data; const blogs: any[] = Array.isArray(rawBl?.blogs) ? rawBl.blogs : Array.isArray(rawBl) ? rawBl : [];

  const saveMut = useMutation({ 
    mutationFn: (data: any = form) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'featured_image' && v instanceof File) fd.append('featured_image', v);
        else if (k === 'tags' && Array.isArray(v)) fd.append('tags', JSON.stringify(v));
        else if (k !== 'featured_image' && v !== null && v !== undefined) fd.append(k, String(v));
      });
      return modal.id ? AdminAPI.updateBlog(modal.id, fd) : AdminAPI.createBlog(fd);
    }, 
    onSuccess: () => { toast.success('Blog saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-blogs'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });

  const { data: catsData } = useQuery({ queryKey: ['blog-categories'], queryFn: () => AdminAPI.getBlogCategories() });
  const existingCats: string[] = Array.isArray(catsData) ? catsData : [];

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
            <div className="modal-header">
              <h3>{modal.new?'New Blog Post':'Edit Post'}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Title *</label><input className="input" value={form.title||''} onChange={e=>f('title',e.target.value)} /></div>
              <div className="form-row">
                <div className="form-group"><label>Slug *</label><input className="input" value={form.slug||''} onChange={e=>f('slug',e.target.value)} placeholder="my-blog-post" /></div>
                <div className="form-group">
                  <label>Category</label>
                  <input className="input" list="cat-list" value={form.category||''} onChange={e=>f('category',e.target.value)} />
                  <datalist id="cat-list">
                    {existingCats.map(c=><option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="form-group"><label>Excerpt</label><textarea className="input" value={form.excerpt||''} onChange={e=>f('excerpt',e.target.value)} rows={2} style={{resize:'vertical'}} /></div>
              <div className="form-group"><label>Content (HTML)</label><textarea className="input" value={form.content||''} onChange={e=>f('content',e.target.value)} rows={6} style={{resize:'vertical',fontFamily:'monospace'}} /></div>
              <div className="form-group">
                <label>Featured Image</label>
                <input type="file" className="input" onChange={e => f('featured_image', e.target.files?.[0])} accept="image/*" />
                {form.featured_image && !(form.featured_image instanceof File) && <img src={form.featured_image} alt="Current" style={{ marginTop: 8, borderRadius: 8, height: 120, width: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />}
                {form.featured_image instanceof File && <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--forest)' }}>New image selected: {form.featured_image.name}</p>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" id="pub" checked={!!form.is_published} onChange={e=>f('is_published',e.target.checked)} style={{width:16,height:16,accentColor:'var(--forest)',cursor:'pointer'}} /><label htmlFor="pub" style={{fontSize:'0.82rem',fontWeight:600,color:'var(--text-2)',cursor:'pointer'}}>Publish immediately</label></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending||!form.title||!form.slug} className="btn btn-primary">{saveMut.isPending?'Saving…':'Save Post'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
