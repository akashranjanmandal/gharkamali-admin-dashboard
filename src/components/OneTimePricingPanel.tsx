'use client';
// One-time service pricing editor (Service Areas page). Each zone's base price
// (first 10 plants) is set where it always was — the zone's Edit form — and
// is shown here read-only. This panel edits that zone's progressive per-plant
// range rates and vermicompost add-on prices. Replaces the old slab table.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminAPI } from '@/lib/api';
import {
  BASE_PLANTS, VERMICOMPOST_SIZES, RateInterval, VermicompostPrice,
  serviceCharge, validateIntervals, inr,
} from '@/lib/oneTimePricing';

type Draft = { intervals: { max: string; rate: string }[]; vermi: Record<number, string> };

const toDraft = (z: any): Draft => ({
  intervals: (z.intervals || []).map((iv: RateInterval) => ({ max: String(iv.max), rate: String(iv.rate) })),
  vermi: Object.fromEntries(VERMICOMPOST_SIZES.map((kg) => [kg, String((z.vermicompost || []).find((v: VermicompostPrice) => v.kg === kg)?.price ?? '')])),
});

// "From" is always the previous interval's To + 1 — no gaps or overlaps possible.
// `base` is the zone's own base price (read-only here).
const fromDraft = (d: Draft, base: number) => {
  let prev = BASE_PLANTS;
  const intervals: RateInterval[] = d.intervals.map((r) => {
    const iv = { min: prev + 1, max: parseInt(r.max, 10), rate: Number(r.rate) };
    prev = Number.isFinite(iv.max) ? iv.max : prev + 1;
    return iv;
  });
  const vermicompost = VERMICOMPOST_SIZES.map((kg) => ({ kg, price: Number(d.vermi[kg]) }));
  return { base, intervals, vermicompost };
};

const ACTION_LABEL: Record<string, string> = { seed: 'Seeded', update: 'Updated', copy: 'Copied from zone', create: 'Zone created' };

