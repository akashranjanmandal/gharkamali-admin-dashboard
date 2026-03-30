'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function PlantHistoryAdmin() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ 
    queryKey: ['admin-plant-history', page], 
    queryFn: () => AdminAPI.plantIdentifications({ page }) 
  });
  const items: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Plant Identification Logs</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>View history of all plants identified by users using AI</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {isLoading ? (
          Array(6).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 20 }} />)
        ) : items.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No identification history found.</div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
              <div style={{ position: 'relative', height: 200, background: '#f5f5f5' }}>
                <img src={item.image_url} alt={item.plant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                   {item.confidence_score}% Confidence
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 2 }}>{item.plant_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--forest)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>{item.scientific_name || 'Generic Identification'}</div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5, height: 48, overflow: 'hidden', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {item.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                   <div style={{ width: 32, height: 32, borderRadius: 99, background: '#e5e7eb', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4b5563' }}>
                    {item.user?.name?.[0]}
                   </div>
                   <div>
                     <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.user?.name}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, gap: 12 }}>
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <div style={{ alignSelf: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Page {page} of {Math.ceil(total / 20)}</div>
          <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </AdminLayout>
  );
}
