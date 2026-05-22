import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Package, Users, ShoppingBag, Receipt, CreditCard, Banknote,
  AlertTriangle, Trash2, RefreshCw, ShoppingCart,
} from 'lucide-react';

const API = 'http://localhost:3001';

const RESET_TYPES = [
  {
    key: 'items',
    label: 'Items',
    subtitle: 'All products & inventory',
    icon: Package,
    color: 'blue',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    border: 'border-blue-100',
    countKey: 'items',
    warning: 'This will permanently delete all products, their stock quantities, and unlink them from any existing sales.',
  },
  {
    key: 'parties',
    label: 'Parties',
    subtitle: 'Customers & suppliers',
    icon: Users,
    color: 'violet',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    border: 'border-violet-100',
    countKey: 'parties',
    warning: 'This will permanently delete all parties (customers & suppliers). Their references in sales, purchases and payments will be cleared.',
  },
  {
    key: 'purchases',
    label: 'Purchases',
    subtitle: 'All purchase records',
    icon: ShoppingBag,
    color: 'orange',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    border: 'border-orange-100',
    countKey: 'purchases',
    warning: 'This will permanently delete all purchase bills and their line items.',
  },
  {
    key: 'sales',
    label: 'Sales & POS Sales',
    subtitle: 'All sales invoices',
    icon: Receipt,
    color: 'green',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    border: 'border-green-100',
    countKey: 'sales',
    warning: 'This will permanently delete all sales invoices (including POS sales) and their line items.',
  },
  {
    key: 'payments-in',
    label: 'Payment In',
    subtitle: 'Received payments',
    icon: CreditCard,
    color: 'teal',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-500',
    border: 'border-teal-100',
    countKey: 'paymentsIn',
    warning: 'This will permanently delete all payment-in records from customers.',
  },
  {
    key: 'payments-out',
    label: 'Payment Out',
    subtitle: 'Sent payments',
    icon: Banknote,
    color: 'rose',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    border: 'border-rose-100',
    countKey: 'paymentsOut',
    warning: 'This will permanently delete all payment-out records to suppliers.',
  },
];

function ConfirmModal({ item, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">Reset {item.label}?</h2>
            <p className="text-xs text-slate-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">{item.warning}</p>
        </div>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Type <span className="text-red-600 font-mono">RESET</span> to confirm
        </label>
        <input
          ref={inputRef}
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="RESET"
          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-mono mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => typed === 'RESET' && onConfirm()}
            disabled={typed !== 'RESET'}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-sm transition"
          >
            Delete All {item.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  const [counts, setCounts]       = useState({});
  const [loading, setLoading]     = useState(true);
  const [confirm, setConfirm]     = useState(null);
  const [resetting, setResetting] = useState(null);

  const fetchCounts = async () => {
    try {
      const res  = await fetch(`${API}/api/reset/counts`);
      const data = await res.json();
      setCounts(data);
    } catch {
      toast.error('Failed to load counts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCounts(); }, []);

  const handleReset = async (type) => {
    setConfirm(null);
    setResetting(type);
    try {
      const res  = await fetch(`${API}/api/reset/${type}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} record${data.deleted !== 1 ? 's' : ''} successfully`);
      fetchCounts();
    } catch (e) {
      toast.error(e.message || 'Reset failed');
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reset Data</h1>
        <p className="text-slate-500 text-sm mt-0.5">Permanently delete specific data from your store. These actions cannot be undone.</p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Caution:</span> Resetting data is permanent and irreversible. Make sure you have a database backup before proceeding.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RESET_TYPES.map((item) => {
          const Icon    = item.icon;
          const count   = counts[item.countKey] ?? 0;
          const isBusy  = resetting === item.key;

          return (
            <div
              key={item.key}
              className={`bg-white border ${item.border} rounded-2xl p-5 flex flex-col gap-4 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 ${item.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={item.iconColor} size={20} />
                </div>
                {loading ? (
                  <div className="w-12 h-6 bg-slate-100 rounded-full animate-pulse" />
                ) : (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                    ${count > 0 ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-600'}`}>
                    {count} record{count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
              </div>

              <button
                onClick={() => count > 0 && setConfirm(item)}
                disabled={count === 0 || isBusy || loading}
                className="mt-auto w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed py-2 rounded-xl text-sm font-semibold transition"
              >
                {isBusy ? (
                  <><RefreshCw size={13} className="animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 size={13} /> Reset {item.label}</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {confirm && (
        <ConfirmModal
          item={confirm}
          onConfirm={() => handleReset(confirm.key)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
