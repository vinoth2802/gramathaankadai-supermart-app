import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { History, Printer, Eye, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { CashbookAPI } from '@features/cashbook/resources/cashbook-service';

const pad = n => String(n).padStart(2, '0');
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function fmtDate(str) {
  const [y, m, d] = str.split('-');
  return `${pad(d)}/${pad(m)}/${y}`;
}
const INR = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const sum = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0);

/* ── column definitions ── */
const COLS = [
  { key: 'sno',          label: 'S.No.',           color: 'text-slate-400',   val: r => r._sno },
  { key: 'date',         label: 'Date',            color: 'text-slate-500',   val: r => r.date },
  { key: 'opening',      label: 'Opening Balance',  color: 'text-slate-500',   val: r => r.openingBalance },
  { key: 'cashSales',    label: 'Cash Sales',       color: 'text-emerald-500', val: r => r.sales.cash },
  { key: 'creditSales',  label: 'Credit Sales',     color: 'text-slate-400',   val: r => r.sales.credit },
  { key: 'totalSales',   label: 'Total Sales',      color: 'text-emerald-700', val: r => r.sales.total },
  { key: 'cashPurch',    label: 'Cash Purchase',    color: 'text-rose-500',    val: r => r.purchases.cash },
  { key: 'creditPurch',  label: 'Credit Purchase',  color: 'text-rose-400',    val: r => r.purchases.credit },
  { key: 'totalPurch',   label: 'Total Purchase',   color: 'text-rose-700',    val: r => r.purchases.total },
  { key: 'payIn',        label: 'Pay In',           color: 'text-blue-500',    val: r => r.paymentIn.cash },
  { key: 'payOut',       label: 'Pay Out',          color: 'text-purple-500',  val: r => r.paymentOut.cash },
  { key: 'expense',      label: 'Expense',          color: 'text-orange-500',  val: r => r.expenses.cash },
  { key: 'cashWithdraw', label: 'Cash Withdrawal',  color: 'text-amber-600',   val: r => r.cashWithdraw.cash },
  { key: 'closing',      label: 'Closing Balance',  color: 'text-teal-600',    val: r => r.closingBalance },
  { key: 'suspense',     label: 'Suspense',         color: 'text-indigo-500',  val: r => r.income.cash },
];

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={10} className="ml-1 opacity-30 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp   size={10} className="ml-1 inline" />
    : <ChevronDown size={10} className="ml-1 inline" />;
}

