'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { IconPlus, IconEdit, IconTrash, IconChevronUp, IconChevronDown } from '@tabler/icons-react';

export default function FaqsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data, isLoading } = useQuery({ queryKey: ['admin-faqs'], queryFn: AdminAPI.faqs });
  const faqs: any[] = Array.isArray(data as any) ? (data as any) : [];

  const saveMut = useMutation({ 
    mutationFn: () => modal.id ? AdminAPI.updateFaq(modal.id, form) : AdminAPI.createFaq(form), 
    onSuccess: () => { 
      toast.success('FAQ saved successfully!'); 
      setModal(null); 
      qc.invalidateQueries({ queryKey: ['admin-faqs'] }); 
    }, 
    onError: (e: any) => toast.error(e.message) 
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteFaq(id),
    onSuccess: () => {
      toast.success('FAQ deleted');
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const toggleStatus = (faq: any) => {
    AdminAPI.updateFaq(faq.id, { is_active: !faq.is_active })
      .then(() => qc.invalidateQueries({ queryKey: ['admin-faqs'] }))
      .catch(e => toast.error(e.message));
  };

  const moveOrder = (faq: any, dir: 'up' | 'down') => {
    const newOrder = dir === 'up' ? faq.display_order - 1 : faq.display_order + 1;
    AdminAPI.updateFaq(faq.id, { display_order: newOrder })
      .then(() => qc.invalidateQueries({ queryKey: ['admin-faqs'] }))
      .catch(e => toast.error(e.message));
  };

  const categories = Array.from(new Set(faqs.map(f => f.category || 'General')));

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">FAQ Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Manage frequently asked questions for the website.</p>
        </div>
        <button onClick={() => { setForm({ question: '', answer: '', category: 'General', is_active: true, display_order: 0 }); setModal({ new: true }); }} className="btn btn-primary">
          <IconPlus size={18} /> New FAQ
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Order</th>
                <th>Question & Answer</th>
                <th>Category</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array(5).fill(null).map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton skel-text" /></td></tr>) :
                faqs.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No FAQs found. Add one to get started.</td></tr> :
                faqs.map((f: any) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => moveOrder(f, 'up')} className="btn-icon" style={{ width: 24, height: 24 }}><IconChevronUp size={14} /></button>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{f.display_order}</span>
                        <button onClick={() => moveOrder(f, 'down')} className="btn-icon" style={{ width: 24, height: 24 }}><IconChevronDown size={14} /></button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{f.question}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.answer}</div>
                    </td>
                    <td>
                      <span className="badge badge-outline">{f.category || 'General'}</span>
                    </td>
                    <td>
                      <div onClick={() => toggleStatus(f)} style={{ cursor: 'pointer' }}>
                        <span className={`badge ${f.is_active ? 'badge-green' : 'badge-gray'}`}>
                          {f.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setForm({ ...f }); setModal(f); }} className="btn-icon">
                          <IconEdit size={16} />
                        </button>
                        <button onClick={() => { if (confirm('Are you sure you want to delete this FAQ?')) deleteMut.mutate(f.id); }} className="btn-icon" style={{ color: 'var(--error)' }}>
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.new ? 'Add New FAQ' : 'Edit FAQ'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Question *</label>
                <textarea 
                  className="input" 
                  rows={2} 
                  placeholder="e.g. What is your refund policy?" 
                  value={form.question || ''} 
                  onChange={e => setForm((p: any) => ({ ...p, question: e.target.value }))} 
                />
              </div>
              <div className="form-group">
                <label>Answer *</label>
                <textarea 
                  className="input" 
                  rows={5} 
                  placeholder="Structure your answer clearly..." 
                  value={form.answer || ''} 
                  onChange={e => setForm((p: any) => ({ ...p, answer: e.target.value }))} 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input 
                    className="input" 
                    list="faq-categories"
                    placeholder="General, Booking, Payment etc." 
                    value={form.category || ''} 
                    onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} 
                  />
                  <datalist id="faq-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={form.display_order ?? 0} 
                    onChange={e => setForm((p: any) => ({ ...p, display_order: parseInt(e.target.value) }))} 
                  />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <input 
                  type="checkbox" 
                  id="faq-active" 
                  checked={form.is_active} 
                  onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} 
                />
                <label htmlFor="faq-active" style={{ marginBottom: 0, cursor: 'pointer' }}>Active (Show on website)</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button 
                onClick={() => saveMut.mutate()} 
                disabled={saveMut.isPending || !form.question || !form.answer} 
                className="btn btn-primary"
              >
                {saveMut.isPending ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
