'use client';
import { useState, useRef, useEffect } from 'react';
import { useNotifStore } from '@/store/notifications';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeColor: Record<string, string> = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};

export default function NotificationBell() {
  const { notifs, unread, markAllRead } = useNotifStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open) markAllRead();
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1.5px solid var(--border)',
          background: open ? 'var(--forest-light)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.15s',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--forest-light)'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as any).style.background = 'transparent'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 99,
            background: '#dc2626', color: '#fff',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #fff',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 440,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          zIndex: 500, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>Notifications</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>This session only</span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No notifications yet
              </div>
            ) : notifs.map((n, i) => (
              <div key={n.id + '-' + i} style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                  background: typeColor[n.type] || typeColor.info,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.body}</div>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
