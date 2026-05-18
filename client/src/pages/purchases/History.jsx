import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MoreVertical, Eye, Pencil, Trash2, Copy, FileText, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PurchasesAPI } from '../../api/purchases.js';
import { fmt } from '../../utils/formatters.js';

const RS = '₹';

function getInvoiceNo(purchase) {
  return purchase.invoice ?? purchase.invoiceNo ?? purchase.billNo ?? '—';
}

function getPartyName(purchase) {
  return purchase.partyName ?? purchase.party_name ?? 'Unknown Supplier';
}

function getTotal(purchase) {
  return Number(purchase.grandTotal ?? purchase.grand_total ?? purchase.total ?? 0);
}

function getPaymentMode(purchase) {
  return purchase.paymentMode ?? purchase.payment_mode ?? 'Cash';
}

function getPaidAmount(purchase) {
  return Number(purchase.paidAmount ?? purchase.paid_amount ?? purchase.totalPaid ?? purchase.total_paid ?? 0);
}

function getPaymentStatus(purchase) {
  const total = getTotal(purchase);
  const paid = getPaidAmount(purchase);
  const mode = getPaymentMode(purchase).toLowerCase();

  if (paid > 0 && paid < total) return 'Partial';
  if (paid >= total || !mode.includes('credit')) return 'Paid';
  return 'Unpaid';
}

function statusClass(status) {
  if (status === 'Paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Partial') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function PurchaseActionMenu({ purchase }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const invoice = getInvoiceNo(purchase);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  const actions = [
    { label: 'View/Edit', icon: Pencil, tone: 'text-slate-700' },
    { label: 'Delete', icon: Trash2, tone: 'text-rose-600' },
    { label: 'Duplicate', icon: Copy, tone: 'text-slate-700' },
    { label: 'Open PDF', icon: FileText, tone: 'text-blue-600' },
    { label: 'Payment History', icon: History, tone: 'text-slate-700' },
  ];

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[180px] z-50 overflow-hidden" style={{ top: pos.top, right: pos.right }}>
            {actions.map(({ label, icon: Icon, tone }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  toast.info(`${label}: ${invoice}`);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${tone}`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PurchaseHistory() {
  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const [search, setSearch] = useState('');

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    return getInvoiceNo(p).toLowerCase().includes(q) || getPartyName(p).toLowerCase().includes(q);
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase History</h1>
          <p className="text-slate-500 text-sm mt-0.5">{purchases.length} purchase invoices total</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search invoice or party..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              {['S.No', 'Invoice No', 'Date', 'Party Name', 'Total Amount', 'Paid/Unpaid/Partial', 'Status', 'Action'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">No purchase invoices found</td></tr>
            ) : filtered.map((purchase, idx) => {
              const paymentStatus = getPaymentStatus(purchase);
              return (
                <tr key={purchase.id ?? getInvoiceNo(purchase)} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-indigo-600">{getInvoiceNo(purchase)}</td>
                  <td className="px-4 py-3 text-slate-600">{purchase.date ? fmt.datetime(purchase.date) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{getPartyName(purchase)}</td>
                  <td className="px-4 py-3 font-bold text-purple-600">{RS}{getTotal(purchase).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusClass(paymentStatus)}`}>{paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{getPaymentMode(purchase)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PurchaseActionMenu purchase={purchase} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