export default function OneTimePricingPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['one-time-pricing-zones'], queryFn: AdminAPI.oneTimePricingZones });
  const zones: any[] = (data as any)?.zones || [];
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);
  const [checkPlants, setCheckPlants] = useState('25');
  const [historyOpen, setHistoryOpen] = useState(false);

  const zone = zones.find((z) => z.id === zoneId) || null;
  useEffect(() => { if (!zoneId && zones.length) setZoneId(zones[0].id); }, [zones, zoneId]);
  useEffect(() => { if (zone) { setDraft(toDraft(zone)); setCopiedFrom(null); } }, [zone?.id, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = draft && zone ? fromDraft(draft, Number(zone.base_price) || 0) : null;
  const error = useMemo(() => {
    if (!parsed) return null;
    const e = validateIntervals(parsed.intervals);
    if (e) return e;
    for (const v of parsed.vermicompost) if (!(v.price > 0)) return `${v.kg} kg vermicompost: price must be more than ₹0`;
    return null;
  }, [parsed]);
  const dirty = !!(zone && draft && JSON.stringify(toDraft(zone)) !== JSON.stringify(draft));

  const saveMut = useMutation({
    mutationFn: () => AdminAPI.saveZonePricing(zoneId!, {
      intervals: parsed!.intervals, vermicompost: parsed!.vermicompost, copied_from_zone_id: copiedFrom,
    }),
    onSuccess: () => {
      toast.success(`Pricing saved for ${zone?.name}. New quotes and bookings use it now.`);
      setCopiedFrom(null);
      qc.invalidateQueries({ queryKey: ['one-time-pricing-zones'] });
      qc.invalidateQueries({ queryKey: ['admin-geofences'] });
      qc.invalidateQueries({ queryKey: ['pricing-audit'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const vermiAllMut = useMutation({
    mutationFn: () => AdminAPI.applyVermicompostAll(parsed!.vermicompost),
    onSuccess: (r: any) => { toast.success('Vermicompost prices applied to every zone'); qc.invalidateQueries({ queryKey: ['one-time-pricing-zones'] }); qc.invalidateQueries({ queryKey: ['pricing-audit'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const { data: audit } = useQuery({
    queryKey: ['pricing-audit', zoneId],
    queryFn: () => AdminAPI.pricingAudit({ entity_type: 'zone_pricing', zone_id: zoneId!, limit: 50 }),
    enabled: historyOpen && !!zoneId,
  });

  const setRow = (i: number, patch: Partial<{ max: string; rate: string }>) =>
    setDraft((d) => d && ({ ...d, intervals: d.intervals.map((r, ri) => (ri === i ? { ...r, ...patch } : r)) }));
  const addRow = () => setDraft((d) => {
    if (!d) return d;
    const lastMax = parseInt(d.intervals[d.intervals.length - 1]?.max || String(BASE_PLANTS), 10) || BASE_PLANTS;
    const lastRate = d.intervals[d.intervals.length - 1]?.rate || '10';
    return { ...d, intervals: [...d.intervals, { max: String(lastMax + 50), rate: lastRate }] };
  });
  const removeRow = () => setDraft((d) => d && ({ ...d, intervals: d.intervals.slice(0, -1) }));
  const copyFrom = (srcId: number) => {
    const src = zones.find((z) => z.id === srcId);
    if (!src || !draft) return;
    setDraft(toDraft(src));
    setCopiedFrom(src.id);
    toast(`Loaded ${src.name}'s rates — edit them, then Save to apply to ${zone?.name}. ${zone?.name} keeps its own base price; ${src.name} is not changed.`);
  };

  const check = parsed && !error ? serviceCharge(parseInt(checkPlants, 10) || 0, parsed.base, parsed.intervals) : null;
  const runningTotal = (i: number) => {
    if (!parsed || error) return null;
    const s = serviceCharge(parsed.intervals[i].max, parsed.base, parsed.intervals);
    return s.ok ? s.amount : null;
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2>One-Time Service Pricing</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Zone base price covers the first 10 plants · each range&apos;s rate applies only to the plants inside it · rounded to ₹1 once · above the last range = custom quote
        </span>
      </div>
      <div style={{ padding: '14px 20px' }}>
        {!zones.length && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading zones…</span>}
        {zone && draft && parsed && (
          <>
            {/* Zone picker + copy + history */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
              <div style={{ minWidth: 220 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)' }}>Zone</label>
                <select className="input" value={zoneId ?? ''} onChange={(e) => {
                  if (dirty && !window.confirm('Discard unsaved pricing changes for this zone?')) return;
                  setZoneId(Number(e.target.value));
                }}>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}{z.city ? ` · ${z.city}` : ''}{z.is_active ? '' : ' (off)'}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 200 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)' }}>Start from another zone</label>
                <select className="input" value="" onChange={(e) => e.target.value && copyFrom(Number(e.target.value))}>
                  <option value="">Copy pricing from…</option>
                  {zones.filter((z) => z.id !== zoneId).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setHistoryOpen(true)}>Change history</button>
              {copiedFrom && <span className="badge badge-blue">Loaded from {zones.find((z) => z.id === copiedFrom)?.name} — not saved yet</span>}
            </div>

            {/* Base price — read-only: it is the zone's own Base Price (zone card → Edit) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', borderRadius: 12, padding: '8px 12px', marginBottom: 10, width: 'fit-content' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>First {BASE_PLANTS} plants</span>
              <span style={{ fontWeight: 800, color: 'var(--forest)' }}>{inr(parsed.base, parsed.base % 1 ? 2 : 0)}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>— this zone&apos;s Base Price (change it with Edit on the zone card below)</span>
            </div>

            {/* Interval rates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {parsed.intervals.map((iv, i) => {
                const atMax = runningTotal(i);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--border)', borderRadius: 12, padding: '8px 10px' }}>
                    <span style={{ width: 34, textAlign: 'right', fontWeight: 700 }}>{iv.min}</span>
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <input className="input" type="number" value={draft.intervals[i].max} onChange={(e) => setRow(i, { max: e.target.value })} style={{ width: 64, padding: '6px 8px' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>plants</span>
                    <span style={{ fontWeight: 800, color: 'var(--forest)' }}>₹</span>
                    <input className="input" type="number" step="0.01" min="0.01" value={draft.intervals[i].rate} onChange={(e) => setRow(i, { rate: e.target.value })} style={{ width: 76, padding: '6px 8px' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/plant</span>
                    {atMax != null && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)' }}>= {inr(atMax)} at {iv.max}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <button className="btn btn-sm btn-outline" onClick={addRow}>+ Add range</button>
              <button className="btn btn-sm btn-outline" onClick={removeRow} disabled={draft.intervals.length <= 1}>Remove last</button>
            </div>

            {/* Vermicompost */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Vermicompost add-on</span>
              {VERMICOMPOST_SIZES.map((kg) => (
                <div key={kg} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--border)', borderRadius: 12, padding: '6px 10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{kg} kg</span>
                  <span style={{ fontWeight: 800, color: 'var(--forest)' }}>₹</span>
                  <input className="input" type="number" min="1" value={draft.vermi[kg]} onChange={(e) => setDraft({ ...draft, vermi: { ...draft.vermi, [kg]: e.target.value } })} style={{ width: 80, padding: '6px 8px' }} />
                </div>
              ))}
              <button className="btn btn-sm btn-ghost" disabled={!!error || vermiAllMut.isPending}
                onClick={() => window.confirm(`Set vermicompost to ${parsed.vermicompost.map((v) => `${v.kg} kg ${inr(v.price)}`).join(', ')} in EVERY zone?`) && vermiAllMut.mutate()}>
                {vermiAllMut.isPending ? 'Applying…' : 'Use these compost prices in all zones'}
              </button>
            </div>

            {/* Price checker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Check a quote</span>
              <input className="input" type="number" min={BASE_PLANTS} value={checkPlants} onChange={(e) => setCheckPlants(e.target.value)} style={{ width: 80, padding: '6px 8px' }} />
              <span style={{ fontSize: '0.78rem' }}>plants →</span>
              {check?.ok && <strong style={{ color: 'var(--forest)' }}>{inr(check.amount)}</strong>}
              {check?.ok && check.rawAmount !== check.amount && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(₹{check.rawAmount.toFixed(2)} before rounding)</span>}
              {check && !check.ok && <span style={{ fontSize: '0.78rem', color: '#92400e' }}>Custom quote (over {check.maxPlants} plants)</span>}
              {check?.ok && check.breakdown.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  = {inr(parsed.base)} + {check.breakdown.map((b) => `${b.plants}×₹${b.rate}`).join(' + ')}
                </span>
              )}
            </div>

            {error && <div style={{ fontSize: '0.8rem', color: 'var(--error)', background: 'rgba(220,38,38,0.06)', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>⚠ {error}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-sm btn-primary" disabled={!dirty && !copiedFrom || !!error || saveMut.isPending} onClick={() => saveMut.mutate()}>
                {saveMut.isPending ? 'Saving…' : `Save ${zone.name} pricing`}
              </button>
              {(dirty || copiedFrom) && <button className="btn btn-sm btn-ghost" onClick={() => { setDraft(toDraft(zone)); setCopiedFrom(null); }}>Discard changes</button>}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Applies to new quotes and bookings only — confirmed bookings keep the price they were charged. Website, app and admin invoices all use this table.
              </span>
            </div>
          </>
        )}
      </div>

      {historyOpen && (
        <div className="modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: '95vw' }}>
            <div className="modal-header">
              <h3>Pricing history — {zone?.name}</h3>
              <button className="modal-close" onClick={() => setHistoryOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {!audit && <div style={{ color: 'var(--text-muted)' }}>Loading…</div>}
              {Array.isArray(audit) && !audit.length && <div style={{ color: 'var(--text-muted)' }}>No changes recorded yet.</div>}
              {Array.isArray(audit) && audit.map((a: any) => {
                const b = a.before_value || {}; const af = a.after_value || {};
                const changes: string[] = [];
                if (af.base_price !== undefined && Number(b.base_price) !== Number(af.base_price)) changes.push(`Base ${b.base_price != null ? inr(b.base_price, 2) : '—'} → ${inr(af.base_price, 2)}`);
                if (af.intervals && JSON.stringify(b.intervals) !== JSON.stringify(af.intervals)) changes.push(`Rates: ${af.intervals.map((i: any) => `${i.min}–${i.max} ₹${i.rate}`).join(', ')}`);
                if (af.vermicompost && JSON.stringify(b.vermicompost) !== JSON.stringify(af.vermicompost)) changes.push(`Vermicompost: ${af.vermicompost.map((v: any) => `${v.kg} kg ${inr(v.price)}`).join(', ')}`);
                return (
                  <div key={a.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.82rem' }}>{ACTION_LABEL[a.action] || a.action}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at || a.createdAt).toLocaleString('en-IN')} · {a.actor?.name || (a.actor_id ? `User #${a.actor_id}` : 'System')}
                      </span>
                    </div>
                    {a.note && <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: 2 }}>{a.note}</div>}
                    {changes.map((c, i) => <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{c}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
