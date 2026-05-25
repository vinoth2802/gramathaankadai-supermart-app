import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { History, Printer, Eye } from 'lucide-react';
import { CashbookAPI } from '../../api/cashbook.js';

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

export default function CashBookHistory() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstOfMonthStr);
  const [to,   setTo]   = useState(todayStr);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['cashbook-history', from, to],
    queryFn:  () => CashbookAPI.getHistory(from, to),
  });

  const totalCashIn  = rows.reduce((s, r) => s + r.cashIn,  0);
  const totalCashOut = rows.reduce((s, r) => s + r.cashOut, 0);

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
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">Opening</th>
                    <th className="px-4 py-3 text-right font-semibold text-emerald-600 uppercase tracking-wide">Cash Sales</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">Credit Sales</th>
                    <th className="px-4 py-3 text-right font-semibold text-rose-500 uppercase tracking-wide">Cash Purchase</th>
                    <th className="px-4 py-3 text-right font-semibold text-blue-500 uppercase tracking-wide">Pay In</th>
                    <th className="px-4 py-3 text-right font-semibold text-purple-500 uppercase tracking-wide">Pay Out</th>
                    <th className="px-4 py-3 text-right font-semibold text-orange-500 uppercase tracking-wide">Expenses</th>
                    <th className="px-4 py-3 text-right font-semibold text-teal-600 uppercase tracking-wide">Closing</th>
                    <th className="px-4 py-3 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        No transactions found for this period.
                      </td>
                    </tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-semibold text-slate-700">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹ {INR(row.openingBalance)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                        ₹ {INR(row.sales.cash)}
                        {row.sales.cashCount > 0 && <span className="ml-1 text-slate-400 font-normal">({row.sales.cashCount})</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        ₹ {INR(row.sales.credit)}
                        {row.sales.creditCount > 0 && <span className="ml-1 text-slate-400">({row.sales.creditCount})</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-500 font-semibold">
                        ₹ {INR(row.purchases.cash)}
                        {row.purchases.cashCount > 0 && <span className="ml-1 text-slate-400 font-normal">({row.purchases.cashCount})</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-500">₹ {INR(row.paymentIn.cash)}</td>
                      <td className="px-4 py-3 text-right text-purple-500">₹ {INR(row.paymentOut.cash)}</td>
                      <td className="px-4 py-3 text-right text-orange-500">₹ {INR(row.expenses.cash)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${row.closingBalance >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        ₹ {INR(row.closingBalance)}
                      </td>
                      <td className="px-4 py-3 print:hidden">
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
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-4 py-3 font-bold text-slate-700">Total ({rows.length} days)</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        ₹ {INR(rows.reduce((s, r) => s + r.sales.cash, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-500">
                        ₹ {INR(rows.reduce((s, r) => s + r.sales.credit, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-500">
                        ₹ {INR(rows.reduce((s, r) => s + r.purchases.cash, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-500">
                        ₹ {INR(rows.reduce((s, r) => s + r.paymentIn.cash, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-500">
                        ₹ {INR(rows.reduce((s, r) => s + r.paymentOut.cash, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-500">
                        ₹ {INR(rows.reduce((s, r) => s + r.expenses.cash, 0))}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${rows[0]?.closingBalance >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        ₹ {INR(rows[0]?.closingBalance ?? 0)}
                      </td>
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
