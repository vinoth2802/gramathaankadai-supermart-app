import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Printer, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ReportsAPI } from '@features/reports/resources/reports-service';

const pad = (n) => String(n).padStart(2, '0');
const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function fmtDt(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const mi = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${mi} ${ampm}`;
}

function toDateInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDisplayDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export default function DayBook() {
  const today = new Date();
  const [date,   setDate]   = useState(toDateInput(today));
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-day-book', date],
    queryFn:  () => ReportsAPI.dayBook(date),
  });

  const allTxns = data?.transactions ?? [];
  const totalIn  = data?.totalIn  ?? 0;
  const totalOut = data?.totalOut ?? 0;
  const net      = data?.net      ?? 0;

  const txns = allTxns.filter(t =>
    !search ||
    t.party.toLowerCase().includes(search.toLowerCase()) ||
    t.invoice.toLowerCase().includes(search.toLowerCase()) ||
    t.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Day Book</h1>

      {/* Date picker */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <span className="text-sm text-slate-500 font-medium shrink-0">Date:</span>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />
        <span className="text-sm text-slate-600 font-medium">{fmtDisplayDate(date)}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle size={16} className="text-emerald-500" />
            <p className="text-xs text-slate-500">Total In (Sales + Cash In)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{fmtAmt(totalIn)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle size={16} className="text-rose-500" />
            <p className="text-xs text-slate-500">Total Out (Purchases + Cash Out)</p>
          </div>
          <p className="text-2xl font-bold text-rose-700">{fmtAmt(totalOut)}</p>
        </div>
        <div className={`border rounded-xl px-5 py-4 shadow-sm ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className="text-xs text-slate-500 mb-1">Net ({net >= 0 ? 'Surplus' : 'Deficit'})</p>
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmtAmt(Math.abs(net))}</p>
          <p className="text-xs text-slate-400 mt-1">{txns.length} transaction{txns.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">All Transactions for {fmtDisplayDate(date)}</h2>
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
                {['Time', 'Type', 'Party / Description', 'Invoice', 'Payment Mode', 'In', 'Out'].map(h => (
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
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No transactions found for this date.</td></tr>
              ) : txns.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDt(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.type === 'Sale' ? 'bg-emerald-50 text-emerald-700' :
                      t.type === 'Purchase' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
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
            {txns.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">Total</td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-700 text-right">{fmtAmt(totalIn)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-rose-600 text-right">{fmtAmt(totalOut)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
