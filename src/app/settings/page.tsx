'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminAPI, API_BASE, getToken } from '@/lib/api';
import toast from 'react-hot-toast';

type Setting = { id: number; key: string; value: string; updated_at: string };

const DEFAULT_SETTINGS = [
  { key: 'hero_tagline', label: 'Hero Tagline', description: 'Main tagline displayed on the website hero section' },
  { key: 'hero_subtitle', label: 'Hero Subtitle', description: 'Subtitle text under the tagline' },
  { key: 'min_order_amount', label: 'Min Order Amount (₹)', description: 'Minimum order amount for shop checkout' },
  { key: 'free_delivery_above', label: 'Free Delivery Above (₹)', description: 'Free delivery threshold for shop orders' },
  { key: 'delivery_charge', label: 'Delivery Charge (₹)', description: 'Standard delivery charge for shop orders' },
  { key: 'referral_bonus', label: 'Referral Bonus (₹)', description: 'Wallet credit for referrals' },
  { key: 'max_surge_multiplier', label: 'Max Surge Multiplier', description: 'Maximum surge pricing multiplier across all zones' },
  { key: 'support_phone', label: 'Support Phone', description: 'Customer support phone number' },
  { key: 'support_email', label: 'Support Email', description: 'Customer support email' },
  { key: 'play_store_url', label: 'Play Store URL', description: 'Google Play Store link for the customer app' },
  { key: 'gardener_app_url', label: 'Gardener App URL', description: 'Download link for the gardener app' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.settings();
      setSettings(data || []);
      const vals: Record<string, string> = {};
      (data || []).forEach((s: Setting) => { vals[s.key] = s.value; });
      setEditValues(vals);
    } catch { toast.error('Failed to load settings'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      await AdminAPI.updateSetting(key, editValues[key] || '');
      toast.success(`Setting "${key}" saved`);
      fetchSettings();
    } catch { toast.error('Failed to save setting'); }
    setSaving(null);
  };

  const exportCSV = (type: string) => {
    const token = getToken();
    const url = `${API_BASE}/admin/reports/export?type=${type}&format=csv`;
    // Open in new tab with auth header via fetch + download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success(`${type} report downloaded`);
      })
      .catch(() => toast.error('Failed to download report'));
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>System Settings</h1>

      {/* Export Reports */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>📊 Export Reports (CSV)</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { type: 'bookings', label: '📋 Bookings Report', color: '#3b82f6' },
            { type: 'orders', label: '📦 Orders Report', color: '#8b5cf6' },
            { type: 'earnings', label: '💰 Gardener Earnings', color: '#22c55e' },
            { type: 'customers', label: '👥 Customers Report', color: '#f59e0b' },
          ].map(({ type, label, color }) => (
            <button key={type} onClick={() => exportCSV(type)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: color, color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {label} ↓
            </button>
          ))}
      </div>

      {/* Social Proof Toast Config */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Social Proof Toast
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Show &quot;X just booked&quot; notifications on the website to build trust and urgency
            </p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => {
              const current = editValues['social_proof_enabled'] ?? 'true';
              const next = current === 'false' ? 'true' : 'false';
              setEditValues(prev => ({ ...prev, social_proof_enabled: next }));
              setSaving('social_proof_enabled');
              AdminAPI.updateSetting('social_proof_enabled', next)
                .then(() => { toast.success(`Social proof ${next === 'true' ? 'enabled' : 'disabled'}`); fetchSettings(); })
                .catch(() => toast.error('Failed to update'))
                .finally(() => setSaving(null));
            }}
            disabled={saving === 'social_proof_enabled'}
            style={{
              width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: (editValues['social_proof_enabled'] ?? 'true') !== 'false' ? '#16a34a' : 'var(--border)',
              position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
              opacity: saving === 'social_proof_enabled' ? 0.5 : 1,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: (editValues['social_proof_enabled'] ?? 'true') !== 'false' ? 27 : 3,
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {/* Timing config grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { key: 'social_proof_interval', label: 'Interval (ms)', desc: 'Time between toasts', placeholder: '8000' },
            { key: 'social_proof_delay', label: 'Initial Delay (ms)', desc: 'Wait before first toast', placeholder: '5000' },
            { key: 'social_proof_duration', label: 'Duration (ms)', desc: 'How long each toast shows', placeholder: '5000' },
            { key: 'social_proof_max_items', label: 'Max Items', desc: 'Max notifications to cycle', placeholder: '10' },
          ].map(({ key, label, desc, placeholder }) => {
            const current = editValues[key] || '';
            const saved = settings.find(s => s.key === key)?.value || '';
            const hasChanges = current !== saved;
            return (
              <div key={key} style={{ background: 'var(--bg)', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)' }}>
                <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.8rem', display: 'block', marginBottom: '0.15rem' }}>{label}</label>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{desc}</p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="number"
                    value={current}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.8rem', width: '100%' }}
                  />
                  <button
                    onClick={() => saveSetting(key)}
                    disabled={!hasChanges || saving === key}
                    style={{
                      padding: '0.4rem 0.7rem', borderRadius: '0.4rem', border: 'none',
                      background: hasChanges ? '#3b82f6' : 'var(--border)',
                      color: hasChanges ? '#fff' : 'var(--text-secondary)',
                      cursor: hasChanges ? 'pointer' : 'not-allowed',
                      fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
                      opacity: saving === key ? 0.5 : 1,
                    }}
                  >
                    {saving === key ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview description */}
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(22, 163, 74, 0.06)', borderRadius: '0.5rem', border: '1px solid rgba(22, 163, 74, 0.12)', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>Preview:</strong> Toast will appear after{' '}
          <strong>{((parseInt(editValues['social_proof_delay'] || '5000') || 5000) / 1000).toFixed(1)}s</strong>,
          show for <strong>{((parseInt(editValues['social_proof_duration'] || '5000') || 5000) / 1000).toFixed(1)}s</strong>,
          then repeat every <strong>{((parseInt(editValues['social_proof_interval'] || '8000') || 8000) / 1000).toFixed(1)}s</strong>,
          cycling through <strong>{editValues['social_proof_max_items'] || '10'}</strong> recent bookings.
        </div>
      </div>
      {/* Settings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading settings...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {DEFAULT_SETTINGS.map(({ key, label, description }) => {
            const current = editValues[key] || '';
            const saved = settings.find(s => s.key === key)?.value || '';
            const hasChanges = current !== saved;
            return (
              <div key={key} style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{label}</label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1.5 }}>
                    <input
                      type="text"
                      value={current}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Not set"
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem' }}
                    />
                    <button
                      onClick={() => saveSetting(key)}
                      disabled={!hasChanges || saving === key}
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: hasChanges ? '#3b82f6' : 'var(--border)', color: hasChanges ? '#fff' : 'var(--text-secondary)', cursor: hasChanges ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', opacity: saving === key ? 0.5 : 1 }}
                    >
                      {saving === key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
