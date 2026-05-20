import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, Plus, Trash2, X,
  Printer, TrendingUp, Camera, FileText, File,
  Calculator, Settings,
} from 'lucide-react';
import { SalesAPI } from '../../api/sales.js';
import { ItemsAPI } from '../../api/items.js';
import { PartiesAPI } from '../../api/parties.js';
import toast from 'react-hot-toast';

/* ── Constants ── */
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chandigarh','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand',
  'Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
];
const UNITS = ['NO.','PCS','KG','G','LTR','ML','BOX','PKT','BAG','DOZ','MTR','SET'];
const TAX_RATES = ['','0','5','12','18','28'];
const PAYMENT_MODES = ['Cash','UPI','Card','Bank Transfer','Cheque','Credit'];
const TERMS_TEMPLATES = {
  'Sale Invoice': 'Your satisfaction is our priority. Please visit us again!',
  'Delivery':     'Goods once sold will not be taken back. Subject to local jurisdiction.',
  'Credit':       'Payment due within 30 days from the date of invoice.',
  'Custom':       '',
};

/* ── Helpers ── */
const pad  = (n) => String(n).padStart(2, '0');
const fmt2 = (n) => Number(n || 0).toFixed(2);

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

let _uid = 0;
const uid = () => ++_uid;

function emptyRow() {
  return {
    _key: uid(), name: '', description: '',
    itemCount: '', batchNo: '', expiryDate: '', mfgDate: '',
    mrp: '', size: '', qty: '', freeQty: '', unit: 'NO.',
    rate: '', gstRate: '',
  };
}

function calcRow(row, priceMode) {
  const qty     = Number(row.qty     || 0);
  const rate    = Number(row.rate    || 0);
  const gstRate = Number(row.gstRate || 0);
  const gross   = qty * rate;

  let taxable, gstAmt, amount;
  if (priceMode === 'withtax') {
    taxable = gross / (1 + gstRate / 100);
    gstAmt  = gross - taxable;
    amount  = gross;
  } else {
    taxable = gross;
    gstAmt  = taxable * gstRate / 100;
    amount  = taxable + gstAmt;
  }
  return {
    gstAmount: isNaN(gstAmt) ? 0 : +gstAmt.toFixed(2),
    amount:    isNaN(amount) ? 0 : +amount.toFixed(2),
  };
}

