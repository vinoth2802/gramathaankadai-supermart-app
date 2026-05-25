import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, TrendingUp, TrendingDown, Wallet,
  ArrowDownCircle, ArrowUpCircle, Receipt, ShoppingCart, Printer,
} from 'lucide-react';
import { CashbookAPI } from '../../api/cashbook.js';

/* ── helpers ── */
const pad   = n => String(n).padStart(2, '0');
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDate(str) {
  const [y, m, d] = str.split('-');
  return `${pad(d)}/${pad(m)}/${y}`;
}
const INR = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

/* ── sub-components ── */
function SummaryCard({ title, icon: Icon, iconBg, iconColor, rows, total, totalLabel, totalColor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        <span className="text-sm font-bold text-slate-700">{title}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{r.label}{r.count != null ? ` (${r.count})` : ''}</span>
            <span className={`text-xs font-semibold ${r.color || 'text-slate-700'}`}>₹ {INR(r.value)}</span>
          </div>
        ))}
      </div>
      {totalLabel && (
        <div className={`flex items-center justify-between border-t border-slate-100 pt-2`}>
          <span className="text-xs font-bold text-slate-600">{totalLabel}</span>
          <span className={`text-sm font-bold ${totalColor || 'text-slate-800'}`}>₹ {INR(total)}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Day Cash Book Page
══════════════════════════════════════════ */
export default function CashBook() {
  const [date, setDate] = useState(todayStr);

  /* denomination state */
  const [counts, setCounts] = useState(() =>
    Object.fromEntries(DENOMS.map(d => [d, '']))
  );

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['cashbook', date],
    queryFn:  () => CashbookAPI.getSummary(date),
  });

  const denomTotal = useMemo(() =>
    DENOMS.reduce((sum, d) => sum + d * (Number(counts[d]) || 0), 0),
    [counts]
  );

  const diff = summary ? denomTotal - summary.closingBalance : 0;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto print:bg-white">
      <div className="px-6 py-5 space-y-5 print:px-4 print:py-2">

        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <BookOpen size={20} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Day Cash Book</h1>
              <p className="text-xs text-slate-400">Daily cash register summary</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDate(todayStr())}
              className="px-3 py-1.5 text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition">
              Today
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-400" />
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition">
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center pb-2 border-b border-slate-300">
          <h2 className="text-lg font-bold">Day Cash Book</h2>
          <p className="text-sm text-slate-500">Date: {fmtDate(date)}</p>
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

        {summary && (
          <>
            {/* Opening Balance banner */}
            <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-6 py-4">
              <div className="flex items-center gap-3">
                <Wallet size={20} className="text-slate-300" />
                <span className="text-sm font-semibold text-slate-200">Opening Balance</span>
                <span className="text-xs text-slate-400">(cash carried forward from previous days)</span>
              </div>
              <span className="text-xl font-bold text-white">₹ {INR(summary.openingBalance)}</span>
            </div>

            {/* Main summary grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

              {/* Sales */}
              <SummaryCard
                title="Total Sales"
                icon={TrendingUp}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                rows={[
                  { label: 'Cash Sales',   count: summary.sales.cashCount,   value: summary.sales.cash,   color: 'text-emerald-600' },
                  { label: 'Credit Sales', count: summary.sales.creditCount, value: summary.sales.credit, color: 'text-slate-500' },
                ]}
                totalLabel="Total Sales"
                total={summary.sales.total}
                totalColor="text-emerald-700"
              />

              {/* Purchases */}
              <SummaryCard
                title="Total Purchase"
                icon={ShoppingCart}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                rows={[
                  { label: 'Cash Purchase',   count: summary.purchases.cashCount,   value: summary.purchases.cash,   color: 'text-rose-600' },
                  { label: 'Credit Purchase', count: summary.purchases.creditCount, value: summary.purchases.credit, color: 'text-slate-500' },
                ]}
                totalLabel="Total Purchase"
                total={summary.purchases.total}
                totalColor="text-amber-700"
              />

              {/* Expenses */}
              <SummaryCard
                title="Expenses / Other Cash"
                icon={TrendingDown}
                iconBg="bg-rose-100"
                iconColor="text-rose-600"
                rows={[
                  { label: 'Cash Expenses', count: summary.expenses.count, value: summary.expenses.cash, color: 'text-rose-600' },
                  { label: 'Other Income',  count: summary.income.count,   value: summary.income.cash,   color: 'text-emerald-600' },
                ]}
                totalLabel="Net (Income − Exp)"
                total={summary.income.cash - summary.expenses.cash}
                totalColor={summary.income.cash - summary.expenses.cash >= 0 ? 'text-emerald-700' : 'text-rose-700'}
              />

              {/* Payment In */}
              <SummaryCard
                title="Payment In (Cash)"
                icon={ArrowDownCircle}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                rows={[
                  { label: 'Cash Received', count: summary.paymentIn.count, value: summary.paymentIn.cash, color: 'text-blue-600' },
                ]}
                totalLabel="Total Payment In"
                total={summary.paymentIn.cash}
                totalColor="text-blue-700"
              />

              {/* Payment Out */}
              <SummaryCard
                title="Payment Out (Cash)"
                icon={ArrowUpCircle}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                rows={[
                  { label: 'Cash Paid Out', count: summary.paymentOut.count, value: summary.paymentOut.cash, color: 'text-purple-600' },
                ]}
                totalLabel="Total Payment Out"
                total={summary.paymentOut.cash}
                totalColor="text-purple-700"
              />

              {/* Receipt summary card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Receipt size={16} className="text-indigo-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Day Summary</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total Cash In</span>
                    <span className="text-xs font-semibold text-emerald-600">
                      ₹ {INR(summary.sales.cash + summary.paymentIn.cash + summary.income.cash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total Cash Out</span>
                    <span className="text-xs font-semibold text-rose-600">
                      ₹ {INR(summary.purchases.cash + summary.paymentOut.cash + summary.expenses.cash)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Closing Balance */}
            <div className={`flex items-center justify-between rounded-xl px-6 py-5 border-2 ${
              summary.closingBalance >= 0
                ? 'bg-teal-50 border-teal-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Closing Balance</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  ₹{INR(summary.openingBalance)} (Opening)
                  + ₹{INR(summary.sales.cash + summary.paymentIn.cash + summary.income.cash)} (In)
                  − ₹{INR(summary.purchases.cash + summary.paymentOut.cash + summary.expenses.cash)} (Out)
                </p>
              </div>
              <span className={`text-3xl font-bold ${
                summary.closingBalance >= 0 ? 'text-teal-700' : 'text-rose-700'
              }`}>
                ₹ {INR(summary.closingBalance)}
              </span>
            </div>

            {/* ── Cash Denomination ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-slate-800">Cash Denomination Count</span>
                </div>
                <button
                  onClick={() => setCounts(Object.fromEntries(DENOMS.map(d => [d, ''])))}
                  className="text-xs text-slate-400 hover:text-rose-500 transition">
                  Clear
                </button>
              </div>

              <div className="divide-y divide-slate-50">
                {DENOMS.map(denom => {
                  const amt = denom * (Number(counts[denom]) || 0);
                  return (
                    <div key={denom} className="flex items-center gap-4 px-5 py-2.5 hover:bg-slate-50/60 transition">
                      <div className="w-20 shrink-0">
                        <span className="text-sm font-bold text-slate-800">₹ {denom}</span>
                      </div>
                      <span className="text-slate-300 text-sm shrink-0">×</span>
                      <input
                        type="number"
                        min="0"
                        value={counts[denom]}
                        onChange={e => setCounts(prev => ({ ...prev, [denom]: e.target.value }))}
                        placeholder="0"
                        className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center
                          font-semibold text-slate-800 focus:outline-none focus:border-teal-400
                          focus:ring-1 focus:ring-teal-100 bg-white"
                      />
                      <span className="text-slate-300 text-sm shrink-0">=</span>
                      <span className={`flex-1 text-right text-sm font-semibold ${amt > 0 ? 'text-teal-700' : 'text-slate-300'}`}>
                        {amt > 0 ? `₹ ${INR(amt)}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Denomination total + comparison */}
              <div className="border-t-2 border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Total Denomination Amount</span>
                  <span className="text-xl font-bold text-teal-700">₹ {INR(denomTotal)}</span>
                </div>

                {summary && denomTotal > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      Difference with Closing Balance
                      <span className="ml-1 text-slate-400">(Denom − Closing)</span>
                    </span>
                    <span className={`text-sm font-bold ${
                      Math.abs(diff) < 0.01
                        ? 'text-emerald-600'
                        : diff > 0 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {Math.abs(diff) < 0.01
                        ? '✓ Balanced'
                        : `${diff > 0 ? '+' : ''}₹ ${INR(diff)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
