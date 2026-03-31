'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function CityPagesAdmin() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({
    city_name: '', title: '', meta_description: '',
    h1_title: '', about_text: '', meta_image: '', is_active: true
  });

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-city-pages'], 
    queryFn: () => AdminAPI.cityPages() 
  });
  const pages: any[] = (data as any) ?? [];

  const upsertMut = useMutation({
    mutationFn: (payload: any) => AdminAPI.upsertCityPage(payload),
    onSuccess: () => {
      toast.success('City SEO content updated');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin-city-pages'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setForm({
      city_name: p.city_name,
      title: p.title || '',
      meta_description: p.meta_description || '',
      h1_title: p.h1_title || '',
      about_text: p.about_text || '',
      meta_image: p.meta_image || '',
      is_active: p.is_active
    });
    setModal(p);
  };

  const openNew = () => {
    setForm({
      city_name: '', title: '', meta_description: '',
      h1_title: '', about_text: '', meta_image: '', is_active: true
    });
    setModal('new');
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">City SEO Pages</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage SEO content and unique headings for service cities</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add City SEO</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>City Name</th>
                <th>SEO Title</th>
                <th>H1 Heading</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(3).fill(null).map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton skel-text" /></td></tr>)
              ) : pages.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No city pages configured yet.</td></tr>
              ) : (
                pages.map((p: any) => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 600 }}>{p.city_name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>/{p.slug}</div></td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{p.h1_title || '—'}</td>
                    <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>Edit SEO</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'new' ? 'Add City SEO' : `Edit SEO: ${modal.city_name}`}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>City Name *</label>
                  <input className="input" value={form.city_name} onChange={e => setForm({ ...form, city_name: e.target.value })} placeholder="e.g. Noida" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="input" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>SEO Browser Title</label>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Best Gardeners in Noida | GharKaMali" />
              </div>

              <div className="form-group">
                <label>H1 Page Heading</label>
                <input className="input" value={form.h1_title} onChange={e => setForm({ ...form, h1_title: e.target.value })} placeholder="e.g. Professional Gardening Services in Noida" />
              </div>

              <div className="form-group">
                <label>Meta Description</label>
                <textarea className="input" rows={2} value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} placeholder="SEO snippet for results..." />
              </div>

              <div className="form-group">
                <label>About/Body Text (Rich Content)</label>
                <textarea className="input" rows={4} value={form.about_text} onChange={e => setForm({ ...form, about_text: e.target.value })} placeholder="Tell users about your services in this city..." />
              </div>

              <div className="form-group">
                <label>Meta Image URL (Optional)</label>
                <input className="input" value={form.meta_image} onChange={e => setForm({ ...form, meta_image: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => upsertMut.mutate(form)} disabled={!form.city_name || upsertMut.isPending}>
                {upsertMut.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
