'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

export default function MyRewardsPage() {
  const qc = useQueryClient();
  const { data: rewards, isLoading } = useQuery({ queryKey: ['sup-rewards'], queryFn: SupervisorAPI.rewards });
  const items: any[] = (rewards as any) || [];
  const { data: gardenersData } = useQuery({ queryKey: ['sup-gardeners-flat'], queryFn: () => SupervisorAPI.gardeners({ limit: 200 }) });
  const gardeners: any[] = (gardenersData as any)?.gardeners || [];

  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ gardener_id: '', type: 'reward', amount: '', reason: '' });

  const submitMut = useMutation({
    mutationFn: () => SupervisorAPI.giveReward({
      gardener_id: Number(form.gardener_id),
      type: form.type as any,
      amount: Number(form.amount),
      reason: form.reason,
    }),
    onSuccess: () => { toast.success('Recorded'); setShow(false); setForm({ gardener_id: '', type: 'reward', amount: '', reason: '' }); qc.invalidateQueries({ queryKey: ['sup-rewards'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Rewards & Penalties</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{items.length} entries for your team</p>
        </div>
        <button onClick={() => setShow(true)} className="btn btn-primary" style={{ background: '#4c39ab', borderColor: '#4c39ab' }}>+ New Entry</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Gardener</th><th>Type</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {isLoading ? Array(4).fill(null).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton skel-text" /></td></tr>)
                : items.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No entries yet</td></tr>
                : items.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>{r.gardener?.name || '—'}</td>
                    <td><span className={`badge ${r.type === 'reward' ? 'badge-green' : 'badge-red'}`}>{r.type}</span></td>
                    <td style={{ fontWeight: 700 }}>₹{r.amount}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                    <td><span className="badge badge-gray">{r.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header"><h3>New Entry</h3><button className="modal-close" onClick={() => setShow(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Gardener *</label>
                <select className="input" value={form.gardener_id} onChange={e => setForm({ ...form, gardener_id: e.target.value })} required>
                  <option value="">Select gardener</option>
                  {gardeners.map((g: any) => <option key={g.id} value={g.id}>{g.name} — {g.phone}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Type</label>
                <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="reward">Reward</option>
                  <option value="penalty">Penalty</option>
                </select>
              </div>
              <div className="form-group"><label>Amount (₹) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="form-group"><label>Reason</label><input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShow(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => { if (!form.gardener_id || !form.amount) { toast.error('Fill required fields'); return; } submitMut.mutate(); }} disabled={submitMut.isPending} className="btn btn-primary" style={{ background: '#4c39ab', borderColor: '#4c39ab' }}>{submitMut.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </SupervisorLayout>
  );
}
