import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ClipboardList, Search, Trash2, AlertTriangle,
  ShoppingBag, ShoppingCart, ArrowDownCircle, ArrowUpCircle,
  Users, Package, Plus, Pencil, ChevronDown,
} from 'lucide-react';
import { ActivityLogAPI } from '@features/utilities/resources/utilities-service';

const pad = (n) => String(n).padStart(2, '0');
function fmtDt(iso) {
  const d = new Date(iso);
  let h = d.getHours(); const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${h}:${m} ${ampm}`;
}
const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const ACTION_META = {
  CREATE: { label: 'Create', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Plus },
  EDIT:   { label: 'Edit',   bg: 'bg-blue-100',    text: 'text-blue-700',    icon: Pencil },
  DELETE: { label: 'Delete', bg: 'bg-rose-100',     text: 'text-rose-700',    icon: Trash2 },
};

const TYPE_META = {
  Sale:       { label: 'Sale Invoice',  icon: ShoppingBag,     bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Purchase:   { label: 'Purchase',      icon: ShoppingCart,    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  PaymentIn:  { label: 'Payment In',    icon: ArrowDownCircle, bg: 'bg-blue-100',    text: 'text-blue-700'    },
  PaymentOut: { label: 'Payment Out',   icon: ArrowUpCircle,   bg: 'bg-purple-100',  text: 'text-purple-700'  },
  Party:      { label: 'Party',         icon: Users,           bg: 'bg-rose-100',    text: 'text-rose-700'    },
  Item:       { label: 'Item',          icon: Package,         bg: 'bg-slate-100',   text: 'text-slate-700'   },
};

const ALL_ACTIONS = ['CREATE', 'EDIT', 'DELETE'];
const ALL_TYPES   = Object.keys(TYPE_META);

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, bg: 'bg-slate-100', text: 'text-slate-600', icon: Package };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-600', icon: Package };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function ChangesRow({ changes }) {
  return (
    <div className="flex flex-wrap gap-2 py-2.5 px-2">
      {changes.map((c, i) => (
        <div key={i}
          className="inline-flex items-center gap-1.5 bg-white border border-blue-100 rounded-lg px-3 py-1.5 shadow-sm text-xs">
          <span className="font-semibold text-slate-500">{c.field}</span>
          <span className="text-slate-300 mx-0.5">:</span>
          <span className="text-rose-500 line-through opacity-80">{c.from}</span>
          <span className="text-slate-400 mx-1">→</span>
          <span className="text-emerald-600 font-semibold">{c.to}</span>
        </div>
      ))}
    </div>
  );
}

export default function LogRegister() {
  const qc = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [typeFilter,   setTypeFilter]   = useState('All');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [expanded,     setExpanded]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log'],
    queryFn:  () => ActivityLogAPI.getAll({ limit: 500 }),
  });

  const logs = data?.logs || [];

  const clearMut = useMutation({
    mutationFn: ActivityLogAPI.clearAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-log'] });
      setConfirmClear(false);
      toast.success('Activity log cleared');
    },
    onError: () => toast.error('Failed to clear log'),
  });

  const filtered = useMemo(() => {
    let list = logs;
    if (actionFilter !== 'All') list = list.filter(l => l.action === actionFilter);
    if (typeFilter   !== 'All') list = list.filter(l => l.details?.type === typeFilter);
    if (fromDate) list = list.filter(l => new Date(l.logTime) >= new Date(fromDate));
    if (toDate)   list = list.filter(l => new Date(l.logTime) <= new Date(toDate + 'T23:59:59'));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.details?.refNo     || '').toLowerCase().includes(q) ||
        (l.details?.partyName || '').toLowerCase().includes(q) ||
        (l.details?.type      || '').toLowerCase().includes(q) ||
        (l.userName           || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, actionFilter, typeFilter, fromDate, toDate, search]);

  const actionCounts = useMemo(() => {
    const c = { All: logs.length };
    ALL_ACTIONS.forEach(a => { c[a] = logs.filter(l => l.action === a).length; });
    return c;
  }, [logs]);

  const typeCounts = useMemo(() => {
    const c = { All: logs.length };
    ALL_TYPES.forEach(t => { c[t] = logs.filter(l => l.details?.type === t).length; });
    return c;
  }, [logs]);

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ClipboardList size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Log Register</h1>
              <p className="text-xs text-slate-400">{logs.length} activit{logs.length !== 1 ? 'ies' : 'y'} recorded</p>
            </div>
          </div>
          {logs.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition">
              <Trash2 size={14} /> Clear Log
            </button>
          )}
        </div>

        {/* Action filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {['All', ...ALL_ACTIONS].map(a => (
            <button key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border
                ${actionFilter === a
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {a === 'All' ? 'All Actions' : ACTION_META[a].label} ({actionCounts[a] || 0})
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          {['All', ...ALL_TYPES].map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border
                ${typeFilter === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {t === 'All' ? 'All Types' : TYPE_META[t].label} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>

        {/* Search + Date range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ref, party, user…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 bg-white" />
            <span className="text-xs text-slate-500">To</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 bg-white" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded transition">
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <p className="text-center py-16 text-slate-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <ClipboardList size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">No activities found</p>
              <p className="text-slate-300 text-xs">Activities will appear here as you work</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ref. No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Party / Item Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const d         = log.details || {};
                  const hasChanges = log.action === 'EDIT' && d.changes?.length > 0;
                  const isOpen    = expanded === log.id;

                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => hasChanges && toggleExpand(log.id)}
                        className={`border-b border-slate-100 transition
                          ${isOpen ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}
                          ${hasChanges ? 'cursor-pointer' : ''}`}>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {fmtDt(log.logTime)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <ActionBadge action={log.action} />
                            {hasChanges && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-500 font-medium">
                                {d.changes.length} field{d.changes.length > 1 ? 's' : ''} changed
                                <ChevronDown size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {d.type ? <TypeBadge type={d.type} /> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800 text-xs whitespace-nowrap">
                          {d.refNo || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 font-semibold uppercase">
                          {d.partyName || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                          {Number(d.amount) > 0 ? fmtAmt(d.amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {log.userName || <span className="text-slate-300">—</span>}
                        </td>
                      </tr>

                      {/* Expanded changes row */}
                      {hasChanges && isOpen && (
                        <tr key={`${log.id}-changes`} className="border-b border-blue-100 bg-blue-50/30">
                          <td colSpan={7} className="px-6 pb-3">
                            <ChangesRow changes={d.changes} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Confirm clear */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Clear Activity Log?</h3>
                <p className="text-xs text-slate-500 mt-0.5">All {logs.length} log entries will be permanently removed.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmClear(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button
                onClick={() => clearMut.mutate()}
                disabled={clearMut.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
                {clearMut.isPending ? 'Clearing…' : 'Clear Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
