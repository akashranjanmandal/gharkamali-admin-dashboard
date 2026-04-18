'use client';
import { useState, useEffect } from 'react';
import { AdminAPI } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function GardenerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gardenerId = Number(params.id);
  const [gardener, setGardener] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'bookings' | 'zones' | 'bank'>('overview');
  const [zones, setZones] = useState<any[]>([]);
  const [allZones, setAllZones] = useState<any[]>([]);
  const [bankEditing, setBankEditing] = useState(false);
  const [bankData, setBankData] = useState({ bank_account: '', bank_ifsc: '', bank_name: '' });

  useEffect(() => {
    if (!gardenerId) return;
    (async () => {
      setLoading(true);
      try {
        const [g, z, az] = await Promise.all([
          AdminAPI.gardenerDetail(gardenerId),
          AdminAPI.gardenerZones(gardenerId).catch(() => []),
          AdminAPI.geofences().catch(() => []),
        ]);
        setGardener(g);
        setZones(Array.isArray(z) ? z : []);
        setAllZones(Array.isArray(az) ? az : []);
        if (g?.gardenerProfile) {
          setBankData({
            bank_account: g.gardenerProfile.bank_account || '',
            bank_ifsc: g.gardenerProfile.bank_ifsc || '',
            bank_name: g.gardenerProfile.bank_name || '',
          });
        }
      } catch { toast.error('Failed to load gardener'); }
      setLoading(false);
    })();
  }, [gardenerId]);

  const [selectedZones, setSelectedZones] = useState<number[]>([]);

  useEffect(() => {
    setSelectedZones(zones.map((z: any) => z.geofence_id || z.id));
  }, [zones]);

  const saveZones = async () => {
    try {
      await AdminAPI.assignGardenerZone(gardenerId, selectedZones);
      toast.success('Zones updated');
      const z = await AdminAPI.gardenerZones(gardenerId).catch(() => []);
      setZones(Array.isArray(z) ? z : []);
    } catch { toast.error('Failed to update zones'); }
  };

  const removeZone = async (geofenceId: number) => {
    try {
      await AdminAPI.removeGardenerZone(gardenerId, geofenceId);
      toast.success('Geofence removed');
      const z = await AdminAPI.gardenerZones(gardenerId).catch(() => []);
      setZones(Array.isArray(z) ? z : []);
    } catch { toast.error('Failed to remove zone'); }
  };

  const saveBankDetails = async () => {
    try {
      await AdminAPI.updateGardener(gardenerId, bankData);
      toast.success('Bank details updated');
      setBankEditing(false);
    } catch { toast.error('Failed to update bank details'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading gardener...</div>;
  if (!gardener) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Gardener not found</div>;

  const profile = gardener.gardenerProfile || {};

  return (
    <div>
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>
        ← Back to Gardeners
      </button>

      {/* Header */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff', fontWeight: 700 }}>
              {gardener.name?.[0]?.toUpperCase() || 'G'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>{gardener.name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{gardener.phone} • {gardener.city || 'No city'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: profile.is_available ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: profile.is_available ? '#22c55e' : '#ef4444' }}>
              {profile.is_available ? '🟢 Available' : '🔴 Unavailable'}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: gardener.is_approved ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: gardener.is_approved ? '#22c55e' : '#eab308' }}>
              {gardener.is_approved ? '✓ Approved' : '⏳ Pending'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {[
            { label: 'Rating', value: profile.rating ? `${Number(profile.rating).toFixed(1)} ★` : 'N/A', color: '#f59e0b' },
            { label: 'Total Jobs', value: profile.total_jobs || 0, color: '#3b82f6' },
            { label: 'Completed', value: profile.completed_jobs || 0, color: '#22c55e' },
            { label: 'Cancelled', value: profile.cancelled_jobs || 0, color: '#ef4444' },
            { label: 'Earnings', value: `₹${Number(profile.total_earnings || 0).toLocaleString()}`, color: '#22c55e' },
            { label: 'Experience', value: profile.experience_years ? `${profile.experience_years} yrs` : 'N/A', color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['overview', 'zones', 'bank'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: tab === t ? 'none' : '1px solid var(--border)', background: tab === t ? '#3b82f6' : 'var(--card-bg)', color: tab === t ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {t === 'bank' ? 'Bank Details' : t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>Profile Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Specialization:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{profile.specialization || 'General'}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Aadhar:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{profile.aadhar_number || '—'}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Address:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{profile.address || gardener.address || '—'}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Joined:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{new Date(gardener.created_at).toLocaleDateString()}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Supervisor:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{profile.supervisor?.name || 'Unassigned'}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Bio:</span> <span style={{ color: 'var(--text)', fontWeight: 500 }}>{profile.bio || '—'}</span></div>
          </div>
        </div>
      )}

      {tab === 'zones' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>Assigned Zones</h3>
          {zones.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No zones assigned yet</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {zones.map((z: any) => (
                <span key={z.id || z.geofence_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 }}>
                  {z.geofence?.name || z.name || `Geofence ${z.geofence_id}`}
                  <button onClick={() => removeZone(z.geofence_id || z.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <h4 style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Assigned Zones</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {zones.map((z: any) => (
              <span key={z.id || z.geofence_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 }}>
                {z.geofence?.name || z.name || `Geofence ${z.geofence_id}`}
              </span>
            ))}
          </div>
          <h4 style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Manage Zones</h4>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
            {allZones.map((az: any) => (
              <label key={az.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedZones.includes(az.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedZones(prev => [...prev, az.id]);
                    } else {
                      setSelectedZones(prev => prev.filter(id => id !== az.id));
                    }
                  }}
                />
                {az.name}
              </label>
            ))}
          </div>
          <button onClick={saveZones} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Save Zones</button>
        </div>
      )}

      {tab === 'bank' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text)' }}>Bank Details</h3>
            {!bankEditing && (
              <button onClick={() => setBankEditing(true)} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { label: 'Bank Name', key: 'bank_name' as const },
              { label: 'Account Number', key: 'bank_account' as const },
              { label: 'IFSC Code', key: 'bank_ifsc' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                {bankEditing ? (
                  <input type="text" value={bankData[key]} onChange={(e) => setBankData(prev => ({ ...prev, [key]: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem' }} />
                ) : (
                  <p style={{ color: 'var(--text)', fontSize: '0.9rem', fontFamily: key === 'bank_ifsc' ? 'monospace' : 'inherit' }}>{bankData[key] || '—'}</p>
                )}
              </div>
            ))}
          </div>
          {bankEditing && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={saveBankDetails} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Save</button>
              <button onClick={() => setBankEditing(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
