'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { v, firstError } from '@/lib/validators';
import * as XLSX from 'xlsx';

const PRODUCT_ICONS = ['soil', 'pest', 'pot', 'fert', 'plant', 'tool'];

// All product fields supported by bulk import. Keep in sync with backend
// /admin/shop/products/bulk-import handler in GharKaMali_Backend/src/routes/index.js
const TEMPLATE_COLS = [
  'name',
  'category_name',
  'category_id',
  'slug',
  'price',
  'mrp',
  'stock_quantity',
  'gst_rate',
  'badge',
  'icon_key',
  'description',
  'long_description',
  'features',
  'faqs',
  'tags',
  'images',
  'available_geofence_ids',
  'is_active',
];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_COLS,
    [
      'Premium Potting Mix',           // name
      'Soil & Substrate',              // category_name (or set category_id)
      '',                              // category_id
      '',                              // slug (auto-generated if empty)
      '299',                           // price
      '399',                           // mrp
      '100',                           // stock_quantity
      '5',                             // gst_rate (0|5|12|18|28)
      'Bestseller',                    // badge
      'soil',                          // icon_key (soil|pest|pot|fert|plant|tool)
      'Rich potting mix for indoor plants',  // description
      'Detailed long description shown in the description tab...', // long_description
      '100% organic & safe|Improves drainage|Boosts plant growth', // features (pipe-separated)
      'Is it safe for indoor use?::Yes, completely safe.||How much per pot?::Approx 200g per medium pot.', // faqs (Q::A pairs, pairs split by ||)
      'indoor,potting,organic',        // tags (comma-separated)
      'https://cdn.example.com/p1.jpg,https://cdn.example.com/p2.jpg', // images (comma-separated URLs)
      '',                              // available_geofence_ids (comma-separated ids, blank = everywhere)
      'true',                          // is_active
    ],
    [
      'Neem Oil Spray', 'Pest Control', '', '', '199', '249', '50', '12', '', 'pest',
      'Organic neem oil for pest control', '', 'Cold-pressed neem|Safe for pets',
      '', 'organic,pest', '', '', 'true',
    ],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'GKM_Products_Template.xlsx');
}

