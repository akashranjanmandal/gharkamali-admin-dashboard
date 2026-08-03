'use client';
import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';
import PeriodFilter, { Period } from '@/components/PeriodFilter';
import { Th, useTableControls, type Col } from '@/components/TableHeader';
import { v, firstError } from '@/lib/validators';
import {
  IconSearch, IconBuilding, IconPaperclip, IconSend, IconLock, IconHistory,
  IconX, IconEdit, IconPlus, IconAlertTriangle, IconClock, IconUser, IconFlame,
} from '@tabler/icons-react';

const STATUSES = ['open', 'in_progress', 'awaiting_customer', 'in_review', 'resolved', 'closed', 'reopened'] as const;
type Status = typeof STATUSES[number];

const STATUS_COLOR: Record<string, string> = {
  open: 'badge-red',
  in_progress: 'badge-blue',
  awaiting_customer: 'badge-orange',
  in_review: 'badge-yellow',
  resolved: 'badge-green',
  closed: 'badge-gray',
  reopened: 'badge-gold',
};
const PRIORITY_COLOR: Record<string, string> = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' };

const TYPE_LABELS: Record<string, string> = {
  service_quality: 'Service Quality', late_arrival: 'Late Arrival', no_show: 'No Show',
  rude_behavior: 'Rude Behavior', billing: 'Billing Issue', damage: 'Property Damage', other: 'Other',
};

