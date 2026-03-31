'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminShopCategoriesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: categories, isLoading } = useQuery({ queryKey: ['admin-shop-categories'], queryFn: AdminAPI.shopCategories });

  const saveMut = useMutation({
    mutationFn: (payload: any) => modal.id ? AdminAPI.updateShopCategory(modal.id, payload) : AdminAPI.createShopCategory(payload),
    onSuccess: () => { 
      toast.success('Category Saved!'); 
      setModal(null); 
      qc.invalidateQueries({ queryKey: ['admin-shop-categories'] }); 
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteShopCategory(id),
    onSuccess: () => { 
      toast.success('Category Deactivated'); 
      qc.invalidateQueries({ queryKey: ['admin-shop-categories'] }); 
    },
    onError: (e: any) => toast.error(e.message)
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const list = Array.isArray(categories) ? categories : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Shop Categories</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage product classification and display icons</p>
        </div>
        <button onClick={() => { setForm({ name: '', slug: '', icon: '🌿', image_url: '', is_active: true }); setModal({ new: true }); }} className="btn btn-primary" style={{ height: 44 }}>+ Add Category</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Icon</th>
              <th>Image</th>
              <th>Category Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(6).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 20, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : list.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No categories found.</td></tr>
            ) : list.map((c: any) => (
              <tr key={c.id}>
                <td style={{ fontSize: '1.5rem' }}>{c.icon}</td>
                <td>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '0.65rem' }}>No Image</div>
                  )}
                </td>
                <td style={{ fontWeight: 700, color: 'var(--text)' }}>{c.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c.slug}</td>
                <td><span className={`badge ${c.is_active ? 'badge-forest' : 'badge-gold'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setForm({ ...c }); setModal(c); }} className="btn btn-sm btn-ghost" style={{ padding: '6px 12px' }}>Edit</button>
                    <button onClick={() => window.confirm('Deactivate Category?') && deleteMut.mutate(c.id)} className="btn btn-sm btn-danger-ghost" style={{ padding: '6px' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{modal.new ? 'Add Category' : 'Edit Category'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} placeholder="e.g. Fertilizers" />
              </div>
              <div className="form-group">
                <label>Slug (used in URL)</label>
                <input className="input" value={form.slug || ''} onChange={e => f('slug', e.target.value)} placeholder="e.g. fertilizers" />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Emoji Icon</label>
                  <input className="input" value={form.icon || '🌿'} onChange={e => f('icon', e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 2, display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                    Active and Visible
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Image URL (Optional)</label>
                <input className="input" value={form.image_url || ''} onChange={e => f('image_url', e.target.value)} placeholder="https://..." />
                {form.image_url && <img src={form.image_url} alt="Preview" style={{ marginTop: 8, borderRadius: 8, height: 100, width: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : 'Save Category'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
