'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

// SVG icons - no emojis
const IcUsers    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcLeaf     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
const IcCal      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcCash     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcStar     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcAlert    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcRefresh  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;
const IcChevron  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

function StatusBadge({ s }: { s: string }) {
  const m: Record<string,string> = { pending:'badge-yellow', assigned:'badge-blue', in_progress:'badge-orange', completed:'badge-green', cancelled:'badge-gray', failed:'badge-red', en_route:'badge-blue', arrived:'badge-orange' };
  return <span className={`badge ${m[s]||'badge-gray'}`}>{s?.replace(/_/g,' ')}</span>;
}

function StatCard({ label, value, icon, color = 'var(--forest)', sub, trend }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}14`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: trend >= 0 ? 'var(--success)' : 'var(--error)', background: trend >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', padding: '3px 8px', borderRadius: 99 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points={trend >= 0 ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: AdminAPI.dashboard, refetchInterval: 60000 });
  const { data: analyticsRaw } = useQuery({ queryKey: ['admin-analytics-dash'], queryFn: () => AdminAPI.analytics({ period: '30' }) });
  const { data: pendingGardenersData } = useQuery({ queryKey: ['admin-gardeners-pending-dash'], queryFn: () => AdminAPI.gardeners({ status: 'pending', limit: 5 }) });
  const d: any = data;
  const s: any = d?.stats;
  const an: any = analyticsRaw;
  const pg: any = pendingGardenersData;

  const recentBookings: any[] = Array.isArray(d?.recentBookings) ? d.recentBookings : [];
  const pendingApprovals: any[] = Array.isArray(pg?.gardeners) ? pg.gardeners : Array.isArray(pg) ? pg : [];
  const { data: openComplaintsData } = useQuery({ queryKey: ['admin-open-complaints-dash'], queryFn: () => AdminAPI.complaints({ status: 'open', limit: 10 }) });
  const openComplaints: any[] = Array.isArray((openComplaintsData as any)?.complaints) ? (openComplaintsData as any).complaints : [];
  const revenueChart = Array.isArray(an?.revenueByDay) ? an.revenueByDay : [];
  const statusDist: any[] = Array.isArray(an?.bookingStatusDist) ? an.bookingStatusDist : [];

  const lineData = {
    labels: revenueChart.map((r: any) => new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
    datasets: [{ label: 'Revenue (₹)', data: revenueChart.map((r: any) => r.revenue ?? r.amount ?? 0), borderColor: '#03411a', backgroundColor: 'rgba(3,65,26,0.06)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: '#03411a' }],
  };
  const doughnutData = {
    labels: statusDist.map((s: any) => s.status?.replace(/_/g,' ')),
    datasets: [{ data: statusDist.map((s: any) => s.count ?? 0), backgroundColor: ['#03411a','#2563eb','#d97706','#16a34a','#808285','#dc2626'], borderWidth: 0, hoverOffset: 8 }],
  };

  const STATS = [
    { label: 'Total Customers',   value: s?.totalCustomers?.toLocaleString('en-IN'),  icon: <IcUsers />,   color: 'var(--forest)', sub: 'All registered',      trend: 12 },
    { label: 'Active Gardeners',  value: s?.totalGardeners?.toLocaleString('en-IN'),  icon: <IcLeaf />,    color: '#2563eb',       sub: 'Currently active',    trend: 5  },
    { label: 'Bookings Today',    value: s?.todayBookings?.toLocaleString('en-IN'),    icon: <IcCal />,     color: '#d97706',       sub: 'Scheduled visits',    trend: -2 },
    { label: 'Revenue (30d)',     value: s?.totalRevenue != null ? `₹${Number(s.totalRevenue).toLocaleString('en-IN')}` : '—', icon: <IcCash />, color: '#16a34a', sub: 'Last 30 days', trend: 18 },
    { label: 'Avg Rating',        value: an?.avgRating ? `${Number(an.avgRating).toFixed(1)}` : '—', icon: <IcStar />, color: 'var(--earth)', sub: 'Customer satisfaction' },
    { label: 'Open Complaints',   value: openComplaints.length,                       icon: <IcAlert />,   color: '#dc2626',       sub: 'Need attention'        },
    { label: 'Active Subs',       value: s?.activeSubscriptions?.toLocaleString('en-IN'), icon: <IcRefresh />, color: '#9333ea', sub: 'Recurring plans' },
    { label: 'Pending Approvals', value: s?.pendingGardeners ?? 0,                    icon: <IcLeaf />,    color: '#0891b2',       sub: 'Gardeners waiting'     },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Welcome back! Here's what's happening today.</p>
        </div>
        <Link href="/analytics" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          View Analytics <IcChevron />
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {isLoading ? Array(8).fill(null).map((_,i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 18 }} />) :
          STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div className="card">
          <div className="card-header">
            <h2>Revenue Trend (30 days)</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>₹ per day</span>
          </div>
          <div className="card-body" style={{ height: 240 }}>
            {revenueChart.length > 0
              ? <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => `₹${Number(c.raw).toLocaleString('en-IN')}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Poppins' }, color: 'var(--text-muted)', maxRotation: 0 } }, y: { grid: { color: 'var(--border-light)' }, ticks: { font: { size: 10, family: 'Poppins' }, color: 'var(--text-muted)', callback: (v: any) => `₹${Number(v).toLocaleString('en-IN')}` } } } }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}><IcCash /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No revenue data yet</span></div>}
          </div>
        </div>
        {/* Donut chart */}
        <div className="card">
          <div className="card-header"><h2>Booking Status</h2></div>
          <div className="card-body" style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusDist.length > 0
              ? <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10, family: 'Poppins' }, padding: 10, boxWidth: 10 } } }, cutout: '65%' }} />
              : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</div>}
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Recent Bookings */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Bookings</h2>
            <Link href="/bookings" className="btn btn-sm btn-secondary">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {isLoading ? Array(4).fill(null).map((_,i) => <tr key={i}><td colSpan={3}><div className="skeleton skel-text" /></td></tr>) :
                  recentBookings.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No bookings yet</td></tr> :
                  recentBookings.slice(0,6).map((b: any) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.customer?.name ?? b.customer_name ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td><StatusBadge s={b.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h2>Pending Approvals</h2>
            <Link href="/gardeners" className="btn btn-sm btn-secondary">Manage</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Gardener</th><th>Phone</th><th>Action</th></tr></thead>
              <tbody>
                {isLoading ? Array(4).fill(null).map((_,i) => <tr key={i}><td colSpan={3}><div className="skeleton skel-text" /></td></tr>) :
                  pendingApprovals.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No pending approvals</td></tr> :
                  pendingApprovals.slice(0,5).map((g: any) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{g.phone}</td>
                      <td><Link href={`/gardeners`} className="btn btn-xs btn-gold">Review</Link></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Open Complaints */}
      {openComplaints.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--error)', display: 'flex' }}><IcAlert /></span>
              Open Complaints ({openComplaints.length})
            </h2>
            <Link href="/complaints" className="btn btn-sm btn-danger">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Customer</th><th>Priority</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {openComplaints.slice(0,5).map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.type?.replace(/_/g,' ')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.customer?.name ?? '—'}</td>
                    <td><span className={`badge badge-${c.priority==='high'?'red':c.priority==='medium'?'orange':'gray'}`}>{c.priority}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td><span className="badge badge-yellow">{c.status?.replace(/_/g,' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