const fmt = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// Column definitions for header sort/filter (accessors match the cell renders).
const COLS: Col[] = [
  { key: 'ticket_number', label: 'Ticket #', get: (c) => c.ticket_number || `#${c.id}` },
  { key: 'subject', label: 'Subject / Type', get: (c) => `${c.subject || TYPE_LABELS[c.type] || c.type} ${TYPE_LABELS[c.type] || c.type}` },
  { key: 'customer', label: 'Customer', get: (c) => `${c.customer?.name || ''} ${c.customer?.phone || ''}` },
  { key: 'department', label: 'Department', get: (c) => c.department?.name || '—' },
  { key: 'assigned', label: 'Assigned', get: (c) => c.assignedTo?.name || 'Unassigned' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created', type: 'date' },
];

export default function AdminComplaintsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'' | Status>('');
  const [priority, setPriority] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [period, setPeriod] = useState<Period>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDepts, setShowDepts] = useState(false);
  const ctl = useTableControls(COLS);

  const { data: stats } = useQuery({ queryKey: ['complaint-stats'], queryFn: AdminAPI.complaintStats });
  const statsData: any = stats || {};

  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', status, priority, deptFilter, search, page, period],
    queryFn: () => AdminAPI.complaints({
      status: status || undefined,
      priority: priority || undefined,
      department_id: deptFilter || undefined,
      search: search || undefined,
      from_date: period?.from,
      to_date: period?.to,
      page, limit: 20,
    }),
  });
  const complaints: any[] = (data as any)?.complaints || (Array.isArray(data) ? data : []);
  const total = (data as any)?.total ?? complaints.length;

  // Column-header sort + per-column filter (client-side on loaded rows).
  const rows = ctl.process(complaints);

  const { data: deptsData } = useQuery({ queryKey: ['complaint-depts'], queryFn: AdminAPI.complaintDepartments });
  const departments: any[] = Array.isArray(deptsData) ? deptsData : [];
  const { data: assigneesData } = useQuery({ queryKey: ['complaint-assignees'], queryFn: AdminAPI.complaintAssignees });
  const assignees: any[] = Array.isArray(assigneesData) ? assigneesData : [];

  // Export fetches EVERY ticket (all pages), not just the visible 20.
  const fetchAllComplaints = () => fetchAllPages(
    (page, limit) => AdminAPI.complaints({ page, limit }),
    (res: any) => res?.complaints || (Array.isArray(res) ? res : []),
  );
  const mapExportRow = (c: any) => ({
    ID: c.id,
    Ticket: c.ticket_number,
    Type: TYPE_LABELS[c.type] || c.type,
    Subject: c.subject,
    Customer: c.customer?.name,
    CustomerPhone: c.customer?.phone,
    Gardener: c.gardener?.name,
    Department: c.department?.name,
    AssignedTo: c.assignedTo?.name,
    Priority: c.priority,
    Status: c.status,
    Created: c.created_at,
  });

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Support Tickets</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{total} total tickets</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ExportButton filename="SupportTickets" fetchAll={fetchAllComplaints} mapRow={mapExportRow} />
          <button onClick={() => setShowDepts(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40 }}>
            <IconBuilding size={16} /> Manage Departments
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatTile icon={<IconAlertTriangle size={18} />} color="#dc2626" bg="rgba(220,38,38,0.08)" label="Open" value={statsData.open || 0} />
        <StatTile icon={<IconClock size={18} />} color="#2563eb" bg="rgba(37,99,235,0.08)" label="In Progress" value={statsData.inProgress || 0} />
        <StatTile icon={<IconUser size={18} />} color="#7e22ce" bg="rgba(126,34,206,0.08)" label="Awaiting Customer" value={statsData.awaitingCustomer || 0} />
        <StatTile icon={<IconFlame size={18} />} color="#ea580c" bg="rgba(234,88,12,0.08)" label="High Priority" value={statsData.highPriority || 0} />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <IconSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search ticket #, subject, description…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}
            />
          </div>
          <button onClick={() => { setPage(1); setSearch(searchInput); }} className="btn btn-primary">Search</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {[{ v: '', l: 'All Status' }, ...STATUSES.map(s => ({ v: s, l: s.replace(/_/g, ' ') }))].map(s => (
            <button key={s.v} onClick={() => { setStatus(s.v as any); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize',
                background: status === s.v ? 'var(--forest)' : 'var(--bg)', color: status === s.v ? '#fff' : 'var(--text-muted)' }}>
              {s.l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {[{ v: '', l: 'All Priority' }, { v: 'high', l: 'high' }, { v: 'medium', l: 'medium' }, { v: 'low', l: 'low' }].map(p => (
            <button key={p.v} onClick={() => { setPriority(p.v); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                background: priority === p.v ? '#6366f1' : 'var(--bg)', color: priority === p.v ? '#fff' : 'var(--text-muted)' }}>
              {p.l}
            </button>
          ))}
          <select className="input" style={{ maxWidth: 200, fontSize: '0.8rem' }} value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <PeriodFilter onChange={p => { setPeriod(p); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>{COLS.map(c => <Th key={c.key} col={c} ctl={ctl} />)}</tr>
            </thead>
            <tbody>
              {isLoading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 20, width: '80%' }} /></td>)}</tr>
              )) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>No tickets found</td></tr>
              ) : rows.map((c: any) => (
                <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--forest)', fontWeight: 700 }}>{c.ticket_number || `#${c.id}`}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.subject || TYPE_LABELS[c.type] || c.type}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{TYPE_LABELS[c.type] || c.type}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.customer?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.customer?.phone}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{c.department?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: '0.82rem' }}>{c.assignedTo?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td><span className={`badge ${PRIORITY_COLOR[c.priority] || 'badge-gray'}`}>{c.priority}</span></td>
                  <td><span className={`badge ${STATUS_COLOR[c.status] || 'badge-gray'}`}>{(c.status || '').replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {total === 0 ? 0 : Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-sm btn-outline">Prev</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn btn-sm btn-outline">Next</button>
          </div>
        </div>
      </div>

      {selectedId && (
        <TicketDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['admin-complaints'] });
            qc.invalidateQueries({ queryKey: ['complaint-stats'] });
          }}
          departments={departments}
          assignees={assignees}
        />
      )}

      {showDepts && (
        <DepartmentsModal
          departments={departments}
          onClose={() => setShowDepts(false)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['complaint-depts'] })}
        />
      )}
    </AdminLayout>
  );
}

