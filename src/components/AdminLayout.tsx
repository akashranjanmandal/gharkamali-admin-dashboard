'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAdmin } from '@/store/admin';
import { AdminAPI } from '@/lib/api';
import AdminNotificationListener from './AdminNotificationListener';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';

// Matches the server default shown to customers when no custom message is set.
const DEFAULT_PAUSE_MESSAGE = "We're not serviceable right now — we'll be back very soon!";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<any>(null);

  // ── Operations kill-switch ──────────────────────────────────────────────────
  const [opsStatus, setOpsStatus] = useState<{ paused: boolean; message: string } | null>(null);
  const [opsModalOpen, setOpsModalOpen] = useState(false);
  const [opsMessage, setOpsMessage] = useState(DEFAULT_PAUSE_MESSAGE);
  const [opsSaving, setOpsSaving] = useState(false);

  // Poll operations status on mount + every 60s
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = () =>
      AdminAPI.getOperationsStatus()
        .then((s: any) => { if (!cancelled && s && typeof s.paused === 'boolean') setOpsStatus(s); })
        .catch(() => { /* keep last known state */ });
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isAuthenticated]);

  const openOpsModal = () => {
    if (!opsStatus) return;
    setOpsMessage(opsStatus.message || DEFAULT_PAUSE_MESSAGE);
    setOpsModalOpen(true);
  };

  const applyOpsStatus = async (paused: boolean, message?: string) => {
    setOpsSaving(true);
    try {
      const s: any = await AdminAPI.setOperationsStatus(paused ? { paused, message } : { paused });
      if (s && typeof s.paused === 'boolean') setOpsStatus(s);
      else setOpsStatus({ paused, message: message || DEFAULT_PAUSE_MESSAGE });
      setOpsModalOpen(false);
      toast.success(paused ? 'Operations paused — customers can no longer book or order.' : 'Operations resumed — you are live!');
    } catch (e: any) {
      toast.error(e?.message || 'Could not update operations status');
    } finally {
      setOpsSaving(false);
    }
  };

  useEffect(() => {
    if (isLoading || pathname === '/login') return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    // Supervisors should never see admin-only pages
    if (user?.role === 'supervisor' && !pathname.startsWith('/supervisor')) {
      router.replace('/supervisor/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, user]);

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
            <NotificationBell />
            {/* Operations status pill — click to pause/resume */}
            {opsStatus && (
              <button
                onClick={openOpsModal}
                title={opsStatus.paused ? 'Operations are paused — click to resume' : 'Operations are live — click to pause'}
                style={{
                  padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${opsStatus.paused ? 'rgba(220,38,38,0.35)' : 'var(--border)'}`,
                  background: opsStatus.paused ? 'rgba(220,38,38,0.08)' : 'transparent',
                  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit',
                  color: opsStatus.paused ? 'var(--error)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: opsStatus.paused ? 'var(--error)' : 'var(--success)',
                  boxShadow: opsStatus.paused ? '0 0 0 3px rgba(220,38,38,0.15)' : '0 0 0 3px rgba(22,163,74,0.15)',
                }} />
                {opsStatus.paused ? 'Paused' : 'Live'}
              </button>
            )}
            <a href="https://gharkamali.com/" target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 14px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              View Site
            </a>
          </div>
        </header>

        {/* Full-width paused banner — visible on every admin page while paused */}
        {opsStatus?.paused && (
          <div style={{
            background: 'var(--error)', color: '#fff', padding: '8px 28px',
            display: 'flex', alignItems: 'center', gap: 12,
            fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4,
          }}>
            <span style={{ flex: 1 }}>
              ⏸ Operations are PAUSED — customers currently see: "{opsStatus.message || DEFAULT_PAUSE_MESSAGE}"
            </span>
            <button
              onClick={() => applyOpsStatus(false)}
              disabled={opsSaving}
              style={{
                padding: '4px 16px', borderRadius: 99, border: 'none', flexShrink: 0,
                background: '#fff', color: 'var(--error)', fontWeight: 700, fontSize: '0.78rem',
                fontFamily: 'inherit', cursor: opsSaving ? 'default' : 'pointer', opacity: opsSaving ? 0.7 : 1,
              }}
            >
              {opsSaving ? 'Resuming…' : 'Resume'}
            </button>
          </div>
        )}

        <div className="admin-content">{children}</div>
      </main>

      {/* Pause / Resume confirm modal */}
      {opsModalOpen && opsStatus && (
        <div className="modal-overlay" onClick={() => !opsSaving && setOpsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{opsStatus.paused ? 'Resume operations?' : 'Pause operations?'}</h3>
              <button className="modal-close" onClick={() => setOpsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {opsStatus.paused ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Customers will immediately be able to book services and place orders again.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'var(--error)', fontWeight: 600, marginBottom: 14 }}>
                    Customers won't be able to book or order while paused.
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Customer-facing message</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={opsMessage}
                      onChange={e => setOpsMessage(e.target.value)}
                      placeholder={DEFAULT_PAUSE_MESSAGE}
                      style={{ resize: 'vertical', minHeight: 70 }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOpsModalOpen(false)} disabled={opsSaving}>Cancel</button>
              {opsStatus.paused ? (
                <button className="btn btn-primary" onClick={() => applyOpsStatus(false)} disabled={opsSaving}>
                  {opsSaving ? 'Resuming…' : 'Resume operations'}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={() => applyOpsStatus(true, opsMessage.trim() || undefined)} disabled={opsSaving}>
                  {opsSaving ? 'Pausing…' : 'Pause operations'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
