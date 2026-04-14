'use client';
import { useState, useEffect } from 'react';
import { AdminAPI } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type BookingLog = {
  id: number;
  event_type: string;
  description: string;
  actor_role: string;
  meta: any;
  created_at: string;
  actor?: { id: number; name: string; role: string };
};

const EVENT_ICONS: Record<string, string> = {
  created: '📝', assigned: '👤', en_route: '🚗', arrived: '📍',
  otp_sent: '📱', otp_accepted: '✅', in_progress: '🌿', completed: '🎉',
  cancelled: '❌', failed: '⚠️', reassigned: '🔄', rescheduled: '📅',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  assigned: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  en_route: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  arrived: { bg: 'rgba(236,72,153,0.15)', color: '#ec4899' },
  in_progress: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  completed: { bg: 'rgba(34,197,94,0.2)', color: '#16a34a' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params.id);
  const [booking, setBooking] = useState<any>(null);
  const [logs, setLogs] = useState<BookingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      setLoading(true);
      try {
        const [b, l] = await Promise.all([
          AdminAPI.bookingDetail(bookingId),
          AdminAPI.bookingLogs(bookingId).catch(() => []),
        ]);
        setBooking(b);
        setLogs(Array.isArray(l) ? l : []);
      } catch { toast.error('Failed to load booking'); }
      setLoading(false);
    })();
  }, [bookingId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading booking...</div>;
  if (!booking) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Booking not found</div>;

  const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;

  return (
    <div>
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>
        ← Back to Bookings
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            Booking #{booking.booking_number || booking.id}
          </h1>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: sc.bg, color: sc.color, marginTop: '0.25rem' }}>
            {booking.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Booking Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Customer Info */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👤 Customer</h3>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>{booking.customer?.name || '—'}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{booking.customer?.phone || '—'}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{booking.customer?.city || '—'}</p>
        </div>

        {/* Gardener Info */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🌿 Gardener</h3>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>{booking.gardener?.name || 'Unassigned'}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{booking.gardener?.phone || '—'}</p>
        </div>

        {/* Schedule & Payment */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Schedule & Payment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : '—'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{booking.scheduled_time || 'Morning'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Plants:</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{booking.plant_count || '—'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>₹{Number(booking.total_amount || 0).toLocaleString()}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Payment:</span>
            <span style={{ color: booking.payment_status === 'paid' ? '#22c55e' : '#eab308', fontWeight: 600 }}>{booking.payment_status || 'pending'}</span>
          </div>
        </div>

        {/* Service Address */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Service Address</h3>
          <p style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5 }}>{booking.service_address || '—'}</p>
          {booking.customer_notes && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}>Note: {booking.customer_notes}</p>
          )}
        </div>
      </div>

      {/* Booking Logs Timeline */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>📋 Activity Timeline</h3>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No activity logs yet</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '2rem' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: '0.6rem', top: '0.5rem', bottom: '0.5rem', width: '2px', background: 'var(--border)' }} />
            {logs.map((log, i) => (
              <div key={log.id} style={{ position: 'relative', marginBottom: i === logs.length - 1 ? 0 : '1.25rem', paddingLeft: '0.5rem' }}>
                {/* Dot */}
                <div style={{ position: 'absolute', left: '-1.65rem', top: '0.15rem', width: '1.25rem', height: '1.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', background: 'var(--card-bg)', border: '2px solid var(--border)', zIndex: 1 }}>
                  {EVENT_ICONS[log.event_type] || '•'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>
                      {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{log.description}</p>
                  )}
                  {log.actor && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      by {log.actor.name} ({log.actor.role})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
