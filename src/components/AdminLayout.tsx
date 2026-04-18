'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAdmin } from '@/store/admin';
import { AdminAPI } from '@/lib/api';
import AdminNotificationListener from './AdminNotificationListener';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, pathname]);

  // Close search on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await AdminAPI.search(q);
        setSearchResults(data);
        setSearchOpen(true);
      } catch { setSearchResults(null); }
    }, 300);
  }, []);

  if (pathname === '/login') return <>{children}</>;
  if (isLoading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--forest)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
      </div>
    </div>
  );
  if (!isAuthenticated) return null;

  return (
    <div className="admin-layout">
      <AdminNotificationListener />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="admin-main">
        <header className="admin-header">
          <button className="sidebar-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {/* Global Search */}
          <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 400, margin: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.82rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Search customers, gardeners, bookings..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults && setSearchOpen(true)}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit' }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults(null); setSearchOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && searchResults && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '400px', overflow: 'auto', padding: '0.5rem' }}>
                {searchResults.total === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No results found</div>
                ) : (
                  <>
                    {searchResults.customers?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customers</div>
                        {searchResults.customers.map((c: any) => (
                          <button key={`c-${c.id}`} onClick={() => { router.push(`/customers?id=${c.id}`); setSearchOpen(false); setSearchQuery(''); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.gardeners?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Gardeners</div>
                        {searchResults.gardeners.map((g: any) => (
                          <button key={`g-${g.id}`} onClick={() => { router.push(`/gardeners/${g.id}`); setSearchOpen(false); setSearchQuery(''); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontWeight: 600 }}>🌿 {g.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.bookings?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Bookings</div>
                        {searchResults.bookings.map((b: any) => (
                          <button key={`b-${b.id}`} onClick={() => { router.push(`/bookings/${b.id}`); setSearchOpen(false); setSearchQuery(''); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontWeight: 600 }}>#{b.booking_number}</span>
                            <span style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '0.7rem', background: 'var(--bg)', color: 'var(--text-muted)' }}>{b.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.orders?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Orders</div>
                        {searchResults.orders.map((o: any) => (
                          <button key={`o-${o.id}`} onClick={() => { router.push(`/shop-orders?id=${o.id}`); setSearchOpen(false); setSearchQuery(''); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontWeight: 600 }}>📦 {o.order_number}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>₹{o.total_amount}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="https://gkmapp.netlify.app/" target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 14px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              View Site
            </a>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
