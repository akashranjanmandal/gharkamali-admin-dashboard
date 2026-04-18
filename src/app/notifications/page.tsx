'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { IconBell, IconSend, IconUsers, IconMapPin, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export default function NotificationsPage() {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
    geofence_id: '',
    target_role: 'customer'
  });

  const { data: geofences } = useQuery({ 
    queryKey: ['admin-geofences'], 
    queryFn: AdminAPI.geofences 
  });

  const sendMut = useMutation({
    mutationFn: () => AdminAPI.sendBroadcast({
      ...form,
      geofence_id: form.geofence_id ? parseInt(form.geofence_id) : undefined
    }),
    onSuccess: () => {
      toast.success('Broadcast sent successfully!');
      setForm({ ...form, title: '', body: '' }); // Clear title and body
    },
    onError: (e: any) => toast.error(e.message || 'Failed to send broadcast')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error('Please fill Title and Message');
    sendMut.mutate();
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Broadcast Notifications</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Send real-time alerts to customers and gardeners.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Notification Title</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. 🌧️ Service Update: Heavy Rain Expected"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Message Body</label>
              <textarea 
                className="input" 
                rows={4} 
                placeholder="Write your message here..."
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label className="label">Alert Type</label>
                <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="error">Critical (Red)</option>
                </select>
              </div>
              <div>
                <label className="label">Target Audience</label>
                <select className="input" value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}>
                  <option value="customer">Customers Only</option>
                  <option value="gardener">Gardeners Only</option>
                  <option value="all">Everyone</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Target Location (Optional)</label>
              <select 
                className="input" 
                value={form.geofence_id} 
                onChange={e => setForm({ ...form, geofence_id: e.target.value })}
              >
                <option value="">Global (All Locations)</option>
                {Array.isArray(geofences) && geofences.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name} - {g.city}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 6 }}>
                If selected, only users currently active in this zone will receive the alert.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', gap: 8 }}
              disabled={sendMut.isPending}
            >
              <IconSend size={18} />
              {sendMut.isPending ? 'Sending Broadcast...' : 'Fire Notification'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 20, background: 'var(--bg)', border: 'none' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconInfoCircle size={18} color="var(--forest)" />
              How it works
            </h3>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 18 }}>
              <li><strong>Real-time:</strong> Users on the website see the notification instantly via Socket.io.</li>
              <li><strong>History:</strong> Notifications are saved to the user's dashboard for later viewing.</li>
              <li><strong>Geofencing:</strong> Targeted alerts only show up for users in specific service zones.</li>
            </ul>
          </div>

          <div className="card" style={{ padding: 20, borderColor: 'var(--warning-light)', background: 'rgba(245, 158, 11, 0.03)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#b45309' }}>
              <IconAlertTriangle size={18} />
              Best Practices
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
              Avoid spamming global alerts. Use geofencing for local weather updates or regional special offers to maintain high engagement.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
