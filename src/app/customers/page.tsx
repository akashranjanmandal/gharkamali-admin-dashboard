'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin-customers', search, page], queryFn: () => AdminAPI.customers({ search: search||undefined, page, limit: 20 }) });
  const customers: any[] = (data as any)?.items ?? Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data as any) ? (data as any) : [];
  const total = (data as any)?.total ?? customers.length;
  const pages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}><h1 className="page-title">Customers</h1><p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{total} total customers</p></div>
      <input type="text" placeholder="Search by name or phone…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
        style={{marginBottom:16,width:'100%',maxWidth:400,padding:'9px 14px',background:'#fff',border:'1.5px solid var(--border)',borderRadius:10,fontFamily:'Poppins',fontSize:'0.875rem',outline:'none'}} />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Phone</th><th>Bookings</th><th>Total Spent</th><th>Wallet</th><th>Joined</th></tr></thead>
            <tbody>
              {isLoading?Array(8).fill(null).map((_,i)=><tr key={i}><td colSpan={6}><div className="skeleton skel-text" style={{width:'100%'}}/></td></tr>):
                customers.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No customers found</td></tr>:
                customers.map((c:any)=>(
                  <tr key={c.id}>
                    <td><div style={{fontWeight:700,fontSize:'0.875rem'}}>{c.name}</div><div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{c.email || '—'}</div></td>
                    <td>+91 {c.phone}</td>
                    <td style={{fontWeight:600,color:'var(--forest)'}}>{c.total_bookings ?? 0}</td>
                    <td style={{fontWeight:600}}>₹{(c.total_spent ?? 0).toLocaleString('en-IN')}</td>
                    <td>₹{(c.wallet_balance ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{c.created_at&&new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages>1&&<div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn btn-sm btn-ghost">← Prev</button>
          <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Page {page}/{pages}</span>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="btn btn-sm btn-ghost">Next →</button>
        </div>}
      </div>
    </AdminLayout>
  );
}
