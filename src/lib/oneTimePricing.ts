// ─────────────────────────────────────────────────────────────────────────────
// One-time gardening service pricing — client mirror of the backend engine
// (GharKaMali_Backend/src/services/oneTimePricing.js). Used only to show the
// price instantly as the customer/admin changes quantity; the server always
// recomputes the final amount at checkout.
//
//   Service charge = zone base price (first 10 plants)
//                  + Σ (plants inside each interval × that interval's rate)
// Rounded to the nearest rupee once, after the full amount. Summed in paise.
// ─────────────────────────────────────────────────────────────────────────────

export type RateInterval = { min: number; max: number; rate: number };
export type VermicompostPrice = { kg: number; price: number };
export type SurchargeRule = {
  id: number; name: string; reason?: string | null;
  type: 'fixed' | 'percentage'; value: number;
  starts_on?: string | null; ends_on?: string | null;
};
export type OneTimePricing = {
  zone?: { id: number; name: string; city?: string };
  base_price: number;
  base_plants: number;
  min_plants: number;
  max_plants: number;
  intervals: RateInterval[];
  vermicompost: VermicompostPrice[];
  surcharges: SurchargeRule[];
  gst_rate: number;
};

export const BASE_PLANTS = 10;
export const MIN_PLANTS = 10;
export const VERMICOMPOST_SIZES = [1, 5, 10];
export const GST_RATE = 0.18;

export const DEFAULT_INTERVALS: RateInterval[] = [
  { min: 11, max: 15, rate: 30.2 }, { min: 16, max: 20, rate: 20 },
  { min: 21, max: 30, rate: 15 }, { min: 31, max: 40, rate: 15 },
  { min: 41, max: 50, rate: 10 }, { min: 51, max: 60, rate: 20 },
  { min: 61, max: 70, rate: 20 }, { min: 71, max: 80, rate: 20 },
  { min: 81, max: 100, rate: 20 }, { min: 101, max: 150, rate: 10 },
  { min: 151, max: 200, rate: 10 },
];
export const DEFAULT_VERMICOMPOST: VermicompostPrice[] = [
  { kg: 1, price: 100 }, { kg: 5, price: 300 }, { kg: 10, price: 580 },
];

const toPaise = (r: number) => Math.round(Number(r) * 100);
export const round2 = (n: number) => Math.round(Number(n) * 100) / 100;

export type ServiceCharge =
  | { ok: true; plants: number; rawAmount: number; amount: number; breakdown: { min: number; max: number; plants: number; rate: number; amount: number }[] }
  | { ok: false; code: 'CUSTOM_QUOTE'; plants: number; maxPlants: number };

export function serviceCharge(quantity: number, basePrice: number, intervals: RateInterval[]): ServiceCharge {
  const asked = Math.floor(Number(quantity));
  const plants = Number.isFinite(asked) && asked >= MIN_PLANTS ? asked : MIN_PLANTS;
  const maxPlants = intervals.length ? intervals[intervals.length - 1].max : BASE_PLANTS;
  if (plants > maxPlants) return { ok: false, code: 'CUSTOM_QUOTE', plants, maxPlants };
  let paise = toPaise(basePrice);
  const breakdown: { min: number; max: number; plants: number; rate: number; amount: number }[] = [];
  for (const iv of intervals) {
    const count = Math.max(0, Math.min(plants, iv.max) - iv.min + 1);
    if (count > 0) {
      const p = count * toPaise(iv.rate);
      paise += p;
      breakdown.push({ min: iv.min, max: iv.max, plants: count, rate: iv.rate, amount: p / 100 });
    }
  }
  return { ok: true, plants, rawAmount: paise / 100, amount: Math.round(paise / 100), breakdown };
}

// Surcharges that apply to a visit on `date` (YYYY-MM-DD; today if empty).
// The pricing endpoint already filtered them by zone and active status.
export function surchargeLines(rules: SurchargeRule[], serviceAmount: number, date?: string) {
  const day = (date || new Date(Date.now() + 330 * 60000).toISOString()).slice(0, 10);
  const seen = new Set<number>();
  const out: { id: number; name: string; reason?: string | null; type: string; value: number; amount: number; basis: string }[] = [];
  for (const s of rules || []) {
    if (seen.has(s.id)) continue;
    if (s.starts_on && day < String(s.starts_on).slice(0, 10)) continue;
    if (s.ends_on && day > String(s.ends_on).slice(0, 10)) continue;
    seen.add(s.id);
    const amount = s.type === 'percentage' ? Math.round(serviceAmount * Number(s.value) / 100) : round2(Number(s.value));
    if (amount <= 0) continue;
    out.push({
      id: s.id, name: s.name, reason: s.reason, type: s.type, value: Number(s.value), amount,
      basis: s.type === 'percentage' ? `${Number(s.value)}% of service charge` : 'Fixed',
    });
  }
  return out;
}

// Admin-side validation (mirrors the server; the server re-validates).
export function validateIntervals(list: RateInterval[]): string | null {
  if (!list.length) return 'Add at least one plant-quantity interval';
  let prevMax = BASE_PLANTS;
  for (const iv of list) {
    const label = `${iv.min}–${iv.max} plants`;
    if (!Number.isInteger(iv.min) || !Number.isInteger(iv.max)) return 'Each interval needs whole-number From and To plant counts';
    if (iv.min !== prevMax + 1) return iv.min > prevMax + 1 ? `${label}: gap after ${prevMax} plants — must start at ${prevMax + 1}` : `${label}: overlaps the previous interval — must start at ${prevMax + 1}`;
    if (iv.max < iv.min) return `${label}: To is below From`;
    if (!(Number(iv.rate) > 0)) return `${label}: rate per plant must be more than ₹0`;
    prevMax = iv.max;
  }
  if (prevMax < 200) return `Intervals must cover every quantity up to 200 plants (they stop at ${prevMax})`;
  if (prevMax > 1000) return 'Intervals cannot go beyond 1000 plants';
  return null;
}

export const inr = (n: number, digits = 0) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

// Pre-GST line items stored on a one-time booking: service charge,
// vermicompost, each surcharge, then catalogue add-ons.
export function bookingLines(b: any): { name: string; amount: number }[] {
  const lines: { name: string; amount: number }[] = [];
  const plants = Number(b?.plant_count) || 0;
  lines.push({ name: `Gardening service${plants ? ` (${plants} plants)` : ''}`, amount: Number(b?.base_amount) || 0 });
  if (Number(b?.vermicompost_amount) > 0) lines.push({ name: `Vermicompost (${b.vermicompost_kg} kg)`, amount: Number(b.vermicompost_amount) });
  let s = b?.surcharge_details;
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = null; } }
  for (const x of Array.isArray(s) ? s : []) lines.push({ name: `Surcharge: ${x.name}`, amount: Number(x.amount) || 0 });
  for (const a of Array.isArray(b?.addons) ? b.addons : []) {
    lines.push({ name: a?.addon?.name || a?.name || 'Add-on', amount: (Number(a?.price) || 0) * (Number(a?.quantity) || 1) });
  }
  return lines;
}
