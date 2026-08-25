'use client';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI, downloadFile } from '@/lib/api';
import InvoicePreview from '@/components/InvoicePreview';
import { inclusiveGstSplit, isUPAddress, inr, SELLER } from '@/lib/invoice';

const ADDITIONAL_PLANT_RATE = 25;
const GST = 1.18;
const PRODUCT_GST_RATES = [0, 5, 12, 18, 28]; // valid shop GST slabs
const round2 = (n: number) => Math.round(n * 100) / 100;

// One editable line of a product invoice. `product_id` links back to a real
// shop product (backend re-prices from the DB); custom lines have none.
type ProductLine = {
  product_id?: number;
  name: string;
  price: string;    // GST-EXCLUSIVE unit price (₹)
  qty: string;
  gst_rate: number; // 0 | 5 | 12 | 18 | 28
};

export default function CreateInvoicePage() {
  // ── Form state ──
  const [invoiceType, setInvoiceType] = useState<'ondemand' | 'plan' | 'products'>('ondemand');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [planId, setPlanId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [notes, setNotes] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [assignMode, setAssignMode] = useState<'none' | 'pick' | 'auto'>('none');
  const [gardenerId, setGardenerId] = useState('');
  const [overrideTotal, setOverrideTotal] = useState('');
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // ── Data ──
  const { data: plansData } = useQuery({ queryKey: ['admin-plans'], queryFn: AdminAPI.plans });
  const plans: any[] = (Array.isArray(plansData) ? plansData : []).filter((p: any) => p.plan_type === 'subscription' && p.is_active);
  const { data: zonesData } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const zones: any[] = Array.isArray(zonesData) ? zonesData : ((zonesData as any)?.items || []);
  const { data: gardenersData } = useQuery({ queryKey: ['admin-gardeners-active'], queryFn: () => AdminAPI.gardeners({ status: 'active', limit: 100 }) });
  const gardeners: any[] = (gardenersData as any)?.items || (Array.isArray(gardenersData) ? gardenersData : []);
  const { data: productsData } = useQuery({ queryKey: ['admin-shop-products'], queryFn: AdminAPI.shopProducts, enabled: invoiceType === 'products' });
  const shopProducts: any[] = (Array.isArray(productsData) ? productsData : []).filter((p: any) => p.is_active);

  const selectedPlan = plans.find((p) => String(p.id) === planId);
  const selectedZone = zones.find((z) => String(z.id) === zoneId);

  // ── Validation ──
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneInvalid = customerPhone !== '' && customerPhone.length !== 10;
  const emailInvalid = customerEmail !== '' && !EMAIL_RE.test(customerEmail);

  // Pincode → auto-fill City & State via India Post API (only when both are empty; silent on failure).
  useEffect(() => {
    if (pincode.length !== 6) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: ctrl.signal });
        const data = await res.json();
        const po = Array.isArray(data) && data[0]?.Status === 'Success' ? data[0]?.PostOffice?.[0] : null;
        if (!po) return;
        if (po.District) setCity((prev) => prev || po.District);
        if (po.State) setStateName((prev) => prev || po.State);
      } catch { /* API down or aborted — never block manual entry */ }
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [pincode]);

  // ── Live pricing (mirrors backend priceInvoice) ──
  const computed = useMemo(() => {
    let baseSum = 0;
    let lineName = '';
    if (invoiceType === 'plan' && selectedPlan) {
      baseSum = Number(selectedPlan.price) || 0;
      lineName = `${selectedPlan.name} Plan${selectedPlan.visits_per_month ? ` — ${selectedPlan.visits_per_month} visits/month` : ''}`;
    } else {
      const base = selectedZone ? (parseFloat(selectedZone.base_price) || 0) : 0;
      const extra = (parseInt(plantCount) || 0) * ADDITIONAL_PLANT_RATE;
      baseSum = base + extra;
      lineName = `On-Demand Gardener Visit (${plantCount || 0} plants)`;
    }
    const total = overrideTotal && Number(overrideTotal) > 0
      ? Math.round(Number(overrideTotal) * 100) / 100
      : Math.round(baseSum * GST * 100) / 100;
    return { lineName, baseSum, total };
  }, [invoiceType, selectedPlan, selectedZone, plantCount, overrideTotal]);

  const previewLine = { name: computed.lineName || 'Service', amount: inclusiveGstSplit(computed.total).subtotal };

  // ── Product invoice lines (GST-EXCLUSIVE unit prices, per-line rates) ──
  // Rounding mirrors the backend's priceProductInvoice: round each line to the
  // paisa, then sum — so the on-screen totals match the PDF exactly.
  const productTotals = useMemo(() => {
    let subtotal = 0, gst = 0;
    for (const l of productLines) {
      const lineBase = round2((Number(l.price) || 0) * (parseInt(l.qty) || 0));
      subtotal += lineBase;
      gst += round2(lineBase * (l.gst_rate / 100));
    }
    return { subtotal: round2(subtotal), gst: round2(gst), total: round2(subtotal + gst) };
  }, [productLines]);

  const addProductLine = (productId: string) => {
    const p = shopProducts.find((x) => String(x.id) === productId);
    if (!p) return;
    setProductLines((prev) => [...prev, {
      product_id: p.id, name: p.name, price: String(p.price ?? ''), qty: '1',
      gst_rate: PRODUCT_GST_RATES.includes(Number(p.gst_rate)) ? Number(p.gst_rate) : 0,
    }]);
  };
  const addCustomLine = () => setProductLines((prev) => [...prev, { name: '', price: '', qty: '1', gst_rate: 18 }]);
  const updateLine = (i: number, patch: Partial<ProductLine>) =>
    setProductLines((prev) => prev.map((l, li) => (li === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setProductLines((prev) => prev.filter((_, li) => li !== i));

  // ── Submit ──
  // Product lines: the backend re-prices from the DB when product_id is sent,
  // so an admin-edited price only sticks if we drop the link and send the line
  // as ad-hoc. Keep product_id only while the price still matches the catalog.
  const buildProductPayload = (outcome: string) => ({
    outcome,
    invoice_type: 'products',
    payment_status: paymentStatus,
    customer_name: customerName,
    customer_phone: customerPhone || undefined,
    customer_email: customerEmail || undefined,
    service_address: address || undefined,
    city: city || undefined,
    state: stateName || undefined,
    pincode: pincode || undefined,
    notes: notes || undefined,
    line_items: productLines.map((l) => {
      const p = l.product_id ? shopProducts.find((x) => x.id === l.product_id) : null;
      const priceUnchanged = p && Number(l.price) === (Number(p.price) || 0);
      return {
        product_id: priceUnchanged ? l.product_id : undefined,
        name: l.name,
        amount: Number(l.price) || 0,
        qty: parseInt(l.qty) || 0,
        gst_rate: l.gst_rate,
      };
    }),
  });

  const buildPayload = (outcome: string) => ({
    outcome,
    invoice_type: invoiceType,
    payment_status: paymentStatus,
    plan_id: invoiceType === 'plan' ? Number(planId) || undefined : undefined,
    customer_name: customerName,
    customer_phone: customerPhone || undefined,
    customer_email: customerEmail || undefined,
    service_address: address || undefined,
    city: city || undefined,
    state: stateName || undefined,
    pincode: pincode || undefined,
    scheduled_date: scheduledDate || undefined,
    scheduled_time: scheduledTime || undefined,
    plant_count: parseInt(plantCount) || 0,
    notes: notes || undefined,
    zone_id: zoneId ? Number(zoneId) : undefined,
    geofence_id: zoneId ? Number(zoneId) : undefined,
    override_total: overrideTotal ? Number(overrideTotal) : undefined,
    assign_mode: assignMode,
    gardener_id: assignMode === 'pick' && gardenerId ? Number(gardenerId) : undefined,
    schedule_dates: outcome === 'subscription' ? scheduleDates.filter(Boolean) : undefined,
  });

  const submit = async (outcome: 'invoice_only' | 'booking' | 'subscription') => {
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    if ((outcome === 'booking' || outcome === 'subscription') && !customerPhone.trim()) {
      toast.error('Customer phone is required to create a record'); return;
    }
    if (phoneInvalid) { toast.error('Phone number must be exactly 10 digits'); return; }
    if (emailInvalid) { toast.error('Enter a valid email address'); return; }
    if (scheduledDate && scheduledDate > today) { toast.error('Service date cannot be in the future'); return; }
    if (outcome === 'subscription' && !planId) { toast.error('Select a plan for a subscription'); return; }
    if (invoiceType === 'products') {
      if (!productLines.length) { toast.error('Add at least one product line'); return; }
      for (const l of productLines) {
        if (!l.name.trim()) { toast.error('Every line needs a product name'); return; }
        if (!((parseInt(l.qty) || 0) >= 1)) { toast.error(`"${l.name}": quantity must be at least 1`); return; }
        if (!(Number(l.price) >= 0)) { toast.error(`"${l.name}": enter a valid unit price`); return; }
      }
    }
    setSubmitting(outcome);
    try {
      const payload = invoiceType === 'products' ? buildProductPayload(outcome) : buildPayload(outcome);
      const res: any = await AdminAPI.createManualInvoice(payload);
      toast.success(res?.message || 'Invoice created');
      // Auto-download the generated PDF.
      if (res?.invoice_id) {
        await downloadFile(`/admin/manual-invoices/${res.invoice_id}/invoice`, `invoice-${res.invoice_number || res.invoice_id}.pdf`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoice');
    }
    setSubmitting(null);
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{children}</label>
  );

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>Create Invoice</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Generate an invoice for an on-demand visit, a plan, or a shop-product sale. Save it as a booking, a subscription, or just a standalone invoice for offline customers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* ── FORM ── */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['ondemand', 'plan', 'products'] as const).map((t) => (
              <button key={t} onClick={() => setInvoiceType(t)}
                className={`btn ${invoiceType === t ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1 }}>
                {t === 'ondemand' ? 'On-Demand Visit' : t === 'plan' ? 'Subscription Plan' : 'Shop Products'}
              </button>
            ))}
          </div>

          {/* Payment status — what prints on the invoice (PAID / PENDING) */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Payment Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['paid', '✅ Paid'], ['pending', '🕗 Unpaid / Pending']] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setPaymentStatus(v)}
                  className={`btn btn-sm ${paymentStatus === v ? (v === 'paid' ? 'btn-primary' : 'btn-danger') : 'btn-outline'}`}
                  style={{ flex: 1 }}>
                  {label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Prints on the invoice PDF. "Unpaid / Pending" also leaves the created booking unpaid.
            </p>
          </div>

          {invoiceType === 'plan' && (
            <div style={{ marginBottom: 16 }}>
              <Label>Plan *</Label>
              <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Select a plan…</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price} ({p.visits_per_month} visits/mo)</option>)}
              </select>
            </div>
          )}

          {/* Product line editor — prices are GST-EXCLUSIVE, per-line GST rate */}
          {invoiceType === 'products' && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>Products</h4>
              <div style={{ marginBottom: 12 }}>
                <Label>Add Product</Label>
                <select className="input" value="" onChange={(e) => addProductLine(e.target.value)}>
                  <option value="">Select a product to add…</option>
                  {shopProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price} · GST {Number(p.gst_rate) || 0}%{Number(p.stock_quantity) <= 0 ? ' (out of stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {productLines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 90px 70px 90px auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                  <div>
                    {i === 0 && <Label>Item</Label>}
                    <input className="input" value={l.name} readOnly={!!l.product_id}
                      onChange={(e) => updateLine(i, { name: e.target.value })} placeholder="Item name" />
                  </div>
                  <div>
                    {i === 0 && <Label>Price (₹)</Label>}
                    <input className="input" type="number" min={0} value={l.price}
                      onChange={(e) => updateLine(i, { price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    {i === 0 && <Label>Qty</Label>}
                    <input className="input" type="number" min={1} step={1} value={l.qty}
                      onChange={(e) => updateLine(i, { qty: e.target.value })} />
                  </div>
                  <div>
                    {i === 0 && <Label>GST %</Label>}
                    <select className="input" value={l.gst_rate} disabled={!!l.product_id}
                      onChange={(e) => updateLine(i, { gst_rate: Number(e.target.value) })}>
                      {PRODUCT_GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => removeLine(i)}>✕</button>
                </div>
              ))}
              <button className="btn btn-sm btn-outline" onClick={addCustomLine}>+ Add custom line</button>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                Prices are <strong>excluding GST</strong> — tax is added on top per line (shop convention).
                Editing a catalog product&apos;s price bills it as a custom line at your price.
              </p>
            </div>
          )}

          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>Customer</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>Name *</Label><input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></div>
            <div>
              <Label>Phone {(assignMode !== 'none' || true) && ''}</Label>
              <input className={`input${phoneInvalid ? ' error' : ''}`} type="tel" inputMode="numeric" maxLength={10} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit phone" />
              {phoneInvalid && <div style={{ color: 'var(--error)', fontSize: '0.72rem', marginTop: 4 }}>Phone number must be exactly 10 digits</div>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Email</Label>
              <input className={`input${emailInvalid ? ' error' : ''}`} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Optional" />
              {emailInvalid && <div style={{ color: 'var(--error)', fontSize: '0.72rem', marginTop: 4 }}>Enter a valid email address</div>}
            </div>
          </div>

          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>
            {invoiceType === 'products' ? 'Billing Address' : 'Service Details'}
          </h4>
          <div style={{ marginBottom: 12 }}><Label>{invoiceType === 'products' ? 'Address' : 'Service Address'}</Label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>City</Label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><Label>State</Label><input className="input" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g. Uttar Pradesh" /></div>
            <div><Label>Pincode</Label><input className="input" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
          </div>
          {invoiceType !== 'products' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><Label>Zone</Label>
                  <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                    <option value="">Select zone…</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div><Label>Plants</Label><input className="input" type="number" value={plantCount} onChange={(e) => setPlantCount(e.target.value)} /></div>
                <div><Label>Date</Label><input className="input" type="date" max={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><Label>Time</Label><input className="input" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
                <div><Label>Override Total (₹, incl. GST)</Label><input className="input" type="number" value={overrideTotal} onChange={(e) => setOverrideTotal(e.target.value)} placeholder={`Auto: ₹${computed.total.toFixed(2)}`} /></div>
              </div>
            </>
          )}
          <div style={{ marginBottom: 16 }}><Label>Notes</Label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          {invoiceType !== 'products' && (
            <>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>Gardener (for booking)</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['none', 'auto', 'pick'] as const).map((m) => (
                  <button key={m} onClick={() => setAssignMode(m)} className={`btn btn-sm ${assignMode === m ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>
                    {m === 'none' ? 'Unassigned' : m === 'auto' ? 'Auto-assign' : 'Pick gardener'}
                  </button>
                ))}
              </div>
              {assignMode === 'pick' && (
                <div style={{ marginBottom: 8 }}>
                  <select className="input" value={gardenerId} onChange={(e) => setGardenerId(e.target.value)}>
                    <option value="">Select gardener…</option>
                    {gardeners.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Subscription visit scheduler — only for plans, capped at visits/month */}
          {invoiceType === 'plan' && selectedPlan && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px' }}>
                Schedule Visits (optional)
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                Pick up to {selectedPlan.visits_per_month} visit date(s). Only used when you choose &ldquo;Create Subscription&rdquo;. Leave empty to schedule later.
              </p>
              {scheduleDates.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="input" type="date" value={d}
                    onChange={(e) => setScheduleDates((prev) => prev.map((x, xi) => xi === i ? e.target.value : x))} />
                  <button className="btn btn-sm btn-outline" onClick={() => setScheduleDates((prev) => prev.filter((_, xi) => xi !== i))}>Remove</button>
                </div>
              ))}
              {scheduleDates.length < (selectedPlan.visits_per_month || 1) && (
                <button className="btn btn-sm btn-outline" onClick={() => setScheduleDates((prev) => [...prev, ''])}>
                  + Add visit date
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── PREVIEW + ACTIONS ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          {invoiceType === 'products' ? (
            // InvoicePreview is hard-wired to the inclusive-18% service split, so
            // product invoices (exclusive prices, mixed per-line rates) get their
            // own totals card with the same look.
            (() => {
              const isUP = isUPAddress([address, city, stateName].filter(Boolean).join(', '));
              return (
                <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Tax Invoice / GST</h4>
                    <span className="badge badge-forest">PREVIEW</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    <strong>{SELLER.brand}</strong> ({SELLER.legalName}) · GSTIN {SELLER.gstin} · {isUP ? 'SGST + CGST (intra-state)' : 'IGST (inter-state)'}
                  </div>
                  {/* minWidth: 0 overrides the global `table { min-width: 600px }`
                      (meant for data tables) which stretched this card's table
                      past the card edge, pushing the amounts outside. */}
                  <table style={{ width: '100%', minWidth: 0, borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <tbody>
                      {productLines.map((l, i) => (
                        <tr key={i}>
                          <td style={{ padding: '4px 0', color: 'var(--text-2)' }}>{(parseInt(l.qty) || 0)} × {l.name || 'Item'} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@ {l.gst_rate}%</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{inr(round2((Number(l.price) || 0) * (parseInt(l.qty) || 0)))}</td>
                        </tr>
                      ))}
                      {!productLines.length && (
                        <tr><td colSpan={2} style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Add products to preview totals…</td></tr>
                      )}
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Subtotal (excl. GST)</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{inr(productTotals.subtotal)}</td>
                      </tr>
                      {isUP ? (
                        <>
                          <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>SGST (per line rates)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(round2(productTotals.gst / 2))}</td></tr>
                          <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>CGST (per line rates)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(round2(productTotals.gst / 2))}</td></tr>
                        </>
                      ) : (
                        <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>IGST (per line rates)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(productTotals.gst)}</td></tr>
                      )}
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 800 }}>Total Amount</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--forest)', fontSize: '1rem' }}>{inr(productTotals.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : (
            <InvoicePreview
              address={[address, city, stateName].filter(Boolean).join(', ')}
              total={computed.total}
              statusLabel="PREVIEW"
              lines={[previewLine]}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn btn-outline" disabled={!!submitting} onClick={() => submit('invoice_only')}>
              {submitting === 'invoice_only' ? 'Generating…' : '📄 Generate Invoice Only'}
            </button>
            {invoiceType !== 'products' && (
              <button className="btn btn-primary" disabled={!!submitting} onClick={() => submit('booking')}>
                {submitting === 'booking' ? 'Creating…' : '✅ Create Booking + Invoice'}
              </button>
            )}
            {invoiceType === 'plan' && (
              <button className="btn btn-primary" disabled={!!submitting} onClick={() => submit('subscription')}>
                {submitting === 'subscription' ? 'Creating…' : '🔁 Create Subscription + Invoice'}
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            {invoiceType === 'products' ? (
              <><strong>Product invoices</strong> are standalone sales — no booking or subscription is created. Prices are GST-exclusive; each line&apos;s GST is added on top. The PDF downloads automatically.</>
            ) : (
              <><strong>Invoice Only</strong> saves a standalone invoice (no booking). <strong>Booking</strong>/<strong>Subscription</strong> also create a record and require a customer phone. The PDF downloads automatically.</>
            )}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
