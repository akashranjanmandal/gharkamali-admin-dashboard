'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminTaglinesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: taglines, isLoading } = useQuery({ queryKey: ['admin-taglines'], queryFn: AdminAPI.taglines });

  const saveMut = useMutation({
    mutationFn: (data: any) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'image' && v instanceof File) fd.append('image', v);
        else if (k !== 'image') fd.append(k, String(v));
      });
      return modal.id ? AdminAPI.updateTagline(modal.id, fd) : AdminAPI.createTagline(fd);
    },
    onSuccess: () => { toast.success('Tagline Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-taglines'] }); },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteTagline(id),
    onSuccess: () => { toast.success('Tagline Deleted'); qc.invalidateQueries({ queryKey: ['admin-taglines'] }); },
    onError: (e: any) => toast.error(e.message)
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const list = Array.isArray(taglines) ? taglines : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Taglines & Content</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage marketing taglines and hero text</p>
        </div>
        <button onClick={() => { setForm({ text: '', display_order: 0, is_active: true }); setModal({ new: true }); }} className="btn btn-primary" style={{ height: 44 }}>+ Add Tagline</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Order</th>
              <th>Image</th>
              <th>Text</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(5).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 20, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : list.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No taglines found. Add your first marketing tagline!</td></tr>
            ) : list.map((t: any) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{t.display_order}</td>
                <td>
                  {t.image_url ? (
                    <img src={t.image_url} alt="tagline" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 60, height: 40, background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-faint)' }}>None</div>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{t.text}</td>
                <td><span className={`badge ${t.is_active ? 'badge-forest' : 'badge-gold'}`}>{t.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setForm({ ...t }); setModal(t); }} className="btn btn-sm btn-ghost" style={{ padding: '6px 12px' }}>Edit</button>
                    <button onClick={() => window.confirm('Delete tagline?') && deleteMut.mutate(t.id)} className="btn btn-sm btn-danger-ghost" style={{ padding: '6px' }}>
                      Delete
                    </button>
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
              <h3>{modal.new ? 'Add Tagline' : 'Edit Tagline'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tagline Text *</label>
                <textarea className="input" rows={3} value={form.text || ''} onChange={e => f('text', e.target.value)} placeholder="e.g. Plants ki tension? GharKaMali hai na" />
              </div>
              <div className="form-group">
                <label>Tagline Image</label>
                <input type="file" className="input" onChange={e => f('image', e.target.files?.[0])} accept="image/*" />
                {form.image_url && !form.image && <img src={form.image_url} alt="Current" style={{ marginTop: 8, borderRadius: 8, height: 80, width: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />}
                {form.image && <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--forest)' }}>New image selected: {form.image.name}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Display Order</label>
                  <input type="number" className="input" value={form.display_order ?? 0} onChange={e => f('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                    Active and Visible
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
