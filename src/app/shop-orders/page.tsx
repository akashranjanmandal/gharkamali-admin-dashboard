'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconCalendar, IconUser, IconPackage, IconCreditCard, IconTruck } from '@tabler/icons-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-gold',
  processing: 'badge-outline',
  shipped: 'badge-outline',
  delivered: 'badge-forest',
  cancelled: 'badge-danger',
  returned: 'badge-danger',
};

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function AdminShopOrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-shop-orders', filter, search, dateFrom, dateTo], 
    queryFn: () => AdminAPI.shopOrders({ 
      status: filter || undefined,
      search: search || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined
    }) 
  });
  const ordersRaw: any[] = Array.isArray((data as any)?.orders) ? (data as any).orders : [];

  const { data: customerOrdersRaw } = useQuery({
    queryKey: ['admin-customer-orders', selected?.customer?.id],
    queryFn: () => selected?.customer?.id ? AdminAPI.shopOrders({ search: selected.customer.phone }) : null,
    enabled: !!selected?.customer?.id
  });

  const orders = ordersRaw.filter(o => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(term) ||
      o.customer?.name?.toLowerCase().includes(term) ||
      o.customer?.phone?.includes(term) ||
      o.status?.toLowerCase().includes(term) ||
      o.payment_status?.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    const exportData = orders.map(o => ({
      OrderNumber: o.order_number || `#${o.id}`,
      Customer: o.customer?.name,
      Phone: o.customer?.phone,
      Total: o.total_amount,
      PaymentStatus: o.payment_status,
      OrderStatus: o.status,
      Date: o.created_at,
      Address: o.shipping_address,
    }));
    exportToCSV(exportData, `ShopOrders_${new Date().toISOString().split('T')[0]}`);
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => AdminAPI.updateOrderStatus(id, status),
    onSuccess: () => { toast.success('Order status updated!'); qc.invalidateQueries({ queryKey: ['admin-shop-orders'] }); setSelected(null); },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Shop Orders</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>View and manage all customer purchases from the marketplace</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export Report
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search order # or customer…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" style={{ width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-forest' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array(6).fill(0).map((_, i) => (
              <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>)}</tr>
            )) : orders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>No orders yet. Once customers start purchasing, orders will appear here.</td></tr>
            ) : orders.map((o: any) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 800, color: 'var(--forest)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.order_number || `#${o.id}`}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{o.customer?.name || 'Unknown'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.customer?.phone}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(o.items || []).slice(0, 2).map((item: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                        {item.quantity}× {item.product?.name || 'Product'}
                      </div>
                    ))}
                    {(o.items || []).length > 2 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{o.items.length - 2} more</div>}
                  </div>
                </td>
                <td style={{ fontWeight: 800 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${o.payment_status === 'paid' ? 'badge-forest' : o.payment_status === 'failed' ? 'badge-danger' : 'badge-gold'}`}>{o.payment_status}</span></td>
                <td><span className={`badge ${STATUS_COLORS[o.status] || 'badge-outline'}`} style={{ textTransform: 'capitalize' }}>{o.status}</span></td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {(() => {
                    const d = o.created_at || o.createdAt;
                    return d ? new Date(d).toLocaleDateString('en-IN') : 'N/A';
                  })()}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => setSelected(o)} className="btn btn-sm btn-ghost" style={{ padding: '6px 12px' }}>Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Order {selected.order_number || `#${selected.id}`}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
              <div className="modal-scroll-area">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>STATUS</div>
                    <span className={`badge ${STATUS_COLORS[selected.status] || 'badge-outline'}`} style={{ textTransform: 'capitalize' }}>{selected.status}</span>
                  </div>
                  <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>PAYMENT</div>
                    <span className={`badge ${selected.payment_status === 'paid' ? 'badge-forest' : selected.payment_status === 'failed' ? 'badge-danger' : 'badge-gold'}`}>{selected.payment_status?.toUpperCase()}</span>
                  </div>
                  <div className="card" style={{ padding: 12, background: 'var(--bg)', border: 'none' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL</div>
                    <div style={{ fontWeight: 800, color: 'var(--forest)', fontSize: '1.1rem' }}>₹{Number(selected.total_amount).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Customer</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--forest-light)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{selected.customer?.name?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{selected.customer?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+91 {selected.customer?.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Shipping Address</h4>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                      <IconTruck size={18} style={{ color: 'var(--forest)', marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{selected.shipping_address}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Order Items</h4>
                  {(selected.items || []).map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPackage size={18} style={{ color: 'var(--text-muted)' }} /></div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity: {item.quantity}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ padding: 16, background: 'var(--bg)', borderRadius: 12 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Update Order Status</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => statusMut.mutate({ id: selected.id, status: s })} disabled={statusMut.isPending || selected.status === s}
                        className={`btn btn-sm ${selected.status === s ? 'btn-forest' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-side-panel">
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Conversion Summary</h4>
                  <div className="card" style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <IconCreditCard size={18} style={{ color: 'var(--forest)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {customerOrdersRaw ? (
                          (() => {
                            const allOrders = (customerOrdersRaw as any).orders || [];
                            if (allOrders.length === 0) return 'First order';
                            const sorted = [...allOrders].sort((a,b)=> {
                              const da = new Date(a.created_at || a.createdAt).getTime();
                              const db = new Date(b.created_at || b.createdAt).getTime();
                              return da - db;
                            });
                            const idx = sorted.findIndex(o => o.id === selected.id);
                            const pos = idx === -1 ? allOrders.length : idx + 1;
                            const suffixes = ['th','st','nd','rd'];
                            const suffix = (pos % 10 > 3 || (pos % 100 >= 11 && pos % 100 <= 13)) ? 'th' : suffixes[pos % 10] || 'th';
                            return `This is their ${pos}${suffix} order`;
                          })()
                        ) : 'Calculating…'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer Loyalty Track</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Timeline</h4>
                  <div style={{ position: 'relative', paddingLeft: 24 }}>
                    <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)' }}></div>
                    {[
                      { label: 'Delivered', status: 'delivered', time: selected.delivered_at },
                      { label: 'Shipped', status: 'shipped', time: selected.shipped_at },
                      { label: 'Processing', status: 'processing', time: selected.status === 'processing' ? (selected.updated_at || selected.updatedAt) : null },
                      { label: 'Payment successful', status: 'paid', time: selected.payment_status === 'paid' ? (selected.paid_at || selected.updated_at || selected.updatedAt) : null },
                      { label: 'Order placed', status: 'pending', time: selected.created_at || selected.createdAt },
                    ].filter(e => e.time || e.status === 'pending').map((e, i) => (
                      <div key={i} style={{ marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: e.time ? 'var(--forest)' : 'var(--text-faint)', border: '2px solid #fff' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: e.time ? 600 : 400, color: e.time ? 'var(--text)' : 'var(--text-muted)' }}>{e.label}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {e.time ? new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </span>
                        </div>
                        {e.time && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(e.time).toLocaleDateString([], { day: 'numeric', month: 'short' })}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