export default function AdminShopProductsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  // category_name (lowercased) → resolution: existing category name OR '__SKIP__' OR '' (unresolved)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { toast.error('No data rows found in file'); return; }
        setCategoryMap({});
        setImportRows(rows);
      } catch {
        toast.error('Could not parse file. Please use the provided template.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const runImport = async () => {
    if (importRows.length === 0) return;
    // Apply category mappings + drop rows the user chose to skip
    const transformed = importRows
      .map(r => {
        const raw = String(r.category_name || '').trim();
        if (!raw) return r; // backend lets it through as uncategorized
        const key = raw.toLowerCase();
        const mapped = categoryMap[key];
        // If a mapping exists, use it. If it's the same name already in catList, keep it.
        if (mapped === '__SKIP__') return null;
        if (mapped && mapped !== '__SKIP__') return { ...r, category_name: mapped };
        return r;
      })
      .filter(Boolean) as any[];

    if (transformed.length === 0) { toast.error('All rows were skipped'); return; }

    setImportLoading(true);
    try {
      const result: any = await AdminAPI.bulkImportProducts(transformed);
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['admin-shop-products'] });
      toast.success(`${result.created} products imported!`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setImportLoading(false);
  };

  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ['admin-shop-products'], queryFn: AdminAPI.shopProducts });
  const { data: categories, isLoading: loadingCats } = useQuery({ queryKey: ['admin-shop-categories'], queryFn: AdminAPI.shopCategories });
  const { data: geofences } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const geoList: any[] = Array.isArray(geofences) ? geofences : [];

  const validateProduct = (d: any): string | null => firstError([
    v.text(d.name, { field: 'name', min: 2, max: 200 }),
    v.amount(d.price, { field: 'price', min: 0, max: 1_000_000 }),
    v.amount(d.mrp, { field: 'mrp', min: 0, max: 1_000_000, optional: true }),
    v.integer(d.stock_quantity, { field: 'stock', min: 0, max: 1_000_000, optional: true }),
    v.enumIn(Number(d.gst_rate ?? 0), [0, 5, 12, 18, 28], { field: 'gst_rate', optional: true }),
    v.text(d.description, { field: 'description', max: 1000, optional: true }),
    v.image(d.image instanceof File ? d.image : null, { maxMB: 5 }),
  ]);

  const saveMut = useMutation({
    mutationFn: (data: any) => {
      const err = validateProduct(data);
      if (err) return Promise.reject(new Error(err));
      const fd = new FormData();
      const skip = ['created_at', 'updated_at', 'createdAt', 'updatedAt', 'category', 'images'];
      Object.entries(data).forEach(([k, v]) => {
        if (skip.includes(k)) return;
        if (k === 'image' && v instanceof File) {
          fd.append('image', v);
        } else if (v !== null && v !== undefined) {
          if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else fd.append(k, String(v));
        }
      });
      return modal.id ? AdminAPI.updateShopProduct(modal.id, fd) : AdminAPI.createShopProduct(fd);
    }, 
    onSuccess: () => { toast.success('Product Saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-shop-products'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });


  const deleteMut = useMutation({ 
    mutationFn: (id: number) => AdminAPI.deleteShopProduct(id), 
    onSuccess: () => { toast.success('Product Deleted'); qc.invalidateQueries({ queryKey: ['admin-shop-products'] }); }, 
    onError: (e: any) => toast.error(e.message) 
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Features helpers
  const [featInput, setFeatInput] = useState('');
  const addFeature = () => {
    const val = featInput.trim();
    if (!val) return;
    f('features', [...(form.features || []), val]);
    setFeatInput('');
  };
  const removeFeature = (i: number) => f('features', (form.features || []).filter((_: any, idx: number) => idx !== i));

  // FAQ helpers
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const addFaq = () => {
    if (!faqQ.trim() || !faqA.trim()) return;
    f('faqs', [...(form.faqs || []), { q: faqQ.trim(), a: faqA.trim() }]);
    setFaqQ(''); setFaqA('');
  };
  const removeFaq = (i: number) => f('faqs', (form.faqs || []).filter((_: any, idx: number) => idx !== i));

  const prodList = Array.isArray(products) ? products : [];
  const catList = Array.isArray(categories) ? categories : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Shop Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage your gardening product catalog and categories</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/shop-categories" className="btn btn-outline" style={{ height: 44, display: 'flex', alignItems: 'center' }}>Manage Categories</Link>
          <button onClick={() => { setImportRows([]); setImportResult(null); setImportModal(true); }} className="btn btn-outline" style={{ height: 44 }}>⬆ Import Excel / CSV</button>
          <button onClick={() => { setForm({ name: '', price: '', mrp: '', stock_quantity: 50, icon_key: 'plant', is_active: true, features: [], faqs: [], tags: [] }); setFeatInput(''); setFaqQ(''); setFaqA(''); setModal({ new: true }); }} className="btn btn-primary" style={{ height: 44 }}>+ Add Product</button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{prodList.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Categories</div>
          <div className="stat-value">{catList.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock items</div>
          <div className="stat-value" style={{ color: 'var(--error)' }}>{prodList.filter((p: any) => p.stock_quantity <= 5).length}</div>
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th style={{ width: 60 }}>Icon</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(loadingProducts || loadingCats) ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 20, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : prodList.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No products found. Start by adding one!</td></tr>
            ) : prodList.map((p: any) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>#{p.id}</td>
                <td>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      p.icon_key === 'soil' ? '🟤' : p.icon_key === 'pest' ? '🕸️' : p.icon_key === 'pot' ? '🏺' : p.icon_key === 'fert' ? '🧪' : p.icon_key === 'plant' ? '🌿' : '🛠️'
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.badge || 'Standard Product'}</div>
                </td>
                <td><span className="badge badge-outline">{p.category?.name || 'Uncategorized'}</span></td>
                <td>
                  <div style={{ fontWeight: 800, color: 'var(--forest)' }}>₹{p.price}</div>
                  {p.mrp && p.mrp > p.price && <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textDecoration: 'line-through' }}>₹{p.mrp}</div>}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: p.stock_quantity <= 5 ? '#dc2626' : 'var(--text)' }}>
                    {p.stock_quantity <= 5 && <span style={{ marginRight: 4 }}>⚠️</span>}
                    {p.stock_quantity} units
                  </div>
                </td>
                <td><span className={`badge ${p.is_active ? 'badge-forest' : 'badge-gold'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setForm({ ...p, category_id: p.category_id, features: p.features || [], faqs: p.faqs || [], tags: p.tags || [] }); setFeatInput(''); setFaqQ(''); setFaqA(''); setModal(p); }} className="btn btn-sm btn-ghost" style={{ padding: '6px 12px' }}>Edit</button>
                    <button onClick={() => window.confirm('Deactivate product?') && deleteMut.mutate(p.id)} className="btn btn-sm btn-danger-ghost" style={{ padding: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{modal.new ? 'Add New Product' : 'Edit Product'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Product Name *</label><input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} placeholder="e.g. Premium Potting Mix" /></div>
              <div className="form-group">
                <label>Product Image</label>
                <input type="file" className="input" onChange={e => f('image', e.target.files?.[0])} accept="image/*" />
                {form.images?.[0] && !form.image && <img src={form.images[0]} alt="Current" style={{ marginTop: 8, borderRadius: 8, height: 120, width: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />}
                {form.image && <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--forest)' }}>New image selected: {form.image.name}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select className="input" value={form.category_id || ''} onChange={e => f('category_id', e.target.value)}>
                    <option value="">Select Category</option>
                    {catList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Icon Key (Category Style)</label>
                  <select className="input" value={form.icon_key || 'plant'} onChange={e => f('icon_key', e.target.value)}>
                    {PRODUCT_ICONS.map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Price (₹) *</label><input type="number" className="input" value={form.price || ''} onChange={e => f('price', e.target.value)} /></div>
                <div className="form-group"><label>MRP (₹)</label><input type="number" className="input" value={form.mrp || ''} onChange={e => f('mrp', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Stock Quantity *</label><input type="number" className="input" value={form.stock_quantity || ''} onChange={e => f('stock_quantity', e.target.value)} /></div>
                <div className="form-group"><label>Badge (e.g. Bestseller)</label><input className="input" value={form.badge || ''} onChange={e => f('badge', e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label>GST Rate</label>
                <select className="input" value={form.gst_rate ?? 0} onChange={e => f('gst_rate', Number(e.target.value))}>
                  <option value={0}>No GST (0%)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Applied only when customer opts to claim GST at checkout. Within UP: split as SGST + CGST. Other states: IGST.</p>
              </div>
              <div className="form-group"><label>Short Description</label><textarea className="input" rows={3} value={form.description || ''} onChange={e => f('description', e.target.value)} placeholder="Brief description shown on the product card and top of detail page..." /></div>
              <div className="form-group"><label>Long Description</label><textarea className="input" rows={5} value={form.long_description || ''} onChange={e => f('long_description', e.target.value)} placeholder="Full detailed description shown in the Description tab..." /></div>

              {/* ── FEATURES ── */}
              <div className="form-group">
                <label>Product Features / Highlights</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Shown as tick-mark bullet points on the product page. Add one at a time.</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input className="input" style={{ flex: 1 }} value={featInput} onChange={e => setFeatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} placeholder="e.g. 100% organic & safe" />
                  <button type="button" onClick={addFeature} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                </div>
                {(form.features || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(form.features || []).map((feat: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.85rem', flex: 1, color: 'var(--text)' }}>✓ {feat}</span>
                        <button type="button" onClick={() => removeFeature(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── FAQs ── */}
              <div className="form-group">
                <label>Product FAQs</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Shown in the FAQ tab on the product detail page. Add question + answer pairs.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  <input className="input" value={faqQ} onChange={e => setFaqQ(e.target.value)} placeholder="Question — e.g. Is this safe for indoor use?" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea className="input" style={{ flex: 1, minHeight: 70, resize: 'vertical' }} value={faqA} onChange={e => setFaqA(e.target.value)} placeholder="Answer..." />
                    <button type="button" onClick={addFaq} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>+ Add FAQ</button>
                  </div>
                </div>
                {(form.faqs || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(form.faqs || []).map((faq: any, i: number) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', position: 'relative' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--forest)', marginBottom: 4 }}>Q. {faq.q}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>A. {faq.a}</div>
                        <button type="button" onClick={() => removeFaq(i)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group"><label>Tags <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(comma separated — used for search)</span></label><input className="input" value={form.tags ? (Array.isArray(form.tags) ? form.tags.join(', ') : form.tags) : ''} onChange={e => f('tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="indoor, pet-friendly, low-light, organic" /></div>
              {/* Location-based availability */}
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  📍 Location Availability
                  <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:400 }}>(leave empty = available everywhere)</span>
                </label>
                {geoList.length === 0 ? (
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', padding:'8px 12px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>No geofences configured yet</div>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 12px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                    {geoList.map((g: any) => {
                      const selected = (form.available_geofence_ids || []).includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const current: number[] = form.available_geofence_ids || [];
                            const updated = selected ? current.filter((id: number) => id !== g.id) : [...current, g.id];
                            f('available_geofence_ids', updated.length > 0 ? updated : null);
                          }}
                          style={{ padding:'5px 12px', borderRadius:99, border:`1px solid ${selected ? 'var(--forest)' : 'var(--border)'}`, background: selected ? 'rgba(3,65,26,0.12)' : 'transparent', color: selected ? 'var(--forest)' : 'var(--text-muted)', fontSize:'0.78rem', fontWeight: selected ? 700 : 400, cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s' }}
                        >
                          {selected ? '✓ ' : ''}{g.name} <span style={{ opacity:0.5, fontSize:'0.7rem' }}>({g.city})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="p_active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                <label htmlFor="p_active" style={{ marginBottom: 0, cursor: 'pointer' }}>Active and visible in shop</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="btn btn-primary">{saveMut.isPending ? 'Saving…' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}
      {importModal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3>📥 Import Products via Excel / CSV</h3>
              <button className="modal-close" onClick={() => setImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Step 1: Download template */}
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1d4ed8' }}>Step 1 — Download the template</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>Fill in your products, then upload the file below. Supports <strong>.xlsx</strong> and <strong>.csv</strong>.</div>
                </div>
                <button onClick={downloadTemplate} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>⬇ Download Template</button>
              </div>

              {/* Required columns info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Expected Columns</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { col: 'name', req: true }, { col: 'price', req: true }, { col: 'category_name', req: false },
                    { col: 'mrp', req: false }, { col: 'stock_quantity', req: false }, { col: 'description', req: false },
                    { col: 'badge', req: false }, { col: 'icon_key', req: false }, { col: 'tags', req: false }, { col: 'is_active', req: false },
                  ].map(({ col, req }) => (
                    <span key={col} style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: req ? 'rgba(239,68,68,0.1)' : 'var(--bg)', color: req ? '#dc2626' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {col}{req ? ' *' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 2: Upload file */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Step 2 — Upload your file</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFilePick} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)', transition: 'border-color 0.2s' }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📂</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Click to select file</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>.xlsx, .xls, .csv accepted</div>
                </div>
              </div>

              {/* Unknown category mapping (gates import) */}
              {importRows.length > 0 && !importResult && (() => {
                const known = new Set(catList.map((c: any) => String(c.name).toLowerCase().trim()));
                const seen = new Map<string, number>(); // displayName → count
                importRows.forEach(r => {
                  const raw = String(r.category_name || '').trim();
                  if (!raw) return;
                  if (known.has(raw.toLowerCase())) return;
                  seen.set(raw, (seen.get(raw) || 0) + 1);
                });
                const unknown = Array.from(seen.entries());
                const unresolved = unknown.filter(([name]) => !categoryMap[name.toLowerCase()]);

                if (unknown.length === 0) return null;
                return (
                  <div style={{ marginBottom: 16, border: '1px solid rgba(234,88,12,0.3)', background: 'rgba(234,88,12,0.06)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b45309', marginBottom: 4 }}>
                      ⚠️ {unknown.length} unknown categor{unknown.length === 1 ? 'y' : 'ies'} found
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                      Map each unknown category to an existing one, or skip those rows. Import is disabled until every unknown category is resolved.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {unknown.map(([name, count]) => {
                        const k = name.toLowerCase();
                        return (
                          <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem' }}>{name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{count} row{count === 1 ? '' : 's'}</div>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                            <select
                              className="input"
                              style={{ minWidth: 160 }}
                              value={categoryMap[k] || ''}
                              onChange={e => setCategoryMap(m => ({ ...m, [k]: e.target.value }))}
                            >
                              <option value="">— Choose action —</option>
                              <optgroup label="Map to existing category">
                                {catList.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </optgroup>
                              <option value="__SKIP__">⊘ Skip these rows</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    {unresolved.length === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: 8 }}>✓ All categories resolved — you can import now.</div>
                    )}
                  </div>
                );
              })()}

              {/* Preview */}
              {importRows.length > 0 && !importResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Preview — {importRows.length} rows found</div>
                    <button onClick={() => { setImportRows([]); setCategoryMap({}); if (fileRef.current) fileRef.current.value = ''; }} style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <table className="admin-table" style={{ minWidth: 600, fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          {Object.keys(importRows[0]).map(col => <th key={col} style={{ fontSize: '0.72rem' }}>{col}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {importRows.length > 5 && (
                          <tr><td colSpan={Object.keys(importRows[0]).length} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>…and {importRows.length - 5} more rows</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result summary */}
              {importResult && (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: importResult.failed === 0 ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)', display: 'flex', gap: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>{importResult.created}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Imported</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: importResult.failed > 0 ? '#dc2626' : 'var(--text-muted)' }}>{importResult.failed}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Failed</div>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Failed rows:</div>
                      {importResult.errors.map((e: any, i: number) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '3px 0', borderBottom: '1px dashed var(--border)' }}>
                          <strong>{e.row}</strong> — {e.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setImportModal(false)} className="btn btn-ghost">Close</button>
              {importRows.length > 0 && !importResult && (() => {
                const known = new Set(catList.map((c: any) => String(c.name).toLowerCase().trim()));
                const blockingUnknown = importRows.some(r => {
                  const raw = String(r.category_name || '').trim();
                  if (!raw) return false;
                  if (known.has(raw.toLowerCase())) return false;
                  return !categoryMap[raw.toLowerCase()];
                });
                return (
                  <button
                    onClick={runImport}
                    disabled={importLoading || blockingUnknown}
                    title={blockingUnknown ? 'Resolve unknown categories above first' : ''}
                    className="btn btn-primary">
                    {importLoading
                      ? `Importing ${importRows.length} products…`
                      : blockingUnknown
                        ? '⚠ Resolve categories to enable import'
                        : `⬆ Import ${importRows.length} Products`}
                  </button>
                );
              })()}
              {importResult && (
                <button onClick={() => { setImportRows([]); setImportResult(null); setCategoryMap({}); }} className="btn btn-outline">Import Another File</button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
