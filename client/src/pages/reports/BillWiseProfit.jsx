import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Printer, FileSpreadsheet, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { ReportsAPI } from '../../api/reports.js';

const pad = (n) => String(n).padStart(2, '0');
const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function fmtDt(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function BillWiseProfit() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [toDate,   setToDate]   = useState(() => today.toISOString().slice(0, 10));
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);

  const fromISO = fromDate ? new Date(fromDate + 'T00:00:00').toISOString() : null;
  const toISO   = toDate   ? new Date(toDate   + 'T23:59:59').toISOString() : null;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['report-bill-wise-profit', fromDate, toDate],
    queryFn:  () => ReportsAPI.billWiseProfit(fromISO, toISO),
  });

  const filtered = rows.filter(r =>
    !search ||
    r.invoice.toLowerCase().includes(search.toLowerCase()) ||
    r.party.toLowerCase().includes(search.toLowerCase())
  );

  const totalSale   = filtered.reduce((s, r) => s + r.saleAmount, 0);
  const totalCost   = filtered.reduce((s, r) => s + r.cost, 0);
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);
  const avgMargin   = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Bill Wise Profit</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <span className="text-sm text-slate-500 font-medium shrink-0">Date Range:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Sale Amount</p>
          <p className="text-xl font-bold text-slate-800">{fmtAmt(totalSale)}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.length} bill{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-amber-700">{fmtAmt(totalCost)}</p>
        </div>
        <div className={`border rounded-xl px-5 py-4 shadow-sm ${totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {totalProfit >= 0
              ? <TrendingUp size={14} className="text-emerald-500" />
              : <TrendingDown size={14} className="text-rose-500" />}
            <p className="text-xs text-slate-500">Net Profit / Loss</p>
          </div>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalProfit < 0 ? '-' : ''}{fmtAmt(Math.abs(totalProfit))}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Avg Profit Margin</p>
          <p className={`text-xl font-bold ${avgMargin >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Bill Wise Profit & Loss</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice / party…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48 focus:outline-none focus:border-blue-400" />
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
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8 bg-slate-50 border-b border-slate-100" />
                {['Date', 'Invoice No', 'Party', 'Items', 'Sale Amount', 'Cost', 'Profit / Loss', 'Margin %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No bills found for the selected period.</td></tr>
              ) : filtered.map(row => {
                const isExp = expanded === row.id;
                const profitColor = row.profit >= 0 ? 'text-emerald-700' : 'text-rose-600';
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setExpanded(isExp ? null : row.id)}>
                      <td className="px-4 py-3 text-slate-400">
                        {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDt(row.date)}</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-slate-700">{row.invoice}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">{row.party}</td>
                      <td className="px-4 py-3 text-xs text-center text-slate-500">{row.itemCount}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 text-right">{fmtAmt(row.saleAmount)}</td>
                      <td className="px-4 py-3 text-xs text-amber-700 text-right">{fmtAmt(row.cost)}</td>
                      <td className={`px-4 py-3 text-xs font-bold text-right ${profitColor}`}>
                        {row.profit < 0 ? '-' : ''}{fmtAmt(Math.abs(row.profit))}
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold text-right ${profitColor}`}>
                        {row.profitPct.toFixed(1)}%
                      </td>
                    </tr>
                    {isExp && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={9} className="px-8 py-3">
                          <div className="text-xs text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-600 mb-2">Bill Summary</p>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <span className="text-slate-400">Sale Amount</span>
                                <p className="font-semibold text-slate-700">{fmtAmt(row.saleAmount)}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Total Cost</span>
                                <p className="font-semibold text-amber-700">{fmtAmt(row.cost)}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Net Profit</span>
                                <p className={`font-semibold ${profitColor}`}>{row.profit < 0 ? '-' : ''}{fmtAmt(Math.abs(row.profit))}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Margin</span>
                                <p className={`font-semibold ${profitColor}`}>{row.profitPct.toFixed(2)}%</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">Total</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800 text-right">{fmtAmt(totalSale)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-amber-700 text-right">{fmtAmt(totalCost)}</td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {totalProfit < 0 ? '-' : ''}{fmtAmt(Math.abs(totalProfit))}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${avgMargin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {avgMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
