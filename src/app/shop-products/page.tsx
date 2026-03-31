'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

const PRODUCT_ICONS = ['soil', 'pest', 'pot', 'fert', 'plant', 'tool'];

export default function AdminShopProductsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ['admin-shop-products'], queryFn: AdminAPI.shopProducts });
  const { data: categories, isLoading: loadingCats } = useQuery({ queryKey: ['admin-shop-categories'], queryFn: AdminAPI.shopCategories });

  const saveMut = useMutation({ 
    mutationFn: (payload: any) => modal.id ? AdminAPI.updateShopProduct(modal.id, payload) : AdminAPI.createShopProduct(payload), 
    onSuccess: () => { toast.success('Product Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-shop-products'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });


  const deleteMut = useMutation({ 
    mutationFn: (id: number) => AdminAPI.deleteShopProduct(id), 
    onSuccess: () => { toast.success('Product Deleted'); qc.invalidateQueries({ queryKey: ['admin-shop-products'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const prodList = Array.isArray(products) ? products : [];
  const catList = Array.isArray(categories) ? categories : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Shop Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage your gardening product catalog and categories</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/shop-categories" className="btn btn-outline" style={{ height: 44, display: 'flex', alignItems: 'center' }}>Manage Categories</Link>
          <button onClick={() => { setForm({ name: '', price: '', mrp: '', stock_quantity: 50, icon_key: 'plant', is_active: true }); setModal({ new: true }); }} className="btn btn-primary" style={{ height: 44 }}>+ Add Product</button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{prodList.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Categories</div>
          <div className="stat-value">{catList.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock items</div>
          <div className="stat-value" style={{ color: 'var(--error)' }}>{prodList.filter((p: any) => p.stock_quantity < 10).length}</div>
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th style={{ width: 60 }}>Icon</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(loadingProducts || loadingCats) ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 20, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : prodList.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No products found. Start by adding one!</td></tr>
            ) : prodList.map((p: any) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>#{p.id}</td>
                <td>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {p.icon_key === 'soil' ? '🟤' : p.icon_key === 'pest' ? '🕸️' : p.icon_key === 'pot' ? '🏺' : p.icon_key === 'fert' ? '🧪' : p.icon_key === 'plant' ? '🌿' : '🛠️'}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.badge || 'Standard Product'}</div>
                </td>
                <td><span className="badge badge-outline">{p.category?.name || 'Uncategorized'}</span></td>
                <td>
                  <div style={{ fontWeight: 800, color: 'var(--forest)' }}>₹{p.price}</div>
                  {p.mrp && p.mrp > p.price && <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textDecoration: 'line-through' }}>₹{p.mrp}</div>}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: p.stock_quantity < 10 ? 'var(--error)' : 'var(--text)' }}>{p.stock_quantity} units</div>
                </td>
                <td><span className={`badge ${p.is_active ? 'badge-forest' : 'badge-gold'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setForm({ ...p, category_id: p.category_id }); setModal(p); }} className="btn btn-sm btn-ghost" style={{ padding: '6px 12px' }}>Edit</button>
                    <button onClick={() => window.confirm('Deactivate product?') && deleteMut.mutate(p.id)} className="btn btn-sm btn-danger-ghost" style={{ padding: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{modal.new ? 'Add New Product' : 'Edit Product'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Product Name *</label><input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} placeholder="e.g. Premium Potting Mix" /></div>
              <div className="form-group"><label>Image URLs (comma separated)</label><input className="input" value={form.images ? (Array.isArray(form.images) ? form.images.join(', ') : form.images) : ''} onChange={e => f('images', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="https://..., https://..." /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select className="input" value={form.category_id || ''} onChange={e => f('category_id', e.target.value)}>
                    <option value="">Select Category</option>
                    {catList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Icon Key (Category Style)</label>
                  <select className="input" value={form.icon_key || 'plant'} onChange={e => f('icon_key', e.target.value)}>
                    {PRODUCT_ICONS.map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Price (₹) *</label><input type="number" className="input" value={form.price || ''} onChange={e => f('price', e.target.value)} /></div>
                <div className="form-group"><label>MRP (₹)</label><input type="number" className="input" value={form.mrp || ''} onChange={e => f('mrp', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Stock Quantity *</label><input type="number" className="input" value={form.stock_quantity || ''} onChange={e => f('stock_quantity', e.target.value)} /></div>
                <div className="form-group"><label>Badge (e.g. Bestseller)</label><input className="input" value={form.badge || ''} onChange={e => f('badge', e.target.value)} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea className="input" rows={4} value={form.description || ''} onChange={e => f('description', e.target.value)} placeholder="Detailed description of the product..." /></div>
              <div className="form-group"><label>Tags (comma separated for search)</label><input className="input" value={form.tags ? (Array.isArray(form.tags) ? form.tags.join(', ') : form.tags) : ''} onChange={e => f('tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="indoor, pet-friendly, low-light" /></div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="p_active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                <label htmlFor="p_active" style={{ marginBottom: 0, cursor: 'pointer' }}>Active and visible in shop</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