export default function CashBookHistory() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstOfMonthStr);
  const [to,   setTo]   = useState(todayStr);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: fetched = [], isLoading, isError } = useQuery({
    queryKey: ['cashbook-history', from, to],
    queryFn:  () => CashbookAPI.getHistory(from, to),
  });

  // stamp a stable S.No. (1-based, API order) onto each row
  const raw = useMemo(() =>
    fetched.map((r, i) => ({ ...r, _sno: i + 1 })),
    [fetched]
  );

  const rows = useMemo(() => {
    const col = COLS.find(c => c.key === sortCol);
    if (!col) return raw;
    return [...raw].sort((a, b) => {
      const av = col.val(a);
      const bv = col.val(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [raw, sortCol, sortDir]);

  function handleSort(key) {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  }

  const Th = ({ colKey, children, sticky = false, className = '' }) => (
    <th
      onClick={() => handleSort(colKey)}
      className={`px-3 py-3 text-center font-semibold uppercase tracking-wide leading-tight
        cursor-pointer select-none hover:bg-slate-100 transition
        ${COLS.find(c => c.key === colKey)?.color ?? 'text-slate-500'}
        ${sticky ? 'sticky left-0 bg-slate-50 z-10' : ''}
        ${sortCol === colKey ? 'bg-slate-100' : ''}
        ${className}`}
    >
      {children}
      <SortIcon col={colKey} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto print:bg-white">
      <div className="px-6 py-5 space-y-5 print:px-4 print:py-2">

        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <History size={20} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Day Cash Book History</h1>
              <p className="text-xs text-slate-400">Cash flow summary by day</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-400" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-400" />
            </div>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition">
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center pb-2 border-b border-slate-300">
          <h2 className="text-lg font-bold">Day Cash Book History</h2>
          <p className="text-sm text-slate-500">{fmtDate(from)} — {fmtDate(to)}</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <p className="text-slate-400 text-sm">Loading…</p>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <p className="text-rose-400 text-sm">Failed to load data.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <Th colKey="sno" sticky className="whitespace-nowrap">S.No.</Th>
                    <Th colKey="date"         sticky>Date</Th>
                    <Th colKey="opening">Opening<br/>Balance</Th>
                    <Th colKey="cashSales">Cash<br/>Sales</Th>
                    <Th colKey="creditSales">Credit<br/>Sales</Th>
                    <Th colKey="totalSales">Total<br/>Sales</Th>
                    <Th colKey="cashPurch">Cash<br/>Purchase</Th>
                    <Th colKey="creditPurch">Credit<br/>Purchase</Th>
                    <Th colKey="totalPurch">Total<br/>Purchase</Th>
                    <Th colKey="payIn">Pay<br/>In</Th>
                    <Th colKey="payOut">Pay<br/>Out</Th>
                    <Th colKey="expense">Expense</Th>
                    <Th colKey="cashWithdraw">Cash<br/>Withdrawal</Th>
                    <Th colKey="closing">Closing<br/>Balance</Th>
                    <Th colKey="suspense">Suspense</Th>
                    <th className="px-3 py-3 print:hidden"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={16} className="px-4 py-12 text-center text-slate-400">
                        No transactions found for this period.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/60 transition text-right">
                      <td className="px-3 py-3 text-center text-slate-400 sticky left-0 bg-white">{row._sno}</td>
                      <td className="px-3 py-3 text-left font-semibold text-slate-700 sticky left-7 bg-white">{fmtDate(row.date)}</td>
                      <td className="px-3 py-3 text-slate-600">₹ {INR(row.openingBalance)}</td>
                      <td className="px-3 py-3 text-emerald-500 font-semibold">
                        ₹ {INR(row.sales.cash)}
                        {row.sales.cashCount > 0 && <span className="ml-1 text-slate-400 font-normal">({row.sales.cashCount})</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        ₹ {INR(row.sales.credit)}
                        {row.sales.creditCount > 0 && <span className="ml-1 text-slate-300">({row.sales.creditCount})</span>}
                      </td>
                      <td className="px-3 py-3 text-emerald-700 font-bold">₹ {INR(row.sales.total)}</td>
                      <td className="px-3 py-3 text-rose-500 font-semibold">
                        ₹ {INR(row.purchases.cash)}
                        {row.purchases.cashCount > 0 && <span className="ml-1 text-slate-400 font-normal">({row.purchases.cashCount})</span>}
                      </td>
                      <td className="px-3 py-3 text-rose-400">
                        ₹ {INR(row.purchases.credit)}
                        {row.purchases.creditCount > 0 && <span className="ml-1 text-slate-300">({row.purchases.creditCount})</span>}
                      </td>
                      <td className="px-3 py-3 text-rose-700 font-bold">₹ {INR(row.purchases.total)}</td>
                      <td className="px-3 py-3 text-blue-500">
                        ₹ {INR(row.paymentIn.cash)}
                        {row.paymentIn.count > 0 && <span className="ml-1 text-slate-400">({row.paymentIn.count})</span>}
                      </td>
                      <td className="px-3 py-3 text-purple-500">
                        ₹ {INR(row.paymentOut.cash)}
                        {row.paymentOut.count > 0 && <span className="ml-1 text-slate-400">({row.paymentOut.count})</span>}
                      </td>
                      <td className="px-3 py-3 text-orange-500">
                        ₹ {INR(row.expenses.cash)}
                        {row.expenses.count > 0 && <span className="ml-1 text-slate-400">({row.expenses.count})</span>}
                      </td>
                      <td className="px-3 py-3 text-amber-600 font-semibold">
                        ₹ {INR(row.cashWithdraw.cash)}
                        {row.cashWithdraw.count > 0 && <span className="ml-1 text-slate-400 font-normal">({row.cashWithdraw.count})</span>}
                      </td>
                      <td className={`px-3 py-3 font-bold ${row.closingBalance >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        ₹ {INR(row.closingBalance)}
                      </td>
                      <td className="px-3 py-3 text-indigo-500">
                        ₹ {INR(row.income.cash)}
                        {row.income.count > 0 && <span className="ml-1 text-slate-400">({row.income.count})</span>}
                      </td>
                      <td className="px-3 py-3 print:hidden">
                        <button
                          onClick={() => navigate(`/utilities/cashbook?date=${row.date}`)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 text-right font-bold">
                      <td className="px-3 py-3 text-left text-slate-700 sticky left-0 bg-slate-50" colSpan={2}>
                        Total <span className="font-normal text-slate-400">({rows.length} days)</span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">₹ {INR(rows[rows.length - 1]?.openingBalance ?? 0)}</td>
                      <td className="px-3 py-3 text-emerald-500">₹ {INR(sum(rows, r => r.sales.cash))}</td>
                      <td className="px-3 py-3 text-slate-400">₹ {INR(sum(rows, r => r.sales.credit))}</td>
                      <td className="px-3 py-3 text-emerald-700">₹ {INR(sum(rows, r => r.sales.total))}</td>
                      <td className="px-3 py-3 text-rose-500">₹ {INR(sum(rows, r => r.purchases.cash))}</td>
                      <td className="px-3 py-3 text-rose-400">₹ {INR(sum(rows, r => r.purchases.credit))}</td>
                      <td className="px-3 py-3 text-rose-700">₹ {INR(sum(rows, r => r.purchases.total))}</td>
                      <td className="px-3 py-3 text-blue-500">₹ {INR(sum(rows, r => r.paymentIn.cash))}</td>
                      <td className="px-3 py-3 text-purple-500">₹ {INR(sum(rows, r => r.paymentOut.cash))}</td>
                      <td className="px-3 py-3 text-orange-500">₹ {INR(sum(rows, r => r.expenses.cash))}</td>
                      <td className="px-3 py-3 text-amber-600">₹ {INR(sum(rows, r => r.cashWithdraw.cash))}</td>
                      <td className={`px-3 py-3 ${rows[0]?.closingBalance >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        ₹ {INR(rows[0]?.closingBalance ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-indigo-500">₹ {INR(sum(rows, r => r.income.cash))}</td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
