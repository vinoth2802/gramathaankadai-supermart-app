import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, MoreVertical, Pencil, Trash2, X, ChevronRight, Ban, Copy, FileText, RotateCcw, History, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { AccountsAPI } from '../../api/accounts.js';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { fmt } from '../../utils/formatters.js';
import AddItemModal from './AddItemModal.jsx';


const normalizeKey = (value) => String(value ?? '').trim().toLowerCase();

function isItemLine(line, item) {
  const lineItemId = line.itemId ?? line.productId;
  if (lineItemId !== undefined && String(lineItemId) === String(item.id)) return true;
  if (normalizeKey(line.name) === normalizeKey(item.shortName)) return true;
  return item.itemCode && normalizeKey(line.itemCode) === normalizeKey(item.itemCode);
}

function ItemTransactions({ item, sales = [], purchases = [] }) {
  const qc = useQueryClient();
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [txnModal, setTxnModal] = useState({ open: false, mode: 'view', txn: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, txn: null });
  const [cancelConfirm, setCancelConfirm] = useState({ open: false, txn: null });

  const delMut = useMutation({
    mutationFn: (txn) => txn.type === 'Sale' ? SalesAPI.delete(txn.id) : PurchasesAPI.delete(txn.id),
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['purchases']); setDeleteConfirm({ open: false, txn: null }); toast.success('Transaction deleted'); },
    onError: () => toast.error('Failed to delete transaction'),
  });

  const cancelMut = useMutation({
    mutationFn: (txn) => txn.type === 'Sale' ? SalesAPI.update(txn.id, { status: 'cancelled' }) : PurchasesAPI.update(txn.id, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['purchases']); setCancelConfirm({ open: false, txn: null }); toast.success('Transaction cancelled'); },
    onError: () => toast.error('Failed to cancel transaction'),
  });

  const itemTransactions = useMemo(() => {
    const transactions = [];

    sales.forEach(s => {
      if (s.items) {
        const itemInSale = s.items.find(si => isItemLine(si, item));
        if (itemInSale) {
          const quantity = Number(itemInSale.quantity ?? itemInSale.qty ?? 0);
          const price = Number(itemInSale.salePrice ?? itemInSale.rate ?? itemInSale.price ?? 0);

          transactions.push({
            id: s.id,
            type: 'Sale',
            status: s.status ?? 'active',
            date: s.date,
            invoiceNo: s.invoiceNo ?? s.invoice,
            quantity,
            price,
            total: Number(itemInSale.total ?? itemInSale.amount ?? quantity * price),
            party: s.partyName ?? s.customerName ?? s.customer_name ?? 'Walk-in Customer',
          });
        }
      }
    });

    purchases.forEach(p => {
      if (p.items) {
        const itemInPurchase = p.items.find(pi => isItemLine(pi, item));
        if (itemInPurchase) {
          const quantity = Number(itemInPurchase.quantity ?? itemInPurchase.qty ?? 0);
          const price = Number(itemInPurchase.purchasePrice ?? itemInPurchase.price ?? 0);

          transactions.push({
            id: p.id,
            type: 'Purchase',
            status: p.status ?? 'active',
            date: p.date,
            invoiceNo: p.billNo ?? p.invoice,
            quantity,
            price,
            total: Number(itemInPurchase.total ?? quantity * price),
            party: p.partyName ?? 'Supplier',
          });
        }
      }
    });

    let sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortColumn) {
      sorted = [...sorted].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal?.toString().toLowerCase() || '';
        }

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return sorted;
  }, [item, sales, purchases, sortColumn, sortDirection]);

  const COLUMNS = [
    { label: 'S.No',            key: null },
    { label: 'Type',            key: 'type' },
    { label: 'Invoice/GRN No',  key: 'invoiceNo' },
    { label: 'Date',            key: 'date' },
    { label: 'Party',           key: 'party' },
    { label: 'Qty',             key: 'quantity' },
    { label: 'Unit Rate',       key: 'price' },
    { label: 'Action',          key: null },
  ];

  const handleHeaderClick = (key) => {
    if (sortColumn === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const saleCount = itemTransactions.filter(t => t.type === 'Sale').length;
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
                      {COLUMNS.map(({ label, key }) => (
                        <th
                          key={label}
                          onClick={() => key && handleHeaderClick(key)}
                          className={`px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-700 ${key ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && sortColumn === key && (
                              <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
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
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${txn.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {txn.type}
                              </span>
                              {isCancelled && <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-500">Cancelled</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700 border-r border-slate-100">
                            <span className={isCancelled ? 'line-through' : ''}>{txn.invoiceNo || '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 border-r border-slate-100">{txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-100">{txn.party || '—'}</td>
                          <td className="px-3 py-2 font-bold text-center text-slate-700 border-r border-slate-100">{txn.quantity}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700 border-r border-slate-100">₹{Number(txn.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <TransactionMenu
                              txn={txn}
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
        <TransactionDetailModal
          txn={txnModal.txn}
          mode={txnModal.mode}
          onClose={() => setTxnModal({ open: false, mode: 'view', txn: null })}
          onSaved={() => { setTxnModal({ open: false, mode: 'view', txn: null }); qc.invalidateQueries(['sales']); qc.invalidateQueries(['purchases']); }}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Transaction"
        message={`Permanently delete ${deleteConfirm.txn?.type} ${deleteConfirm.txn?.invoiceNo || ''}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => delMut.mutate(deleteConfirm.txn)}
        onClose={() => setDeleteConfirm({ open: false, txn: null })}
      />

      <ConfirmDialog
        open={cancelConfirm.open}
        title="Cancel Transaction"
        message={`Mark ${cancelConfirm.txn?.type} ${cancelConfirm.txn?.invoiceNo || ''} as cancelled?`}
        confirmLabel="Yes, Cancel"
        danger={false}
        onConfirm={() => cancelMut.mutate(cancelConfirm.txn)}
        onClose={() => setCancelConfirm({ open: false, txn: null })}
      />
    </div>
  );
}

function StatusBadge({ item }) {
  const stock = Number(item.stock || 0);
  const reorder = Number(item.reorderLevel || 10);
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const nearExpiry = item.expiryDate && new Date(item.expiryDate) <= soon;

  if (stock <= reorder)
    return <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-semibold">Low Stock</span>;
  if (nearExpiry)
    return <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Near Expiry</span>;
  return <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">Normal</span>;
}

function RowMenu({ item, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[150px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            <button onClick={() => { setOpen(false); onEdit(item); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Pencil size={13} className="text-slate-400" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onDelete(item.id); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
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
    { label: 'View',             icon: Eye,      tone: 'text-slate-700',   onClick: onView },
    { label: 'Edit',             icon: Pencil,   tone: 'text-slate-700',   onClick: onEdit,   disabled: isCancelled },
    { label: 'Cancel',           icon: Ban,      tone: 'text-amber-600',   onClick: onCancel, disabled: isCancelled },
    { label: 'Delete',           icon: Trash2,   tone: 'text-rose-600',    onClick: onDelete },
    { label: 'Duplicate',        icon: Copy,     tone: 'text-slate-700',   onClick: () => toast.info(`Duplicate ${txn.type} ${txn.invoiceNo || ''}`) },
    { label: 'Open PDF',         icon: FileText, tone: 'text-blue-600',    onClick: () => toast.info(`Open PDF for ${txn.invoiceNo || txn.type}`) },
    { label: 'Convert to Return',icon: RotateCcw,tone: 'text-purple-600',  onClick: () => toast.info(`Convert ${txn.type} ${txn.invoiceNo || ''} to return`) },
    { label: 'Payment History',  icon: History,  tone: 'text-slate-700',   onClick: () => toast.info(`Payment history for ${txn.invoiceNo || txn.type}`) },
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
              <button
                key={label}
                disabled={disabled}
                onClick={() => { setOpen(false); onClick(); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${tone} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
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
      const items = (form.items || []).map(i => ({
        name: i.name, qty: Number(i.qty), rate: Number(i.rate),
        amount: Number(i.qty) * Number(i.rate),
      }));
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
      const grandTotal = items.reduce((s, i) => s + i.total, 0);
      saveMut.mutate({ partyName: form.partyName, paymentMode: form.paymentMode, date: form.date, grandTotal, items });
    }
  };

  const setItem = (idx, field, value) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const isSale = txn.type === 'Sale';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isSale ? 'Sale' : 'Purchase'} — {txn.invoiceNo || '—'}
            </h2>
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
            {/* Top fields */}
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

            {/* Items table */}
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

            {/* Total */}
            <div className="flex justify-end">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-right">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Grand Total</p>
                <p className="text-xl font-bold text-slate-800">
                  ₹{Number(mode === 'view' ? record?.grandTotal : (form?.items || []).reduce((s, i) => s + Number(isSale ? i.qty : i.qty) * Number(isSale ? i.rate : i.price), 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
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

const inp2 = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 text-sm text-slate-800 bg-white';

export default function Items() {
  const qc = useQueryClient();
  const { data: allItems = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: uoms = [] } = useQuery({ queryKey: ['uoms'], queryFn: AccountsAPI.getUOMs });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });

  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalKey, setModalKey] = useState(0);
  const [showLow, setShowLow] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [selectedItemId, setSelectedItemId] = useState(null);

  const saveMut = useMutation({
    mutationFn: (data) => editItem ? ItemsAPI.update(editItem.id, data) : ItemsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['items']); closeModal(); toast.success(editItem ? 'Item updated' : 'Item added'); },
    onError: (err) => toast.error(err?.message || 'Failed to save item'),
  });

  const deleteMut = useMutation({
    mutationFn: ItemsAPI.delete,
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries(['items']);
      if (String(selectedItemId) === String(deletedId)) setSelectedItemId(null);
      setDeleteConfirm({ open: false, id: null });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const openAdd  = () => { setEditItem(null); setModal(true); };
  const openEdit = (item) => { setEditItem(item); setModal(true); };
  const closeModal = () => { setModal(false); setEditItem(null); };

  const handleDelete = (id) => setDeleteConfirm({ open: true, id });

  const exportCSV = () => {
    let csv = 'S.No,Item Name,Item Code,Batch,Category,UOM,Stock,Purchase Rs,MRP Rs,Sales Rs,GST%,Expiry\n';
    allItems.forEach((p, i) => {
      csv += `${i+1},"${p.shortName}","${p.itemCode||''}","${p.batch||''}","${p.category||''}","${p.uom||''}",${p.stock||0},${p.purchasePrice||0},${p.mrp||0},${p.salesPrice||0},${p.gstRate||5},"${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : ''}"\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Inventory_${fmt.today()}.csv`; a.click();
  };

  const displayed = useMemo(
    () => showLow ? allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)) : allItems,
    [allItems, showLow],
  );
  const selectedItem = useMemo(
    () => displayed.find(i => String(i.id) === String(selectedItemId)) || null,
    [displayed, selectedItemId],
  );
  const lowCount  = allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const expCount  = allItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= soon).length;

  useEffect(() => {
    if (!displayed.length) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId(currentId =>
      displayed.some(i => String(i.id) === String(currentId)) ? currentId : displayed[0].id,
    );
  }, [displayed]);

  return (
    <div className="p-8 h-screen flex flex-col">

      {/* Split Layout - Items List and Details */}
      <div className={`flex-1 grid grid-cols-6 gap-4 min-h-0 ${modal ? 'hidden' : ''}`}>
        {/* Left Panel - Items List (compact header + warning card) */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-4 border-b border-slate-200">
            <div className="flex flex-col gap-3">
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-amber-500 text-white">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold border-r border-amber-400">Qty</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="bg-amber-50 divide-y divide-amber-100">
                    <tr>
                      <td className="px-3 py-1.5 font-bold text-amber-700 border-r border-amber-100">{lowCount}</td>
                      <td className="px-3 py-1.5 text-amber-800">Low Stock</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-bold text-amber-700 border-r border-amber-100">{expCount}</td>
                      <td className="px-3 py-1.5 text-amber-800">Near Expiry</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button onClick={openAdd} className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm whitespace-nowrap">
                <Plus size={15} /> Add Item
              </button>
            </div>
          </div>
          <div className="w-full">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {['S.No','Item','Qty'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={3} className="text-center py-6 text-slate-400">Loading...</td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-6 text-slate-400">No items found</td></tr>
                ) : displayed.map((p, idx) => {
                  const stock = Number(p.stock || 0);
                  const isLow = stock <= Number(p.reorderLevel || 10);
                  const isSelected = String(selectedItemId) === String(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedItemId(p.id)}
                      className={`transition-colors cursor-pointer ${isLow ? 'bg-orange-50' : ''} ${isSelected ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 text-xs">{p.shortName}</td>
                      <td className={`px-3 py-2 font-bold text-center text-xs ${stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel - Item Details and Transactions */}
        <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {selectedItem ? (
            <ItemTransactions item={selectedItem} sales={sales} purchases={purchases} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ChevronRight size={48} className="mb-2 opacity-50" />
              <p className="text-sm">Select an item to view details</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <AddItemModal
          key={modalKey}
          editData={editItem}
          uoms={uoms}
          existingItems={allItems}
          onClose={closeModal}
          onSave={(data) => saveMut.mutate(data)}
          onSaveAndNew={(data) => {
            const api = editItem ? ItemsAPI.update(editItem.id, data) : ItemsAPI.create(data);
            api.then(() => {
              qc.invalidateQueries(['items']);
              setEditItem(null);
              setModalKey(k => k + 1);
              toast.success('Item saved');
            }).catch(err => toast.error(err?.message || 'Failed to save'));
          }}
        />
      )}


      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Item"
        message="This item will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}
