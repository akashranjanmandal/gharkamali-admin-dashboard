'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period, inPeriod } from '@/components/PeriodFilter';
import { IconSearch, IconDownload } from '@tabler/icons-react';

// Permanent register of every manually generated invoice — the record the
// accounts/CA reconciliation works from. The OFFICIAL number is the GKM
// sequential one (same series as automatic invoices); INV… is internal.
export default function ManualInvoicesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-manual-invoices', search, page],
    queryFn: () => AdminAPI.manualInvoices({ search: search || undefined, page, limit: 20 }),
  });

  const itemsRaw: any[] = (data as any)?.items || [];
  const items = itemsRaw.filter((m) => inPeriod(m, period));
  const total = (data as any)?.total ?? items.length;
  const pages = (data as any)?.pages ?? 1;

  const download = async (m: any) => {
    setDownloading(m.id);
    try { await AdminAPI.downloadManualInvoice(m.id); }
    catch { toast.error('Failed to download invoice'); }
    setDownloading(null);
  };

  const fetchAll = () => fetchAllPages(
    (p, limit) => AdminAPI.manualInvoices({ page: p, limit }),
    (res: any) => res?.items || [],
  );
  const mapExportRow = (m: any) => ({
    InvoiceNumber: m.gkm_invoice_number || '—',
    Reference: m.invoice_number,
    Customer: m.customer_name,
    Phone: m.customer_phone,
    Type: m.invoice_type,
    Outcome: m.outcome,
    PaymentStatus: m.payment_status || 'paid',
    Subtotal: m.subtotal,
    GST: m.gst_amount,
    Total: m.total_amount,
    CreatedBy: m.creator?.name,
    Date: m.created_at ?? m.createdAt,
  });

  const typeBadge: Record<string, string> = { ondemand: 'badge-blue', plan: 'badge-green', products: 'badge-gold' };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Manual Invoices</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {total} invoices generated from Create Invoice — official numbers share the same GKM series as automatic invoices.
          </p>
        </div>
        <ExportButton filename="ManualInvoices" fetchAll={fetchAll} mapRow={mapExportRow} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by number, customer or phone…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <PeriodFilter onChange={(p) => { setPeriod(p); setPage(1); }} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Invoice No.</th><th>Customer</th><th>Type</th><th>Outcome</th><th>Payment</th><th>Total</th><th>Created By</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton skel-text" style={{ width: '100%' }} /></td></tr>) :
                items.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>No manual invoices found</td></tr> :
                items.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--forest)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.gkm_invoice_number || '—'}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ref {m.invoice_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.customer_phone || '—'}</div>
                    </td>
                    <td><span className={`badge badge-sm ${typeBadge[m.invoice_type] || 'badge-gray'}`}>{m.invoice_type === 'ondemand' ? 'On-Demand' : m.invoice_type === 'plan' ? 'Plan' : 'Products'}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{String(m.outcome || '').replace(/_/g, ' ')}</td>
                    <td><span className={`badge badge-sm ${(m.payment_status || 'paid') === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{(m.payment_status || 'paid').toUpperCase()}</span></td>
                    <td style={{ fontWeight: 700 }}>₹{Number(m.total_amount ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.creator?.name || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {(m.created_at ?? m.createdAt) ? new Date(m.created_at ?? m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-xs btn-outline" disabled={downloading === m.id} onClick={() => download(m)} style={{ gap: 4 }}>
                        <IconDownload size={13} /> {downloading === m.id ? '…' : 'Invoice'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button>
        </div>}
      </div>
    </AdminLayout>
  );
}
