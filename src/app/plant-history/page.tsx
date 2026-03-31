'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { IconSearch, IconDownload, IconX, IconLeaf, IconUser, IconCalendar, IconChartBar, IconExternalLink } from '@tabler/icons-react';

export default function PlantHistoryAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-plant-history', page, search, dateFrom, dateTo], 
    queryFn: () => AdminAPI.plantIdentifications({ 
      page, 
      search: search || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined
    }) 
  });
  const items: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const handleExport = () => {
    const exportData = items.map(p => ({
      ID: p.id,
      PlantName: p.plant_name,
      ScientificName: p.scientific_name,
      Confidence: p.confidence_score,
      User: p.user?.name,
      Phone: p.user?.phone,
      Date: p.created_at,
      Description: p.description
    }));
    exportToCSV(exportData, `PlantHistory_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Plant Identification Logs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>History of all AI plant identifications made by users</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search plant name or username…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, fontFamily: 'Poppins', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input" style={{ width: 'auto' }} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {isLoading ? (
          Array(6).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 20 }} />)
        ) : items.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No identification history found.</div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="card" onClick={() => setSelected(item)} style={{ padding: 0, overflow: 'hidden', border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}>
              <div style={{ position: 'relative', height: 200, background: '#f5f5f5' }}>
                <img src={item.image_url} alt={item.plant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4 }}>
                   <IconChartBar size={12} /> {item.confidence_score}%
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 2 }}>{item.plant_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--forest)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>{item.scientific_name || 'Generic Identification'}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                   <div style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--forest-light)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--forest)' }}>
                    {item.user?.name?.[0]}
                   </div>
                   <div>
                     <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.user?.name}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, gap: 12 }}>
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <div style={{ alignSelf: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Page {page} of {pages}</div>
          <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 260, position: 'relative' }}>
               <img src={selected.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               <button className="modal-close" onClick={() => setSelected(null)} style={{ position: 'absolute', top: 12, right: 12, background: '#fff', borderRadius: '50%', padding: 4 }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{selected.plant_name}</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--forest)', fontStyle: 'italic', fontWeight: 600 }}>{selected.scientific_name}</div>
                  </div>
                  <div style={{ background: 'var(--forest-light)', color: 'var(--forest)', padding: '6px 12px', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem' }}>{selected.confidence_score}%</div>
               </div>
               
               <div style={{ marginBottom: 24 }}>
                 <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><IconLeaf size={14} /> Description</h4>
                 <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)' }}>{selected.description}</div>
               </div>

               <div style={{ display: 'flex', gap: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                 <div>
                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Identified by</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <IconUser size={16} style={{ color: 'var(--forest)' }} />
                       <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selected.user?.name}</span>
                    </div>
                 </div>
                 <div>
                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Date</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <IconCalendar size={16} style={{ color: 'var(--text-muted)' }} />
                       <span style={{ fontSize: '0.85rem' }}>{new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium' })}</span>
                    </div>
                 </div>
               </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', padding: 20 }}>
               <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
               <button className="btn btn-forest" style={{ gap: 6 }}><IconExternalLink size={16} /> Open Image</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
