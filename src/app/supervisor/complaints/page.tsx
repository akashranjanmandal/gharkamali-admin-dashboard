'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

const STATUS_BADGE: Record<string, string> = { open: 'badge-yellow', in_progress: 'badge-blue', resolved: 'badge-green', closed: 'badge-gray' };

export default function MyComplaintsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['sup-complaints'], queryFn: SupervisorAPI.complaints });
  const items: any[] = (data as any) || [];

  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ status: 'in_progress', resolution_note: '' });

  const saveMut = useMutation({
    mutationFn: () => SupervisorAPI.updateComplaint(editing.id, form),
    onSuccess: () => { toast.success('Updated'); setEditing(null); qc.invalidateQueries({ queryKey: ['sup-complaints'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const open = (c: any) => {
    setForm({ status: c.status || 'in_progress', resolution_note: c.resolution_note || '' });
    setEditing(c);
  };

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Complaints</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{items.length} complaints involving your gardeners</p>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Customer</th><th>Gardener</th><th>Subject</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(4).fill(null).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton skel-text" /></td></tr>)
                : items.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No complaints</td></tr>
                : items.map((c: any) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{c.customer?.name || '—'}</td>
                    <td>{c.gardener?.name || '—'}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject || c.description || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-gray'}`}>{c.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td><button onClick={() => open(c)} className="btn btn-sm btn-outline">Update</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header"><h3>Update Complaint #{editing.id}</h3><button className="modal-close" onClick={() => setEditing(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Status</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group"><label>Resolution Note</label><textarea className="input" rows={4} value={form.resolution_note} onChange={e => setForm({ ...form, resolution_note: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditing(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </SupervisorLayout>
  );
}
