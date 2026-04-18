'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcRevenue   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcBooking   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcUsers     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcStar      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcPin       = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcLeaf      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
const IcPercent   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const IcShop      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IcSubs      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;

function KpiCard({ label, value, icon, color, sub, trend }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}14`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: trend >= 0 ? '#16a34a' : '#dc2626', background: trend >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', padding: '3px 8px', borderRadius: 99 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points={trend >= 0 ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: sub ? 4 : 0 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

const CHART_OPTS: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const [selectedZone, setSelectedZone] = useState('');

  const { data: zonesRaw } = useQuery({ queryKey: ['admin-geofences'], queryFn: () => AdminAPI.geofences() });
  // Filter to only active geofence zones
  const zones: any[] = (Array.isArray(zonesRaw) ? zonesRaw : (zonesRaw as any)?.data ?? [])
    .filter((z:any) => z.is_active !== false)
    .sort((a:any, b:any) => (a.name || '').localeCompare(b.name || ''));
  
  const selectedZoneName = zones.find((z:any) => String(z.id) === selectedZone)?.name || 'All Service Areas';

  const { data: an, isLoading } = useQuery({
    queryKey: ['admin-analytics', period, selectedZone],
    queryFn: () => AdminAPI.analytics({ period, geofence_id: selectedZone || undefined }),
  });
  const { data: util } = useQuery({
    queryKey: ['admin-utilization', period, selectedZone],
    queryFn: () => AdminAPI.utilization({ period, geofence_id: selectedZone || undefined }),
  });
  const a: any = an;
  const u: any = util;

  // ── Existing data mappings ─────────────────────────────────────────────────
  const zonePerformance = (a?.bookingsByZone || []).map((z: any) => ({
    ...z, zone_name: z.zone, total_bookings: Number(z.total || 0), completed_bookings: 0,
  }));
  const shopOrdersByZone = (a?.shopOrdersByZone || []);
  const shopOrdersByCity = (a?.shopOrdersByCity || []);
  const newCustomersByDay = (a?.newUsersTrend || []).filter((r: any) => r.role === 'customer');
  const bookingsByStatus = a?.bookingStatusDist || [];
  const totalBookings = (a?.bookingsByZone || []).reduce((n: number, z: any) => n + Number(z.total || 0), 0);
  const totalRevenue = (a?.bookingsByZone || []).reduce((n: number, z: any) => n + Number(z.revenue || 0), 0);
  const newCustomers = newCustomersByDay.reduce((n: number, r: any) => n + Number(r.count || 0), 0);

  // ── New analytics fields ───────────────────────────────────────────────────
  const shopStats: any    = a?.shopOrdersStats || {};
  const topProducts: any[] = a?.topProducts || [];
  const subscriptionsByPlan: any[] = a?.subscriptionsByPlan || [];
  const revenueBreakdown: any      = a?.revenueBreakdown || {};
  const bookingRevenue      = Number(revenueBreakdown.booking_revenue      || 0);
  const shopRevenue         = Number(revenueBreakdown.shop_revenue         || 0);
  const subscriptionRevenue = Number(revenueBreakdown.subscription_revenue || 0);
  const totalAnalyticsRevenue = bookingRevenue + shopRevenue + subscriptionRevenue;

  // ── Zone-specific revenue ──────────────────────────────────────────────────
  const zoneAllRevenue = (a?.bookingsByZone || []).reduce((n: number, z: any) => n + Number(z.revenue || 0), 0);
  const shopZoneRevenue = shopOrdersByZone.reduce((n: number, z: any) => n + Number(z.revenue || 0), 0);
  const zoneShopOrders = shopOrdersByZone.reduce((n: number, z: any) => n + Number(z.total || 0), 0);

  // ── Chart datasets ─────────────────────────────────────────────────────────
  const revenueData = {
    labels: (a?.revenueByDay||[]).map((r:any) => new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})),
    datasets: [{ label:'Revenue', data:(a?.revenueByDay||[]).map((r:any)=>r.revenue||r.amount||0), borderColor:'#03411a', backgroundColor:'rgba(3,65,26,0.07)', fill:true, tension:0.4, borderWidth:2, pointRadius:0, pointHoverRadius:5 }],
  };
  const bookingsData = {
    labels: (a?.bookingsByDay||[]).map((r:any) => new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})),
    datasets: [{ label:'Bookings', data:(a?.bookingsByDay||[]).map((r:any)=>r.count||r.bookings||0), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.07)', fill:true, tension:0.4, borderWidth:2, pointRadius:0, pointHoverRadius:5 }],
  };
  const zoneData = {
    labels: zonePerformance.map((z:any)=>z.zone_name),
    datasets: [{ label:'Bookings', data:zonePerformance.map((z:any)=>z.total_bookings), backgroundColor:'rgba(3,65,26,0.8)', borderRadius:6, borderSkipped:false }],
  };
  const newCustData = {
    labels: newCustomersByDay.map((r:any) => new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})),
    datasets: [{ label:'New Customers', data:newCustomersByDay.map((r:any)=>r.count||0), backgroundColor:'rgba(37,99,235,0.7)', borderRadius:6, borderSkipped:false }],
  };
  const statusData = {
    labels: bookingsByStatus.map((s:any)=>s.status?.replace(/_/g,' ')),
    datasets: [{ data:bookingsByStatus.map((s:any)=>s.count||0), backgroundColor:['#03411a','#2563eb','#d97706','#16a34a','#808285','#dc2626'], borderWidth:0, hoverOffset:8 }],
  };
  const revenueBreakdownData = {
    labels: ['Service Bookings', 'Shop Orders', 'Subscriptions'],
    datasets: [{ data:[bookingRevenue, shopRevenue, subscriptionRevenue], backgroundColor:['#03411a','#2563eb','#d97706'], borderWidth:0, hoverOffset:8 }],
  };
  const topProductsData = {
    labels: topProducts.map((p:any) => p.name),
    datasets: [{ label:'Units Sold', data:topProducts.map((p:any)=>Number(p.total_sold||0)), backgroundColor:'rgba(201,168,76,0.8)', borderRadius:6, borderSkipped:false }],
  };
  const planDistData = {
    labels: subscriptionsByPlan.map((p:any) => p.name),
    datasets: [{ data:subscriptionsByPlan.map((p:any)=>Number(p.active_count||0)), backgroundColor:['#03411a','#2563eb','#d97706','#16a34a','#9333ea'], borderWidth:0, hoverOffset:8 }],
  };
  const shopOrdersZoneData = {
    labels: shopOrdersByZone.map((z:any) => z.zone),
    datasets: [{ label:'Orders', data:shopOrdersByZone.map((z:any)=>Number(z.total||0)), backgroundColor:'rgba(147,51,234,0.7)', borderRadius:6, borderSkipped:false }],
  };
  const shopRevenueZoneData = {
    labels: shopOrdersByZone.map((z:any) => z.zone),
    datasets: [{ label:'Revenue (₹)', data:shopOrdersByZone.map((z:any)=>Number(z.revenue||0)), backgroundColor:'rgba(37,99,235,0.7)', borderRadius:6, borderSkipped:false }],
  };

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  const KPIS = [
    { label:'Total Revenue',        value: totalAnalyticsRevenue ? `₹${Number(totalAnalyticsRevenue).toLocaleString('en-IN')}` : '—', icon:<IcRevenue/>, color:'#03411a', sub:`${period}-day period`, trend:18 },
    { label:'Booking Revenue',      value: bookingRevenue ? `₹${Number(bookingRevenue).toLocaleString('en-IN')}` : '—', icon:<IcBooking/>, color:'#2563eb', sub:'Service bookings' },
    { label:'Shop Revenue',         value: shopRevenue ? `₹${Number(shopRevenue).toLocaleString('en-IN')}` : '—', icon:<IcShop/>, color:'#9333ea', sub:'Marketplace orders' },
    { label:'Total Bookings',       value: totalBookings ? totalBookings.toLocaleString('en-IN') : '—', icon:<IcBooking/>, color:'#2563eb', sub:'Service requests', trend:12 },
    { label:'Shop Orders',          value: shopStats.total_orders ? Number(shopStats.total_orders).toLocaleString('en-IN') : '—', icon:<IcShop/>, color:'#9333ea', sub:'Marketplace' },
    { label:'Avg Rating',           value: a?.avgRating ? `${Number(a.avgRating).toFixed(1)} ★` : '—', icon:<IcStar/>, color:'#d97706', sub:'Out of 5.0' },
    { label:'Completion Rate',      value: a?.completionRate != null ? `${Number(a.completionRate).toFixed(0)}%` : '—', icon:<IcPercent/>, color:'#16a34a', sub:'Booking completion', trend:3 },
    { label:'Active Subscriptions', value: a?.activeSubscriptions != null ? Number(a.activeSubscriptions).toLocaleString('en-IN') : '—', icon:<IcSubs/>, color:'#0891b2', sub:'Active plans' },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:4 }}>Platform performance & insights</p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:4 }}>Showing analytics for <strong>{a?.selectedCity ? `${selectedZoneName} (${a.selectedCity})` : selectedZoneName}</strong></p>
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', padding:'8px 12px', borderRadius:12, border:'1px solid var(--border)' }}>
            <label htmlFor="zone-filter" style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-muted)' }}>Service Area:</label>
            <select id="zone-filter" value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="input" style={{ minWidth:200, borderRadius:10, padding:'8px 12px', border:'1px solid var(--border)', background:'#f9fafb', color:'var(--text)', fontWeight:600, cursor:'pointer' }}>
              <option value="">All Service Areas</option>
              {zones.length === 0 ? <option value="" disabled>No service areas available</option> : zones.map(z => <option key={z.id} value={String(z.id)}>{z.name}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', background:'#fff', padding:4, borderRadius:12, border:'1px solid var(--border)' }}>
            {[['7','7 Days'],['30','30 Days'],['90','90 Days'],['365','1 Year']].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={{ padding:'6px 14px', borderRadius:9, border:'none', background:period===v?'var(--forest)':'transparent', color:period===v?'#fff':'var(--text-muted)', fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16, marginBottom:24 }}>
        {isLoading ? Array(8).fill(null).map((_,i)=><div key={i} className="skeleton" style={{ height:130, borderRadius:18 }}/>) :
          KPIS.map((k,i)=><KpiCard key={i} {...k}/>)}
      </div>

      {/* Revenue + Bookings charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><h2>Revenue Trend</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Daily ₹</span></div>
          <div className="card-body" style={{ height:240 }}>
            {(a?.revenueByDay||[]).length>0 ? <Line data={revenueData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)',maxRotation:0}}, y:{grid:{color:'rgba(3,65,26,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)',callback:(v:any)=>`₹${Number(v).toLocaleString('en-IN')}`}} } }} />
            : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)',fontSize:'0.85rem' }}>No revenue data</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Booking Volume</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Daily count</span></div>
          <div className="card-body" style={{ height:240 }}>
            {(a?.bookingsByDay||[]).length>0 ? <Line data={bookingsData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)',maxRotation:0}}, y:{grid:{color:'rgba(37,99,235,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}} } }} />
            : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)',fontSize:'0.85rem' }}>No booking data</div>}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown + Shop Orders + Plan Distribution */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Revenue Source Donut */}
        <div className="card">
          <div className="card-header"><h2>Revenue Sources</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Period breakdown</span></div>
          <div style={{ padding:'8px 20px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
            {totalAnalyticsRevenue > 0 ? (
              <>
                <div style={{ height:140, width:140, flexShrink:0 }}>
                  <Doughnut data={revenueBreakdownData} options={{ ...CHART_OPTS, plugins:{ legend:{ display:false } }, cutout:'65%' }} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Bookings',      val:bookingRevenue,      color:'#03411a' },
                    { label:'Shop',          val:shopRevenue,         color:'#2563eb' },
                    { label:'Subscriptions', val:subscriptionRevenue, color:'#d97706' },
                  ].map((r,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:r.color, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:600 }}>{r.label}</div>
                        <div style={{ fontSize:'0.82rem', fontWeight:800, color:r.color }}>₹{r.val.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ padding:'24px 0', color:'var(--text-muted)',fontSize:'0.85rem' }}>No revenue data</div>}
          </div>
        </div>

        {/* Shop Order Stats */}
        <div className="card">
          <div className="card-header"><h2>Shop Orders</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Marketplace</span></div>
          <div style={{ padding:'0 20px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Total Orders',  val:Number(shopStats.total_orders||0).toLocaleString('en-IN'),  color:'#2563eb' },
                { label:'Revenue',       val:shopStats.total_revenue ? `₹${Number(shopStats.total_revenue).toLocaleString('en-IN')}` : '—',  color:'#03411a' },
                { label:'Delivered',     val:Number(shopStats.delivered_orders||0).toLocaleString('en-IN'),  color:'#16a34a' },
                { label:'Processing',    val:Number(shopStats.processing_orders||0).toLocaleString('en-IN'), color:'#0891b2' },
                { label:'Shipped',       val:Number(shopStats.shipped_orders||0).toLocaleString('en-IN'),    color:'#9333ea' },
                { label:'Cancelled',     val:Number(shopStats.cancelled_orders||0).toLocaleString('en-IN'),  color:'#dc2626' },
              ].map((s,i)=>(
                <div key={i} style={{ padding:'10px 12px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'0.63rem', color:'var(--text-muted)', marginBottom:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                  <div style={{ fontSize:'1.05rem', fontWeight:900, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Plan Distribution */}
        <div className="card">
          <div className="card-header"><h2>Plan Distribution</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Active subscribers</span></div>
          <div className="card-body" style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {subscriptionsByPlan.length>0
              ? <Doughnut data={planDistData} options={{ ...CHART_OPTS, plugins:{ legend:{ position:'bottom', labels:{ font:{size:9,family:'Poppins'}, padding:6, boxWidth:8 } } }, cutout:'58%' }} />
              : <div style={{ color:'var(--text-muted)',fontSize:'0.85rem' }}>No subscription data</div>}
          </div>
        </div>
      </div>

      {/* Zone + Status Donut */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><h2>Bookings by Zone</h2><IcPin /></div>
          <div className="card-body" style={{ height:260 }}>
            {zonePerformance.length>0 ? <Bar data={zoneData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}}, y:{grid:{color:'rgba(3,65,26,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}} } }} />
            : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)',fontSize:'0.85rem' }}>No zone data</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Status Breakdown</h2></div>
          <div className="card-body" style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {bookingsByStatus.length>0 ? <Doughnut data={statusData} options={{ ...CHART_OPTS, plugins:{ legend:{ position:'bottom', labels:{ font:{size:10,family:'Poppins'}, padding:10, boxWidth:10 } } }, cutout:'65%' }} />
            : <div style={{ color:'var(--text-muted)',fontSize:'0.85rem' }}>No data</div>}
          </div>
        </div>
      </div>

      {/* New customers + Top Gardeners */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><h2>New Customer Signups</h2></div>
          <div className="card-body" style={{ height:240 }}>
            {newCustomersByDay.length>0 ? <Bar data={newCustData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)',maxRotation:0}}, y:{grid:{color:'rgba(37,99,235,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}} } }} />
            : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)',fontSize:'0.85rem' }}>No customer data</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Top Gardeners</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>By completions</span></div>
          <div style={{ padding:'8px 0' }}>
            {!(a?.topGardeners?.length) ? (
              <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>No data available</div>
            ) : a.topGardeners.slice(0,5).map((g:any, i:number) => {
              const max = a.topGardeners[0]?.completed_jobs || a.topGardeners[0]?.total_jobs || 1;
              const val = g.completed_jobs || g.total_jobs || 0;
              return (
                <div key={g.id||i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?'var(--gold)':i===1?'var(--sage)':i===2?'var(--earth)':'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:800, color:i<3?'#fff':'var(--text-muted)', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                    <div style={{ height:5, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/max)*100}%`, background:'var(--forest)', borderRadius:99, transition:'width 1s var(--ease)' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--forest)', flexShrink:0 }}>{val} jobs</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Products */}
      {topProducts.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header"><h2>Top Selling Products</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>By units sold</span></div>
          <div className="card-body" style={{ height:240 }}>
            <Bar data={topProductsData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}}, y:{grid:{color:'rgba(201,168,76,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}} } }} />
          </div>
        </div>
      )}

      {/* Zone Performance Table */}
      {zonePerformance.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>Zone Performance Detail</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Zone</th><th>Total Bookings</th><th>Completed</th><th>Revenue</th><th>Avg Rating</th><th>Completion Rate</th></tr></thead>
              <tbody>
                {zonePerformance.map((z:any) => {
                  const rate = z.total_bookings ? Math.round((z.completed_bookings||0)/z.total_bookings*100) : 0;
                  return (
                    <tr key={z.zone_id||z.id}>
                      <td style={{ fontWeight:600 }}>{z.zone_name||z.name}</td>
                      <td>{(z.total_bookings||0).toLocaleString('en-IN')}</td>
                      <td>{(z.completed_bookings||0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight:700, color:'var(--forest)' }}>{z.revenue!=null ? `₹${Number(z.revenue).toLocaleString('en-IN')}` : '—'}</td>
                      <td>{z.avg_rating ? `${Number(z.avg_rating).toFixed(1)} ★` : '—'}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden', minWidth:60 }}>
                            <div style={{ height:'100%', width:`${rate}%`, background: rate>80?'var(--success)':rate>50?'var(--warning)':'var(--error)', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:'0.8rem', fontWeight:700, color: rate>80?'var(--success)':rate>50?'var(--warning)':'var(--error)', minWidth:36, textAlign:'right' }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shop Orders by Zone */}
      {shopOrdersByZone.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          <div className="card">
            <div className="card-header"><h2>Shop Orders by Zone</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Order count</span></div>
            <div className="card-body" style={{ height:260 }}>
              <Bar data={shopOrdersZoneData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}}, y:{grid:{color:'rgba(147,51,234,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}} } }} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h2>Shop Revenue by Zone</h2><span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Revenue break-up</span></div>
            <div className="card-body" style={{ height:260 }}>
              <Bar data={shopRevenueZoneData} options={{ ...CHART_OPTS, scales:{ x:{grid:{display:false},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)'}}, y:{grid:{color:'rgba(37,99,235,0.05)'},ticks:{font:{size:10,family:'Poppins'},color:'var(--text-muted)',callback:(v:any)=>`₹${Number(v).toLocaleString('en-IN')}`}} } }} />
            </div>
          </div>
        </div>
      )}

      {/* Shop Orders by Zone - Table View */}
      {shopOrdersByZone.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>Shop Orders by Zone - Details</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Zone / City</th><th style={{ textAlign:'right' }}>Total Orders</th><th style={{ textAlign:'right' }}>Revenue (₹)</th><th style={{ textAlign:'right' }}>Avg Order Value</th><th style={{ textAlign:'right' }}>Share %</th></tr></thead>
              <tbody>
                {shopOrdersByZone.map((z:any, idx:number) => {
                  const totalOrders = shopOrdersByZone.reduce((n:number, zz:any) => n + Number(zz.total||0), 0);
                  const share = totalOrders > 0 ? ((Number(z.total||0) / totalOrders) * 100).toFixed(1) : 0;
                  const avgVal = Number(z.total||0) > 0 ? (Number(z.revenue||0) / Number(z.total||0)).toFixed(0) : 0;
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight:600 }}>{z.zone} {z.city && <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', fontWeight:400 }}>({z.city})</span>}</td>
                      <td style={{ textAlign:'right', fontWeight:700 }}>{Number(z.total||0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign:'right', fontWeight:700, color:'var(--forest)' }}>₹{Number(z.revenue||0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign:'right', color:'var(--text-muted)' }}>₹{Number(avgVal).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign:'right' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                          <div style={{ width:40, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${share}%`, background:'#9333ea', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:'0.8rem', fontWeight:700, minWidth:36, textAlign:'right' }}>{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop:'2px solid var(--border)', fontWeight:700 }}>
                  <td>Total</td>
                  <td style={{ textAlign:'right' }}>{zoneShopOrders.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign:'right', color:'var(--forest)' }}>₹{shopZoneRevenue.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign:'right' }}>₹{zoneShopOrders > 0 ? Number((shopZoneRevenue / zoneShopOrders).toFixed(0)).toLocaleString('en-IN') : '—'}</td>
                  <td style={{ textAlign:'right' }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
