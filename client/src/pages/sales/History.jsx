import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronDown, Settings, Search, X, Plus, Trash2,
  Printer, MoreVertical, Share2, BarChart2, FileSpreadsheet, Calendar, Check,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { SalesAPI } from '../../api/sales.js';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';
import { SettingsAPI } from '../../api/settings.js';

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

/* ── Normalize API sale → row ── */
function normalizeRow(s) {
  const grandTotal    = Number(s.grandTotal    ?? 0);
  const totalReceived = Number(s.totalReceived ?? 0);
  const balance       = Math.max(0, grandTotal - totalReceived);
  const dueDate       = s.dueDate ? fmtDate(new Date(s.dueDate)) : '';

  return {
    id:          s.id,
    invoiceNo:   s.invoice,
    date:        s.date,
    party:       (s.party?.name ?? s.customerName ?? 'CASH SALE').toUpperCase(),
    transaction: 'Sale',
    paymentType: s.paymentMode ?? 'Cash',
    amount:      grandTotal,
    balance,
    dueDate,
    status:      s.paymentStatus ?? 'Paid',
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
                <span className={value === opt ? 'text-blue-600 font-medium' : 'text-gray-700'}>{opt}</span>
                {value === opt && <Check size={13} className="text-blue-500 shrink-0" />}
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
        <Icon size={11} className={active ? 'text-blue-500 shrink-0' : 'text-slate-300 shrink-0'} />
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

/* ─── Print: opens a formatted 80mm thermal receipt in a new window ─── */
function printInvoice(sale, cfg = {}) {
  const shopName = cfg.shopName || 'Gramathaankadai SuperMart';
  const address  = cfg.address  || '';
  const phone    = cfg.phone    || '';
  const gstin    = cfg.gstin    || '';

  const dateStr = new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const rows = (sale.items || []).map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${Number(it.rate).toFixed(2)}</td>
      <td style="text-align:right">₹${Number(it.amount).toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Invoice ${sale.invoice}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:11px;color:#000;width:80mm;margin:0 auto;padding:4mm}
  .c{text-align:center} .r{text-align:right} .b{font-weight:bold}
  .shop{font-size:15px;font-weight:bold;text-align:center;letter-spacing:.5px}
  .dash{border-top:1px dashed #000;margin:5px 0}
  .solid{border-top:1px solid #000;margin:5px 0}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;padding:2px 1px;border-bottom:1px solid #000}
  td{font-size:10px;padding:1px 1px;vertical-align:top}
  .grand td{font-size:12px;font-weight:bold;border-top:1px solid #000;border-bottom:2px solid #000;padding:3px 1px}
  .footer{text-align:center;margin-top:8px;font-size:10px}
  @media print{@page{margin:4mm;size:80mm auto}body{width:100%}}
</style></head><body>
<div class="shop">${shopName}</div>
${address ? `<div class="c">${address}</div>` : ''}
${phone   ? `<div class="c">Ph: ${phone}</div>` : ''}
${gstin   ? `<div class="c">GSTIN: ${gstin}</div>` : ''}
<div class="solid"></div>
<div class="c b" style="font-size:12px;margin:4px 0">TAX INVOICE</div>
<div class="dash"></div>
<table>
  <tr><td>Invoice</td><td class="r b">${sale.invoice}</td></tr>
  <tr><td>Date</td><td class="r">${dateStr} ${timeStr}</td></tr>
  <tr><td>Customer</td><td class="r">${sale.customerName || sale.party?.name || 'CASH SALE'}</td></tr>
  ${sale.party?.phone ? `<tr><td>Phone</td><td class="r">${sale.party.phone}</td></tr>` : ''}
</table>
<div class="dash"></div>
<table>
  <thead><tr>
    <th style="width:14px">#</th>
    <th style="text-align:left">Item</th>
    <th style="text-align:center;width:24px">Qty</th>
    <th style="text-align:right;width:52px">Rate</th>
    <th style="text-align:right;width:56px">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="dash"></div>
<table>
  <tr><td>Subtotal</td><td class="r">₹${Number(sale.subtotal ?? 0).toFixed(2)}</td></tr>
  <tr><td>Tax (GST)</td><td class="r">₹${Number(sale.gst ?? 0).toFixed(2)}</td></tr>
  <tr class="grand"><td>Grand Total</td><td class="r">₹${Number(sale.grandTotal).toFixed(0)}</td></tr>
</table>
<div class="dash"></div>
<table>
  <tr><td>Received</td><td class="r">₹${Number(sale.totalReceived ?? sale.grandTotal).toFixed(2)}</td></tr>
  <tr><td>Payment</td><td class="r">${sale.paymentMode || 'Cash'}</td></tr>
</table>
<div class="solid"></div>
<div class="footer">
  <p class="b">Thank you for your purchase!</p>
  <p>Please visit us again</p>
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=420,height=650,toolbar=0,menubar=0');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

/* ─── Invoice Preview Modal ─── */
function InvoicePreviewModal({ sale, settings, onClose }) {
  const cfg      = settings || {};
  const shopName = cfg.shopName || 'Gramathaankadai SuperMart';
  const address  = cfg.address  || '';
  const phone    = cfg.phone    || '';
  const gstin    = cfg.gstin    || '';
  const dateStr  = new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr  = new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const customer = sale.customerName || sale.party?.name || 'CASH SALE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-sm">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">Invoice Preview</span>
            <span className="text-xs font-mono text-amber-600 font-bold">#{sale.invoice}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-4 font-mono text-[11px] text-slate-800 shadow-inner"
               style={{ fontFamily: "'Courier New', monospace" }}>

            <div className="text-center font-bold text-sm mb-0.5">{shopName}</div>
            {address && <div className="text-center text-[10px] text-slate-500">{address}</div>}
            {phone   && <div className="text-center text-[10px] text-slate-500">Ph: {phone}</div>}
            {gstin   && <div className="text-center text-[10px] text-slate-500">GSTIN: {gstin}</div>}

            <div className="border-t border-slate-400 my-2" />
            <div className="text-center font-bold text-xs tracking-wider mb-2">TAX INVOICE</div>
            <div className="border-t border-dashed border-slate-300 my-2" />

            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Invoice</span><span className="font-bold">{sale.invoice}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{dateStr} {timeStr}</span></div>
              <div className="flex justify-between"><span>Customer</span><span className="font-medium">{customer}</span></div>
              {sale.party?.phone && <div className="flex justify-between"><span>Phone</span><span>{sale.party.phone}</span></div>}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-400">
                  <th className="text-left pb-1 w-5">#</th>
                  <th className="text-left pb-1">Item</th>
                  <th className="text-center pb-1 w-8">Qty</th>
                  <th className="text-right pb-1 w-14">Rate</th>
                  <th className="text-right pb-1 w-16">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="py-0.5">{i + 1}</td>
                    <td className="py-0.5 pr-1">{it.name}</td>
                    <td className="py-0.5 text-center">{it.qty}</td>
                    <td className="py-0.5 text-right">₹{Number(it.rate).toFixed(2)}</td>
                    <td className="py-0.5 text-right font-medium">₹{Number(it.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-slate-300 my-2" />

            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(sale.subtotal ?? 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax (GST)</span><span>₹{Number(sale.gst ?? 0).toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-b border-slate-400 py-1.5 my-1.5">
              <span>Grand Total</span><span>₹{Number(sale.grandTotal).toFixed(0)}</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Received</span><span>₹{Number(sale.totalReceived ?? sale.grandTotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Payment</span><span className="font-medium">{sale.paymentMode || 'Cash'}</span></div>
            </div>

            <div className="border-t border-slate-400 my-2" />
            <div className="text-center font-bold text-[10px]">Thank you for your purchase!</div>
            <div className="text-center text-[10px] text-slate-400">Please visit us again</div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Close
          </button>
          <button onClick={() => printInvoice(sale, cfg)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sale item row blank ── */
const ITEM_BLANK = { name: '', batchNo: '', expiryDate: '', mfgDate: '', mrp: 0, qty: 1, freeQty: 0, unit: 'PCS', rate: 0, gstRate: 0, gstAmount: 0, amount: 0 };

function calcLine(qty, rate, gstRate) {
  const base = Number(qty) * Number(rate);
  const gstAmount = base * Number(gstRate) / 100;
  return { gstAmount, amount: base + gstAmount };
}

/* ── Edit Sale Modal ── */
export function EditSaleModal({ sale, onClose }) {
  const qc = useQueryClient();

  const { data: parties    = [] } = useQuery({ queryKey: ['parties'],        queryFn: PartiesAPI.getAll });
  const { data: payOptions = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });

  const customers = parties.filter(p => p.type === 'customer' || p.type === 'both');
  const MODES     = payOptions.length ? payOptions.map(o => o.name) : ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];

  const [customerName, setCustomerName] = useState(sale.customerName || sale.party?.name || '');
  const [partyId,      setPartyId]      = useState(sale.partyId ? String(sale.partyId) : '');
  const [customerDrop, setCustomerDrop] = useState(false);
  const customerRef = useRef(null);
  const [paymentMode,    setPaymentMode]    = useState(sale.paymentMode || 'Cash');
  const [totalReceived,  setTotalReceived]  = useState(String(Number(sale.totalReceived ?? sale.grandTotal ?? 0)));
  const [items, setItems] = useState(
    (sale.items || []).map(i => ({
      name:       i.name       || '',
      batchNo:    i.batchNo    || '',
      expiryDate: i.expiryDate || '',
      mfgDate:    i.mfgDate    || '',
      mrp:        Number(i.mrp      || 0),
      qty:        Number(i.qty      || 0),
      freeQty:    Number(i.freeQty  || 0),
      unit:       i.unit       || 'PCS',
      rate:       Number(i.rate     || 0),
      gstRate:    Number(i.gstRate  || 0),
      gstAmount:  Number(i.gstAmount|| 0),
      amount:     Number(i.amount   || 0),
    }))
  );

  useEffect(() => {
    const fn = (e) => { if (customerRef.current && !customerRef.current.contains(e.target)) setCustomerDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      const { gstAmount, amount } = calcLine(updated.qty, updated.rate, updated.gstRate);
      return { ...updated, gstAmount, amount };
    }));
  };

  const grandTotal    = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const received      = Number(totalReceived || 0);
  const balance       = Math.max(0, grandTotal - received);
  const paymentStatus = received <= 0 ? 'Unpaid' : received >= grandTotal ? 'Paid' : 'Partial';
  const statusColor   = { Paid: 'text-emerald-600', Partial: 'text-amber-600', Unpaid: 'text-rose-600' };

  const updateMut = useMutation({
    mutationFn: (data) => SalesAPI.update(sale.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Sale updated');
      onClose();
    },
    onError: () => toast.error('Failed to update sale'),
  });

  const handleSave = () => {
    const validItems = items.filter(i => i.name && Number(i.qty) > 0);
    if (!validItems.length) { toast.warning('Add at least one valid item'); return; }
    updateMut.mutate({
      customerName:  customerName || null,
      partyId:       partyId ? Number(partyId) : null,
      paymentMode,
      totalReceived: received,
      paymentStatus,
      grandTotal,
      items: validItems.map(i => ({
        name:       i.name,
        batchNo:    i.batchNo    || null,
        expiryDate: i.expiryDate || null,
        mfgDate:    i.mfgDate    || null,
        mrp:        Number(i.mrp      || 0),
        qty:        Number(i.qty),
        freeQty:    Number(i.freeQty  || 0),
        unit:       i.unit       || null,
        rate:       Number(i.rate),
        gstRate:    Number(i.gstRate  || 0),
        gstAmount:  Number(i.gstAmount|| 0),
        amount:     Number(i.amount),
      })),
    });
  };

  const inp  = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100';
  const cell = 'px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:bg-emerald-50 rounded w-full';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Edit Sale</h2>
            <p className="text-xs text-slate-400 mt-0.5">Invoice: {sale.invoice}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4">

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">

            {/* Customer */}
            <div ref={customerRef} className="relative">
              <label className="text-xs text-slate-500 mb-1 block">Customer Name</label>
              <input
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); setPartyId(''); setCustomerDrop(true); }}
                onFocus={() => setCustomerDrop(true)}
                placeholder="Search customer…"
                className={inp}
              />
              {customerDrop && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
                    .map(c => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { setCustomerName(c.name); setPartyId(String(c.id)); setCustomerDrop(false); }}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-emerald-50 text-left text-sm text-slate-800">
                        {c.name}
                        {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
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
          </div>

          {/* Items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Items</span>
              <button type="button" onClick={() => setItems(prev => [...prev, { ...ITEM_BLANK }])}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
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
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-14">Free</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-medium w-14">Unit</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-20">Rate</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-14">GST%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-20">GST Amt</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-medium w-24">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-1 py-1"><input value={row.name}    onChange={e => updateRow(idx, 'name',    e.target.value)} className={cell} placeholder="Item name" /></td>
                      <td className="px-1 py-1"><input value={row.batchNo} onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cell} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.mrp}     onChange={e => updateRow(idx, 'mrp',     e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.qty}     onChange={e => updateRow(idx, 'qty',     e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.freeQty} onChange={e => updateRow(idx, 'freeQty', e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input value={row.unit}    onChange={e => updateRow(idx, 'unit',    e.target.value)} className={cell} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.rate}    onChange={e => updateRow(idx, 'rate',    e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-1 py-1"><input type="number" value={row.gstRate} onChange={e => updateRow(idx, 'gstRate', e.target.value)} className={`${cell} text-right`} /></td>
                      <td className="px-2 py-1 text-right text-slate-500">{Number(row.gstAmount).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-semibold text-slate-800">{Number(row.amount).toFixed(2)}</td>
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
                <span className="text-xs text-slate-500">Amount Received</span>
                <input
                  type="number" min="0"
                  value={totalReceived}
                  onChange={e => setTotalReceived(e.target.value)}
                  className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right text-slate-800 focus:outline-none focus:border-emerald-500"
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
                  ₹ {items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Tax Amount</span>
                <span className="text-sm text-slate-700">
                  ₹ {items.reduce((s, i) => s + Number(i.gstAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-4 py-2.5 bg-emerald-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Grand Total</span>
                <span className="text-base font-bold text-emerald-700">
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
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
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
export default function SalesHistory() {
  const location = useLocation();
  const [dateLabel, setDateLabel] = useState(location.state?.initFilter ?? 'This Month');
  const [selected,  setSelected]  = useState(null);
  const [editRow,   setEditRow]   = useState(null);
  const [printSale, setPrintSale] = useState(null);
  const [search,    setSearch]    = useState('');
  const [sortCol,   setSortCol]   = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get });

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

  const { data: rawSales = [], isLoading } = useQuery({
    queryKey: ['sales', dateLabel],
    queryFn:  () => SalesAPI.getByDateRange(fromISO, toISO),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => SalesAPI.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSelected(null);
      toast.success('Invoice deleted');
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  const handleDelete = (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    deleteMut.mutate(id);
  };

  const rows = rawSales
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

  const totalAmount   = rows.reduce((s, r) => s + r.amount,  0);
  const totalReceived = rows.reduce((s, r) => s + (r.amount - r.balance), 0);
  const totalBalance  = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Sales History</h1>
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
            <p className="text-xs text-slate-500 mb-2">Total Sales Amount</p>
            <p className="text-2xl font-bold text-slate-800">{fmtAmt(totalAmount)}</p>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span>Received: {fmtAmt(totalReceived)}</span>
              <span className="text-slate-300">|</span>
              <span>Balance: {fmtAmt(totalBalance)}</span>
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-2">Total Loyalty Points Rewarded</p>
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-xs text-slate-500 mt-1.5">Total Discount Redeemed: ₹ 0</p>
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
                    focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
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
                      No invoices found. Click "+ Add Sale" to create one.
                    </td>
                  </tr>
                ) : sortedRows.map((row) => {
                  const isSel = selected === row.id;
                  const bold  = isSel ? 'font-bold text-slate-900' : '';
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(isSel ? null : row.id)}
                      onDoubleClick={() => setEditRow(rawSales.find(s => s.id === row.id) ?? null)}
                      className={`cursor-pointer transition ${isSel ? 'bg-emerald-50' : 'hover:bg-slate-50/80'}`}
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
                            onClick={() => setPrintSale(rawSales.find(s => s.id === row.id))}
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
        <EditSaleModal
          sale={editRow}
          onClose={() => setEditRow(null)}
        />
      )}

      {printSale && (
        <InvoicePreviewModal
          sale={printSale}
          settings={settings}
          onClose={() => setPrintSale(null)}
        />
      )}
    </div>
  );
}
