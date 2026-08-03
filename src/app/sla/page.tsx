'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period } from '@/components/PeriodFilter';
import { Th, useTableControls, type Col } from '@/components/TableHeader';

import { IconSearch, IconX, IconTrendingDown, IconClock, IconAlertTriangle } from '@tabler/icons-react';

// Column definitions for header sort/filter (accessors match the cell renders).
const COLS: Col[] = [
  { key: 'booking', label: 'Booking #', get: (b) => b.booking?.booking_number || '—' },
  { key: 'gardener', label: 'Gardener', get: (b) => b.gardener?.name || '—' },
  { key: 'breach_type', label: 'Breach Type', get: (b) => b.breach_type?.replace(/_/g, ' ') },
  { key: 'occurred_at', label: 'Occurred', type: 'date' },
  { key: 'status', label: 'Status', get: (b) => (b.resolved ? 'Resolved' : 'Open') },
];

export default function SLAPage() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<any>({});
  const [editConfig, setEditConfig] = useState(false);
  const [period, setPeriod] = useState<Period>(null);
  const ctl = useTableControls(COLS);

  const { data: configRaw } = useQuery({ queryKey: ['sla-config'], queryFn: AdminAPI.slaConfig });
  const { data: breachesRaw } = useQuery({ queryKey: ['sla-breaches', period], queryFn: () => AdminAPI.slaBreaches({ from_date: period?.from, to_date: period?.to }) });
  const rawBr: any = breachesRaw; const breaches: any[] = Array.isArray(rawBr?.breaches) ? rawBr.breaches : Array.isArray(rawBr) ? rawBr : [];

  // Column-header sort + per-column filter (client-side on loaded rows).
  const rows = ctl.process(breaches);

  const saveMut = useMutation({ mutationFn: () => AdminAPI.updateSlaConfig(config), onSuccess: () => { toast.success('SLA config updated'); setEditConfig(false); qc.invalidateQueries({ queryKey: ['sla-config'] }); }, onError: (e: any) => toast.error(e.message) });
  const resolveMut = useMutation({ mutationFn: (id: number) => AdminAPI.resolveBreach(id), onSuccess: () => { toast.success('Breach resolved'); qc.invalidateQueries({ queryKey: ['sla-breaches'] }); }, onError: (e: any) => toast.error(e.message) });

  // Export fetches EVERY breach (all pages), not just the visible list.
  const fetchAllBreaches = () => fetchAllPages(
    (page, limit) => AdminAPI.slaBreaches({ page, limit }),
    (res: any) => res?.breaches || (Array.isArray(res) ? res : []),
  );
  const mapExportRow = (b: any) => ({
    ID: b.id,
    Booking: b.booking?.booking_number,
    Gardener: b.gardener?.name,
    Type: b.breach_type,
    Occurred: b.occurred_at,
    Resolved: b.resolved ? 'Yes' : 'No',
  });

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">SLA Monitor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Service Level Agreement configuration and breach tracking</p>
        </div>
        <ExportButton filename="SLABreaches" fetchAll={fetchAllBreaches} mapRow={mapExportRow} dateField="occurred_at" />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:20}}>
        <div className="card">
          <div className="card-header"><h2 style={{fontWeight:700,fontSize:'0.95rem'}}>SLA Configuration</h2><button onClick={()=>{setConfig(configRaw||{});setEditConfig(e=>!e);}} className="btn btn-sm btn-outline">{editConfig?'Cancel':'Edit'}</button></div>
          <div className="card-body">
            {editConfig?(
              <>
                {['max_response_minutes','max_completion_hours','penalty_amount','reward_on_time_amount','rating_threshold'].map(key=>(
                  <div key={key} className="form-group"><label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text-2)",marginBottom:5,textTransform:'capitalize'}}>{key.replace(/_/g,' ')}</label><input type="number" className="input" value={config[key]||''} onChange={e=>setConfig((p:any)=>({...p,[key]:e.target.value}))} /></div>
                ))}
                <button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn btn-primary" style={{width:'100%'}}>{saveMut.isPending?'Saving…':'Save Config'}</button>
              </>
            ):(
              <div>
                {configRaw&&Object.entries(configRaw).map(([k,v]:any)=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.875rem'}}>
                    <span style={{color:'var(--text-muted)',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
                    <span style={{fontWeight:700}}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2 style={{fontWeight:700,fontSize:'0.95rem'}}>SLA Breaches</h2><div style={{display:'flex',gap:12,alignItems:'center'}}><PeriodFilter onChange={p=>setPeriod(p)} /><span style={{fontSize:'0.78rem',color:'var(--error)',fontWeight:600}}>{breaches.filter((b:any)=>!b.resolved).length} unresolved</span></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr>{COLS.map(c => <Th key={c.key} col={c} ctl={ctl} />)}<th>Action</th></tr></thead>
              <tbody>
                {rows.length===0?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'28px'}}>No SLA breaches 🎉</td></tr>:
                  rows.map((b:any)=>(
                    <tr key={b.id}>
                      <td style={{fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--forest)'}}>{b.booking?.booking_number||'—'}</td>
                      <td>{b.gardener?.name||'—'}</td>
                      <td style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{b.breach_type?.replace(/_/g,' ')}</td>
                      <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.occurred_at&&new Date(b.occurred_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td><span className={`badge ${b.resolved?'badge-green':'badge-red'}`}>{b.resolved?'Resolved':'Open'}</span></td>
                      <td>{!b.resolved&&<button onClick={()=>resolveMut.mutate(b.id)} className="btn btn-sm btn-outline">Resolve</button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:900px){div[style*="grid-template-columns: 1fr 2fr"]{grid-template-columns:1fr !important;}}`}</style>
    </AdminLayout>
  );
}
