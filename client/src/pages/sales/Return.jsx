import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, ChevronDown, Printer, Share2, MoreVertical,
  FileSpreadsheet, X, Trash2, Check, GripVertical, FileText,
  AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PartiesAPI }     from '../../api/parties.js';
import { ItemsAPI }       from '../../api/items.js';
import { SalesAPI }       from '../../api/sales.js';
import { SaleReturnsAPI } from '../../api/saleReturns.js';

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Credit'];
const RETURN_TYPES  = ['Credit Note', 'Debit Note', 'Refund'];
const TAX_RATES     = ['0', '5', '12', '18', '28'];

/* ── Helpers ── */
const pad  = n => String(n).padStart(2, '0');
const fmt2 = n => Number(n || 0).toFixed(2);
const fmtAmt = n => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function getRange(label) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (label) {
    case 'Today':        return { from: `${y}-${pad(m+1)}-${pad(d)}`,   to: `${y}-${pad(m+1)}-${pad(d)}` };
    case 'This Month':   return { from: `${y}-${pad(m+1)}-01`,          to: `${y}-${pad(m+1)}-${new Date(y,m+1,0).getDate()}` };
    case 'Last Month':   { const lm=m===0?11:m-1,ly=m===0?y-1:y; return { from:`${ly}-${pad(lm+1)}-01`, to:`${ly}-${pad(lm+1)}-${new Date(ly,lm+1,0).getDate()}` }; }
    case 'This Quarter': { const q=Math.floor(m/3); return { from:`${y}-${pad(q*3+1)}-01`, to:`${y}-${pad(q*3+3)}-${new Date(y,q*3+3,0).getDate()}` }; }
    case 'This Year':    return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:             return { from: '', to: '' };
  }
}

