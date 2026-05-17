'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import SupervisorLayout from '@/components/SupervisorLayout';
import { SupervisorAPI } from '@/lib/api';

const IcUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
const IcCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 11.08 22 12 12 22 2 12 12 2 13 3"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcCal = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcRun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v6h6l-7 10v-6H6l7-10z"/></svg>;

function Stat({ label, value, icon, color }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}14`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = { pending: 'badge-yellow', assigned: 'badge-blue', in_progress: 'badge-orange', completed: 'badge-green', cancelled: 'badge-gray', failed: 'badge-red' };
  return <span className={`badge ${m[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
}

export default function SupervisorDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['sup-dashboard'], queryFn: SupervisorAPI.dashboard, refetchInterval: 60000 });
  const stats = (data as any)?.stats || {};
  const team = (data as any)?.team || [];
  const recent = (data as any)?.recentBookings || [];

  return (
    <SupervisorLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <Stat label="My Team"          value={stats.totalGardeners}   icon={<IcUsers />} color="#4c39ab" />
        <Stat label="Active"            value={stats.activeGardeners}  icon={<IcCheck />} color="var(--success)" />
        <Stat label="Pending Approval"  value={stats.pendingGardeners} icon={<IcClock />} color="var(--warning, #d97706)" />
        <Stat label="Today's Bookings"  value={stats.todayBookings}    icon={<IcCal />}   color="var(--forest)" />
      </div>

      <div className="stat-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Completed Today" value={stats.completedToday} icon={<IcCheck />} color="var(--success)" />
        <Stat label="In Progress"      value={stats.inProgress}     icon={<IcRun />}   color="#0891b2" />
        <Stat label="Pending Bookings" value={stats.pendingBookings} icon={<IcClock />} color="#d97706" />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>My Team</h2>
          <Link href="/supervisor/gardeners" style={{ fontSize: '0.78rem', color: '#4c39ab', fontWeight: 600 }}>Manage →</Link>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Gardener</th><th>Phone</th><th>City</th><th>Status</th><th>Available</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5}><div className="skeleton skel-text" style={{ width: '100%' }}/></td></tr>
                : team.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No gardeners assigned yet. Add some from <Link href="/supervisor/add-gardener" style={{ color: '#4c39ab' }}>Add Gardener</Link>.</td></tr>
                  : team.map((g: any) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 700 }}>{g.name}</td>
                      <td>+91 {g.phone}</td>
                      <td>{g.city || '—'}</td>
                      <td>{g.is_approved ? <span className="badge badge-green">Active</span> : g.is_active ? <span className="badge badge-yellow">Pending</span> : <span className="badge badge-gray">Inactive</span>}</td>
                      <td>{g.gardenerProfile?.is_available ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Bookings</h2>
          <Link href="/supervisor/bookings" style={{ fontSize: '0.78rem', color: '#4c39ab', fontWeight: 600 }}>View all →</Link>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Booking #</th><th>Customer</th><th>Gardener</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {recent.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No bookings yet</td></tr>
                : recent.map((b: any) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{b.booking_number}</td>
                    <td>{b.customer?.name || '—'}</td>
                    <td>{b.gardener?.name || '—'}</td>
                    <td>{b.scheduled_date}</td>
                    <td style={{ fontWeight: 700 }}>₹{b.total_amount}</td>
                    <td><StatusBadge s={b.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </SupervisorLayout>
  );
}
