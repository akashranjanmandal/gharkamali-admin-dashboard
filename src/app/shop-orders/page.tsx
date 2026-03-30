'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

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
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-shop-orders', filter], queryFn: () => AdminAPI.shopOrders(filter ? { status: filter } : {}) });
  const orders: any[] = Array.isArray((data as any)?.orders) ? (data as any).orders : [];

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
        <div style={{ display: 'flex', gap: 10 }}>
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
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
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
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Order {selected.order_number || `#${selected.id}`}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>CUSTOMER</div>
                <div style={{ fontWeight: 700 }}>{selected.customer?.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selected.customer?.phone}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{selected.shipping_address}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>ITEMS</div>
                {(selected.items || []).map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{item.quantity}× {item.product?.name}</span>
                    <span style={{ fontWeight: 700 }}>₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 800 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--forest)' }}>₹{Number(selected.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Update Status</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => statusMut.mutate({ id: selected.id, status: s })} disabled={statusMut.isPending || selected.status === s}
                      className={`btn btn-sm ${selected.status === s ? 'btn-forest' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
