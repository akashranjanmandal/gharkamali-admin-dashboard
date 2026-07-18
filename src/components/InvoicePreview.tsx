'use client';
// On-screen tax-invoice summary for booking & subscription modals.
// Uses shared logic (src/lib/invoice.ts) so it matches the downloadable PDF and
// the customer website. Booking/subscription totals are GST-INCLUSIVE.
import { SELLER, isUPAddress, inclusiveGstSplit, inr } from '@/lib/invoice';

type Line = { name: string; amount: number };

export default function InvoicePreview({
  address,
  total,
  lines,
  statusLabel,
}: {
  address?: string | null;
  total: number;
  lines: Line[];
  statusLabel?: string;
}) {
  const isUP = isUPAddress(address);
  const { subtotal, gst, half } = inclusiveGstSplit(total);

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Tax Invoice / GST</h4>
        {statusLabel && <span className="badge badge-forest">{statusLabel}</span>}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        <strong>{SELLER.brand}</strong> (a unit of {SELLER.legalName}) · GSTIN {SELLER.gstin} · {isUP ? 'SGST + CGST (intra-state)' : 'IGST (inter-state)'}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 0', color: 'var(--text-2)' }}>{l.name}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{inr(l.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Subtotal (excl. GST)</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{inr(subtotal)}</td>
          </tr>
          {isUP ? (
            <>
              <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>SGST @ 9%</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(half)}</td></tr>
              <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>CGST @ 9%</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(half)}</td></tr>
            </>
          ) : (
            <tr><td style={{ padding: '4px 0', color: 'var(--forest)' }}>IGST @ 18%</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)' }}>{inr(gst)}</td></tr>
          )}
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '8px 0', fontWeight: 800 }}>Total Amount</td>
            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--forest)', fontSize: '1rem' }}>{inr(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