/* ── Dropdown ── */
function Dropdown({ label, options, value, onChange, width = 'w-40' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const display = value || label;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`${width} flex items-center justify-between gap-1 border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition`}>
        <span className="truncate">{display}</span>
        <ChevronDown size={11} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden">
          {[label, ...options].map(opt => (
            <button key={opt} onClick={() => { onChange(opt === label ? '' : opt); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition">
              <span className={value === opt ? 'text-blue-600 font-semibold' : 'text-slate-700'}>{opt}</span>
              {value === opt && <Check size={11} className="text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = {
    Paid:    'bg-green-100 text-green-700',
    Unpaid:  'bg-red-100 text-red-600',
    Partial: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════
   ADD CREDIT NOTE MODAL
══════════════════════════════════════════ */
let _uid = 0;
const uid = () => ++_uid;
const emptyRow = () => ({ _key: uid(), _fromInvoiceIdx: undefined, productId: null, name: '', qty: '', rate: '', unit: 'PCS', gstRate: '0', gstAmount: 0, amount: 0 });

function buildRowFromInvoiceItem(item, idx) {
  const rate      = Number(item.rate || 0);
  const qty       = Number(item.qty  || 0);
  const gst       = Number(item.gstRate || 0);
  const base      = qty * rate;
  const gstAmount = +(base * gst / 100).toFixed(2);
  const amount    = +(base + gstAmount).toFixed(2);
  return {
    _key: uid(), _fromInvoiceIdx: idx,
    productId: item.productId || null,
    name: item.name || '', qty: String(qty), rate: String(rate),
    unit: item.unit || 'PCS', gstRate: String(gst), gstAmount, amount,
  };
}

function AddCreditNoteModal({ onClose, onSaved }) {
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: items   = [] } = useQuery({ queryKey: ['items'],   queryFn: ItemsAPI.getAll });

  /* ── form state ── */
  const [creditNoteNo,  setCreditNoteNo]  = useState('');
  const [date,          setDate]          = useState(todayYMD());
  const [partyId,       setPartyId]       = useState('');
  const [partyQuery,    setPartyQuery]    = useState('');
  const [partyOpen,     setPartyOpen]     = useState(false);
  const [type,          setType]          = useState('Credit Note');
  const [paymentMode,   setPaymentMode]   = useState('Cash');
  const [totalReceived, setTotalReceived] = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [notes,         setNotes]         = useState('');
  const [rows,          setRows]          = useState([emptyRow()]);
  const [saving,        setSaving]        = useState(false);
  const [focusedKey,    setFocusedKey]    = useState(null);

  /* ── invoice lookup state ── */
  const [invoiceQuery,   setInvoiceQuery]   = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData,    setInvoiceData]    = useState(null);
  const [invoiceError,   setInvoiceError]   = useState('');
  const [checkedItems,   setCheckedItems]   = useState(new Set());

  const partyRef  = useRef(null);
  const dragItem  = useRef(null);
  const dropZone  = useRef(null);

  /* next CN number */
  useEffect(() => {
    SaleReturnsAPI.nextNumber()
      .then(d => setCreditNoteNo(d.creditNoteNo || 'CN-0001'))
      .catch(() => setCreditNoteNo('CN-0001'));
  }, []);

  /* close party dropdown on outside click */
  useEffect(() => {
    const fn = e => { if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(partyQuery.toLowerCase()));
  const selectedParty   = parties.find(p => p.id === partyId);

  /* ── Invoice lookup ── */
  const searchInvoice = async () => {
    const q = invoiceQuery.trim();
    if (!q) return;
    setInvoiceLoading(true);
    setInvoiceError('');
    setInvoiceData(null);
    setCheckedItems(new Set());
    setRows(prev => prev.filter(r => r._fromInvoiceIdx === undefined));
    try {
      const results = await SalesAPI.searchByInvoice(q);
      if (!results.length) {
        setInvoiceError('No invoice found for "' + q + '"');
      } else {
        const sale = results[0];
        setInvoiceData(sale);
        if (!partyId && sale.partyId) setPartyId(sale.partyId);
      }
    } catch {
      setInvoiceError('Error fetching invoice. Please try again.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  /* ── Toggle invoice item checkbox ── */
  const toggleInvoiceItem = (idx, item) => {
    const isChecked = checkedItems.has(idx);
    if (isChecked) {
      setCheckedItems(prev => { const s = new Set(prev); s.delete(idx); return s; });
      setRows(prev => prev.filter(r => r._fromInvoiceIdx !== idx));
    } else {
      setCheckedItems(prev => { const s = new Set(prev); s.add(idx); return s; });
      const newRow = buildRowFromInvoiceItem(item, idx);
      // Remove all empty placeholder rows, then append the invoice row
      setRows(prev => [...prev.filter(r => r.name.trim()), newRow]);
    }
  };

  /* ── Select / clear all invoice items ── */
  const selectAllInvoiceItems = () => {
    if (!invoiceData?.items?.length) return;
    const allIdx = new Set(invoiceData.items.map((_, i) => i));
    setCheckedItems(allIdx);
    // Keep non-empty manual rows, replace empty ones, add all invoice items
    setRows(prev => {
      const manual = prev.filter(r => r._fromInvoiceIdx === undefined && r.name.trim());
      const fromInvoice = invoiceData.items.map((it, i) => buildRowFromInvoiceItem(it, i));
      return [...manual, ...fromInvoice];
    });
  };

  const clearAllInvoiceItems = () => {
    setCheckedItems(new Set());
    setRows(prev => prev.filter(r => r._fromInvoiceIdx === undefined));
  };

  /* ── Drag from right panel ── */
  const handleDragStart = (e, item, idx) => {
    dragItem.current = { item, idx };
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = e => {
    e.preventDefault();
    if (!dragItem.current) return;
    const { item, idx } = dragItem.current;
    if (checkedItems.has(idx)) return; // already added via checkbox
    toggleInvoiceItem(idx, item);
    dragItem.current = null;
  };

  /* ── Row helpers ── */
  const updateRow = (key, field, val) => setRows(prev => prev.map(r => {
    if (r._key !== key) return r;
    const updated = { ...r, [field]: val };
    const qty  = Number(updated.qty    || 0);
    const rate = Number(updated.rate   || 0);
    const gst  = Number(updated.gstRate || 0);
    const base = qty * rate;
    updated.gstAmount = +(base * gst / 100).toFixed(2);
    updated.amount    = +(base + updated.gstAmount).toFixed(2);
    return updated;
  }));

  const fillFromItem = (key, item) => setRows(prev => prev.map(r => {
    if (r._key !== key) return r;
    const rate = Number(item.salesPrice || item.mrp || 0);
    const gst  = Number(item.gstRate || 0);
    return { ...r, productId: item.id, name: item.shortName || item.name || '', rate: String(rate), unit: item.uom || 'PCS', gstRate: String(gst), gstAmount: 0, amount: 0 };
  }));

  const subtotal   = rows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.rate || 0), 0);
  const totalGst   = rows.reduce((s, r) => s + r.gstAmount, 0);
  const grandTotal = subtotal + totalGst;
  const balance    = Math.max(0, grandTotal - Number(totalReceived || 0));

  const handleSave = async () => {
    if (!creditNoteNo) return toast.error('Credit note number is required');
    const validRows = rows.filter(r => r.name.trim() && Number(r.qty) > 0);
    if (!validRows.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await SaleReturnsAPI.create({
        creditNoteNo, date, partyId: partyId || null,
        partyName: selectedParty?.name || 'Walk-in Customer',
        referenceInvoice: invoiceData?.invoice || invoiceQuery || null,
        type, subtotal: +subtotal.toFixed(2), gst: +totalGst.toFixed(2),
        grandTotal: +grandTotal.toFixed(2),
        paymentMode, totalReceived: Number(totalReceived || 0),
        dueDate: dueDate || null, notes: notes || null,
        items: validRows.map(r => ({
          productId: r.productId, name: r.name,
          qty: Number(r.qty), rate: Number(r.rate), unit: r.unit,
          gstRate: Number(r.gstRate), gstAmount: r.gstAmount, amount: r.amount,
        })),
      });
      toast.success('Credit note created');
      onSaved();
    } catch (e) {
      toast.error(e.error || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inp  = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100';
  const inp2 = 'w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400';
  const allSelected = invoiceData?.items?.length > 0 && checkedItems.size === invoiceData.items.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh]">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800 text-base">Add Credit Note</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* ── Two-panel body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ════════ LEFT PANEL — form + items ════════ */}
          <div className="flex flex-col flex-1 overflow-y-auto border-r border-slate-100">

            {/* Top fields */}
            <div className="px-5 pt-5 pb-3 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Credit Note No.</label>
                <input value={creditNoteNo} onChange={e => setCreditNoteNo(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className={inp}>
                  {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div ref={partyRef} className="relative col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Party Name</label>
                <input
                  value={partyId ? selectedParty?.name : partyQuery}
                  onChange={e => { setPartyQuery(e.target.value); setPartyId(''); setPartyOpen(true); }}
                  onFocus={() => setPartyOpen(true)}
                  placeholder="Search party..."
                  className={inp}
                />
                {partyOpen && filteredParties.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-44 overflow-y-auto">
                    {filteredParties.map(p => (
                      <button key={p.id} onClick={() => { setPartyId(p.id); setPartyQuery(''); setPartyOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Items table — droppable */}
            <div className="px-5 pb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Return Items</p>
              <div
                ref={dropZone}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-2.5 text-left font-semibold text-slate-500 w-7">#</th>
                      <th className="px-2 py-2.5 text-left font-semibold text-slate-500">Item Name</th>
                      <th className="px-2 py-2.5 text-center font-semibold text-slate-500 w-16">Qty</th>
                      <th className="px-2 py-2.5 text-center font-semibold text-slate-500 w-14">Unit</th>
                      <th className="px-2 py-2.5 text-center font-semibold text-slate-500 w-20">Rate</th>
                      <th className="px-2 py-2.5 text-center font-semibold text-slate-500 w-14">GST%</th>
                      <th className="px-2 py-2.5 text-right font-semibold text-slate-500 w-22">Amount</th>
                      <th className="w-7" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const isFocused    = focusedKey === row._key;
                      const matchedItems = isFocused
                        ? items.filter(i => (i.shortName || '').toLowerCase().includes(row.name.toLowerCase()) && row.name)
                        : [];
                      return (
                        <tr key={row._key} className={`hover:bg-slate-50 ${row._fromInvoiceIdx !== undefined ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-2 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-2 relative">
                            <input
                              value={row.name}
                              onChange={e => updateRow(row._key, 'name', e.target.value)}
                              onFocus={() => setFocusedKey(row._key)}
                              onBlur={() => setTimeout(() => setFocusedKey(null), 150)}
                              placeholder="Item name"
                              className={inp2}
                            />
                            {matchedItems.length > 0 && (
                              <div className="absolute top-full left-2 right-2 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-28 overflow-y-auto">
                                {matchedItems.slice(0, 6).map(it => (
                                  <button key={it.id}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => { fillFromItem(row._key, it); setFocusedKey(null); }}
                                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 transition">
                                    {it.shortName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={row.qty} onChange={e => updateRow(row._key, 'qty', e.target.value)}
                              className={`${inp2} text-center`} />
                          </td>
                          <td className="px-2 py-2">
                            <input value={row.unit} onChange={e => updateRow(row._key, 'unit', e.target.value)}
                              className={`${inp2} text-center`} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={row.rate} onChange={e => updateRow(row._key, 'rate', e.target.value)}
                              className={`${inp2} text-center`} />
                          </td>
                          <td className="px-2 py-2">
                            <select value={row.gstRate} onChange={e => updateRow(row._key, 'gstRate', e.target.value)}
                              className={`${inp2} text-center`}>
                              {TAX_RATES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-700">{fmt2(row.amount)}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => {
                              if (row._fromInvoiceIdx !== undefined) {
                                setCheckedItems(prev => { const s = new Set(prev); s.delete(row._fromInvoiceIdx); return s; });
                              }
                              setRows(prev => prev.filter(r => r._key !== row._key));
                            }} className="text-slate-300 hover:text-red-400 transition">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-3">
                  <button onClick={() => setRows(prev => [...prev, emptyRow()])}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold transition">
                    <Plus size={12} /> Add Row
                  </button>
                  {invoiceData && (
                    <span className="text-xs text-slate-400 ml-auto">
                      Drag items from the invoice preview →
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes + payment + totals */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Payment Mode</label>
                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={inp}>
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Received</label>
                    <input type="number" value={totalReceived} onChange={e => setTotalReceived(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 self-start">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{fmtAmt(subtotal)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>GST</span><span>{fmtAmt(totalGst)}</span></div>
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2"><span>Total</span><span>{fmtAmt(grandTotal)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>Received</span><span>{fmtAmt(totalReceived || 0)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-rose-600"><span>Balance</span><span>{fmtAmt(balance)}</span></div>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT PANEL — invoice preview ════════ */}
          <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-slate-50/50">

            {/* Search bar */}
            <div className="px-4 pt-5 pb-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Original Sale Invoice</p>
              <div className="flex gap-2">
                <input
                  value={invoiceQuery}
                  onChange={e => setInvoiceQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchInvoice()}
                  placeholder="e.g. INV-0001"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
                />
                <button
                  onClick={searchInvoice}
                  disabled={invoiceLoading}
                  className="shrink-0 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  {invoiceLoading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Search size={13} />}
                  {invoiceLoading ? '' : 'Find'}
                </button>
              </div>
            </div>

            {/* Invoice content area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Placeholder */}
              {!invoiceLoading && !invoiceData && !invoiceError && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <FileText size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Enter an invoice number</p>
                  <p className="text-xs text-slate-300 mt-1">Items will appear here for selection</p>
                </div>
              )}

              {/* Error */}
              {invoiceError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{invoiceError}</p>
                </div>
              )}

              {/* Invoice found */}
              {invoiceData && (
                <div className="space-y-3">
                  {/* Invoice info card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 font-mono">{invoiceData.invoice}</span>
                      <span className="text-xs text-slate-400">{fmtDate(invoiceData.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {invoiceData.party?.name || invoiceData.partyName || 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total: <span className="font-semibold text-slate-700">{fmtAmt(invoiceData.grandTotal)}</span>
                    </p>
                  </div>

                  {/* Select all / clear all */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      {invoiceData.items?.length || 0} items
                      {checkedItems.size > 0 && ` · ${checkedItems.size} selected`}
                    </p>
                    <button
                      onClick={allSelected ? clearAllInvoiceItems : selectAllInvoiceItems}
                      className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition"
                    >
                      {allSelected ? 'Clear All' : 'Select All'}
                    </button>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1.5">
                    {(invoiceData.items || []).map((item, idx) => {
                      const checked = checkedItems.has(idx);
                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={e => handleDragStart(e, item, idx)}
                          onClick={() => toggleInvoiceItem(idx, item)}
                          className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition group
                            ${checked
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'}`}
                        >
                          {/* Checkbox */}
                          <div className={`shrink-0 w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center transition
                            ${checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-blue-400'}`}>
                            {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                          {/* Drag handle */}
                          <GripVertical size={13} className="shrink-0 text-slate-300 mt-0.5 group-hover:text-slate-400 cursor-grab active:cursor-grabbing" />
                          {/* Item details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {item.qty} {item.unit} × {fmtAmt(item.rate)}
                            </p>
                          </div>
                          {/* Amount */}
                          <span className={`text-xs font-bold shrink-0 ${checked ? 'text-blue-600' : 'text-slate-600'}`}>
                            {fmtAmt(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Invoice total */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Subtotal</span><span>{fmtAmt(invoiceData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>GST</span><span>{fmtAmt(invoiceData.gst)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-2">
                      <span>Invoice Total</span><span>{fmtAmt(invoiceData.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
          <button className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white transition">
            <Printer size={15} /> Print
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-6 py-2 rounded-xl text-sm font-bold transition">
              {saving ? 'Saving…' : 'Save Credit Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const DATE_OPTIONS = ['Today', 'This Month', 'Last Month', 'This Quarter', 'This Year'];

export default function SaleReturn() {
  const qc = useQueryClient();

  /* Filter state */
  const [dateLabel,   setDateLabel]   = useState('This Month');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [filterPay,   setFilterPay]   = useState('');
  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [rowMenu,     setRowMenu]     = useState(null);

  /* Apply date label → from/to */
  useEffect(() => {
    const { from, to } = getRange(dateLabel);
    setFromDate(from);
    setToDate(to);
  }, [dateLabel]);

  /* Fetch */
  const queryKey = ['sale-returns', filterType, filterPay, fromDate, toDate];
  const { data: returns = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => SaleReturnsAPI.getAll({
      type:    filterType || undefined,
      payment: filterPay  || undefined,
      from:    fromDate   || undefined,
      to:      toDate     || undefined,
    }),
  });

  /* Filtered by search */
  const rows = useMemo(() => {
    if (!search) return returns;
    const q = search.toLowerCase();
    return returns.filter(r =>
      (r.creditNoteNo || '').toLowerCase().includes(q) ||
      (r.partyName    || '').toLowerCase().includes(q)
    );
  }, [returns, search]);

  const totalAmount = rows.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
  const totalBalance = rows.reduce((s, r) => s + Math.max(0, Number(r.grandTotal || 0) - Number(r.totalReceived || 0)), 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Filter Bar Row 1 ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-2 flex-wrap">
        <Dropdown label="This Month" options={DATE_OPTIONS.slice(1)} value={dateLabel} onChange={v => setDateLabel(v || 'This Month')} />
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Between</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400" />
        <span className="text-xs text-slate-400">—</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400" />
        <Dropdown label="All Firms"  options={[]} value="" onChange={() => {}} />
        <Dropdown label="All Users"  options={[]} value="" onChange={() => {}} />
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition" title="Export Excel">
            <FileSpreadsheet size={15} />
          </button>
          <button className="p-1.5 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition" title="Print">
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar Row 2 ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-2 flex-wrap">
        <Dropdown label="Credit Note Type" options={RETURN_TYPES} value={filterType} onChange={setFilterType} width="w-44" />
        <Dropdown label="All Godown"        options={[]}            value=""           onChange={() => {}} />
        <Dropdown label="All Payment"       options={PAYMENT_MODES} value={filterPay}  onChange={setFilterPay} />
        <Dropdown label="All Additional"    options={[]}            value=""           onChange={() => {}} width="w-40" />
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-40 focus:outline-none focus:border-blue-400" />
        </div>
        <button className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition ml-1">Select All</button>
      </div>

      {/* ── Table Header ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by party / ref no..."
            className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-sm w-60 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition">
          <Plus size={15} /> Add Credit Note
        </button>
      </div>

      {/* ── Transactions Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ref No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Party Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Received</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr><td colSpan={12} className="py-16 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center">
                  <div className="text-slate-400 text-sm">No credit notes found</div>
                  <button onClick={() => setShowModal(true)}
                    className="mt-3 text-blue-500 hover:text-blue-700 text-sm font-semibold transition">
                    + Add your first credit note
                  </button>
                </td>
              </tr>
            ) : rows.map((r, idx) => {
              const gt      = Number(r.grandTotal    || 0);
              const recv    = Number(r.totalReceived || 0);
              const balance = Math.max(0, gt - recv);
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.creditNoteNo}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[160px] truncate">{r.partyName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">—</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtAmt(gt)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtAmt(recv)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600">{fmtAmt(balance)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.dueDate)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={r.paymentStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Print">
                        <Printer size={13} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Share">
                        <Share2 size={13} />
                      </button>
                      <div className="relative">
                        <button onClick={() => setRowMenu(rowMenu === r.id ? null : r.id)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                          <MoreVertical size={13} />
                        </button>
                        {rowMenu === r.id && (
                          <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-32 overflow-hidden">
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">View</button>
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-red-500">Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm font-bold text-teal-600">
          Total Amount: {fmtAmt(totalAmount)}
        </span>
        <span className="text-sm font-semibold text-slate-600">
          Balance: {fmtAmt(totalBalance)}
        </span>
      </div>

      {/* 3-dot menu overlay close */}
      {rowMenu && <div className="fixed inset-0 z-10" onClick={() => setRowMenu(null)} />}

      {showModal && (
        <AddCreditNoteModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['sale-returns'] }); }}

        />
      )}
    </div>
  );
}
