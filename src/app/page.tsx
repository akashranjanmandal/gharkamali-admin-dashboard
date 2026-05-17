'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('gkm_admin_token');
    const raw = localStorage.getItem('gkm_admin_user');
    if (!token || !raw) { router.replace('/login'); return; }
    try {
      const u = JSON.parse(raw);
      if (u.role === 'supervisor') router.replace('/supervisor/dashboard');
      else if (u.role === 'admin') router.replace('/dashboard');
      else router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }, [router]);
  return <div style={{ minHeight: '100svh', background: 'var(--bg)' }} />;
}
