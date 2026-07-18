// Shared invoice/GST logic for admin on-screen previews.
// MUST stay consistent with the customer website invoices and the backend PDF:
//   - website: GharKaMali_Website/src/app/shop/orders/[id]/page.tsx
//   - website: GharKaMali_Website/src/app/bookings/[id]/page.tsx
//   - backend: GharKaMali_Backend/src/services/invoice.service.js
// The website is the reference design — change all four together if it changes.

export const SELLER = {
  brand: 'GharKaMali',                    // main brand name
  legalName: 'Plantura Care Pvt Ltd',     // registered legal entity
  tagline: 'Trusted plant care and gardening services',
  gstin: '09AAQCP7633P1ZD',
  address: 'Noida, Uttar Pradesh — 201301',
};

// Intra-state (UP) → SGST + CGST; otherwise IGST. Checks state OR city OR address
// for UP cities, exactly like the website/backend.
export function isUPAddress(...parts: (string | null | undefined)[]): boolean {
  const addr = parts.filter(Boolean).join(' ').toLowerCase();
  return addr.includes('uttar pradesh') || addr === 'up' || addr.includes('noida') ||
    addr.includes('greater noida') || addr.includes('ghaziabad');
}

export const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Booking / subscription totals are GST-INCLUSIVE (× 1.18). Returns the split.
export function inclusiveGstSplit(total: number) {
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const gst = Math.round((total - subtotal) * 100) / 100;
  return { subtotal, gst, half: gst / 2 };
}
