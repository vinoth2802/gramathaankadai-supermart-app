import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, Printer, FileSpreadsheet, Check, Calendar, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ReportsAPI } from '../../api/reports.js';

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtAmt  = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function fmtDt(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const mi = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${mi} ${ampm}`;
}

function getPresetRange(label) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (label) {
    case 'This Month':   return { from: new Date(y, m, 1),     to: new Date(y, m + 1, 0)   };
    case 'Last Month':   return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0)       };
    case 'This Quarter': { const q = Math.floor(m / 3); return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0) }; }
    case 'This Year':    return { from: new Date(y, 0, 1),     to: new Date(y, 11, 31)     };
    default:             return { from: null, to: null };
  }
}

const DATE_OPTIONS = ['This Month', 'Last Month', 'This Quarter', 'This Year', 'Custom'];

export default function AllTransactions() {
  const today = new Date();
  const [filter, setFilter]         = useState('Custom');
  const [customFrom, setCustomFrom] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [customTo,   setCustomTo]   = useState(() => today.toISOString().slice(0, 10));
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [open,       setOpen]       = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  let fromISO = null, toISO = null;
  if (filter === 'Custom') {
    if (customFrom) fromISO = new Date(customFrom + 'T00:00:00').toISOString();
    if (customTo)   toISO   = new Date(customTo   + 'T23:59:59').toISOString();
  } else {
    const r = getPresetRange(filter);
    if (r.from) fromISO = new Date(r.from.getFullYear(), r.from.getMonth(), r.from.getDate(), 0, 0, 0).toISOString();
    if (r.to)   toISO   = new Date(r.to.getFullYear(),   r.to.getMonth(),   r.to.getDate(),   23, 59, 59, 999).toISOString();
  }

  const { data, isLoading } = useQuery({
    queryKey: ['report-all-txns', filter, customFrom, customTo],
    queryFn:  () => ReportsAPI.allTransactions(fromISO, toISO),
  });

  const allTxns = data?.transactions ?? [];
  const totalIn  = data?.totalIn  ?? 0;
  const totalOut = data?.totalOut ?? 0;
  const net      = data?.net      ?? 0;

  const txns = allTxns.filter(t => {
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    const matchSearch = !search ||
      t.party.toLowerCase().includes(search.toLowerCase()) ||
      t.invoice.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const presetRange = filter !== 'Custom' ? getPresetRange(filter) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">All Transactions</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <span className="text-sm text-slate-500 font-medium shrink-0">Filter by:</span>

        <div ref={ref} className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition">
            {filter}
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[170px] z-50 overflow-hidden">
              {DATE_OPTIONS.map(opt => (
                <button key={opt} onClick={() => { setFilter(opt); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition">
                  <span className={filter === opt ? 'text-blue-600 font-medium' : 'text-gray-700'}>{opt}</span>
                  {filter === opt && <Check size={13} className="text-blue-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {filter === 'Custom' && (
          <>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400" />
            </div>
          </>
        )}

        {presetRange?.from && presetRange?.to && (
          <div className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 bg-white">
            <Calendar size={13} className="text-gray-400" />
            <span className="text-xs text-gray-700">{fmtDate(presetRange.from)} To {fmtDate(presetRange.to)}</span>
          </div>
        )}

        {/* Type filter pills */}
        <div className="ml-auto flex items-center gap-1.5">
          {['All', 'Sale', 'Purchase'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                typeFilter === t
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle size={16} className="text-emerald-500" />
            <p className="text-xs text-slate-500">Total In (Sales)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{fmtAmt(totalIn)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle size={16} className="text-rose-500" />
            <p className="text-xs text-slate-500">Total Out (Purchases)</p>
          </div>
          <p className="text-2xl font-bold text-rose-700">{fmtAmt(totalOut)}</p>
        </div>
        <div className={`border rounded-xl px-5 py-4 shadow-sm ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className="text-xs text-slate-500 mb-1">Net ({net >= 0 ? 'Surplus' : 'Deficit'})</p>
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmtAmt(Math.abs(net))}</p>
          <p className="text-xs text-slate-400 mt-1">{allTxns.length} total transactions</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Transactions {txns.length !== allTxns.length && `(${txns.length} of ${allTxns.length})`}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-40 focus:outline-none focus:border-blue-400" />
            </div>
            <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              <Printer size={15} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr>
                {['Date', 'Type', 'Party / Description', 'Invoice', 'Payment Mode', 'In', 'Out'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No transactions found for the selected period.</td></tr>
              ) : txns.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDt(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.type === 'Sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{t.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{t.party}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{t.invoice}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.paymentMode}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-700 text-right">
                    {t.flow === 'in' ? fmtAmt(t.amount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-rose-600 text-right">
                    {t.flow === 'out' ? fmtAmt(t.amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
