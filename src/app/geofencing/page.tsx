'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import type { LatLng } from '@/components/GeofenceMapPicker';

// Load map only client-side (Leaflet doesn't support SSR)
const GeofenceMapPicker = dynamic(() => import('@/components/GeofenceMapPicker'), { ssr: false });

const EMPTY_FORM = { name: '', city: '', state: '', is_active: true, polygon_coords: [] as LatLng[] };

export default function GeofencingPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null); // null | { new: true } | geofence object
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const geofences: any[] = Array.isArray(data) ? data : [];

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { ...form, polygon_coords: form.polygon_coords };
      return modal?.id
        ? AdminAPI.updateGeofence(modal.id, payload)
        : AdminAPI.createGeofence(payload);
    },
    onSuccess: () => {
      toast.success(modal?.id ? 'Geofence updated' : 'Geofence created');
      setModal(null);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ['admin-geofences'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteGeofence(id),
    onSuccess: () => { toast.success('Geofence deleted'); qc.invalidateQueries({ queryKey: ['admin-geofences'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setForm(EMPTY_FORM); setModal({ new: true }); };
  const openEdit = (g: any) => {
    let pts: LatLng[] = [];
    try { pts = typeof g.polygon_coords === 'string' ? JSON.parse(g.polygon_coords) : (g.polygon_coords || []); } catch {}
    setForm({ name: g.name, city: g.city, state: g.state || '', is_active: g.is_active, polygon_coords: pts });
    setModal(g);
  };
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const getPolygonPoints = (g: any): LatLng[] => {
    try { return typeof g.polygon_coords === 'string' ? JSON.parse(g.polygon_coords) : (g.polygon_coords || []); } catch { return []; }
  };

  const canSave = form.name && form.city && form.polygon_coords.length >= 3;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Geofencing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Draw serviceable polygon areas that define where customers can book gardening services.
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">+ New Area</button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem' }}>🗺️</span>
        <div>
          <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.9rem', marginBottom: 3 }}>How Geofencing Works</div>
          <div style={{ color: '#166534', fontSize: '0.82rem', lineHeight: 1.6 }}>
            Draw polygon areas on the map by clicking to add vertices. Customers booking from within an active polygon will be confirmed as serviceable. Areas complement the existing radius-based zones.
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Areas', value: geofences.length, icon: '🗺️' },
          { label: 'Active', value: geofences.filter(g => g.is_active).length, icon: '✅' },
          { label: 'Inactive', value: geofences.filter(g => !g.is_active).length, icon: '⏸️' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--forest)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Geofence Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {isLoading
          ? Array(4).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)
          : geofences.length === 0
            ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺️</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No geofences yet</div>
                  <div style={{ fontSize: '0.85rem' }}>Click "+ New Area" to draw your first serviceable polygon.</div>
                </div>
              )
            : geofences.map((g: any) => {
                const pts = getPolygonPoints(g);
                return (
                  <div key={g.id} style={{ background: '#fff', borderRadius: 20, border: `1.5px solid ${g.is_active ? 'var(--border)' : 'rgba(220,38,38,0.2)'}`, overflow: 'hidden', opacity: g.is_active ? 1 : 0.8 }}>
                    {/* Card header */}
                    <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{g.name}</h3>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{g.city}{g.state ? `, ${g.state}` : ''}</div>
                        </div>
                        <span className={`badge ${g.is_active ? 'badge-green' : 'badge-red'}`}>{g.is_active ? 'Active' : 'Off'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)' }}>
                          📍 {pts.length} vertices
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, color: pts.length >= 3 ? '#14532d' : '#b45309' }}>
                          {pts.length >= 3 ? '✓ Valid polygon' : '⚠ Incomplete'}
                        </div>
                      </div>
                    </div>

                    {/* Mini map preview toggle */}
                    {previewId === g.id && pts.length >= 3 && (
                      <div style={{ padding: '0 12px 12px' }}>
                        <GeofenceMapPicker points={pts} onChange={() => {}} readOnly />
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      {pts.length >= 3 && (
                        <button
                          onClick={() => setPreviewId(previewId === g.id ? null : g.id)}
                          className="btn btn-sm btn-ghost"
                          style={{ flex: 1 }}
                        >
                          {previewId === g.id ? 'Hide Map' : '🗺 Preview'}
                        </button>
                      )}
                      <button onClick={() => openEdit(g)} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Edit</button>
                      <button
                        onClick={() => window.confirm(`Delete geofence "${g.name}"?`) && deleteMut.mutate(g.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(null); setForm(EMPTY_FORM); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '95vw' }}>
            <div className="modal-header">
              <h3>{modal.new ? '🗺️ New Serviceable Area' : `Edit: ${modal.name}`}</h3>
              <button className="modal-close" onClick={() => { setModal(null); setForm(EMPTY_FORM); }}>✕</button>
            </div>

            <div className="modal-body">
              {/* Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>Area Name *</label>
                  <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Koramangala South" />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input className="input" value={form.city} onChange={e => f('city', e.target.value)} placeholder="Bangalore" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>State</label>
                  <input className="input" value={form.state} onChange={e => f('state', e.target.value)} placeholder="Karnataka" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                  <input type="checkbox" id="gf-active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--forest)', cursor: 'pointer' }} />
                  <label htmlFor="gf-active" style={{ marginBottom: 0, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Area Active</label>
                </div>
              </div>

              {/* Map */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Draw Polygon <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— click on the map to add vertices</span>
                </label>
                <GeofenceMapPicker
                  points={form.polygon_coords}
                  onChange={pts => f('polygon_coords', pts)}
                />
              </div>

              {form.polygon_coords.length < 3 && form.polygon_coords.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#b45309', background: 'rgba(251,191,36,0.1)', padding: '6px 12px', borderRadius: 8, marginTop: 6 }}>
                  ⚠️ Add at least 3 points to form a valid polygon ({form.polygon_coords.length}/3)
                </div>
              )}
              {form.polygon_coords.length >= 3 && (
                <div style={{ fontSize: '0.78rem', color: '#14532d', background: 'rgba(22,163,74,0.1)', padding: '6px 12px', borderRadius: 8, marginTop: 6 }}>
                  ✓ Polygon ready — {form.polygon_coords.length} vertices
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setModal(null); setForm(EMPTY_FORM); }} className="btn btn-ghost">Cancel</button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !canSave}
                className="btn btn-primary"
              >
                {saveMut.isPending ? 'Saving…' : modal.new ? 'Create Geofence' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
