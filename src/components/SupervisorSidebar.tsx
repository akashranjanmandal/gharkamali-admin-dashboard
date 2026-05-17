'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/store/admin';

const icons: Record<string, JSX.Element> = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  gardeners: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  add: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  bookings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  complaints: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  rewards: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const NAV = [
  { href: '/supervisor/dashboard',    icon: 'dashboard',  label: 'Dashboard' },
  { href: '/supervisor/gardeners',    icon: 'gardeners',  label: 'My Gardeners' },
  { href: '/supervisor/add-gardener', icon: 'add',        label: 'Add Gardener' },
  { href: '/supervisor/bookings',     icon: 'bookings',   label: 'Bookings' },
  { href: '/supervisor/complaints',   icon: 'complaints', label: 'Complaints' },
  { href: '/supervisor/rewards',      icon: 'rewards',    label: 'Rewards & Penalties' },
];

export default function SupervisorSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAdmin();

  return (
    <aside className={`admin-sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ background: 'rgba(76,57,171,0.18)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c7b8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-logo-text">GKM Supervisor</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)', fontWeight: 500, letterSpacing: '0.04em' }}>Team management</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sidebar-close-btn" aria-label="Close menu" style={{ marginLeft: 'auto' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Supervisor</div>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`} onClick={onClose}>
              <span className="sidebar-icon">{icons[item.icon]}</span>
              <span>{item.label}</span>
              {active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#c7b8ff', flexShrink: 0 }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b2a8c, #4c39ab)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, border: '2px solid var(--border)' }}>{user?.name?.[0]?.toUpperCase() ?? 'S'}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{user?.name ?? 'Supervisor'}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role ?? 'supervisor'}</div>
          </div>
        </div>
        <button onClick={logout}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.06)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.12)', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {icons.logout}
          Sign Out
        </button>
      </div>
    </aside>
  );
}
