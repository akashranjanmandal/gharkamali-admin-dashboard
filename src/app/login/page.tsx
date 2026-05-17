'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { adminLogin } from '@/lib/api';
import { useAdmin } from '@/store/admin';

type Role = 'admin' | 'supervisor';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAdmin();
  const [role, setRole] = useState<Role>('admin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(user?.role === 'supervisor' ? '/supervisor/dashboard' : '/dashboard');
    }
  }, [isAuthenticated, user]);

  const handleLogin = async () => {
    if (!phone.trim() || !password) { toast.error('Enter phone and password'); return; }
    setLoading(true);
    try {
      const res: any = await adminLogin(phone.trim(), password);
      if (!['admin', 'supervisor'].includes(res?.user?.role)) {
        toast.error('Access denied. Admin or supervisor only.');
        return;
      }
      if (res.user.role !== role) {
        toast.error(`This account is a ${res.user.role}. Switch the tab to "${res.user.role === 'admin' ? 'Admin' : 'Supervisor'}" to log in.`);
        return;
      }
      login(res.user, res.token);
      toast.success('Welcome back!');
      router.replace(res.user.role === 'supervisor' ? '/supervisor/dashboard' : '/dashboard');
    } catch (e: any) { toast.error(e.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const isSup = role === 'supervisor';
  const gradient = isSup
    ? 'linear-gradient(150deg, #2c1d6b 0%, #3b2a8c 55%, #4c39ab 100%)'
    : 'linear-gradient(150deg, #02340f 0%, #03411a 55%, #054d20 100%)';
  const accent = isSup ? '#4c39ab' : 'var(--forest)';

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '45vh', background: gradient, clipPath: 'ellipse(130% 100% at 50% 0%)', zIndex: 0, transition: 'background 0.4s' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 4 5.5 4 9.5c0 5.5 8 12.5 8 12.5s8-7 8-12.5C20 5.5 16 2 12 2z" fill="white" opacity=".9"/>
              <path d="M12 7c-1.5 1.5-2 3-2 4 0 1.5 1 2.5 2 3 1-.5 2-1.5 2-3 0-1-.5-2.5-2-4z" fill="#edcf87"/>
            </svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>GKM {isSup ? 'Supervisor' : 'Admin'}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: 4 }}>{isSup ? 'Supervisor Portal' : 'Management Dashboard'}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: '28px 32px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          {/* Slider tabs */}
          <div style={{ position: 'relative', background: 'var(--bg-subtle, #f5f5f5)', borderRadius: 14, padding: 4, display: 'flex', marginBottom: 22 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: isSup ? '50%' : 4,
                width: 'calc(50% - 4px)',
                borderRadius: 10,
                background: accent,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'left 0.28s cubic-bezier(.4,0,.2,1), background 0.4s',
              }}
            />
            <button
              type="button"
              onClick={() => setRole('admin')}
              style={{ position: 'relative', zIndex: 1, flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: role === 'admin' ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'color 0.25s' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole('supervisor')}
              style={{ position: 'relative', zIndex: 1, flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: role === 'supervisor' ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'color 0.25s' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Supervisor
            </button>
          </div>

          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 24, letterSpacing: '-0.02em' }}>Sign In</h1>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg)', transition: 'border-color 0.2s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = accent)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-2)', borderRight: '1.5px solid var(--border)', background: 'var(--bg-subtle)', whiteSpace: 'nowrap' }}>+91</div>
              <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="9999999999" onKeyDown={e => e.key === 'Enter' && document.getElementById('pass-input')?.focus()}
                style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Poppins', fontSize: '0.9rem' }} autoFocus />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="pass-input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', padding: '9px 42px 9px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'Poppins', fontSize: '0.9rem', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: 99, background: accent, color: '#fff', border: 'none', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, opacity: loading ? 0.7 : 1, transition: 'background 0.3s' }}>
            {loading ? <><div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Signing in...</> : <>Sign in as {isSup ? 'Supervisor' : 'Admin'} →</>}
          </button>
          {!isSup ? (
            <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(3,65,26,0.04)', borderRadius: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong>Dev credentials:</strong> Phone: 9999999999 / Password: Admin@123
            </div>
          ) : (
            <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(76,57,171,0.06)', borderRadius: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Supervisor accounts are created by an admin.
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
