'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';

type Log = {
  id: number; actor_id?: number; actor_name?: string; actor_role?: string;
  method: string; path: string; module: string; action: string;
  body?: string; ip?: string; created_at?: string; createdAt?: string;
};

const fmtDT = (v?: string) => {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function AuditPage() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', moduleFilter],
    queryFn: () => AdminAPI.auditLogs({ module: moduleFilter || undefined, limit: 300 }),
    refetchInterval: 60_000,
  });
  const logs: Log[] = Array.isArray(data) ? (data as any) : [];
  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort();

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            Every change and export made from the admin panel — who, what, when, from where. Append-only; nobody can edit this.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" style={{ width: 200 }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
            <option value="">All sections</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching}>Refresh</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted, #f6f7f6)', textAlign: 'left' }}>
                {['When', 'Who', 'Action', 'Section', 'Request', 'IP'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No audit entries yet — they appear as soon as someone changes something.</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  style={{ borderTop: '1px solid var(--border)', cursor: l.body ? 'pointer' : 'default', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDT(l.created_at || l.createdAt)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700 }}>{l.actor_name || `#${l.actor_id}`}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}> · {l.actor_role}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontWeight: 700, fontSize: '0.7rem', borderRadius: 999, padding: '3px 9px',
                      background: l.action === 'export' ? '#ede9fe' : l.method === 'DELETE' ? '#fee2e2' : '#dbeafe',
                      color: l.action === 'export' ? '#7c3aed' : l.method === 'DELETE' ? '#b91c1c' : '#1d4ed8',
                    }}>{l.action === 'export' ? 'EXPORT' : l.method}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{l.module}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 420 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.path}</div>
                    {expanded === l.id && l.body && (
                      <pre style={{ marginTop: 6, background: 'var(--bg-muted, #f6f7f6)', borderRadius: 8, padding: 10, fontSize: '0.7rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>
                        {(() => { try { return JSON.stringify(JSON.parse(l.body!), null, 2); } catch { return l.body; } })()}
                      </pre>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.74rem' }}>{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
