import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronDown, Settings, Search, X, Plus, Trash2,
  Printer, MoreVertical, Share2, BarChart2, FileSpreadsheet, Calendar, Check,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { PurchasesAPI } from '../../api/purchases.js';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';

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

/* ── Item row blank ── */
const ITEM_BLANK = { name: '', batchNo: '', expiryDate: '', mfgDate: '', mrp: 0, qty: 1, unit: 'PCS', price: 0, gstRate: 0, gstAmount: 0, total: 0 };

function calcLine(qty, price, gstRate) {
  const base = Number(qty) * Number(price);
  const gstAmount = base * Number(gstRate) / 100;
  return { gstAmount, total: base + gstAmount };
}

/* ── Edit Purchase Modal ── */
export function EditPurchaseModal({ purchase, onClose }) {
  const qc = useQueryClient();

  const { data: parties    = [] } = useQuery({ queryKey: ['parties'],        queryFn: PartiesAPI.getAll });
  const { data: payOptions = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });

  const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');
  const MODES     = payOptions.length ? payOptions.map(o => o.name) : ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];

  const [partyName,        setPartyName]        = useState(purchase.partyName || '');
  const [partyId,          setPartyId]          = useState(purchase.partyId ? String(purchase.partyId) : '');
  const [supplierDrop,     setSupplierDrop]     = useState(false);
  const supplierRef = useRef(null);
  const [paymentMode,      setPaymentMode]      = useState(purchase.paymentMode || 'Cash');
  const [totalPaid,        setTotalPaid]        = useState(String(Number(purchase.totalPaid ?? purchase.grandTotal ?? 0)));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(purchase.supplierInvoiceNo || '');
  const [items, setItems] = useState(
    (purchase.items || []).map(i => ({
      name:       i.name        || '',
      batchNo:    i.batchNo     || '',
      expiryDate: i.expiryDate  || '',
      mfgDate:    i.mfgDate     || '',
      mrp:        Number(i.mrp       || 0),
      qty:        Number(i.qty       || 0),
      unit:       i.unit        || 'PCS',
      price:      Number(i.price     || 0),
      gstRate:    Number(i.gstRate   || 0),
      gstAmount:  Number(i.gstAmount || 0),
      total:      Number(i.total     || 0),
    }))
  );

  useEffect(() => {
    const fn = (e) => { if (supplierRef.current && !supplierRef.current.contains(e.target)) setSupplierDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      const { gstAmount, total } = calcLine(updated.qty, updated.price, updated.gstRate);
      return { ...updated, gstAmount, total };
    }));
  };

  const grandTotal    = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const paid          = Number(totalPaid || 0);
  const balance       = Math.max(0, grandTotal - paid);
  const paymentStatus = paid <= 0 ? 'Unpaid' : paid >= grandTotal ? 'Paid' : 'Partial';
  const statusColor   = { Paid: 'text-emerald-600', Partial: 'text-amber-600', Unpaid: 'text-rose-600' };

  const updateMut = useMutation({
    mutationFn: (data) => PurchasesAPI.update(purchase.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase updated');
      onClose();
    },
    onError: () => toast.error('Failed to update purchase'),
  });

  const handleSave = () => {
    const validItems = items.filter(i => i.name && Number(i.qty) > 0);
    if (!validItems.length) { toast.warning('Add at least one valid item'); return; }
    updateMut.mutate({
      partyName:        partyName || null,
      partyId:          partyId ? Number(partyId) : null,
      paymentMode,
      totalPaid:        paid,
      paymentStatus,
      grandTotal,
      supplierInvoiceNo: supplierInvoiceNo || null,
      items: validItems.map(i => ({
        name:       i.name,
        batchNo:    i.batchNo    || null,
        expiryDate: i.expiryDate || null,
        mfgDate:    i.mfgDate    || null,
        mrp:        Number(i.mrp       || 0),
        qty:        Number(i.qty),
        unit:       i.unit       || null,
        price:      Number(i.price),
        gstRate:    Number(i.gstRate   || 0),
        gstAmount:  Number(i.gstAmount || 0),
        total:      Number(i.total),
      })),
    });
  };

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100';
  const cell = 'px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:bg-amber-50 rounded w-full';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Edit Purchase</h2>
            <p className="text-xs text-slate-400 mt-0.5">Invoice: {purchase.invoice}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4">

          {/* Header fields */}
          <div className="grid grid-cols-3 gap-4">

            {/* Supplier */}
            <div ref={supplierRef} className="relative">
              <label className="text-xs text-slate-500 mb-1 block">Supplier Name</label>
              <input
                value={partyName}
                onChange={e => { setPartyName(e.target.value); setPartyId(''); setSupplierDrop(true); }}
                onFocus={() => setSupplierDrop(true)}
                placeholder="Search supplier…"
                className={inp}
              />
              {supplierDrop && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {suppliers
                    .filter(s => s.name.toLowerCase().includes(partyName.toLowerCase()))
                    .map(s => (
                      <button key={s.id} type="button"
                        onMouseDown={() => { setPartyName(s.name); setPartyId(String(s.id)); setSupplierDrop(false); }}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-50 text-left text-sm text-slate-800">
                        {s.name}
                        {s.phone && <span className="text-xs text-slate-400">{s.phone}</span>}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={inp}>
                {MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Supplier Invoice No */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Supplier Invoice No</label>
              <input value={supplierInvoiceNo} onChange={e => setSupplierInvoiceNo(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Items</span>
              <button type="button" onClick={() => setItems(prev => [...prev, { ...ITEM_BLANK }])}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold">
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-slate-500 font-medium w-6">#</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-medium min-w-[140px]">Item Name</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-medium w-20">Batch</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-14">MRP</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-14">Qty</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-medium w-14">Unit</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-20">Price</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-14">GST%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-20">GST Amt</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-1 py-1"><input value={row.name}       onChange={e => updateRow(idx, 'name',    e.target.value)} className={cell} placeholder="Item name" /></td>
                      <td className="px-1 py-1"><input value={row.batchNo}    onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cell} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.mrp}   onChange={e => updateRow(idx, 'mrp',   e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.qty}   onChange={e => updateRow(idx, 'qty',   e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input value={row.unit}       onChange={e => updateRow(idx, 'unit',   e.target.value)} className={cell} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.gstRate} onChange={e => updateRow(idx, 'gstRate', e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-2 py-1 text-right text-slate-500">{Number(row.gstAmount).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-semibold text-slate-800">{Number(row.total).toFixed(2)}</td>
                      <td className="px-1 py-1 text-center">
                        <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-300 hover:text-rose-500 transition">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals + Payment */}
          <div className="flex items-start justify-end gap-4">

            {/* Payment card */}
            <div className="w-64 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Amount Paid</span>
                <input
                  type="number" min="0"
                  value={totalPaid}
                  onChange={e => setTotalPaid(e.target.value)}
                  className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Balance</span>
                <span className={`text-sm font-semibold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50">
                <span className="text-xs text-slate-500">Status</span>
                <span className={`text-xs font-bold ${statusColor[paymentStatus]}`}>{paymentStatus}</span>
              </div>
            </div>

            {/* Totals card */}
            <div className="w-64 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Sub Total</span>
                <span className="text-sm text-slate-700">
                  ₹ {items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Tax Amount</span>
                <span className="text-sm text-slate-700">
                  ₹ {items.reduce((s, i) => s + Number(i.gstAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-4 py-2.5 bg-amber-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Grand Total</span>
                <span className="text-base font-bold text-amber-700">
                  ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
            {updateMut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
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
  const [editRow,   setEditRow]   = useState(null);
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
                      onDoubleClick={() => setEditRow(rawPurchases.find(p => p.id === row.id) ?? null)}
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

      {editRow && (
        <EditPurchaseModal
          purchase={editRow}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  );
}