/* ── Item search cell ── */
function ItemSearchCell({ row, idx, allItems, onSelect, onNameChange }) {
  const [searchQ,    setSearchQ]    = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [open,       setOpen]       = useState(false);
  const ref = useRef(null);

  /* Debounce: fire API only after 300 ms of no typing */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const { data: apiResults, isFetching } = useQuery({
    queryKey:  ['items-search', debouncedQ],
    queryFn:   () => ItemsAPI.search(debouncedQ),
    select:    d => d.data,
    enabled:   debouncedQ.trim().length > 0,
    staleTime: 30_000,
  });

  /* Immediate local filter while API is in-flight; swap to API results once ready */
  const localMatches = searchQ.length > 0
    ? allItems.filter(it =>
        it.shortName.toLowerCase().includes(searchQ.toLowerCase()) ||
        (it.itemCode ?? '').toLowerCase().includes(searchQ.toLowerCase()),
      ).slice(0, 20)
    : allItems.slice(0, 15);

  const matches = (debouncedQ.trim().length > 0 && apiResults) ? apiResults : localMatches;

  const handleChange = e => {
    setSearchQ(e.target.value);
    onNameChange(idx, e.target.value);
    setOpen(true);
  };

  const handleFocus = () => { setSearchQ(''); setOpen(true); };

  const handleSelect = it => { onSelect(idx, it); setSearchQ(''); setOpen(false); };

  const displayValue = open ? searchQ : (row.name || '');

  function highlight(text, query) {
    if (!query) return text;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-yellow-100 text-gray-900 rounded-sm">{text.slice(i, i + query.length)}</mark>
        {text.slice(i + query.length)}
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="Name or item code…"
        className="w-full px-2 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded placeholder:text-gray-300"
      />
      {open && (matches.length > 0 || isFetching) && (
        <div className="absolute top-full left-0 w-72 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-52 overflow-y-auto">
          {isFetching && debouncedQ && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">Searching…</div>
          )}
          {matches.map(it => (
            <button key={it.id} type="button"
              onMouseDown={() => handleSelect(it)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
              {it.itemCode && (
                <span className="shrink-0 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                  {highlight(it.itemCode, searchQ)}
                </span>
              )}
              <span className="flex-1 text-xs text-gray-800 truncate">
                {highlight(it.shortName, searchQ)}
              </span>
              <span className="shrink-0 text-xs font-semibold text-gray-600">
                ₹{fmt2(it.salesPrice)}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && !isFetching && matches.length === 0 && searchQ.length > 0 && (
        <div className="absolute top-full left-0 w-72 bg-white border border-gray-200 rounded shadow-lg z-50 px-3 py-3 text-xs text-gray-400">
          No items found for &ldquo;{searchQ}&rdquo;
        </div>
      )}
    </div>
  );
}

/* ── Party combo ── */
function PartyCombo({ query, onQueryChange, onSelect, parties, isCredit, hasError }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const q = query.toLowerCase();
  const filtered = q.length === 0 ? parties
    : parties.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q)
      );
  const borderCls = hasError
    ? 'border-red-400 focus:border-red-500'
    : 'border-gray-300 focus:border-blue-400';
  return (
    <div ref={ref} className="relative flex-1">
      <input type="text" value={query}
        onChange={e => { onQueryChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={isCredit ? 'Party Name / Phone *' : 'Billing Name (Optional)'}
        className={`w-full border rounded px-3 py-2 text-sm text-gray-800
          focus:outline-none placeholder:text-gray-400 bg-white ${borderCls}`}
      />
      {query && (
        <button type="button" onClick={() => { onQueryChange(''); onSelect(null); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button"
              onMouseDown={() => { onSelect(p); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-blue-50 text-left">
              <span className="text-sm text-gray-800">{p.name}</span>
              {p.phone && <span className="text-xs text-gray-400">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}
      {hasError && (
        <p className="absolute -bottom-4 left-0 text-xs text-red-500">Party is required for credit sale</p>
      )}
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ on, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-blue-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/* ── Cell input ── */
const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded';

/* ══════════════════════════════════════════
   AddSale
══════════════════════════════════════════ */
export default function AddSale() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [isCash,        setIsCash]        = useState(true);
  const [priceMode,     setPriceMode]     = useState('withtax');
  const [invoiceDate,   setInvoiceDate]   = useState(todayYMD());
  const [invoiceTime]                     = useState(nowTime());
  const [stateSupply,   setStateSupply]   = useState('Tamil Nadu');
  const [paymentMode,   setPaymentMode]   = useState('Cash');
  const [partyId,       setPartyId]       = useState('');
  const [partyQuery,    setPartyQuery]    = useState('');
  const [phone,         setPhone]         = useState('');
  const [billingAddr,   setBillingAddr]   = useState('');
  const [shippingAddr,  setShippingAddr]  = useState('');
  const [rows,          setRows]          = useState([emptyRow(), emptyRow()]);
  const [vehicleNo,     setVehicleNo]     = useState('');
  const [dispatchLoc,   setDispatchLoc]   = useState('');
  const [deliveryDate,  setDeliveryDate]  = useState('');
  const [deliveryLoc,   setDeliveryLoc]   = useState('');
  const [adjustment,    setAdjustment]    = useState('');
  const [roundOffOn,    setRoundOffOn]    = useState(true);
  const [termsTemplate, setTermsTemplate] = useState('Sale Invoice');
  const [termsText,     setTermsText]     = useState(TERMS_TEMPLATES['Sale Invoice']);
  const [totalReceived, setTotalReceived] = useState('');
  const [isSaving,      setIsSaving]      = useState(false);
  const [partyError,    setPartyError]    = useState(false);

  /* ── Queries ── */
  const { data: invoiceData } = useQuery({
    queryKey: ['next-invoice'], queryFn: SalesAPI.getNextNumber,
    select: d => d.data, staleTime: Infinity,
  });
  const invoiceNo = invoiceData?.invoice ?? '—';

  const { data: allItems   = [] } = useQuery({ queryKey: ['items'],   queryFn: ItemsAPI.getAll,   select: d => d.data });
  const { data: allParties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll, select: d => d.data });

  /* ── Row helpers ── */
  const updateRow = (idx, key, val) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  const selectItem = (idx, product) =>
    setRows(prev => prev.map((r, i) => i !== idx ? r : {
      ...r,
      name:    product.shortName,
      unit:    product.uom  || 'NO.',
      mrp:     String(Number(product.mrp)        || ''),
      rate:    String(Number(product.salesPrice) || ''),
      gstRate: String(Number(product.gstRate)    || ''),
    }));

  const addRow    = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = idx => setRows(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));

  /* ── Computed ── */
  const computed = useMemo(() => rows.map(r => ({ ...r, ...calcRow(r, priceMode) })), [rows, priceMode]);

  const totals = useMemo(() => {
    const count    = computed.filter(r => r.name).length;
    const qty      = computed.reduce((s, r) => s + Number(r.qty     || 0), 0);
    const freeQty  = computed.reduce((s, r) => s + Number(r.freeQty || 0), 0);
    const taxAmt   = computed.reduce((s, r) => s + r.gstAmount, 0);
    const amount   = computed.reduce((s, r) => s + r.amount, 0);
    const adj      = Number(adjustment || 0);
    const subtotal = amount - taxAmt;
    const rawTotal = amount + adj;
    const roundOff = roundOffOn ? Math.round(rawTotal) - rawTotal : 0;
    const grandTotal = rawTotal + roundOff;
    return { count, qty, freeQty, taxAmt, subtotal, amount, adj, roundOff, grandTotal };
  }, [computed, adjustment, roundOffOn]);

  const changeGiven = Math.max(0, Number(totalReceived || 0) - totals.grandTotal);

  const handlePartySelect = p => {
    if (!p) { setPartyId(''); setPartyQuery(''); setPhone(''); setBillingAddr(''); }
    else { setPartyId(String(p.id)); setPartyQuery(p.name); setPhone(p.phone || ''); setBillingAddr(p.address || ''); }
  };

  const handleTemplateChange = tmpl => {
    setTermsTemplate(tmpl);
    setTermsText(TERMS_TEMPLATES[tmpl] ?? '');
  };

  /* ── Save ── */
  const createMut = useMutation({
    mutationFn: SalesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['next-invoice'] });
      toast.success('Sale saved');
      navigate('/sales/invoice');
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to save'),
  });

  const handleSave = async () => {
    if (!isCash && !partyId) { setPartyError(true); toast.error('Select a party for credit sale'); return; }
    const filled = computed.filter(r => r.name);
    if (!filled.length) { toast.error('Add at least one item'); return; }
    setIsSaving(true);
    try {
      await createMut.mutateAsync({
        date:             invoiceDate,
        customerName:     partyQuery || 'Walk-in Customer',
        partyId:          partyId ? Number(partyId) : undefined,
        phone:            phone        || undefined,
        billingAddress:   billingAddr  || undefined,
        shippingAddress:  shippingAddr || undefined,
        stateOfSupply:    stateSupply,
        paymentMode,
        subtotal:  +computed.reduce((s, r) => {
          const q = Number(r.qty || 0), rt = Number(r.rate || 0);
          return s + (priceMode === 'withtax' ? q * rt / (1 + Number(r.gstRate || 0) / 100) : q * rt);
        }, 0).toFixed(2),
        gst:              +totals.taxAmt.toFixed(2),
        grandTotal:       +totals.grandTotal.toFixed(2),
        totalReceived:    Number(totalReceived || 0),
        changeGiven:      +changeGiven.toFixed(2),
        paymentStatus:    isCash ? 'Paid' : (Number(totalReceived || 0) >= totals.grandTotal ? 'Paid' : 'Unpaid'),
        notes:            termsText   || undefined,
        terms:            termsText   || undefined,
        vehicleNo:        vehicleNo   || undefined,
        dispatchLocation: dispatchLoc || undefined,
        deliveryDate:     deliveryDate || undefined,
        deliveryLocation: deliveryLoc  || undefined,
        items: filled.map(r => ({
          name:      r.name,
          itemCount: Number(r.itemCount || 0),
          batchNo:   r.batchNo    || undefined,
          expiryDate: r.expiryDate || undefined,
          mfgDate:   r.mfgDate    || undefined,
          mrp:       Number(r.mrp     || 0),
          size:      r.size       || undefined,
          qty:       Number(r.qty     || 0),
          freeQty:   Number(r.freeQty || 0),
          unit:      r.unit       || undefined,
          rate:      Number(r.rate    || 0),
          gstRate:   Number(r.gstRate || 0),
          gstAmount: r.gstAmount,
          amount:    r.amount,
        })),
      });
    } finally { setIsSaving(false); }
  };

  /* ── th helper ── */
  const TH = ({ children, rowSpan, colSpan, className = '' }) => (
    <th rowSpan={rowSpan} colSpan={colSpan}
      className={`px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide
        border-b border-r border-gray-200 bg-gray-50 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 text-gray-800">

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex items-end bg-gray-200 border-b border-gray-300 px-3 pt-1.5 gap-2">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-t border-l border-r border-t border-gray-300 text-sm font-medium text-gray-700 -mb-px z-10">
          Sale #1
          <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        </div>
        <button type="button" className="mb-1 p-0.5 text-gray-500 hover:text-gray-700">
          <Plus size={15} />
        </button>
        <div className="ml-auto mb-1 flex items-center gap-1">
          <button className="p-1 text-gray-500 hover:bg-gray-300 rounded"><Calculator size={14} /></button>
          <button className="p-1 text-gray-500 hover:bg-gray-300 rounded"><Settings size={14} /></button>
          <button onClick={() => navigate(-1)} className="p-1 text-gray-500 hover:bg-gray-300 rounded"><X size={14} /></button>
        </div>
      </div>

      {/* ── Sale header bar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Sale</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${!isCash ? 'text-blue-600' : 'text-gray-400'}`}>Credit</span>
          <Toggle on={isCash} onToggle={() => { setIsCash(v => !v); setPartyError(false); }} />
          <span className={`text-xs font-medium ${isCash ? 'text-blue-600' : 'text-gray-400'}`}>Cash</span>
        </div>
        <div className="ml-auto">
          <select className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white focus:outline-none text-gray-700">
            <option>Godown: Main Go...</option>
          </select>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Customer + Invoice meta ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-4">
          <div className="flex gap-10 justify-between">

            {/* Left — customer */}
            <div className="w-[28rem] shrink-0 space-y-2.5">
              <div className="flex gap-2">
                <PartyCombo query={partyQuery}
                  onQueryChange={q => { setPartyQuery(q); setPartyError(false); }}
                  onSelect={p => { handlePartySelect(p); setPartyError(false); }}
                  parties={allParties}
                  isCredit={!isCash}
                  hasError={partyError} />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Phone No."
                  className="w-36 shrink-0 border border-gray-300 rounded px-3 py-2 text-sm
                    focus:outline-none focus:border-blue-400 placeholder:text-gray-400 bg-white" />
              </div>
              <div className="flex gap-2">
                <textarea value={billingAddr} onChange={e => setBillingAddr(e.target.value)}
                  placeholder="Billing Address" rows={3}
                  className="w-52 border border-gray-300 rounded px-3 py-2 text-sm resize-none
                    focus:outline-none focus:border-blue-400 placeholder:text-gray-400 bg-white" />
                <textarea value={shippingAddr} onChange={e => setShippingAddr(e.target.value)}
                  placeholder="Shipping Address" rows={3}
                  className="w-52 border border-gray-300 rounded px-3 py-2 text-sm resize-none
                    focus:outline-none focus:border-blue-400 placeholder:text-gray-400 bg-white" />
              </div>
            </div>

            {/* Right — invoice meta */}
            <div className="w-64 shrink-0 space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Invoice Number</span>
                <span className="text-sm font-bold text-gray-800 font-mono">{invoiceNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Invoice Date</span>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                  className="text-sm text-gray-800 border border-gray-300 rounded px-2 py-0.5
                    focus:outline-none focus:border-blue-400 bg-white" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Time</span>
                <span className="text-sm text-gray-600">{invoiceTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">State of supply</span>
                <select value={stateSupply} onChange={e => setStateSupply(e.target.value)}
                  className="text-sm text-gray-800 border border-gray-300 rounded px-2 py-0.5
                    focus:outline-none focus:border-blue-400 bg-white max-w-[160px]">
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Payment Mode</span>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  className="text-sm text-gray-800 border border-gray-300 rounded px-2 py-0.5
                    focus:outline-none focus:border-blue-400 bg-white">
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Items table ── */}
        <div className="bg-white border-b border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              {/* Row 1 */}
              <tr>
                <TH rowSpan={2} className="w-8 text-center">#</TH>
                <TH rowSpan={2} className="min-w-[160px]">Item</TH>
                <TH rowSpan={2} className="min-w-[110px]">Description</TH>
                <TH rowSpan={2} className="w-14 text-right">Count</TH>
                <TH rowSpan={2} className="w-20">Batch No.</TH>
                <TH rowSpan={2} className="w-[100px]">Exp. Date</TH>
                <TH rowSpan={2} className="w-[100px]">Mfg. Date</TH>
                <TH rowSpan={2} className="w-16 text-right">MRP</TH>
                <TH rowSpan={2} className="w-14">Size</TH>
                <TH rowSpan={2} className="w-16 text-right">QTY</TH>
                <TH rowSpan={2} className="w-16 text-right">Free QTY</TH>
                <TH rowSpan={2} className="w-16">Unit</TH>
                <TH rowSpan={2} className="w-24 text-right">
                  <div>Price/Unit</div>
                  <select value={priceMode} onChange={e => setPriceMode(e.target.value)}
                    className="text-[10px] font-normal text-blue-600 bg-transparent border-0 focus:outline-none cursor-pointer mt-0.5 appearance-none">
                    <option value="withtax">With Tax ▾</option>
                    <option value="withouttax">Without Tax ▾</option>
                  </select>
                </TH>
                <th colSpan={2} className="px-2 py-1 text-center text-[10px] font-semibold text-gray-500 uppercase
                  border-b border-r border-gray-200 bg-gray-50">Tax</th>
                <TH rowSpan={2} className="w-24 text-right">Amount</TH>
                <th rowSpan={2} className="w-8 border-b border-gray-200 bg-gray-50 text-center">
                  <button type="button" onClick={addRow} className="text-blue-500 hover:text-blue-700 p-0.5">
                    <Plus size={14} />
                  </button>
                </th>
              </tr>
              {/* Row 2 — sub-headers */}
              <tr>
                <th className="px-2 py-1 text-center text-[10px] font-semibold text-gray-400 border-b border-r border-gray-200 bg-gray-50 w-16">%</th>
                <th className="px-2 py-1 text-right text-[10px] font-semibold text-gray-400 border-b border-r border-gray-200 bg-gray-50 w-20">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {computed.map((row, idx) => (
                <tr key={row._key} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-center text-gray-400 border-r border-gray-100 text-xs">{idx + 1}</td>
                  <td className="border-r border-gray-100 p-0">
                    <ItemSearchCell row={row} idx={idx} allItems={allItems}
                      onSelect={selectItem} onNameChange={(i, v) => updateRow(i, 'name', v)} />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="text" value={row.description}
                      onChange={e => updateRow(idx, 'description', e.target.value)} className={cellCls} />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="number" value={row.itemCount}
                      onChange={e => updateRow(idx, 'itemCount', e.target.value)}
                      className={`${cellCls} text-right`} placeholder="0" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="text" value={row.batchNo}
                      onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cellCls} />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="text" value={row.expiryDate}
                      onChange={e => updateRow(idx, 'expiryDate', e.target.value)}
                      className={cellCls} placeholder="MM/YY" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="text" value={row.mfgDate}
                      onChange={e => updateRow(idx, 'mfgDate', e.target.value)}
                      className={cellCls} placeholder="MM/YY" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="number" value={row.mrp}
                      onChange={e => updateRow(idx, 'mrp', e.target.value)}
                      className={`${cellCls} text-right`} placeholder="0.00" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="text" value={row.size}
                      onChange={e => updateRow(idx, 'size', e.target.value)} className={cellCls} />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="number" value={row.qty}
                      onChange={e => updateRow(idx, 'qty', e.target.value)}
                      className={`${cellCls} text-right font-semibold`} placeholder="0" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="number" value={row.freeQty}
                      onChange={e => updateRow(idx, 'freeQty', e.target.value)}
                      className={`${cellCls} text-right`} placeholder="0" />
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <select value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}
                      className={`${cellCls} appearance-none`}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="border-r border-gray-100 p-0">
                    <input type="number" value={row.rate}
                      onChange={e => updateRow(idx, 'rate', e.target.value)}
                      className={`${cellCls} text-right`} placeholder="0.00" />
                  </td>
                  {/* Tax % */}
                  <td className="border-r border-gray-100 p-0">
                    <select value={row.gstRate} onChange={e => updateRow(idx, 'gstRate', e.target.value)}
                      className={`${cellCls} appearance-none`}>
                      {TAX_RATES.map(r => <option key={r} value={r}>{r ? `${r}%` : 'Select'}</option>)}
                    </select>
                  </td>
                  {/* Tax Amount (computed) */}
                  <td className="border-r border-gray-100 px-1.5 py-1 text-right text-gray-500">
                    {row.gstAmount > 0 ? row.gstAmount.toFixed(2) : ''}
                  </td>
                  {/* Amount */}
                  <td className="border-r border-gray-100 px-1.5 py-1 text-right font-semibold text-gray-800">
                    {row.amount > 0 ? row.amount.toFixed(2) : ''}
                  </td>
                  <td className="p-0 text-center">
                    <button type="button" onClick={() => removeRow(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                {/* cols 1-3: ADD ROW */}
                <td colSpan={3} className="px-3 py-2">
                  <button type="button" onClick={addRow}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                    <Plus size={12} /> ADD ROW
                  </button>
                </td>
                {/* col 4: TOTAL label */}
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-600 border-l border-gray-200">
                  TOTAL
                </td>
                {/* cols 5-9: BATCH EXP MFG MRP SIZE (empty) */}
                <td colSpan={5} />
                {/* col 10: QTY */}
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-700">
                  {totals.qty > 0 ? totals.qty.toFixed(2) : '0'}
                </td>
                {/* col 11: FREE QTY */}
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-700">
                  {totals.freeQty > 0 ? totals.freeQty.toFixed(2) : '0'}
                </td>
                {/* cols 12-14: UNIT PRICE TAX% (empty) */}
                <td colSpan={3} />
                {/* col 17: TAX AMT */}
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-700">
                  {totals.taxAmt.toFixed(2)}
                </td>
                {/* col 18: AMOUNT */}
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-800">
                  {totals.amount.toFixed(2)}
                </td>
                {/* col 19: delete */}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Bottom section ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-4">
          <div className="flex gap-8">

            {/* Transport */}
            <div className="w-44 shrink-0 space-y-2">
              {[
                ['Vehicle Number',    vehicleNo,    setVehicleNo,   'text'],
                ['Dispatch Location', dispatchLoc,  setDispatchLoc, 'text'],
                ['Delivery Date',     deliveryDate, setDeliveryDate,'date'],
                ['Delivery Location', deliveryLoc,  setDeliveryLoc, 'text'],
              ].map(([ph, val, set, type]) => (
                <input key={ph} type={type} value={val} onChange={e => set(e.target.value)}
                  placeholder={ph}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm
                    focus:outline-none focus:border-blue-400 placeholder:text-gray-400 bg-white" />
              ))}
            </div>

            {/* Docs */}
            <div className="w-48 shrink-0 space-y-3 pt-1">
              {[
                [FileText, 'ADD DESCRIPTION'],
                [Camera,   'ADD IMAGE'],
                [File,     'ADD DOCUMENT'],
              ].map(([Icon, label]) => (
                <button key={label} type="button"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
                  <Icon size={16} className="text-gray-400" /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Summary + Payment */}
            <div className="w-80 shrink-0 space-y-2">

              {/* Subtotal row */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-sm text-gray-700">{fmt2(totals.subtotal)}</span>
              </div>

              {/* Tax row */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Tax</span>
                <span className="text-sm text-gray-700">{fmt2(totals.taxAmt)}</span>
              </div>

              {/* Adjustment */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600 shrink-0">Adjustment</span>
                <input type="number" value={adjustment} onChange={e => setAdjustment(e.target.value)}
                  placeholder="0"
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right
                    focus:outline-none focus:border-blue-400 bg-white" />
              </div>

              {/* Round Off + Total */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <input type="checkbox" id="roundoff" checked={roundOffOn}
                    onChange={e => setRoundOffOn(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <label htmlFor="roundoff" className="text-sm text-gray-600 cursor-pointer">Round Off</label>
                  <span className="text-sm text-gray-500 w-14 text-right">
                    {roundOffOn ? totals.roundOff.toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-sm font-bold text-gray-800 w-28 text-right">
                    {totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2 space-y-2">
                {/* Received */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600 shrink-0">Received</span>
                  <input type="number" value={totalReceived} onChange={e => setTotalReceived(e.target.value)}
                    placeholder="0.00" min="0"
                    className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right
                      focus:outline-none focus:border-blue-400 bg-white" />
                </div>

                {/* Change Given */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Change Given</span>
                  <span className={`text-sm font-semibold w-32 text-right ${changeGiven > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {changeGiven.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="bg-white px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Terms &amp; Conditions</h3>
          <div className="border border-gray-300 rounded w-72 px-3 py-2 mb-2">
            <span className="text-[10px] text-gray-500 block mb-0.5">Terms &amp; Conditions</span>
            <div className="flex items-center">
              <select value={termsTemplate} onChange={e => handleTemplateChange(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent border-0 focus:outline-none cursor-pointer">
                {Object.keys(TERMS_TEMPLATES).map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={13} className="text-gray-400 shrink-0" />
            </div>
          </div>
          <textarea value={termsText} onChange={e => setTermsText(e.target.value)}
            placeholder="Enter terms & conditions…" rows={4}
            className="w-72 border border-gray-300 rounded px-3 py-2 text-sm resize-none
              focus:outline-none focus:border-blue-400 placeholder:text-gray-400 bg-white" />
        </div>

      </div>{/* end scrollable */}

      {/* ── Footer ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-200">
        <button className="p-2 text-gray-400 hover:text-gray-600 transition">
          <TrendingUp size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button onClick={handleSave} disabled={isSaving || createMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
              <Printer size={14} /> Print
            </button>
            <div className="w-px bg-gray-300" />
            <button className="px-2 py-2 text-gray-500 hover:bg-gray-50 transition">
              <ChevronDown size={13} />
            </button>
          </div>
          <button onClick={handleSave} disabled={isSaving || createMut.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition disabled:opacity-60">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

    </div>
  );
}
