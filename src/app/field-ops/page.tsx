'use client';
// Field Ops — gardener field-service operations hub.
// Tabs: Leads (on-site sales leads), Escalations, Attendance, Leaves, Checklist config.
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI } from '@/lib/api';
import ExportButton from '@/components/ExportButton';
import { Th, useTableControls, type Col } from '@/components/TableHeader';
import { IconPhoto, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';

// ─── shared helpers ───────────────────────────────────────────────────────────

// snake_case slug → "Title Case" for display
const humanize = (s?: string | null) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtTime = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  open: 'badge-yellow',
  resolved: 'badge-green',
};

// Escalation severity: emergencies red, everything else amber
const RED_ESCALATIONS = ['plant_emergency', 'accident_damage'];

// Small status-filter pill row used by the Leads / Escalations / Leaves tabs
function FilterPills({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '0.45rem 1rem', borderRadius: 999, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            fontFamily: 'inherit',
            border: value === o.value ? 'none' : '1px solid var(--border)',
            background: value === o.value ? 'var(--forest)' : 'var(--card-bg, #fff)',
            color: value === o.value ? '#fff' : 'var(--text)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const emptyState = (msg: string) => (
  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{msg}</div>
);

// ─── Leads tab ────────────────────────────────────────────────────────────────

type Lead = {
  id: number;
  type: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  gardener: { name: string; phone: string };
  customer: { name: string; phone: string } | null;
  booking: { id: number; booking_number: string } | null;
};

const LEAD_COLS: Col[] = [
  { key: 'gardener', label: 'Gardener', get: (r) => `${r.gardener?.name || ''} ${r.gardener?.phone || ''}` },
  { key: 'type', label: 'Type', get: (r) => humanize(r.type) },
  { key: 'customer', label: 'Customer', get: (r) => `${r.customer?.name || ''} ${r.customer?.phone || ''}` },
  { key: 'booking', label: 'Booking #', get: (r) => r.booking?.booking_number || '' },
  { key: 'note', label: 'Note' },
  { key: 'created_at', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status' },
];

function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const ctl = useTableControls(LEAD_COLS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.fieldLeads(statusFilter ? { status: statusFilter as any } : undefined);
      setLeads(Array.isArray(data) ? data : data?.leads || []);
    } catch { toast.error('Failed to load leads'); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (lead: Lead, status: 'approved' | 'rejected') => {
    if (!confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this ${humanize(lead.type)} lead from ${lead.gardener?.name}?`)) return;
    setProcessingId(lead.id);
    try {
      await AdminAPI.updateFieldLead(lead.id, status);
      toast.success(`Lead ${status}`);
      fetchData();
    } catch (e: any) { toast.error(e?.message || 'Failed to update lead'); }
    setProcessingId(null);
  };

  const rows = ctl.process(leads);

  const fetchAllLeads = async () => {
    const data = await AdminAPI.fieldLeads();
    return Array.isArray(data) ? data : data?.leads || [];
  };
  const mapExportRow = (r: Lead) => ({
    ID: r.id,
    Gardener: r.gardener?.name,
    GardenerPhone: r.gardener?.phone,
    Type: humanize(r.type),
    Customer: r.customer?.name || '',
    CustomerPhone: r.customer?.phone || '',
    Booking: r.booking?.booking_number || '',
    Note: r.note || '',
    Status: r.status,
    Date: r.created_at,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterPills
          options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <ExportButton filename="FieldLeads" fetchAll={fetchAllLeads} mapRow={mapExportRow} />
      </div>

      {loading ? emptyState('Loading…') : leads.length === 0 ? emptyState('No leads found') : (
        <div className="card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>{LEAD_COLS.map((c) => <Th key={c.key} col={c} ctl={ctl} />)}<th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No matching leads</td></tr>
                ) : rows.map((r: Lead) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.gardener?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.gardener?.phone}</div>
                    </td>
                    <td><span className="badge badge-forest">{humanize(r.type)}</span></td>
                    <td>
                      {r.customer ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{r.customer.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.customer.phone}</div>
                        </>
                      ) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                    <td>{r.booking ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--forest)', fontSize: '0.8rem' }}>{r.booking.booking_number}</span> : '—'}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'normal', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.note || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-xs btn-primary" disabled={processingId === r.id} onClick={() => handleAction(r, 'approved')}>Approve</button>
                          <button className="btn btn-xs btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} disabled={processingId === r.id} onClick={() => handleAction(r, 'rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Escalations tab ──────────────────────────────────────────────────────────

type Escalation = {
  id: number;
  type: string;
  note: string | null;
  photo_url: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  gardener: { name: string; phone: string };
  booking: { id: number; booking_number: string } | null;
};

const ESCALATION_COLS: Col[] = [
  { key: 'type', label: 'Type', get: (r) => humanize(r.type) },
  { key: 'gardener', label: 'Gardener', get: (r) => `${r.gardener?.name || ''} ${r.gardener?.phone || ''}` },
  { key: 'booking', label: 'Booking #', get: (r) => r.booking?.booking_number || '' },
  { key: 'note', label: 'Note' },
  { key: 'photo', label: 'Photo', sortable: false, filterable: false },
  { key: 'created_at', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status' },
];

function EscalationsTab() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const ctl = useTableControls(ESCALATION_COLS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.escalations(statusFilter ? { status: statusFilter as any } : undefined);
      setEscalations(Array.isArray(data) ? data : data?.escalations || []);
    } catch { toast.error('Failed to load escalations'); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (e: Escalation) => {
    if (!confirm(`Mark this ${humanize(e.type)} escalation from ${e.gardener?.name} as resolved?`)) return;
    setProcessingId(e.id);
    try {
      await AdminAPI.resolveEscalation(e.id);
      toast.success('Escalation resolved');
      fetchData();
    } catch (err: any) { toast.error(err?.message || 'Failed to resolve escalation'); }
    setProcessingId(null);
  };

  const rows = ctl.process(escalations);

  const fetchAllEscalations = async () => {
    const data = await AdminAPI.escalations();
    return Array.isArray(data) ? data : data?.escalations || [];
  };
  const mapExportRow = (r: Escalation) => ({
    ID: r.id,
    Type: humanize(r.type),
    Gardener: r.gardener?.name,
    GardenerPhone: r.gardener?.phone,
    Booking: r.booking?.booking_number || '',
    Note: r.note || '',
    Photo: r.photo_url || '',
    Status: r.status,
    Date: r.created_at,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterPills
          options={[{ value: '', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <ExportButton filename="Escalations" fetchAll={fetchAllEscalations} mapRow={mapExportRow} />
      </div>

      {loading ? emptyState('Loading…') : escalations.length === 0 ? emptyState('No escalations found') : (
        <div className="card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>{ESCALATION_COLS.map((c) => <Th key={c.key} col={c} ctl={ctl} />)}<th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No matching escalations</td></tr>
                ) : rows.map((r: Escalation) => (
                  <tr key={r.id}>
                    <td><span className={`badge ${RED_ESCALATIONS.includes(r.type) ? 'badge-red' : 'badge-orange'}`}>{humanize(r.type)}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.gardener?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.gardener?.phone}</div>
                    </td>
                    <td>{r.booking ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--forest)', fontSize: '0.8rem' }}>{r.booking.booking_number}</span> : '—'}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'normal', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.note || '—'}</td>
                    <td>
                      {r.photo_url ? (
                        <a href={r.photo_url} target="_blank" rel="noopener noreferrer" title="Open photo">
                          <img src={r.photo_url} alt="Escalation" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                        </a>
                      ) : <IconPhoto size={18} style={{ color: 'var(--text-faint)' }} />}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                    <td>
                      {r.status === 'open' && (
                        <button className="btn btn-xs btn-primary" disabled={processingId === r.id} onClick={() => handleResolve(r)}>Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attendance tab ───────────────────────────────────────────────────────────

type AttendanceRow = {
  gardener: { id: number; name: string; phone: string };
  checkin_at: string | null;
  checkout_at: string | null;
  hours: number | null;
  checkin_distance?: number | null;
};

const ATTENDANCE_COLS: Col[] = [
  { key: 'gardener', label: 'Gardener', get: (r) => `${r.gardener?.name || ''} ${r.gardener?.phone || ''}` },
  { key: 'checkin_at', label: 'Check-In', type: 'date' },
  { key: 'checkout_at', label: 'Check-Out', type: 'date' },
  { key: 'hours', label: 'Hours', type: 'number' },
  { key: 'checkin_distance', label: 'Distance', type: 'number' },
];

function AttendanceTab() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const ctl = useTableControls(ATTENDANCE_COLS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.attendance(date);
      setRows(Array.isArray(data) ? data : data?.attendance || data?.rows || []);
    } catch { toast.error('Failed to load attendance'); }
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const presentCount = rows.filter((r) => r.checkin_at).length;
  const display = ctl.process(rows);

  const mapExportRow = (r: AttendanceRow) => ({
    Gardener: r.gardener?.name,
    Phone: r.gardener?.phone,
    Date: date,
    CheckIn: r.checkin_at || '',
    CheckOut: r.checkout_at || '',
    Hours: r.hours ?? '',
    CheckInDistanceM: r.checkin_distance ?? '',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', background: 'var(--card-bg, #fff)', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit' }}
          />
          {!loading && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--forest)' }}>{presentCount}</strong> of {rows.length} gardener{rows.length === 1 ? '' : 's'} present
            </span>
          )}
        </div>
        <ExportButton filename={`Attendance_${date}`} fetchAll={async () => rows} mapRow={mapExportRow} dateField="checkin_at" />
      </div>

      {loading ? emptyState('Loading…') : rows.length === 0 ? emptyState('No attendance records for this date') : (
        <div className="card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>{ATTENDANCE_COLS.map((c) => <Th key={c.key} col={c} ctl={ctl} />)}</tr>
              </thead>
              <tbody>
                {display.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No matching rows</td></tr>
                ) : display.map((r: AttendanceRow) => (
                  <tr key={r.gardener?.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.gardener?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.gardener?.phone}</div>
                    </td>
                    <td>{r.checkin_at ? <span style={{ fontWeight: 600, color: 'var(--forest)' }}>{fmtTime(r.checkin_at)}</span> : <span className="badge badge-red">Absent</span>}</td>
                    <td>{r.checkout_at ? fmtTime(r.checkout_at) : (r.checkin_at ? <span style={{ color: 'var(--text-faint)' }}>On duty</span> : '—')}</td>
                    <td style={{ fontWeight: 700 }}>{r.hours != null ? `${Number(r.hours).toFixed(1)} h` : '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.checkin_distance != null ? `${Math.round(Number(r.checkin_distance))} m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leaves tab ───────────────────────────────────────────────────────────────

type Leave = {
  id: number;
  gardener: { name: string };
  from_date: string;
  to_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const LEAVE_COLS: Col[] = [
  { key: 'gardener', label: 'Gardener', get: (r) => r.gardener?.name || '' },
  { key: 'from_date', label: 'From', type: 'date' },
  { key: 'to_date', label: 'To', type: 'date' },
  { key: 'reason', label: 'Reason' },
  { key: 'created_at', label: 'Requested', type: 'date' },
  { key: 'status', label: 'Status' },
];

function LeavesTab() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const ctl = useTableControls(LEAVE_COLS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.leaves(statusFilter ? { status: statusFilter } : undefined);
      setLeaves(Array.isArray(data) ? data : data?.leaves || []);
    } catch { toast.error('Failed to load leave requests'); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (leave: Leave, status: 'approved' | 'rejected') => {
    if (!confirm(`${status === 'approved' ? 'Approve' : 'Reject'} leave for ${leave.gardener?.name} (${fmtDate(leave.from_date)} → ${fmtDate(leave.to_date)})?`)) return;
    setProcessingId(leave.id);
    try {
      await AdminAPI.updateLeave(leave.id, status);
      toast.success(`Leave ${status}`);
      fetchData();
    } catch (e: any) { toast.error(e?.message || 'Failed to update leave'); }
    setProcessingId(null);
  };

  const rows = ctl.process(leaves);

  const fetchAllLeaves = async () => {
    const data = await AdminAPI.leaves();
    return Array.isArray(data) ? data : data?.leaves || [];
  };
  const mapExportRow = (r: Leave) => ({
    ID: r.id,
    Gardener: r.gardener?.name,
    From: r.from_date,
    To: r.to_date,
    Reason: r.reason || '',
    Status: r.status,
    Requested: r.created_at,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterPills
          options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <ExportButton filename="GardenerLeaves" fetchAll={fetchAllLeaves} mapRow={mapExportRow} />
      </div>

      {loading ? emptyState('Loading…') : leaves.length === 0 ? emptyState('No leave requests found') : (
        <div className="card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>{LEAVE_COLS.map((c) => <Th key={c.key} col={c} ctl={ctl} />)}<th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No matching leave requests</td></tr>
                ) : rows.map((r: Leave) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.gardener?.name || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.from_date)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.to_date)}</td>
                    <td style={{ maxWidth: 260, whiteSpace: 'normal', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.reason || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-xs btn-primary" disabled={processingId === r.id} onClick={() => handleAction(r, 'approved')}>Approve</button>
                          <button className="btn btn-xs btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} disabled={processingId === r.id} onClick={() => handleAction(r, 'rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Checklist config tab ─────────────────────────────────────────────────────

type ChecklistItem = { key: string; label: string; required: boolean };
type ChecklistTemplate = { service_type: 'ondemand' | 'subscription'; items: ChecklistItem[] };

const SERVICE_LABELS: Record<string, string> = { ondemand: 'On-Demand', subscription: 'Subscription' };

function ChecklistCard({ template, onSaved }: { template: ChecklistTemplate; onSaved: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(template.items || []);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setItems(template.items || []); }, [template]);

  const updateItem = (i: number, patch: Partial<ChecklistItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key) { toast.error('Enter a valid label'); return; }
    if (items.some((it) => it.key === key)) { toast.error('An item with this key already exists'); return; }
    setItems((prev) => [...prev, { key, label, required: false }]);
    setNewLabel('');
  };

  const save = async () => {
    if (items.some((it) => !it.label.trim())) { toast.error('Item labels cannot be empty'); return; }
    setSaving(true);
    try {
      await AdminAPI.updateChecklistTemplate(template.service_type, items.map((it) => ({ ...it, label: it.label.trim() })));
      toast.success(`${SERVICE_LABELS[template.service_type] || template.service_type} checklist saved`);
      onSaved();
    } catch (e: any) { toast.error(e?.message || 'Failed to save checklist'); }
    setSaving(false);
  };

  return (
    <div className="card" style={{ padding: 20, flex: 1, minWidth: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
          {SERVICE_LABELS[template.service_type] || humanize(template.service_type)} Visit Checklist
        </h3>
        <span className="badge badge-outline">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>

      {items.length === 0 && (
        <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.83rem' }}>No checklist items yet — add one below.</div>
      )}
      {items.map((it, i) => (
        <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light, var(--border))' }}>
          <input
            value={it.label}
            onChange={(e) => updateItem(i, { label: e.target.value })}
            style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.83rem' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={it.required} onChange={(e) => updateItem(i, { required: e.target.checked })} />
            Required
          </label>
          <button
            onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
            title="Remove item"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)', display: 'flex', padding: 4 }}
          >
            <IconTrash size={16} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
          placeholder="New checklist item…"
          style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.83rem' }}
        />
        <button className="btn btn-sm btn-outline" style={{ gap: 4 }} onClick={addItem}><IconPlus size={14} /> Add</button>
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button className="btn btn-sm btn-primary" style={{ gap: 6 }} disabled={saving} onClick={save}>
          <IconDeviceFloppy size={15} /> {saving ? 'Saving…' : 'Save Checklist'}
        </button>
      </div>
    </div>
  );
}

function ChecklistTab() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.checklistTemplates();
      const list: ChecklistTemplate[] = Array.isArray(data) ? data : data?.templates || [];
      // Always show both service types, even before any template exists.
      const byType = new Map(list.map((t) => [t.service_type, t]));
      setTemplates((['ondemand', 'subscription'] as const).map((st) => byType.get(st) || { service_type: st, items: [] }));
    } catch { toast.error('Failed to load checklist templates'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return emptyState('Loading…');

  return (
    <div>
      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        Items every gardener must tick off during a visit. Required items block visit completion in the gardener app.
      </p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {templates.map((t) => <ChecklistCard key={t.service_type} template={t} onSaved={fetchData} />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'leads', label: 'Leads' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leaves', label: 'Leaves' },
  { id: 'checklist', label: 'Checklist' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function FieldOpsPage() {
  const [tab, setTab] = useState<TabId>('leads');

  return (
    <AdminLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Field Ops</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          On-site leads, escalations, attendance, leaves and visit checklists
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'inherit',
              border: tab === t.id ? 'none' : '1px solid var(--border)',
              background: tab === t.id ? 'var(--forest)' : 'var(--card-bg, #fff)',
              color: tab === t.id ? '#fff' : 'var(--text)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'leads' && <LeadsTab />}
      {tab === 'escalations' && <EscalationsTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'leaves' && <LeavesTab />}
      {tab === 'checklist' && <ChecklistTab />}
    </AdminLayout>
  );
}
