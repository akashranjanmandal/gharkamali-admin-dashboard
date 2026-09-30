'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period, inPeriod } from '@/components/PeriodFilter';
import { IconSearch, IconDownload, IconTrash, IconPencil } from '@tabler/icons-react';

// Permanent register of every manually generated invoice — the record the
// accounts/CA reconciliation works from. The OFFICIAL number is the GKM
// sequential one (same series as automatic invoices); INV… is internal.
export default function ManualInvoicesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<any>(null); // invoice being corrected
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
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

  // Permanently removes the invoice AND its GKM number. Deleting the latest
  // invoice frees its number for the next one; deleting an older one leaves a
  // gap in the series. Any booking/subscription created with it is kept.
  const remove = async (m: any) => {
    const label = m.gkm_invoice_number || m.invoice_number;
    if (!window.confirm(
      `Delete invoice ${label} for ${m.customer_name} (₹${Number(m.total_amount ?? 0).toLocaleString('en-IN')})?\n\n` +
      'This permanently removes the invoice and its GKM number. A booking or subscription created with it is NOT deleted.'
    )) return;
    setDeleting(m.id);
    try {
      const res: any = await AdminAPI.deleteManualInvoice(m.id);
      toast.success(res?.message || 'Invoice deleted');
      refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete invoice');
    }
    setDeleting(null);
  };

  const openEdit = (m: any) => {
    setEditForm({
      customer_name: m.customer_name || '',
      customer_phone: m.customer_phone || '',
      customer_gstin: m.customer_gstin || '',
      service_address: m.service_address || '',
      city: m.city || '',
      state: m.state || '',
      pincode: m.pincode || '',
      // DATEONLY comes back as YYYY-MM-DD; fall back to the creation date.
      invoice_date: m.invoice_date || String(m.created_at ?? m.createdAt ?? '').slice(0, 10),
      tax_type: m.is_up ? 'cgst_sgst' : 'igst',
    });
    setEditModal(m);
  };
  const ef = (k: string, v: any) => setEditForm((p: any) => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    if (!String(editForm.customer_name).trim()) { toast.error('Customer name cannot be empty'); return; }
    setSaving(true);
    try {
      const res: any = await AdminAPI.updateManualInvoice(editModal.id, editForm);
      toast.success(res?.message || 'Invoice updated');
      setEditModal(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update invoice');
    }
    setSaving(false);
  };

  const fetchAll = () => fetchAllPages(
    (p, limit) => AdminAPI.manualInvoices({ page: p, limit }),
    (res: any) => res?.items || [],
  );
  const mapExportRow = (m: any) => {
    // Split the GST the way it was billed: within UP → CGST+SGST halves,
    // outside → all IGST. Same convention as the PDF.
    const gst = Number(m.gst_amount) || 0;
    const half = Math.round((gst / 2) * 100) / 100;
    return {
      InvoiceNumber: m.gkm_invoice_number || '—',
      Reference: m.invoice_number,
      Customer: m.customer_name,
      Phone: m.customer_phone,
      CustomerGSTIN: m.customer_gstin || '',
      Type: m.invoice_type,
      Outcome: m.outcome,
      PaymentStatus: m.payment_status || 'paid',
      State: m.state || '',
      GSTType: m.is_up ? 'CGST+SGST (Within State)' : 'IGST (Outside State)',
      Subtotal: m.subtotal,
      GSTRate: m.invoice_type === 'products' ? 'per-line' : `${m.gst_rate ?? 18}%`,
      CGST: m.is_up ? half : 0,
      SGST: m.is_up ? Math.round((gst - half) * 100) / 100 : 0,
      IGST: m.is_up ? 0 : gst,
      GST: m.gst_amount,
      Total: m.total_amount,
      CreatedBy: m.creator?.name,
      Date: m.invoice_date ?? m.created_at ?? m.createdAt,
    };
  };

  const typeBadge: Record<string, string> = { ondemand: 'badge-blue', plan: 'badge-green', products: 'badge-gold', makeover: 'badge-forest' };
  const typeLabel: Record<string, string> = { ondemand: 'On-Demand', plan: 'Plan', products: 'Products', makeover: 'Green Makeover' };

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
                    <td><span className={`badge badge-sm ${typeBadge[m.invoice_type] || 'badge-gray'}`}>{typeLabel[m.invoice_type] || m.invoice_type}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{String(m.outcome || '').replace(/_/g, ' ')}</td>
                    <td><span className={`badge badge-sm ${(m.payment_status || 'paid') === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{(m.payment_status || 'paid').toUpperCase()}</span></td>
                    <td style={{ fontWeight: 700 }}>₹{Number(m.total_amount ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.creator?.name || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {(m.invoice_date ?? m.created_at ?? m.createdAt) ? new Date(m.invoice_date ?? m.created_at ?? m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-xs btn-outline" disabled={downloading === m.id} onClick={() => download(m)} style={{ gap: 4 }}>
                          <IconDownload size={13} /> {downloading === m.id ? '…' : 'Invoice'}
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => openEdit(m)} style={{ gap: 4 }} title="Correct name / address / date">
                          <IconPencil size={13} /> Edit
                        </button>
                        <button className="btn btn-xs btn-danger" disabled={deleting === m.id} onClick={() => remove(m)} style={{ gap: 4 }} title="Delete invoice">
                          <IconTrash size={13} /> {deleting === m.id ? '…' : 'Delete'}
                        </button>
                      </div>
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

      {/* Edit Modal — corrections only; amounts and the GKM number stay frozen */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Edit — {editModal.gkm_invoice_number || editModal.invoice_number}</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Customer Name *</label>
                  <input className="input" value={editForm.customer_name} onChange={(e) => ef('customer_name', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Phone</label>
                  <input className="input" type="tel" inputMode="numeric" maxLength={10} value={editForm.customer_phone}
                    onChange={(e) => ef('customer_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Customer GSTIN (B2B input credit — blank for none)</label>
                <input className="input" maxLength={15} value={editForm.customer_gstin} style={{ fontFamily: 'monospace' }}
                  onChange={(e) => ef('customer_gstin', e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Address</label>
                <input className="input" value={editForm.service_address} onChange={(e) => ef('service_address', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>City</label>
                  <input className="input" value={editForm.city} onChange={(e) => ef('city', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>State</label>
                  <input className="input" value={editForm.state} onChange={(e) => ef('state', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Pincode</label>
                  <input className="input" inputMode="numeric" maxLength={6} value={editForm.pincode}
                    onChange={(e) => ef('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Invoice Date</label>
                  <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={editForm.invoice_date}
                    onChange={(e) => ef('invoice_date', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tax Split</label>
                  <select className="input" value={editForm.tax_type} onChange={(e) => ef('tax_type', e.target.value)}>
                    <option value="cgst_sgst">CGST + SGST (within UP)</option>
                    <option value="igst">IGST (outside UP)</option>
                    <option value="auto">Auto (re-detect from address)</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Amounts, GST rate and the invoice number cannot be changed — delete and recreate the invoice for those. Re-download the PDF after saving to get the corrected copy.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
