'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import type { LatLng } from '@/components/GeofenceMapPicker';

const GeofenceMapPicker = dynamic(() => import('@/components/GeofenceMapPicker'), { ssr: false });

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'
];

const EMPTY_FORM = {
  name: '', city: '', state: '',
  base_price: '', price_per_plant: '0', min_plants: '1',
  product_markup: '0',
  is_active: true,
  polygon_coords: [] as LatLng[],
};

export default function GeofencingPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const geofences: any[] = Array.isArray(data) ? data : [];

  const closeModal = () => { setModal(null); setForm(EMPTY_FORM); };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name, city: form.city, state: form.state,
        base_price: parseFloat(form.base_price) || 0,
        price_per_plant: parseFloat(form.price_per_plant) || 0,
        min_plants: parseInt(form.min_plants) || 1,
        product_markup: parseFloat(form.product_markup) || 0,
        is_active: form.is_active,
        polygon_coords: form.polygon_coords,
      };
      return modal?.id ? AdminAPI.updateGeofence(modal.id, payload) : AdminAPI.createGeofence(payload);
    },
    onSuccess: () => {
      toast.success(modal?.id ? 'Zone updated' : 'Zone created');
      closeModal();
      qc.invalidateQueries({ queryKey: ['admin-geofences'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteGeofence(id),
    onSuccess: () => { toast.success('Zone deleted'); qc.invalidateQueries({ queryKey: ['admin-geofences'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setForm(EMPTY_FORM); setModal({ new: true }); };
  const openEdit = (g: any) => {
    let pts: LatLng[] = [];
    try { pts = typeof g.polygon_coords === 'string' ? JSON.parse(g.polygon_coords) : (g.polygon_coords || []); } catch {}
    setForm({
      name: g.name, city: g.city, state: g.state || '',
      base_price: String(g.base_price ?? ''),
      price_per_plant: String(g.price_per_plant ?? '0'),
      min_plants: String(g.min_plants ?? '1'),
      product_markup: String(g.product_markup ?? '0'),
      is_active: g.is_active,
      polygon_coords: pts,
    });
    setModal(g);
  };
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const getPts = (g: any): LatLng[] => {
    try { return typeof g.polygon_coords === 'string' ? JSON.parse(g.polygon_coords) : (g.polygon_coords || []); } catch { return []; }
  };

  const canSave = form.name && form.city && form.polygon_coords.length >= 3 && form.base_price;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Service Areas (Geofencing)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Draw polygon boundaries to define serviceable areas and pricing.
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">+ New Zone</button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem' }}>🗺️</span>
        <div>
          <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.9rem', marginBottom: 3 }}>Polygon Geofencing</div>
          <div style={{ color: '#166534', fontSize: '0.82rem', lineHeight: 1.6 }}>
            Click on the map to place vertices — you can add <strong>as many points as needed</strong> for highly accurate coverage boundaries (minimum 3). Drag any vertex to refine the shape. Each zone includes pricing that the booking system uses to calculate costs.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Zones', value: geofences.length, icon: '🗺️' },
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

      {/* Zone Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        {isLoading
          ? Array(4).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />)
          : geofences.length === 0
            ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺️</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No service zones yet</div>
                  <div style={{ fontSize: '0.85rem' }}>Click "+ New Zone" to draw your first serviceable area on the map.</div>
                </div>
              )
            : geofences.map((g: any) => {
                const pts = getPts(g);
                return (
                  <div key={g.id} style={{ background: '#fff', borderRadius: 20, border: `1.5px solid ${g.is_active ? 'var(--border)' : 'rgba(220,38,38,0.2)'}`, overflow: 'hidden', opacity: g.is_active ? 1 : 0.8 }}>
                    {/* Header */}
                    <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{g.name}</h3>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{g.city}{g.state ? `, ${g.state}` : ''}</div>
                        </div>
                        <span className={`badge ${g.is_active ? 'badge-green' : 'badge-red'}`}>{g.is_active ? 'Active' : 'Off'}</span>
                      </div>

                      {/* Pricing grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[
                          { l: 'Base Price', v: g.base_price != null ? `₹${g.base_price}` : '—' },
                          { l: 'Per Plant', v: g.price_per_plant != null ? `₹${g.price_per_plant}` : '—' },
                          { l: 'Min Plants', v: g.min_plants ?? '—' },
                          { l: 'Prod Surge', v: g.product_markup != null ? `+₹${g.product_markup}` : '—' },
                        ].map(s => (
                          <div key={s.l} style={{ background: 'var(--bg)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{s.l}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{s.v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)' }}>
                          📍 {pts.length} vertices
                        </div>
                        <div style={{ background: pts.length >= 3 ? 'rgba(22,163,74,0.08)' : 'rgba(234,179,8,0.1)', borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: pts.length >= 3 ? '#14532d' : '#92400e' }}>
                          {pts.length >= 3 ? '✓ Valid polygon' : '⚠ Needs 3+ vertices'}
                        </div>
                      </div>
                    </div>

                    {/* Inline map preview */}
                    {previewId === g.id && pts.length >= 3 && (
                      <div style={{ padding: '0 12px 12px' }}>
                        <GeofenceMapPicker points={pts} onChange={() => {}} readOnly />
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      {pts.length >= 3 && (
                        <button onClick={() => setPreviewId(previewId === g.id ? null : g.id)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>
                          {previewId === g.id ? 'Hide Map' : '🗺 Preview'}
                        </button>
                      )}
                      <button onClick={() => openEdit(g)} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Edit</button>
                      <button onClick={() => window.confirm(`Delete zone "${g.name}"?`) && deleteMut.mutate(g.id)} className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </div>
                );
              })}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '95vw' }}>
            <div className="modal-header">
              <h3>{modal.new ? '🗺️ New Service Zone' : `Edit Zone: ${modal.name}`}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">

              {/* Name + City */}
              <div className="form-row">
                <div className="form-group">
                  <label>Zone Name *</label>
                  <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Koramangala South" />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input className="input" value={form.city} onChange={e => f('city', e.target.value)} placeholder="Bangalore" />
                </div>
              </div>

              {/* State + Active */}
              <div className="form-row">
                <div className="form-group">
                  <label>State *</label>
                  <select className="input" value={form.state} onChange={e => f('state', e.target.value)}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                  <input type="checkbox" id="gf-active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--forest)', cursor: 'pointer' }} />
                  <label htmlFor="gf-active" style={{ marginBottom: 0, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Zone Active</label>
                </div>
              </div>

              {/* Pricing */}
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label>Base Price (₹) *</label>
                  <input type="number" className="input" value={form.base_price} onChange={e => f('base_price', e.target.value)} placeholder="e.g. 299" min="0" />
                </div>
                <div className="form-group">
                  <label>Price per Plant (₹)</label>
                  <input type="number" className="input" value={form.price_per_plant} onChange={e => f('price_per_plant', e.target.value)} placeholder="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Product Markup (₹)</label>
                  <input type="number" className="input" value={form.product_markup} onChange={e => f('product_markup', e.target.value)} placeholder="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Min Plants</label>
                  <input type="number" className="input" value={form.min_plants} onChange={e => f('min_plants', e.target.value)} placeholder="1" min="1" />
                </div>
              </div>

              {/* Map */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Draw Zone Boundary{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    — click to add vertices (3 minimum, unlimited maximum)
                  </span>
                </label>
                <GeofenceMapPicker points={form.polygon_coords} onChange={pts => f('polygon_coords', pts)} />
              </div>

              {form.polygon_coords.length > 0 && form.polygon_coords.length < 3 && (
                <div style={{ fontSize: '0.78rem', color: '#b45309', background: 'rgba(251,191,36,0.08)', padding: '6px 12px', borderRadius: 8, marginTop: 6 }}>
                  ⚠️ {form.polygon_coords.length}/3 points — add {3 - form.polygon_coords.length} more to form a valid polygon
                </div>
              )}
              {form.polygon_coords.length >= 3 && (
                <div style={{ fontSize: '0.78rem', color: '#14532d', background: 'rgba(22,163,74,0.08)', padding: '6px 12px', borderRadius: 8, marginTop: 6 }}>
                  ✓ Polygon ready — {form.polygon_coords.length} vertices. You can keep adding more for a more precise boundary.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeModal} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSave} className="btn btn-primary">
                {saveMut.isPending ? 'Saving…' : modal.new ? 'Create Zone' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
