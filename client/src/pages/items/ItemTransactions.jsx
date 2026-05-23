import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy, Eye, FileText, History, MoreVertical, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';

const inp2 = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 text-sm text-slate-800 bg-white';

const normalizeKey = (v) => String(v ?? '').trim().toLowerCase();

function isItemLine(line, item) {
  const lineItemId = line.itemId ?? line.productId;
  if (lineItemId !== undefined && String(lineItemId) === String(item.id)) return true;
  if (normalizeKey(line.name) === normalizeKey(item.shortName)) return true;
  return item.itemCode && normalizeKey(line.itemCode) === normalizeKey(item.itemCode);
}

function TransactionMenu({ txn, onView, onEdit, onDelete, onCancel }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const isCancelled = txn.status === 'cancelled';

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  const actions = [
    { label: 'View',              icon: Eye,       tone: 'text-slate-700',  onClick: onView },
    { label: 'Edit',              icon: Pencil,    tone: 'text-slate-700',  onClick: onEdit,   disabled: isCancelled },
    { label: 'Cancel',            icon: Ban,       tone: 'text-amber-600',  onClick: onCancel, disabled: isCancelled },
    { label: 'Delete',            icon: Trash2,    tone: 'text-rose-600',   onClick: onDelete },
    { label: 'Duplicate',         icon: Copy,      tone: 'text-slate-700',  onClick: () => toast.info(`Duplicate ${txn.type} ${txn.invoiceNo || ''}`) },
    { label: 'Open PDF',          icon: FileText,  tone: 'text-blue-600',   onClick: () => toast.info(`Open PDF for ${txn.invoiceNo || txn.type}`) },
    { label: 'Convert to Return', icon: RotateCcw, tone: 'text-purple-600', onClick: () => toast.info(`Convert ${txn.type} ${txn.invoiceNo || ''} to return`) },
    { label: 'Payment History',   icon: History,   tone: 'text-slate-700',  onClick: () => toast.info(`Payment history for ${txn.invoiceNo || txn.type}`) },
  ];

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[190px] z-50 overflow-hidden" style={{ top: pos.top, right: pos.right }}>
            {actions.map(({ label, icon: Icon, tone, onClick, disabled }) => (
              <button key={label} disabled={disabled}
                onClick={() => { setOpen(false); onClick(); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${tone} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TransactionDetailModal({ txn, mode: initialMode, onClose, onSaved }) {
  const [mode, setMode] = useState(initialMode);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    (txn.type === 'Sale' ? SalesAPI.getById(txn.id) : PurchasesAPI.getById(txn.id))
      .then(r => { setRecord(r); setForm(r); setLoading(false); })
      .catch(() => { toast.error('Failed to load transaction'); onClose(); });
  }, [txn.id, txn.type]);

  const saveMut = useMutation({
    mutationFn: (data) => txn.type === 'Sale' ? SalesAPI.update(txn.id, data) : PurchasesAPI.update(txn.id, data),
    onSuccess: () => { toast.success('Transaction updated'); onSaved(); },
    onError: () => toast.error('Failed to update transaction'),
  });

  const handleSave = () => {
    if (!form) return;
    if (txn.type === 'Sale') {
      const items = (form.items || []).map(i => ({ name: i.name, qty: Number(i.qty), rate: Number(i.rate), amount: Number(i.qty) * Number(i.rate) }));
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      saveMut.mutate({ customerName: form.customerName, paymentMode: form.paymentMode, date: form.date, subtotal, grandTotal: subtotal, items });
    } else {
      const items = (form.items || []).map(i => ({
        name: i.name, qty: Number(i.qty), unit: i.unit, price: Number(i.price),
        mrp: Number(i.mrp) || 0, gstRate: Number(i.gstRate) || 0,
        gstAmount: Number(i.gstAmount) || 0,
        total: Number(i.qty) * Number(i.price),
        batchNo: i.batchNo || null, expiryDate: i.expiryDate || null, mfgDate: i.mfgDate || null,
      }));
      saveMut.mutate({ partyName: form.partyName, paymentMode: form.paymentMode, date: form.date, grandTotal: items.reduce((s, i) => s + i.total, 0), items });
    }
  };

  const setItem = (idx, field, value) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const isSale = txn.type === 'Sale';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{isSale ? 'Sale' : 'Purchase'} — {txn.invoiceNo || '—'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{mode === 'view' ? 'Read-only view' : 'Editing transaction'}</p>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <button onClick={() => setMode('edit')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition">
                <Pencil size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"><X size={20} /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 py-12">Loading...</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{isSale ? 'Customer' : 'Supplier'}</label>
                {mode === 'view'
                  ? <p className="text-sm font-medium text-slate-800">{isSale ? record?.customerName : record?.partyName}</p>
                  : <input value={isSale ? form.customerName || '' : form.partyName || ''} onChange={e => setForm(f => ({ ...f, [isSale ? 'customerName' : 'partyName']: e.target.value }))} className={inp2} />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                {mode === 'view'
                  ? <p className="text-sm font-medium text-slate-800">{record?.date ? new Date(record.date).toLocaleDateString('en-IN') : '—'}</p>
                  : <input type="date" value={form.date ? new Date(form.date).toISOString().split('T')[0] : ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inp2} />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Payment Mode</label>
                {mode === 'view'
                  ? <p className="text-sm font-medium text-slate-800">{record?.paymentMode || '—'}</p>
                  : <input value={form.paymentMode || ''} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inp2} />}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">Item Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">{isSale ? 'Rate' : 'Price'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(mode === 'view' ? record?.items : form?.items || []).map((it, idx) => {
                      const qty = Number(it.qty ?? 0);
                      const rate = Number(isSale ? (it.rate ?? 0) : (it.price ?? 0));
                      const amount = Number(it.amount ?? it.total ?? qty * rate);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 border-r border-slate-100">
                            {mode === 'view' ? <span className="font-medium text-slate-800">{it.name}</span>
                              : <input value={it.name} onChange={e => setItem(idx, 'name', e.target.value)} className={inp2} />}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100">
                            {mode === 'view' ? <span>{qty}</span>
                              : <input type="number" value={it.qty} onChange={e => setItem(idx, 'qty', e.target.value)} className={inp2} />}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100">
                            {mode === 'view' ? <span>₹{rate.toFixed(2)}</span>
                              : <input type="number" value={isSale ? it.rate : it.price} onChange={e => setItem(idx, isSale ? 'rate' : 'price', e.target.value)} className={inp2} />}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-700">₹{amount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-right">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Grand Total</p>
                <p className="text-xl font-bold text-slate-800">
                  ₹{Number(mode === 'view' ? record?.grandTotal : (form?.items || []).reduce((s, i) => s + Number(i.qty) * Number(isSale ? i.rate : i.price), 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === 'edit' && !loading && (
          <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
            <button onClick={() => setMode('view')} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">Cancel</button>
            <button onClick={handleSave} disabled={saveMut.isPending} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition">
              {saveMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ItemTransactions({ item, sales = [], purchases = [] }) {
  const qc = useQueryClient();
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [txnModal, setTxnModal] = useState({ open: false, mode: 'view', txn: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, txn: null });
  const [cancelConfirm, setCancelConfirm] = useState({ open: false, txn: null });

  const delMut = useMutation({
    mutationFn: (txn) => txn.type === 'Sale' ? SalesAPI.delete(txn.id) : PurchasesAPI.delete(txn.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      setDeleteConfirm({ open: false, txn: null });
      toast.success('Transaction deleted');
    },
    onError: () => toast.error('Failed to delete transaction'),
  });

  const cancelMut = useMutation({
    mutationFn: (txn) => txn.type === 'Sale' ? SalesAPI.update(txn.id, { status: 'cancelled' }) : PurchasesAPI.update(txn.id, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['purchases'] }); setCancelConfirm({ open: false, txn: null }); toast.success('Transaction cancelled'); },
    onError: () => toast.error('Failed to cancel transaction'),
  });

  const itemTransactions = useMemo(() => {
    const transactions = [];
    sales.forEach(s => {
      if (s.items) {
        const found = s.items.find(si => isItemLine(si, item));
        if (found) {
          const qty = Number(found.quantity ?? found.qty ?? 0);
          const price = Number(found.salePrice ?? found.rate ?? found.price ?? 0);
          transactions.push({ id: s.id, type: 'Sale', status: s.status ?? 'active', date: s.date, invoiceNo: s.invoiceNo ?? s.invoice, quantity: qty, price, total: Number(found.total ?? found.amount ?? qty * price), party: s.partyName ?? s.customerName ?? 'Walk-in Customer' });
        }
      }
    });
    purchases.forEach(p => {
      if (p.items) {
        const found = p.items.find(pi => isItemLine(pi, item));
        if (found) {
          const qty = Number(found.quantity ?? found.qty ?? 0);
          const price = Number(found.purchasePrice ?? found.price ?? 0);
          transactions.push({ id: p.id, type: 'Purchase', status: p.status ?? 'active', date: p.date, invoiceNo: p.billNo ?? p.invoice, quantity: qty, price, total: Number(found.total ?? qty * price), party: p.partyName ?? 'Supplier' });
        }
      }
    });
    let sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortColumn) {
      sorted = [...sorted].sort((a, b) => {
        let aVal = a[sortColumn]; let bVal = b[sortColumn];
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal?.toString().toLowerCase() || ''; }
        return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
    }
    return sorted;
  }, [item, sales, purchases, sortColumn, sortDirection]);

  const COLUMNS = [
    { label: 'S.No',      key: null,        cls: 'w-10' },
    { label: 'Type',      key: 'type',      cls: 'w-24' },
    { label: 'Ref.No',    key: 'invoiceNo', cls: 'w-20' },
    { label: 'Date',      key: 'date',      cls: 'w-28' },
    { label: 'Party',     key: 'party',     cls: '' },
    { label: 'Qty',       key: 'quantity',  cls: 'w-16 text-center' },
    { label: 'Unit Rate', key: 'price',     cls: 'w-24 text-right' },
    { label: 'Action',    key: null,        cls: 'w-12 text-center' },
  ];

  const handleHeaderClick = (key) => {
    if (sortColumn === key) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(key); setSortDirection('asc'); }
  };

  const saleCount     = itemTransactions.filter(t => t.type === 'Sale').length;
  const purchaseCount = itemTransactions.filter(t => t.type === 'Purchase').length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="grid grid-cols-7 gap-3 items-center">
          <div className="col-span-2">
            <h3 className="text-lg font-bold text-slate-800">{item.shortName}</h3>
            <p className="text-xs text-slate-500 mt-1">Item Code: {item.itemCode || '—'}</p>
          </div>
          <div className="col-span-1 bg-amber-50 border border-amber-200 rounded-lg h-20 flex flex-col items-center justify-center px-3">
            <p className="text-xs text-slate-500 font-semibold">Purchase Price</p>
            <p className="text-lg font-bold text-amber-600">₹{Number(item.purchasePrice || 0).toFixed(2)}</p>
          </div>
          <div className="col-span-1 bg-emerald-50 border border-emerald-200 rounded-lg h-20 flex flex-col items-center justify-center px-3">
            <p className="text-xs text-slate-500 font-semibold">Sales Price</p>
            <p className="text-lg font-bold text-emerald-600">₹{Number(item.salesPrice || 0).toFixed(2)}</p>
          </div>
          <div className="col-span-1 bg-purple-50 border border-purple-200 rounded-lg h-20 flex flex-col items-center justify-center px-3">
            <p className="text-xs text-slate-500 font-semibold">MRP</p>
            <p className="text-lg font-bold text-purple-600">₹{Number(item.mrp || 0).toFixed(2)}</p>
          </div>
          <div className="col-span-1 bg-blue-50 border border-blue-200 rounded-lg h-20 flex flex-col items-center justify-center px-3">
            <p className="text-xs text-slate-500 font-semibold">Qty</p>
            <p className="text-lg font-bold text-blue-600">{item.stock}</p>
          </div>
          <div className="col-span-1 bg-slate-50 border border-slate-200 rounded-lg h-20 flex flex-col items-center justify-center px-3">
            <p className="text-xs text-slate-500 font-semibold">Stock Value</p>
            <p className="text-lg font-bold text-slate-800">₹{(Number(item.stock || 0) * Number(item.purchasePrice || 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 text-xs font-semibold">
        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{itemTransactions.length} Total</span>
        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{saleCount} Sales</span>
        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{purchaseCount} Purchases</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4">
          <h4 className="font-semibold text-slate-700 text-sm mb-4">Transactions ({itemTransactions.length})</h4>
        </div>
        {itemTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 flex-1 flex items-center justify-center">
            <p>No transactions found for this item</p>
          </div>
        ) : (
          <div className="px-6 pb-4 flex-1 flex flex-col min-h-0">
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white sticky top-0 z-10">
                    <tr>
                      {COLUMNS.map(({ label, key, cls }) => (
                        <th key={label} onClick={() => key && handleHeaderClick(key)}
                          className={`px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-700 ${cls} ${key ? 'cursor-pointer hover:bg-slate-700' : ''}`}>
                          <div className="flex items-center gap-1">
                            {label}
                            {key && sortColumn === key && <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemTransactions.map((txn, idx) => {
                      const isCancelled = txn.status === 'cancelled';
                      return (
                        <tr key={`${txn.type}-${txn.invoiceNo}-${idx}`} className={`transition ${isCancelled ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2 text-slate-400 border-r border-slate-100">{idx + 1}</td>
                          <td className="px-3 py-2 border-r border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${txn.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{txn.type}</span>
                              {isCancelled && <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-500">Cancelled</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700 border-r border-slate-100"><span className={isCancelled ? 'line-through' : ''}>{txn.invoiceNo || '—'}</span></td>
                          <td className="px-3 py-2 text-slate-600 border-r border-slate-100">{txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-100">{txn.party || '—'}</td>
                          <td className="px-3 py-2 font-bold text-center text-slate-700 border-r border-slate-100">{txn.quantity}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700 border-r border-slate-100">₹{Number(txn.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <TransactionMenu txn={txn}
                              onView={() => setTxnModal({ open: true, mode: 'view', txn })}
                              onEdit={() => setTxnModal({ open: true, mode: 'edit', txn })}
                              onDelete={() => setDeleteConfirm({ open: true, txn })}
                              onCancel={() => setCancelConfirm({ open: true, txn })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {txnModal.open && (
        <TransactionDetailModal txn={txnModal.txn} mode={txnModal.mode}
          onClose={() => setTxnModal({ open: false, mode: 'view', txn: null })}
          onSaved={() => { setTxnModal({ open: false, mode: 'view', txn: null }); qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['purchases'] }); }}
        />
      )}

      <ConfirmDialog open={deleteConfirm.open} title="Delete Transaction"
        message={`Permanently delete ${deleteConfirm.txn?.type} ${deleteConfirm.txn?.invoiceNo || ''}? This cannot be undone.`}
        confirmLabel="Delete" danger
        onConfirm={() => delMut.mutate(deleteConfirm.txn)}
        onClose={() => setDeleteConfirm({ open: false, txn: null })}
      />
      <ConfirmDialog open={cancelConfirm.open} title="Cancel Transaction"
        message={`Mark ${cancelConfirm.txn?.type} ${cancelConfirm.txn?.invoiceNo || ''} as cancelled?`}
        confirmLabel="Yes, Cancel" danger={false}
        onConfirm={() => cancelMut.mutate(cancelConfirm.txn)}
        onClose={() => setCancelConfirm({ open: false, txn: null })}
      />
    </div>
  );
}
