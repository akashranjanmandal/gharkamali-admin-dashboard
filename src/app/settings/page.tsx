'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

type Setting = { id: number; key: string; value: string; updated_at: string };

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

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await AdminAPI.updateSetting(key, value || '');
      toast.success(`Updated ${key.replace(/_/g, ' ')}`);
      fetchSettings();
    } catch { toast.error('Failed to save'); }
    setSaving(null);
  };

  const isEnabled = (editValues['social_proof_enabled'] ?? 'true') !== 'false';

  if (loading && settings.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--forest)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Website Notifications</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage real-time social proof and visitor notifications to build trust.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Master Toggle Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--forest)', marginBottom: '4px' }}>
                Social Proof System
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Enable or disable all real-time notifications on the website.
              </p>
            </div>
            <button
              onClick={() => saveSetting('social_proof_enabled', isEnabled ? 'false' : 'true')}
              disabled={saving === 'social_proof_enabled'}
              style={{
                width: '52px', height: '28px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: isEnabled ? 'var(--success)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                opacity: saving === 'social_proof_enabled' ? 0.5 : 1
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px',
                left: isEnabled ? '27px' : '3px',
                transition: 'left 0.2s var(--ease)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>

        {isEnabled && (
          <>
            {/* Templates Card */}
            <div className="card">
              <div className="card-header">
                <h2>Message Templates</h2>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div className="form-group">
                  <label>Booking Notification Template</label>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '8px' }}>
                    Available tags: <strong>{'{name}'}</strong> (First Name), <strong>{'{city}'}</strong>, <strong>{'{service}'}</strong>, <strong>{'{time}'}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="input"
                      type="text"
                      value={editValues['social_proof_booking_template'] || ''}
                      onChange={(e) => setEditValues({ ...editValues, social_proof_booking_template: e.target.value })}
                      placeholder="{name} from {city} just booked {service}"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => saveSetting('social_proof_booking_template', editValues['social_proof_booking_template'])}
                      disabled={saving === 'social_proof_booking_template'}
                    >
                      {saving === 'social_proof_booking_template' ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Visitor Activity Template</label>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '8px' }}>
                    Static message shown to simulate live visitor traffic.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="input"
                      type="text"
                      value={editValues['social_proof_visitor_template'] || ''}
                      onChange={(e) => setEditValues({ ...editValues, social_proof_visitor_template: e.target.value })}
                      placeholder="10+ people are viewing this page right now"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => saveSetting('social_proof_visitor_template', editValues['social_proof_visitor_template'])}
                      disabled={saving === 'social_proof_visitor_template'}
                    >
                      {saving === 'social_proof_visitor_template' ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Timings Card */}
            <div className="card">
              <div className="card-header">
                <h2>Display Configuration</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                  {[
                    { key: 'social_proof_delay', label: 'Initial Delay (ms)', placeholder: '5000' },
                    { key: 'social_proof_duration', label: 'Show Duration (ms)', placeholder: '5000' },
                    { key: 'social_proof_interval', label: 'Wait Interval (ms)', placeholder: '8000' },
                    { key: 'social_proof_max_items', label: 'History Items', placeholder: '10' },
                  ].map((field) => (
                    <div className="form-group" key={field.key} style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{field.label}</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          className="input"
                          type="number"
                          style={{ padding: '7px 10px' }}
                          value={editValues[field.key] || ''}
                          onChange={(e) => setEditValues({ ...editValues, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                        />
                        <button
                          className="btn-icon"
                          onClick={() => saveSetting(field.key, editValues[field.key])}
                          disabled={saving === field.key}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Hint */}
            <div style={{ 
              background: 'var(--forest-light)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '1.4rem' }}>💡</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Notifications will show for <strong>{((parseInt(editValues['social_proof_duration'] || '5000')) / 1000).toFixed(1)}s</strong>, 
                then wait <strong>{((parseInt(editValues['social_proof_interval'] || '8000')) / 1000).toFixed(1)}s</strong> 
                before the next one. Order: <strong>Randomized</strong>.
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          GKM Admin Dashboard &bull; Settings v2.0
        </p>
      </div>
    </div>
  );
}