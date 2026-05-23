import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronDown, Settings, Search,
  Printer, MoreVertical, Share2, BarChart2, FileSpreadsheet, Calendar, Check,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { PurchasesAPI } from '../../api/purchases.js';

/* ── Helpers ── */
const pad = (n) => String(n).padStart(2, '0');

function fmtDt(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${m} ${ampm}`;
}

function fmtDate(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function getRange(label) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (label) {
    case 'Today':        return { from: new Date(y, m, d),     to: new Date(y, m, d)       };
    case 'This Month':   return { from: new Date(y, m, 1),     to: new Date(y, m + 1, 0)   };
    case 'Last Month':   return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0)       };
    case 'This Quarter': { const q = Math.floor(m / 3); return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0) }; }
    case 'This Year':    return { from: new Date(y, 0, 1),     to: new Date(y, 11, 31)     };
    default:             return { from: null, to: null };
  }
}

/* ── Normalize API purchase → row ── */
function normalizeRow(p) {
  const grandTotal = Number(p.grandTotal ?? p.grand_total ?? p.total ?? 0);
  const paid       = Number(p.paidAmount ?? p.paid_amount ?? p.totalPaid ?? p.total_paid ?? 0);
  const balance    = Math.max(0, grandTotal - paid);
  const dueDate    = p.dueDate ? fmtDate(new Date(p.dueDate)) : '';

  return {
    id:          p.id,
    invoiceNo:   p.invoice ?? p.invoiceNo ?? p.billNo ?? '—',
    date:        p.date,
    party:       (p.party?.name ?? p.partyName ?? p.party_name ?? 'UNKNOWN SUPPLIER').toUpperCase(),
    transaction: 'Purchase',
    paymentType: p.paymentMode ?? p.payment_mode ?? 'Cash',
    amount:      grandTotal,
    balance,
    dueDate,
    status:      p.paymentStatus ?? (balance > 0 && paid > 0 ? 'Partial' : balance > 0 ? 'Unpaid' : 'Paid'),
  };
}

/* ── Date filter dropdown + range pill ── */
const DATE_OPTIONS = ['Today', 'This Month', 'Last Month', 'This Quarter', 'This Year'];

function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const { from, to } = getRange(value);

  return (
    <div ref={ref} className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition whitespace-nowrap"
        >
          {value}
          <ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] z-50 overflow-hidden">
            {DATE_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition">
                <span className={value === opt ? 'text-amber-600 font-medium' : 'text-gray-700'}>{opt}</span>
                {value === opt && <Check size={13} className="text-amber-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {from && to && (
        <div className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 bg-white whitespace-nowrap">
          <Calendar size={13} className="text-gray-400" />
          <span className="text-xs text-gray-700">{fmtDate(from)} To {fmtDate(to)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Filter pill ── */
function FilterPill({ children }) {
  return (
    <button className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition whitespace-nowrap">
      {children}
      <ChevronDown size={12} className="text-gray-400 shrink-0" />
    </button>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const cls = { Paid: 'text-emerald-600', Unpaid: 'text-rose-600', Partial: 'text-amber-600' };
  return <span className={`text-xs font-semibold ${cls[status] || 'text-slate-500'}`}>{status}</span>;
}

/* ── Column header ── */
function Th({ label, sortKey, sortCol, sortDir, onSort, className = '' }) {
  const active = sortKey && sortCol === sortKey;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 whitespace-nowrap ${sortKey ? 'cursor-pointer select-none hover:bg-slate-100' : ''} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <Icon size={11} className={active ? 'text-amber-500 shrink-0' : 'text-slate-300 shrink-0'} />
      </div>
    </th>
  );
}

/* ── 3-dot row menu ── */
function RowMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  const act = (fn) => { setOpen(false); fn?.(); };

  const items = [
    { label: 'View/Edit',  fn: null,     danger: false },
    { label: 'Delete',     fn: onDelete, danger: true  },
    { label: 'Duplicate',  fn: null,     danger: false },
    { label: 'Open PDF',   fn: null,     danger: false },
  ];

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle}
        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[160px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            {items.map(({ label, fn, danger }) => (
              <button key={label} onClick={() => act(fn)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition
                  ${danger ? 'text-rose-600' : 'text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function PurchaseHistory() {
  const location = useLocation();
  const [dateLabel, setDateLabel] = useState(location.state?.initFilter ?? 'This Month');
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [sortCol,   setSortCol]   = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const qc = useQueryClient();
  const { from, to } = getRange(dateLabel);

  const fromISO = from
    ? new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).toISOString()
    : null;
  const toISO = to
    ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString()
    : null;

  const { data: rawPurchases = [], isLoading } = useQuery({
    queryKey: ['purchases', dateLabel],
    queryFn:  () => PurchasesAPI.getByDateRange(fromISO, toISO),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => PurchasesAPI.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setSelected(null);
      toast.success('Purchase deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete purchase'),
  });

  const handleDelete = (id) => {
    if (!window.confirm('Delete this purchase?')) return;
    deleteMut.mutate(id);
  };

  const rows = rawPurchases
    .map(normalizeRow)
    .filter(r =>
      r.party.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNo.toLowerCase().includes(search.toLowerCase()),
    );

  const sortedRows = [...rows].sort((a, b) => {
    let av = a[sortCol];
    let bv = b[sortCol];
    if (sortCol === 'date') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
    else if (sortCol === 'amount' || sortCol === 'balance') { av = Number(av); bv = Number(bv); }
    else { av = String(av ?? '').toLowerCase(); bv = String(bv ?? '').toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalAmount  = rows.reduce((s, r) => s + r.amount,  0);
  const totalPaid    = rows.reduce((s, r) => s + (r.amount - r.balance), 0);
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Purchase History</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white border border-slate-200 rounded-xl transition">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-500 font-medium mr-1 shrink-0">Filter by:</span>
          <DateFilter value={dateLabel} onChange={setDateLabel} />
          <FilterPill>All Firms</FilterPill>
          <FilterPill>All Users</FilterPill>
          <FilterPill>All Godown</FilterPill>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-2">Total Purchase Amount</p>
            <p className="text-2xl font-bold text-slate-800">{fmtAmt(totalAmount)}</p>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span>Paid: {fmtAmt(totalPaid)}</span>
              <span className="text-slate-300">|</span>
              <span>Balance: {fmtAmt(totalBalance)}</span>
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-2">Total Purchase Discount</p>
            <p className="text-2xl font-bold text-slate-800">₹ 0.00</p>
            <p className="text-xs text-slate-500 mt-1.5">Total Unpaid Balance: {fmtAmt(totalBalance)}</p>
          </div>
        </div>

        {/* ── Transactions table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Transactions</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-44
                    focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                />
              </div>
              <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <BarChart2 size={15} />
              </button>
              <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <Printer size={15} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr>
                  <Th label="Date"         sortKey="date"        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Invoice No"   sortKey="invoiceNo"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Party Name"   sortKey="party"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Transaction"  sortKey="transaction" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Payment Type" sortKey="paymentType" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Amount"       sortKey="amount"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                  <Th label="Balance"      sortKey="balance"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                  <Th label="Due Date"     sortKey="dueDate"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Status"       sortKey="status"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-slate-400 text-sm">Loading…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-slate-400 text-sm">
                      No purchase invoices found for this period.
                    </td>
                  </tr>
                ) : sortedRows.map((row) => {
                  const isSel = selected === row.id;
                  const bold  = isSel ? 'font-bold text-slate-900' : '';
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(isSel ? null : row.id)}
                      className={`cursor-pointer transition ${isSel ? 'bg-amber-50' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${isSel ? bold : 'text-slate-600'}`}>
                        {fmtDt(row.date)}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${isSel ? bold : 'font-semibold text-slate-700'}`}>
                        {row.invoiceNo}
                      </td>
                      <td className={`px-4 py-3 text-xs uppercase tracking-wide ${isSel ? bold : 'font-semibold text-slate-800'}`}>
                        {row.party}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isSel ? bold : 'text-slate-600'}`}>
                        {row.transaction}
                      </td>
                      <td className={`px-4 py-3 text-xs max-w-[140px] truncate ${isSel ? bold : 'text-slate-600'}`}
                        title={row.paymentType}>
                        {row.paymentType}
                      </td>
                      <td className={`px-4 py-3 text-right text-xs ${isSel ? bold : 'font-semibold text-slate-800'}`}>
                        {fmtAmt(row.amount)}
                      </td>
                      <td className={`px-4 py-3 text-right text-xs ${isSel ? bold : 'text-slate-600'}`}>
                        {fmtAmt(row.balance)}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isSel ? bold : 'text-slate-400'}`}>
                        {row.dueDate || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <button title="Print"
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                            <Printer size={13} />
                          </button>
                          <button title="Share"
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                            <Share2 size={13} />
                          </button>
                          <RowMenu onDelete={() => handleDelete(row.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
