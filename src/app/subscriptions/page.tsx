'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin-subscriptions', page], queryFn: () => AdminAPI.subscriptions({ page, limit: 20 }) });
  const subs: any[] = (data as any)?.items ?? Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];
  const total = (data as any)?.total ?? subs.length;
  const pages = Math.ceil(total / 20);
  const STATUS_COLOR: Record<string,string> = { active:'badge-green', paused:'badge-yellow', cancelled:'badge-gray', expired:'badge-red' };

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}><h1 className="page-title">Subscriptions</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{total} total subscriptions</p></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Plan</th><th>Zone</th><th>Plants</th><th>Status</th><th>Auto Renew</th><th>Start</th><th>Next Visit</th></tr></thead>
            <tbody>
              {isLoading?Array(8).fill(null).map((_,i)=><tr key={i}><td colSpan={8}><div className="skeleton skel-text"/></td></tr>):
                subs.length===0?<tr><td colSpan={8} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No subscriptions found</td></tr>:
                subs.map((s:any)=>(
                  <tr key={s.id}>
                    <td><div style={{fontWeight:600,fontSize:'0.875rem'}}>{s.customer?.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>+91 {s.customer?.phone}</div></td>
                    <td style={{fontWeight:600,fontSize:'0.875rem'}}>{s.plan?.name}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{s.zone?.name||'—'}</td>
                    <td style={{fontWeight:600}}>{s.plant_count}</td>
                    <td><span className={`badge ${STATUS_COLOR[s.status]||'badge-gray'}`}>{s.status}</span></td>
                    <td>{s.auto_renew?<span className="badge badge-green">Yes</span>:<span className="badge badge-gray">No</span>}</td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{s.start_date&&new Date(s.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                    <td style={{fontSize:'0.78rem',color:s.status==='active'?'var(--forest)':'var(--text-muted)',fontWeight:s.status==='active'?700:400}}>{s.next_visit_date&&new Date(s.next_visit_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages>1&&<div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:8,justifyContent:'center'}}><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn btn-sm btn-ghost">← Prev</button><span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Page {page}/{pages}</span><button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="btn btn-sm btn-ghost">Next →</button></div>}
      </div>
    </AdminLayout>
  );
}