function StatTile({ icon, color, bg, label, value }: any) {
  return (
    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ── Ticket Drawer ────────────────────────────────────────────────────────────
function TicketDrawer({ id, onClose, onChanged, departments, assignees }: any) {
  const qc = useQueryClient();
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['complaint-detail', id],
    queryFn: () => AdminAPI.complaintDetail(id),
  });
  const t: any = ticket;

  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['complaint-detail', id] });
    onChanged();
  };

  const updateMut = useMutation({
    mutationFn: (b: any) => AdminAPI.updateComplaint(id, b),
    onSuccess: () => { toast.success('Ticket updated'); reload(); },
    onError: (e: any) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: () => {
      if (!comment.trim() && files.length === 0) {
        return Promise.reject(new Error('Add a comment or attachment'));
      }
      const err = firstError([
        v.text(comment, { field: 'comment', max: 5000, optional: !comment.trim() ? true : false }),
      ]);
      if (err) return Promise.reject(new Error(err));
      // Per-file size guard
      const big = files.find(f => f.size > 15 * 1024 * 1024);
      if (big) return Promise.reject(new Error(`"${big.name}" is over 15MB`));
      const fd = new FormData();
      if (comment.trim()) fd.append('comment', comment.trim());
      fd.append('is_internal', String(isInternal));
      files.forEach(f => fd.append('attachments', f));
      return AdminAPI.addComplaintComment(id, fd);
    },
    onSuccess: () => {
      setComment(''); setIsInternal(false); setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Reply sent');
      reload();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const events = useMemo(() => {
    if (!t) return [] as any[];
    return [
      ...(t.comments || []).map((c: any) => ({ kind: 'comment', at: c.created_at, data: c })),
      ...(t.history || []).map((h: any) => ({ kind: 'status', at: h.created_at, data: h })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [t]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 820, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isLoading || !t ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--forest)', fontWeight: 700 }}>{t.ticket_number}</span>
                  <span className={`badge ${STATUS_COLOR[t.status] || 'badge-gray'}`}>{(t.status || '').replace(/_/g, ' ')}</span>
                  <span className={`badge ${PRIORITY_COLOR[t.priority] || 'badge-gray'}`}>{t.priority}</span>
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {t.subject || TYPE_LABELS[t.type] || t.type}
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Filed by <strong>{t.customer?.name}</strong> ({t.customer?.phone}) · {fmt(t.created_at)}
                </p>
              </div>
              <button onClick={onClose} className="modal-close"><IconX size={20} /></button>
            </div>

            {/* Meta edit grid */}
            <MetaEditor t={t} departments={departments} assignees={assignees} onSave={updateMut.mutate} saving={updateMut.isPending} />

            {/* Original */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Original Issue · {TYPE_LABELS[t.type] || t.type}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{t.description}</div>
              {t.attachments?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {t.attachments.map((a: any) => <AttachChip key={a.id} a={a} />)}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div style={{ flex: 1, padding: 20, background: 'var(--bg)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Activity</div>
              {events.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No replies yet</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {events.map((ev: any, i: number) => ev.kind === 'comment'
                  ? <CommentBubble key={i} c={ev.data} />
                  : <StatusLog key={i} h={ev.data} />
                )}
              </div>
            </div>

            {/* Composer */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: '#fff', position: 'sticky', bottom: 0 }}>
              <textarea className="input" rows={3} placeholder="Type your reply…" value={comment} onChange={e => setComment(e.target.value)} />
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {files.map((f, i) => (
                    <span key={i} style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {f.name}
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><IconX size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconPaperclip size={14} /> Attach
                  <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
                    onChange={e => setFiles([...files, ...Array.from(e.target.files || [])])} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                  <IconLock size={12} /> Internal note (hidden from customer)
                </label>
                <button
                  onClick={() => commentMut.mutate()}
                  disabled={(!comment.trim() && files.length === 0) || commentMut.isPending}
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconSend size={14} /> {commentMut.isPending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetaEditor({ t, departments, assignees, onSave, saving }: any) {
  const [edit, setEdit] = useState({
    status: t.status, priority: t.priority,
    department_id: t.department_id || '',
    assigned_to: t.assigned_to || '',
    subject: t.subject || '',
    resolution_notes: t.resolution_notes || '',
  });
  return (
    <div style={{ padding: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="Department">
          <select className="input" value={edit.department_id || ''} onChange={e => setEdit({ ...edit, department_id: e.target.value })}>
            <option value="">— None —</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Assigned To">
          <select className="input" value={edit.assigned_to || ''} onChange={e => setEdit({ ...edit, assigned_to: e.target.value })}>
            <option value="">Unassigned</option>
            {assignees.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={edit.priority} onChange={e => setEdit({ ...edit, priority: e.target.value })}>
            {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Subject">
          <input className="input" value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })} />
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Resolution Notes (sent to customer when status = resolved/closed)">
          <textarea className="input" rows={2} value={edit.resolution_notes} onChange={e => setEdit({ ...edit, resolution_notes: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={() => onSave(edit)} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function CommentBubble({ c }: any) {
  const isStaff = c.user_role === 'admin' || c.user_role === 'supervisor';
  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: isStaff ? 'row' : 'row-reverse' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isStaff ? 'rgba(3,65,26,0.10)' : 'rgba(37,99,235,0.10)',
        color: isStaff ? 'var(--forest)' : '#2563eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
      }}>{(c.user?.name || '?').charAt(0).toUpperCase()}</div>
      <div style={{
        flex: 1, maxWidth: '78%',
        background: c.is_internal ? 'rgba(234,179,8,0.10)' : '#fff',
        border: `1px solid ${c.is_internal ? 'rgba(234,179,8,0.4)' : 'var(--border)'}`,
        borderRadius: 12, padding: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.72rem' }}>
          <strong style={{ color: 'var(--text)' }}>{c.user?.name || 'Unknown'}</strong>
          <span style={{ color: 'var(--text-muted)' }}>· {c.user_role}</span>
          {c.is_internal && <span style={{ background: 'rgba(234,179,8,0.25)', color: '#854d0e', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.65rem' }}>INTERNAL</span>}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{fmt(c.created_at)}</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{c.comment}</p>
        {c.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {c.attachments.map((a: any) => <AttachChip key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLog({ h }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 0' }}>
      <IconHistory size={13} />
      <strong style={{ color: 'var(--text)' }}>{h.changedBy?.name || 'System'}</strong>
      <span>changed status from</span>
      <span className={`badge ${STATUS_COLOR[h.from_status] || 'badge-gray'}`}>{h.from_status || '—'}</span>
      <span>to</span>
      <span className={`badge ${STATUS_COLOR[h.to_status] || 'badge-gray'}`}>{h.to_status}</span>
      <span style={{ marginLeft: 'auto' }}>{fmt(h.created_at)}</span>
    </div>
  );
}

function AttachChip({ a }: any) {
  const isImg = (a.file_type || '').startsWith('image/');
  return (
    <a href={a.file_url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'var(--text)', fontSize: '0.75rem', background: '#fff' }}>
      {isImg ? <img src={a.file_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} /> : <IconPaperclip size={14} />}
      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{a.file_name}</span>
    </a>
  );
}

function DepartmentsModal({ departments, onClose, onChanged }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });

  const createMut = useMutation({
    mutationFn: () => {
      const err = firstError([
        v.text(form.name, { field: 'name', min: 2, max: 80 }),
        v.text(form.description, { field: 'description', max: 255, optional: true }),
      ]);
      if (err) return Promise.reject(new Error(err));
      return editing ? AdminAPI.updateComplaintDepartment(editing.id, form) : AdminAPI.createComplaintDepartment(form);
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Created');
      setEditing(null); setForm({ name: '', description: '', is_active: true });
      onChanged();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteComplaintDepartment(id),
    onSuccess: () => { toast.success('Deactivated'); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconBuilding size={18} /> Departments</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {departments.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No departments yet.</p>}
            {departments.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{d.name}</div>
                  {d.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.description}</div>}
                </div>
                {!d.is_active && <span className="badge badge-gray">Inactive</span>}
                <button onClick={() => { setEditing(d); setForm({ name: d.name, description: d.description || '', is_active: !!d.is_active }); }} className="btn btn-sm btn-ghost"><IconEdit size={14} /></button>
                <button onClick={() => window.confirm('Deactivate this department?') && deleteMut.mutate(d.id)} className="btn btn-sm btn-danger-ghost"><IconX size={14} /></button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>{editing ? 'Edit Department' : 'Add Department'}</div>
            <div className="form-group"><input className="input" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><input className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="d_act" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <label htmlFor="d_act" style={{ marginBottom: 0 }}>Active</label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {editing && <button onClick={() => { setEditing(null); setForm({ name: '', description: '', is_active: true }); }} className="btn btn-ghost">Cancel Edit</button>}
          <button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={14} /> {createMut.isPending ? 'Saving…' : (editing ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}
