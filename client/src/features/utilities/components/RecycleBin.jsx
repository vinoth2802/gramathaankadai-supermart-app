import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Trash2, RotateCcw, AlertTriangle, Search,
  ShoppingBag, ShoppingCart, ArrowDownCircle, ArrowUpCircle,
  Users, Package,
} from 'lucide-react';
import { RecycleBinAPI } from '@features/utilities/resources/utilities-service';

const pad = (n) => String(n).padStart(2, '0');
function fmtDt(iso) {
  const d = new Date(iso);
  let h = d.getHours(); const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${h}:${m} ${ampm}`;
}
const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const TYPE_META = {
  Sale:       { label: 'Sale Invoice',   icon: ShoppingBag,      bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  Purchase:   { label: 'Purchase',       icon: ShoppingCart,     bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  PaymentIn:  { label: 'Payment In',     icon: ArrowDownCircle,  bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  PaymentOut: { label: 'Payment Out',    icon: ArrowUpCircle,    bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200'  },
  Party:      { label: 'Party',          icon: Users,            bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200'    },
  Item:       { label: 'Item',           icon: Package,          bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-200'   },
};

const ALL_TYPES = Object.keys(TYPE_META);

function parseSnapshot(item) {
  try {
    const s = JSON.parse(item.snapshot);
    switch (item.type) {
      case 'Sale':
        return { refNo: s.invoice || '—', partyName: s.customerName || 'Walk-in Customer' };
      case 'Purchase':
        return { refNo: s.invoice || '—', partyName: s.partyName || 'Unknown Supplier' };
      case 'PaymentIn':
      case 'PaymentOut':
        return { refNo: s.reference || `#${s.id}`, partyName: s.partyName || '—' };
      case 'Party':
        return { refNo: '—', partyName: s.name || '—' };
      case 'Item':
        return { refNo: s.itemCode || '—', partyName: s.shortName || '—' };
      default:
        return { refNo: item.name || '—', partyName: '—' };
    }
  } catch {
    return { refNo: item.name || '—', partyName: '—' };
  }
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: Package };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

export default function Recyclebin() {
  const qc = useQueryClient();
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('All');
  const [confirmAll,  setConfirmAll]  = useState(false);
  const [confirmId,   setConfirmId]   = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recycle-bin'],
    queryFn:  RecycleBinAPI.getAll,
  });

  const restoreMut = useMutation({
    mutationFn: RecycleBinAPI.restore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recycle-bin'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success('Restored successfully');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Restore failed'),
  });

  const permDeleteMut = useMutation({
    mutationFn: RecycleBinAPI.deletePerm,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recycle-bin'] }); toast.success('Permanently deleted'); },
    onError:   () => toast.error('Delete failed'),
  });

  const emptyMut = useMutation({
    mutationFn: RecycleBinAPI.deleteAll,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recycle-bin'] }); setConfirmAll(false); toast.success('Recycle bin emptied'); },
    onError:   () => toast.error('Failed to empty bin'),
  });

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== 'All') list = list.filter(i => i.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
    }
    return list;
  }, [items, typeFilter, search]);

  const counts = useMemo(() => {
    const c = { All: items.length };
    ALL_TYPES.forEach(t => { c[t] = items.filter(i => i.type === t).length; });
    return c;
  }, [items]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <Trash2 size={20} className="text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Recycle Bin</h1>
              <p className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''} in bin</p>
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setConfirmAll(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition">
              <Trash2 size={14} /> Empty Bin
            </button>
          )}
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {['All', ...ALL_TYPES].map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border
                ${typeFilter === t
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {t === 'All' ? 'All' : TYPE_META[t].label} ({counts[t] || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or type…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <p className="text-center py-16 text-slate-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Trash2 size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Recycle bin is empty</p>
              <p className="text-slate-300 text-xs">Deleted items will appear here</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ref. No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Party Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Deleted At</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const { refNo, partyName } = parseSnapshot(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 text-xs whitespace-nowrap">
                        {refNo}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-semibold uppercase">
                        {partyName}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                        {Number(item.amount) > 0 ? fmtAmt(item.amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmtDt(item.deletedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => restoreMut.mutate(item.id)}
                            disabled={restoreMut.isPending}
                            title="Restore"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition border border-emerald-200">
                            <RotateCcw size={12} /> Restore
                          </button>
                          <button
                            onClick={() => setConfirmId(item.id)}
                            title="Delete permanently"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition border border-rose-200">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Confirm permanent delete single */}
      {confirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Delete Permanently?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmId(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button
                onClick={() => { permDeleteMut.mutate(confirmId); setConfirmId(null); }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm empty bin */}
      {confirmAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Empty Recycle Bin?</h3>
                <p className="text-xs text-slate-500 mt-0.5">All {items.length} item{items.length !== 1 ? 's' : ''} will be permanently deleted.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmAll(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancel
              </button>
              <button
                onClick={() => emptyMut.mutate()}
                disabled={emptyMut.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
                {emptyMut.isPending ? 'Emptying…' : 'Empty Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
