'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

export default function AddGardenerPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['sup-unassigned'], queryFn: SupervisorAPI.unassignedGardeners });
  const profiles: any[] = (data as any) || [];

  const assignMut = useMutation({
    mutationFn: (id: number) => SupervisorAPI.assignGardener(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => { toast.success('Added to your team'); qc.invalidateQueries({ queryKey: ['sup-unassigned'] }); qc.invalidateQueries({ queryKey: ['sup-gardeners'] }); },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setBusyId(null),
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? profiles.filter(p =>
        (p.user?.name || '').toLowerCase().includes(q) ||
        (p.user?.phone || '').toLowerCase().includes(q) ||
        (p.user?.city || '').toLowerCase().includes(q))
    : profiles;

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Add Gardener to Your Team</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Browse unassigned gardeners and bring them under your supervision.</p>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <input className="input" placeholder="Search name, phone, or city…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {isLoading ? Array(6).fill(null).map((_, i) => <div key={i} className="card" style={{ padding: 16, height: 180 }}><div className="skeleton skel-text" /></div>)
          : filtered.length === 0 ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No unassigned gardeners.</div>
          : filtered.map((p: any) => (
            <div key={p.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #3b2a8c, #4c39ab)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{p.user?.name?.[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.user?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+91 {p.user?.phone}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', lineHeight: 1.7, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>City</span><span>{p.user?.city || '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Experience</span><span>{p.experience_years || 0} yrs</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Rating</span><span>{p.rating ? `⭐ ${Number(p.rating).toFixed(1)}` : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Status</span><span>{p.user?.is_approved ? <span className="badge badge-green">Active</span> : <span className="badge badge-yellow">Pending</span>}</span></div>
              </div>
              <button onClick={() => assignMut.mutate(p.user.id)} disabled={busyId === p.user.id} className="btn btn-primary" style={{ width: '100%', background: '#4c39ab', borderColor: '#4c39ab' }}>
                {busyId === p.user.id ? 'Adding…' : '+ Add to Team'}
              </button>
            </div>
          ))}
      </div>
    </SupervisorLayout>
  );
}
