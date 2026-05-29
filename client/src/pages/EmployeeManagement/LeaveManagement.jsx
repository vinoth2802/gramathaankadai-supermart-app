import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarOff, Plus, Search, Check, X, Trash2, Pencil,
  Users, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, FileText, AlertTriangle, Clock,
} from 'lucide-react';
import { EmployeesAPI }     from '../../api/employees.js';
import { LeaveTypesAPI }    from '../../api/leaveTypes.js';
import { LeaveRequestsAPI } from '../../api/leaveRequests.js';
import ConfirmDialog        from '../../components/ConfirmDialog.jsx';

/* ─── helpers ─── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today   = () => new Date().toISOString().slice(0, 10);
const thisYear = () => String(new Date().getFullYear());

const LEAVE_COLORS = {
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700'    },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-700'   },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-700'    },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700'    },
};
const colorCls = (c) => LEAVE_COLORS[c] ?? LEAVE_COLORS.blue;

const STATUS_META = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700'    },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-600'      },
};

const COLOR_OPTIONS = ['blue','amber','rose','emerald','violet','indigo','slate','pink','orange','teal'];

function calcDays(from, to) {
  if (!from || !to) return 0;
  const d = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(0, d);
}

/* ─── Apply Leave Modal ─── */
function ApplyLeaveModal({ employees, leaveTypes, onClose, onSaved }) {
  const [form, setForm] = useState({
    employeeId: '', leaveTypeId: '', fromDate: today(), toDate: today(), days: '1', reason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const d = calcDays(form.fromDate, form.toDate);
    set('days', String(d));
  }, [form.fromDate, form.toDate]);

  const handleSave = async () => {
    if (!form.employeeId) { toast.error('Select an employee'); return; }
    if (!form.leaveTypeId) { toast.error('Select leave type'); return; }
    if (!form.fromDate || !form.toDate) { toast.error('Select dates'); return; }
    if (Number(form.days) <= 0) { toast.error('Days must be > 0'); return; }
    setSaving(true);
    try {
      await LeaveRequestsAPI.create({
        employeeId:  Number(form.employeeId),
        leaveTypeId: Number(form.leaveTypeId),
        fromDate:    form.fromDate,
        toDate:      form.toDate,
        days:        Number(form.days),
        reason:      form.reason || null,
      });
      toast.success('Leave request submitted');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit leave');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <CalendarOff size={15} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Apply Leave</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Employee *</label>
            <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} className={inputCls}>
              <option value="">Select employee…</option>
              {employees.filter(e => e.isActive).map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Leave Type *</label>
            <select value={form.leaveTypeId} onChange={e => set('leaveTypeId', e.target.value)} className={inputCls}>
              <option value="">Select leave type…</option>
              {leaveTypes.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">From Date *</label>
              <input type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">To Date *</label>
              <input type="date" value={form.toDate} min={form.fromDate} onChange={e => set('toDate', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Days</label>
            <input type="number" min="0.5" step="0.5" value={form.days} onChange={e => set('days', e.target.value)} className={inputCls} />
            <p className="text-xs text-slate-400">Auto-calculated; adjust for half-day leaves.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Reason</label>
            <textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Optional reason…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder:text-slate-300" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition">
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reject Remarks Modal ─── */
function RejectModal({ onClose, onConfirm }) {
  const [remarks, setRemarks] = useState('');
  const [saving,  setSaving]  = useState(false);
  const handleConfirm = async () => {
    setSaving(true);
    try { await onConfirm(remarks); onClose(); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Reject Leave</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4">
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Reason for rejection (optional)</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Insufficient leave balance…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none placeholder:text-slate-300" />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 transition">
            {saving ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Leave Type Modal ─── */
function LeaveTypeModal({ leaveType, onClose, onSaved }) {
  const isEdit = Boolean(leaveType);
  const [form, setForm] = useState({
    name:            leaveType?.name            || '',
    code:            leaveType?.code            || '',
    annualAllotment: leaveType?.annualAllotment != null ? String(leaveType.annualAllotment) : '0',
    isPaid:          leaveType?.isPaid          ?? true,
    isActive:        leaveType?.isActive        ?? true,
    color:           leaveType?.color           || 'blue',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, annualAllotment: Number(form.annualAllotment) };
      if (isEdit) { await LeaveTypesAPI.update(leaveType.id, payload); toast.success('Leave type updated'); }
      else        { await LeaveTypesAPI.create(payload);               toast.success('Leave type created'); }
      onSaved(); onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save leave type');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">{isEdit ? 'Edit Leave Type' : 'Add Leave Type'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sick Leave" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. SL" maxLength={10} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Annual Allotment (days)</label>
            <input type="number" min="0" value={form.annualAllotment} onChange={e => set('annualAllotment', e.target.value)} className={inputCls} />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Badge Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => {
                const { bg, text } = colorCls(c);
                return (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition ${bg} ${text} ${form.color === c ? 'border-slate-800 shadow' : 'border-transparent'}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isPaid} onChange={e => set('isPaid', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
              <span className="text-sm text-slate-700 font-medium">Paid Leave</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
              <span className="text-sm text-slate-700 font-medium">Active</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Leave Type'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Leave Requests Tab ─── */
function LeaveRequestsTab({ employees, leaveTypes }) {
  const qc = useQueryClient();
  const [applyOpen,    setApplyOpen]    = useState(false);
  const [rejectId,     setRejectId]     = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);
  const [empFilter,    setEmpFilter]    = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [year,         setYear]         = useState(thisYear());
  const [search,       setSearch]       = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', { year, empFilter, typeFilter, statusFilter }],
    queryFn:  () => LeaveRequestsAPI.getAll({
      year,
      ...(empFilter    ? { employeeId:  empFilter    } : {}),
      ...(typeFilter   ? { leaveTypeId: typeFilter   } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leave-requests'] });

  const approveMut = useMutation({
    mutationFn: id => LeaveRequestsAPI.updateStatus(id, { status: 'approved' }),
    onSuccess:  () => { toast.success('Leave approved'); invalidate(); },
    onError:    () => toast.error('Failed to approve'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, remarks }) => LeaveRequestsAPI.updateStatus(id, { status: 'rejected', remarks }),
    onSuccess:  () => { toast.success('Leave rejected'); invalidate(); },
    onError:    () => toast.error('Failed to reject'),
  });

  const deleteMut = useMutation({
    mutationFn: id => LeaveRequestsAPI.delete(id),
    onSuccess:  () => { toast.success('Request deleted'); invalidate(); setDeleteId(null); },
    onError:    () => toast.error('Failed to delete'),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(r =>
      r.employee?.name?.toLowerCase().includes(q) ||
      r.leaveType?.name?.toLowerCase().includes(q));
  }, [requests, search]);

  const stats = useMemo(() => ({
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total:    requests.length,
  }), [requests]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-3 flex-wrap shrink-0">
        <button onClick={() => setApplyOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm shrink-0">
          <Plus size={14} /> Apply Leave
        </button>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">All Employees</option>
          {employees.filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">All Types</option>
          {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 font-medium transition ${statusFilter === val ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <input type="number" value={year} onChange={e => setYear(e.target.value)} min="2020" max="2099"
            className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-center font-medium" />
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-3 flex gap-3 shrink-0">
        {[
          ['Total',    stats.total,    'bg-slate-100  text-slate-700'],
          ['Pending',  stats.pending,  'bg-amber-100  text-amber-700'],
          ['Approved', stats.approved, 'bg-emerald-100 text-emerald-700'],
          ['Rejected', stats.rejected, 'bg-rose-100   text-rose-600'],
        ].map(([lbl, val, cls]) => (
          <div key={lbl} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${cls}`}>
            <span className="font-bold text-base leading-none">{val}</span>
            <span className="opacity-70">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <CalendarOff size={36} className="opacity-20" />
            <p className="text-sm">No leave requests found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Leave Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Duration</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Days</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Applied On</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(req => {
                  const lc  = colorCls(req.leaveType?.color || 'blue');
                  const sm  = STATUS_META[req.status] ?? STATUS_META.pending;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{req.employee?.name}</div>
                        <div className="text-xs text-slate-400">{req.employee?.designation || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${lc.bg} ${lc.text}`}>
                          {req.leaveType?.code}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">{req.leaveType?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{fmtDate(req.fromDate)}</div>
                        <div className="text-slate-400">to {fmtDate(req.toDate)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-800">{Number(req.days)}</span>
                        <div className="text-xs text-slate-400">day{Number(req.days) !== 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">
                        {req.reason || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(req.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.cls}`}>{sm.label}</span>
                        {req.remarks && (
                          <div className="text-xs text-slate-400 mt-0.5 max-w-[100px] truncate" title={req.remarks}>{req.remarks}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => approveMut.mutate(req.id)}
                                disabled={approveMut.isPending}
                                title="Approve"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-50">
                                <Check size={13} />
                              </button>
                              <button onClick={() => setRejectId(req.id)}
                                title="Reject"
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition">
                                <X size={13} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setDeleteId(req.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {applyOpen && (
        <ApplyLeaveModal
          employees={employees}
          leaveTypes={leaveTypes}
          onClose={() => setApplyOpen(false)}
          onSaved={invalidate}
        />
      )}
      {rejectId !== null && (
        <RejectModal
          onClose={() => setRejectId(null)}
          onConfirm={remarks => rejectMut.mutateAsync({ id: rejectId, remarks })}
        />
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Request"
        message="Delete this leave request? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ─── Leave Types Tab ─── */
function LeaveTypesTab() {
  const qc = useQueryClient();
  const [addOpen,  setAddOpen]  = useState(false);
  const [editType, setEditType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn:  LeaveTypesAPI.getAll,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leave-types'] });

  const deleteMut = useMutation({
    mutationFn: id => LeaveTypesAPI.delete(id),
    onSuccess:  () => { toast.success('Leave type deleted'); invalidate(); setDeleteId(null); },
    onError:    () => toast.error('Failed to delete'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }) => LeaveTypesAPI.update(id, { isActive }),
    onSuccess:  () => invalidate(),
    onError:    () => toast.error('Failed to update'),
  });

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Define leave categories and annual allotments</p>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm">
          <Plus size={14} /> Add Leave Type
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Code</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Annual Days</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Paid</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Active</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaveTypes.map(t => {
                const lc = colorCls(t.color);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lc.bg} ${lc.text}`}>
                        {t.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${lc.bg} ${lc.text}`}>{t.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-slate-800">{t.annualAllotment}</span>
                      <span className="text-xs text-slate-400 ml-1">days</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.isPaid
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Unpaid</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleMut.mutate({ id: t.id, isActive: !t.isActive })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition hover:opacity-75 ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditType(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(addOpen || editType) && (
        <LeaveTypeModal
          leaveType={editType ?? undefined}
          onClose={() => { setAddOpen(false); setEditType(null); }}
          onSaved={invalidate}
        />
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Leave Type"
        message="Delete this leave type? Existing requests will be unaffected."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ─── Main Page ─── */
export default function LeaveManagementPage() {
  const [tab, setTab] = useState('requests');

  const { data: employees  = [] } = useQuery({ queryKey: ['employees'],   queryFn: EmployeesAPI.getAll });
  const { data: leaveTypes = [] } = useQuery({ queryKey: ['leave-types'], queryFn: LeaveTypesAPI.getAll });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <CalendarOff size={18} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Leave Management</h1>
            <p className="text-xs text-slate-500">Leave Requests · Leave Types · Approvals</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
        {[['requests','Leave Requests'],['types','Leave Types']].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'requests'
        ? <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} />
        : <LeaveTypesTab />}
    </div>
  );
}
