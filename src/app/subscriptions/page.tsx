'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconFilter, IconDownload, IconSearch, IconX, IconCalendar, IconUser, IconMapPin, IconLeaf } from '@tabler/icons-react';

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [planId, setPlanId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-subscriptions', page, status, zoneId, planId, search], 
    queryFn: () => AdminAPI.subscriptions({ 
      page, 
      limit: 20, 
      status: status || undefined,
      zone_id: zoneId || undefined,
      plan_id: planId || undefined,
      search: search || undefined
    }) 
  });

  const { data: zonesRaw } = useQuery({ queryKey: ['admin-zones'], queryFn: () => AdminAPI.zones() });
  const { data: plansRaw } = useQuery({ queryKey: ['admin-plans'], queryFn: () => AdminAPI.plans() });

  const { data: subHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['admin-subscription-history', selected?.id],
    queryFn: () => selected?.id ? AdminAPI.bookings({ subscription_id: selected.id, limit: 100 }) : null,
    enabled: !!selected?.id
  });

  const subsRaw: any[] = (data as any)?.subscriptions ?? [];
  const zones: any[] = (zonesRaw as any) ?? [];
  const plans: any[] = (plansRaw as any) ?? [];

  // Client-side "all columns" filtering
  const subs = subsRaw.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.id?.toString().includes(term) ||
      s.customer?.name?.toLowerCase().includes(term) ||
      s.customer?.phone?.includes(term) ||
      s.plan?.name?.toLowerCase().includes(term) ||
      s.zone?.name?.toLowerCase().includes(term) ||
      s.status?.toLowerCase().includes(term)
    );
  });

  const total = (data as any)?.total ?? subs.length;
  const pages = Math.ceil(total / 20);

  const STATUS_COLOR: Record<string,string> = { active:'badge-green', paused:'badge-yellow', cancelled:'badge-gray', expired:'badge-red' };

  const handleExport = () => {
    const exportData = subs.map(s => ({
      ID: s.id,
      Customer: s.customer?.name,
      Phone: s.customer?.phone,
      Plan: s.plan?.name,
      Zone: s.zone?.name,
      Plants: s.plant_count,
      Status: s.status,
      AutoRenew: s.auto_renew ? 'Yes' : 'No',
      StartDate: s.start_date,
      NextVisit: s.next_visit_date,
    }));
    exportToCSV(exportData, `Subscriptions_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{total} total active subscriptions</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export Report
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search customer name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={zoneId} onChange={e => { setZoneId(e.target.value); setPage(1); }} className="input" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={planId} onChange={e => { setPlanId(e.target.value); setPage(1); }} className="input" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Plans</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Plan</th><th>Zone</th><th>Plants</th><th>Status</th><th>Auto Renew</th><th>Start</th><th>Next Visit</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array(8).fill(null).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton skel-text" /></td></tr>) :
                subs.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No subscriptions found matching criteria</td></tr> :
                subs.map((s: any) => (
                  <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.customer?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {s.customer?.phone}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.plan?.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.zone?.name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{s.plant_count}</td>
                    <td><span className={`badge ${STATUS_COLOR[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                    <td>{s.auto_renew ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.start_date && new Date(s.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td style={{ fontSize: '0.78rem', color: s.status === 'active' ? 'var(--forest)' : 'var(--text-muted)', fontWeight: s.status === 'active' ? 700 : 400 }}>{s.next_visit_date && new Date(s.next_visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setSelected(s); }}>Details</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-ghost">← Prev</button><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}/{pages}</span><button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-sm btn-ghost">Next →</button></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Subscription Details</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><IconX size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Customer Info</h4>
                  <div className="card" style={{ padding: 16, background: 'var(--bg)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--forest)', color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700 }}>{selected.customer?.name?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{selected.customer?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+91 {selected.customer?.phone}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{selected.customer?.email || 'No email provided'}</div>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Plan Details</h4>
                  <div className="card" style={{ padding: 16, background: 'var(--bg)', border: 'none' }}>
                    <div style={{ fontWeight: 800, color: 'var(--forest)', fontSize: '1.1rem' }}>{selected.plan?.name}</div>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>{selected.plant_count} Plants Included</div>
                    <div style={{ marginTop: 8 }}><span className={`badge ${STATUS_COLOR[selected.status]}`}>{selected.status}</span></div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Subscription Metadata</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>START DATE</div>
                    <div style={{ fontWeight: 600 }}>{new Date(selected.start_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                  </div>
                  <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>NEXT VISIT</div>
                    <div style={{ fontWeight: 600, color: 'var(--forest)' }}>{selected.next_visit_date ? new Date(selected.next_visit_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</div>
                  </div>
                  <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>AUTO RENEW</div>
                    <div style={{ fontWeight: 600 }}>{selected.auto_renew ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Service History</h4>
                  {subHistory && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--forest)' }}>
                      {((subHistory as any).bookings || []).filter((b: any) => b.status === 'completed').length} Visits Completed
                    </div>
                  )}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    <table className="admin-table mini">
                      <thead>
                        <tr><th>Booking #</th><th>Date</th><th>Status</th><th>Gardener</th></tr>
                      </thead>
                      <tbody>
                        {isHistoryLoading ? Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton mini" /></td></tr>) :
                          ((subHistory as any)?.bookings || []).length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>No service history found</td></tr> :
                          ((subHistory as any).bookings || []).map((b: any) => (
                            <tr key={b.id}>
                              <td style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--forest)' }}>{b.booking_number}</td>
                              <td style={{ fontSize: '0.75rem' }}>{new Date(b.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                              <td><span className={`badge badge-sm badge-${b.status === 'completed' ? 'green' : 'blue'}`} style={{ fontSize: '0.65rem' }}>{b.status}</span></td>
                              <td style={{ fontSize: '0.75rem' }}>{b.gardener?.name || '—'}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Service Location</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                  <IconMapPin size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{selected.zone?.name || 'Universal Zone'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{selected.service_address || 'Address information not linked to subscription'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'active' && <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Pause Subscription</button>}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
