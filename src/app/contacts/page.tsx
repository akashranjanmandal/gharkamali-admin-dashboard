'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['admin-contacts', page],
    queryFn: () => AdminAPI.contacts({ page, limit: 20 })
  });
  const contacts: any[] = contactsData?.data || [];
  const pagination = contactsData?.pagination || {};

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Contact Messages</h1>
        <p style={{color:'var(--text-muted)',fontSize:'0.875rem',marginTop:4}}>{pagination.total || 0} messages</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>
              {isLoading?Array(4).fill(null).map((_,i)=><tr key={i}><td colSpan={5}><div className="skeleton skel-text" style={{ width: '100%' }}/></td></tr>):
                contacts.length===0?<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No messages yet</td></tr>:
                contacts.map((c:any)=>(
                  <tr key={c.id}>
                    <td><div style={{fontWeight:700,fontSize:'0.875rem'}}>{c.name}</div></td>
                    <td>{c.phone}</td>
                    <td>{c.email||'—'}</td>
                    <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.message}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div style={{display:'flex',justifyContent:'center',gap:'0.5rem',marginTop:'1rem'}}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn btn-sm btn-outline">Prev</button>
            <span>Page {page} of {pagination.pages}</span>
            <button onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))} disabled={page===pagination.pages} className="btn btn-sm btn-outline">Next</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}