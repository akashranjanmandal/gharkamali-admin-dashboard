'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

type BlockedDate = { date: string; reason?: string };

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function BlockedDatesPage() {
  const qc = useQueryClient();
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['blocked-dates'], queryFn: AdminAPI.blockedDates });
  const dates: BlockedDate[] = Array.isArray(data) ? data : [];

  const saveMut = useMutation({
    mutationFn: (next: BlockedDate[]) => AdminAPI.saveBlockedDates(next),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocked-dates'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addDate = () => {
    if (!newDate) { toast.error('Pick a date first'); return; }
    if (dates.some(d => d.date === newDate)) { toast.error('That date is already blocked'); return; }
    saveMut.mutate([...dates, { date: newDate, reason: newReason.trim() || undefined }]);
    toast.success(`Bookings closed on ${fmt(newDate)}`);
    setNewDate(''); setNewReason('');
  };
  const removeDate = (date: string) => {
    saveMut.mutate(dates.filter(d => d.date !== date));
    toast.success('Date reopened for bookings');
  };

  const today = todayStr();
  const upcoming = dates.filter(d => d.date >= today);
  const past = dates.filter(d => d.date < today);

  return (
    <AdminLayout>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title">Blocked Dates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Close new bookings on specific days (holidays, staff off-days). Customers see no slots on these
            dates on the website and app, and the server refuses bookings and reschedules onto them.
            Admin-created manual bookings are not affected.
          </p>
        </div>

        {/* Add a date */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Date *</label>
              <input type="date" className="input" min={today} value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Reason (shown to customers, optional)</label>
              <input className="input" placeholder="e.g. Diwali holiday" maxLength={200} value={newReason} onChange={e => setNewReason(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={addDate} disabled={saveMut.isPending}>Block Date</button>
          </div>
        </div>

        {/* Upcoming blocked dates */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
            Upcoming blocked dates {upcoming.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({upcoming.length})</span>}
          </div>
          {isLoading ? (
            <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>
          ) : upcoming.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No upcoming blocked dates — bookings are open every day.
            </div>
          ) : upcoming.map(d => (
            <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: 180 }}>{fmt(d.date)}</span>
              <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{d.reason || '—'}</span>
              <button className="btn btn-sm btn-outline" onClick={() => window.confirm(`Reopen bookings on ${fmt(d.date)}?`) && removeDate(d.date)} disabled={saveMut.isPending}>
                Unblock
              </button>
            </div>
          ))}
        </div>

        {/* Past dates, kept for reference */}
        {past.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 20, opacity: 0.7 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Past blocked dates ({past.length})
            </div>
            {past.slice(-20).reverse().map(d => (
              <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', minWidth: 180, color: 'var(--text-muted)' }}>{fmt(d.date)}</span>
                <span style={{ flex: 1, color: 'var(--text-faint)', fontSize: '0.8rem' }}>{d.reason || '—'}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => removeDate(d.date)} disabled={saveMut.isPending}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
