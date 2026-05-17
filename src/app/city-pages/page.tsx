'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

// Global template stored as a single system setting (JSON string).
const TEMPLATE_KEY = 'city_seo_template';

const DEFAULT_TEMPLATE = {
  title: 'Best Gardeners in {city} | GharKaMali',
  h1: 'Professional Gardening Services in {city}',
  meta_description:
    'Hire trusted gardeners in {city} for lawn care, plant maintenance, and garden setup. Book online with GharKaMali.',
  about_text:
    'GharKaMali brings expert gardening services to {city}. From regular plant care to one-time setup, our verified gardeners cover every corner of {city} — fast, reliable, and affordable.',
  meta_keywords: 'gardener in {city}, gardening service {city}, plant care {city}',
};

type TplKey = keyof typeof DEFAULT_TEMPLATE;
const TPL_FIELDS: { k: TplKey; label: string; rows?: number }[] = [
  { k: 'title', label: 'SEO Browser Title' },
  { k: 'h1', label: 'H1 Page Heading' },
  { k: 'meta_description', label: 'Meta Description', rows: 2 },
  { k: 'meta_keywords', label: 'Meta Keywords' },
  { k: 'about_text', label: 'About / Body Text', rows: 5 },
];

export default function CityPagesAdmin() {
  const qc = useQueryClient();

  // Load existing template (system setting). Falls back to defaults.
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: AdminAPI.settings });
  const [tpl, setTpl] = useState(DEFAULT_TEMPLATE);
  const [previewCity, setPreviewCity] = useState('Noida');

  useEffect(() => {
    if (!settings) return;
    // settings is either an object map or list of {key, value}; handle both
    let raw: any = null;
    if (Array.isArray(settings)) raw = settings.find((s: any) => s.key === TEMPLATE_KEY)?.value;
    else if (typeof settings === 'object') raw = (settings as any)[TEMPLATE_KEY];
    if (!raw) return;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setTpl({ ...DEFAULT_TEMPLATE, ...parsed });
    } catch { /* ignore */ }
  }, [settings]);

  const saveTplMut = useMutation({
    mutationFn: () => AdminAPI.updateSetting(TEMPLATE_KEY, JSON.stringify(tpl)),
    onSuccess: () => { toast.success('Global template saved'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: pagesData, isLoading } = useQuery({ queryKey: ['admin-city-pages'], queryFn: () => AdminAPI.cityPages() });
  const pages: any[] = (pagesData as any) ?? [];

  const upsertMut = useMutation({
    mutationFn: (payload: any) => AdminAPI.upsertCityPage(payload),
    onSuccess: () => { toast.success('City updated'); qc.invalidateQueries({ queryKey: ['admin-city-pages'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newCity, setNewCity] = useState('');

  const render = (s: string, city: string) => (s || '').replace(/\{city\}/gi, city);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">City SEO Pages</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Define ONE global template — every city renders from it with <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>{'{city}'}</code> replaced.
          </p>
        </div>
      </div>

      {/* ── Global Template Editor ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>🌍 Global City SEO Template</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Used by every city page. Use <code>{'{city}'}</code> as a placeholder.</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          <div>
            {TPL_FIELDS.map(({ k, label, rows }) => (
              <div className="form-group" key={k}>
                <label>{label}</label>
                {rows ? (
                  <textarea className="input" rows={rows} value={tpl[k]} onChange={e => setTpl({ ...tpl, [k]: e.target.value })} style={{ resize: 'vertical' }} />
                ) : (
                  <input className="input" value={tpl[k]} onChange={e => setTpl({ ...tpl, [k]: e.target.value })} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => saveTplMut.mutate()} disabled={saveTplMut.isPending} className="btn btn-primary">
                {saveTplMut.isPending ? 'Saving…' : 'Save Global Template'}
              </button>
              <button onClick={() => setTpl(DEFAULT_TEMPLATE)} className="btn btn-ghost">Reset to defaults</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Live preview</div>
            <div className="form-group">
              <label>Preview city</label>
              <input className="input" value={previewCity} onChange={e => setPreviewCity(e.target.value)} placeholder="e.g. Noida" />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: '#fff', fontSize: '0.82rem', lineHeight: 1.55 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>&lt;title&gt;</div>
              <div style={{ fontWeight: 700, color: 'var(--forest)', marginBottom: 10 }}>{render(tpl.title, previewCity)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>&lt;h1&gt;</div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{render(tpl.h1, previewCity)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>meta description</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{render(tpl.meta_description, previewCity)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>about text</div>
              <div style={{ color: 'var(--text-2)' }}>{render(tpl.about_text, previewCity)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cities list (just on/off, no per-city content) ────── */}
      <div className="card">
        <div className="card-header">
          <h2>Cities</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Just toggle active. Content comes from the global template above.</span>
        </div>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Add city name (e.g. Pune)" value={newCity} onChange={e => setNewCity(e.target.value)} style={{ flex: 1 }} />
          <button
            onClick={() => { if (!newCity.trim()) return; upsertMut.mutate({ city_name: newCity.trim(), is_active: true }, { onSuccess: () => setNewCity('') }); }}
            disabled={!newCity.trim() || upsertMut.isPending}
            className="btn btn-primary">
            + Add City
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Slug</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {isLoading ? Array(3).fill(null).map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton skel-text" /></td></tr>) :
                pages.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cities yet — add one above.</td></tr> :
                pages.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.city_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>/{p.slug || p.city_name?.toLowerCase().replace(/\s+/g, '-')}</td>
                    <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => upsertMut.mutate({ city_name: p.city_name, is_active: !p.is_active })}
                        className={`btn btn-sm ${p.is_active ? 'btn-danger-ghost' : 'btn-outline'}`}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 12, background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-2)' }}>
        ℹ️ <strong>Website integration:</strong> the public city page should read the <code>{TEMPLATE_KEY}</code> system setting and replace <code>{'{city}'}</code> with the city name at render time. The per-city <code>title/meta_description/h1_title/about_text</code> fields are no longer used for content.
      </div>
    </AdminLayout>
  );
}
