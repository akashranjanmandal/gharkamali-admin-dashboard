'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI, downloadFile } from '@/lib/api';
import InvoicePreview from '@/components/InvoicePreview';
import { inclusiveGstSplit } from '@/lib/invoice';

const ADDITIONAL_PLANT_RATE = 25;
const GST = 1.18;

export default function CreateInvoicePage() {
  // ── Form state ──
  const [invoiceType, setInvoiceType] = useState<'ondemand' | 'plan'>('ondemand');
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
  const [submitting, setSubmitting] = useState<string | null>(null);

  // ── Data ──
  const { data: plansData } = useQuery({ queryKey: ['admin-plans'], queryFn: AdminAPI.plans });
  const plans: any[] = (Array.isArray(plansData) ? plansData : []).filter((p: any) => p.plan_type === 'subscription' && p.is_active);
  const { data: zonesData } = useQuery({ queryKey: ['admin-geofences'], queryFn: AdminAPI.geofences });
  const zones: any[] = Array.isArray(zonesData) ? zonesData : ((zonesData as any)?.items || []);
  const { data: gardenersData } = useQuery({ queryKey: ['admin-gardeners-active'], queryFn: () => AdminAPI.gardeners({ status: 'active', limit: 100 }) });
  const gardeners: any[] = (gardenersData as any)?.items || (Array.isArray(gardenersData) ? gardenersData : []);

  const selectedPlan = plans.find((p) => String(p.id) === planId);
  const selectedZone = zones.find((z) => String(z.id) === zoneId);

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

  // ── Submit ──
  const buildPayload = (outcome: string) => ({
    outcome,
    invoice_type: invoiceType,
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
    if (outcome === 'subscription' && !planId) { toast.error('Select a plan for a subscription'); return; }
    setSubmitting(outcome);
    try {
      const res: any = await AdminAPI.createManualInvoice(buildPayload(outcome));
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
          Generate an invoice for an on-demand visit or a plan. Save it as a booking, a subscription, or just a standalone invoice for offline customers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* ── FORM ── */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['ondemand', 'plan'] as const).map((t) => (
              <button key={t} onClick={() => setInvoiceType(t)}
                className={`btn ${invoiceType === t ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1 }}>
                {t === 'ondemand' ? 'On-Demand Visit' : 'Subscription Plan'}
              </button>
            ))}
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

          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>Customer</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>Name *</Label><input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></div>
            <div><Label>Phone {(assignMode !== 'none' || true) && ''}</Label><input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="10-digit phone" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Label>Email</Label><input className="input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Optional" /></div>
          </div>

          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 0 12px' }}>Service Details</h4>
          <div style={{ marginBottom: 12 }}><Label>Service Address</Label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>City</Label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><Label>State</Label><input className="input" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g. Uttar Pradesh" /></div>
            <div><Label>Pincode</Label><input className="input" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>Zone</Label>
              <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">Select zone…</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div><Label>Plants</Label><input className="input" type="number" value={plantCount} onChange={(e) => setPlantCount(e.target.value)} /></div>
            <div><Label>Date</Label><input className="input" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Label>Time</Label><input className="input" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
            <div><Label>Override Total (₹, incl. GST)</Label><input className="input" type="number" value={overrideTotal} onChange={(e) => setOverrideTotal(e.target.value)} placeholder={`Auto: ₹${computed.total.toFixed(2)}`} /></div>
          </div>
          <div style={{ marginBottom: 16 }}><Label>Notes</Label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

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
          <InvoicePreview
            address={[address, city, stateName].filter(Boolean).join(', ')}
            total={computed.total}
            statusLabel="PREVIEW"
            lines={[previewLine]}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn btn-outline" disabled={!!submitting} onClick={() => submit('invoice_only')}>
              {submitting === 'invoice_only' ? 'Generating…' : '📄 Generate Invoice Only'}
            </button>
            <button className="btn btn-primary" disabled={!!submitting} onClick={() => submit('booking')}>
              {submitting === 'booking' ? 'Creating…' : '✅ Create Booking + Invoice'}
            </button>
            {invoiceType === 'plan' && (
              <button className="btn btn-primary" disabled={!!submitting} onClick={() => submit('subscription')}>
                {submitting === 'subscription' ? 'Creating…' : '🔁 Create Subscription + Invoice'}
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            <strong>Invoice Only</strong> saves a standalone invoice (no booking). <strong>Booking</strong>/<strong>Subscription</strong> also create a record and require a customer phone. The PDF downloads automatically.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
