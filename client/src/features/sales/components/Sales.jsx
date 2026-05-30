import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, X, Search,
  Calculator, Settings, Printer, Camera,
} from 'lucide-react';
import { SalesAPI } from '@features/sales/resources/sales-service';
import { ItemsAPI } from '@features/inventory/resources/inventory-service';
import { PartiesAPI } from '@features/parties/resources/parties-service';
import { PaymentsAPI } from '@features/payments/resources/payments-service';
import { SettingsAPI } from '@features/settings/resources/settings-service';
import { toast } from 'sonner';
import { INDIAN_STATES, UNITS, TAX_RATES, PAYMENT_MODES, TERMS_TEMPLATES, DEFAULT_STATE } from '@constants';
import { pad, fmt2, todayYMD, nowTime, formatExpDate } from '@utils/formatters';
import { calcRow, backCalcRate } from '@utils/calc';
import { printSaleInvoice } from '../resources/printSaleInvoice';
import CameraScanner from '@components/CameraScanner';

let _uid = 0;
const uid = () => ++_uid;

function emptyRow() {
  return {
    _key: uid(), productId: null, name: '', description: '',
    itemCount: '', batchNo: '', expiryDate: '', mfgDate: '',
    mrp: '', size: '', qty: '', freeQty: '', unit: 'NO.',
    rate: '', gstRate: '', total: '',
  };
}

function makeTabData() {
  return {
    id:            uid(),
    invoiceDate:   todayYMD(),
    invoiceTime:   nowTime(),
    isCash:        true,
    priceMode:     'withtax',
    stateSupply:   DEFAULT_STATE,
    paymentMode:   'Cash',
    partyId:       '',
    partyQuery:    '',
    phone:         '',
    billingAddr:   '',
    shippingAddr:  '',
    rows:          [emptyRow(), emptyRow(), emptyRow()],
    needsTransport: false,
    vehicleNo:     '',
    dispatchLoc:   '',
    deliveryDate:  '',
    deliveryLoc:   '',
    adjustment:    '',
    roundOffOn:    true,
    termsTemplate: 'Sale Invoice',
    termsText:     TERMS_TEMPLATES['Sale Invoice'],
    totalReceived: '',
    description:   '',
    partyError:    false,
    invoiceNo:     '…',
  };
}

/* ── Item search cell ── */
function ItemSearchCell({ row, idx, allItems, onSelect, onNameChange, onAfterSelect }) {
  const [searchQ,    setSearchQ]    = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [open,       setOpen]       = useState(false);
  const [dropPos,    setDropPos]    = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    const fn = e => {
      if (inputRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const calcPos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom, left: r.left });
    }
  };

  const { data: apiResults, isFetching } = useQuery({
    queryKey:  ['items-search', debouncedQ],
    queryFn:   () => ItemsAPI.search(debouncedQ),
    select:    d => d.data,
    enabled:   debouncedQ.trim().length > 0,
    staleTime: 30_000,
  });

  const localMatches = searchQ.length > 0
    ? allItems.filter(it =>
        it.shortName.toLowerCase().includes(searchQ.toLowerCase()) ||
        (it.itemCode ?? '').toLowerCase().includes(searchQ.toLowerCase()),
      ).slice(0, 20)
    : allItems.slice(0, 15);

  const matches = (debouncedQ.trim().length > 0 && apiResults) ? apiResults : localMatches;

  const handleChange = e => { setSearchQ(e.target.value); onNameChange(idx, e.target.value); calcPos(); setOpen(true); };
  const handleFocus  = () => { setSearchQ(''); calcPos(); setOpen(true); };
  const handleSelect = it => {
    onSelect(idx, it);
    setSearchQ('');
    setOpen(false);
    setTimeout(() => {
      const qtyInput = document.querySelector(`[data-qty-row="${idx}"]`);
      if (qtyInput) { qtyInput.focus(); qtyInput.select(); }
    }, 0);
  };
  const displayValue = open ? searchQ : (row.name || '');

  function highlight(text, query) {
    if (!query) return text;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return text;
    return (<>{text.slice(0, i)}<mark className="bg-yellow-100 text-gray-900 rounded-sm">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>);
  }

  const showDrop = open && (matches.length > 0 || isFetching || (searchQ.length > 0 && !isFetching));

  return (
    <div className="relative">
      <input ref={inputRef} type="text" value={displayValue} onChange={handleChange} onFocus={handleFocus}
        placeholder="Name or item code…"
        className="w-full px-2 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded placeholder:text-gray-300" />
      {showDrop && createPortal(
        <div ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: '18rem', zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto">
          {isFetching && debouncedQ && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">Searching…</div>
          )}
          {matches.map(it => (
            <button key={it.id} type="button" onMouseDown={() => handleSelect(it)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
              {it.itemCode && (
                <span className="shrink-0 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                  {highlight(it.itemCode, searchQ)}
                </span>
              )}
              <span className="flex-1 text-xs text-gray-800 truncate">{highlight(it.shortName, searchQ)}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-600">₹{fmt2(it.salesPrice)}</span>
            </button>
          ))}
          {matches.length === 0 && !isFetching && searchQ.length > 0 && (
            <div className="px-3 py-3 text-xs text-gray-400">No items found for "{searchQ}"</div>
          )}
        </div>,
        document.body
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
    : parties.filter(p => p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q));
  const borderCls = hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-400';
  const labelTxt  = isCredit ? 'Party Name / Phone *' : 'Billing Name (Optional)';
  return (
    <div ref={ref} className="relative flex-1">
      <input type="text" value={query}
        onChange={e => { onQueryChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder=" "
        className={`peer w-full border rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
          focus:outline-none bg-white ${borderCls}`} />
      <label className={`absolute left-3 top-1.5 text-[10px] pointer-events-none
        transition-all duration-150
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-blue-500
        ${hasError ? 'text-red-400' : 'text-gray-400'}`}>
        {labelTxt}
      </label>
      {query && (
        <button type="button" onClick={() => { onQueryChange(''); onSelect(null); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button" onMouseDown={() => { onSelect(p); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-blue-50 text-left">
              <span className="text-sm text-gray-800">{p.name}</span>
              {p.phone && <span className="text-xs text-gray-400">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}
      {hasError && (
        <p className="absolute -bottom-4 left-0 text-xs text-red-500">Party required for credit sale</p>
      )}
    </div>
  );
}

/* ── Floating label input ── */
function FloatInput({ label, value, onChange, type = 'text', wrapperClass = '', inputClass = '' }) {
  return (
    <div className={`relative ${wrapperClass}`}>
      <input type={type} value={value} onChange={onChange} placeholder=" "
        className={`peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
          focus:outline-none focus:border-blue-400 bg-white ${inputClass}`} />
      <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none
        transition-all duration-150
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-blue-500">
        {label}
      </label>
    </div>
  );
}

/* ── Floating label textarea ── */
function FloatTextarea({ label, value, onChange, rows = 3, wrapperClass = '' }) {
  return (
    <div className={`relative ${wrapperClass}`}>
      <textarea value={value} onChange={onChange} rows={rows} placeholder=" "
        className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
          resize-none focus:outline-none focus:border-blue-400 bg-white" />
      <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none
        transition-all duration-150
        peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-blue-500">
        {label}
      </label>
    </div>
  );
}

/* ── Non-negative number input ── */
function NonNegativeNumberInput({ value, onValueChange, allowEmpty = true, className = '', ...props }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (allowEmpty && raw === '') { onValueChange(''); return; }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    onValueChange(num < 0 ? '0' : raw);
  };

  return (
    <input
      type="number"
      value={value}
      onKeyDown={e => e.key === '-' && e.preventDefault()}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}

const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded';

/* ══════════════════════════════════════════
   Sale Page
══════════════════════════════════════════ */
export default function SalePage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving,     setIsSaving]     = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);

  /* ── Queries ── */
  const { data: invoiceData } = useQuery({
    queryKey: ['next-invoice'], queryFn: SalesAPI.getNextNumber,
    staleTime: 0,
  });
  const { data: allItems    = [] } = useQuery({ queryKey: ['items'],   queryFn: ItemsAPI.getAll });
  const { data: allParties  = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: scanProducts = [] } = useQuery({ queryKey: ['items'],  queryFn: ItemsAPI.getAll });
  const { data: payOptions  = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });
  const { data: settings }          = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get, staleTime: 60_000 });
  const PAYMENT_MODES = payOptions.length ? payOptions.map(o => o.name) : PAYMENT_MODES_FALLBACK;

  /* ── Tabs ── */
  const [tabs,     setTabs]     = useState(() => [makeTabData()]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);

  /* When server invoice data arrives, stamp it onto any tab still showing '…' */
  useEffect(() => {
    if (!invoiceData?.invoice) return;
    setTabs(prev => prev.map((t, i) =>
      t.invoiceNo === '…' && i === prev.findIndex(x => x.invoiceNo === '…')
        ? { ...t, invoiceNo: invoiceData.invoice }
        : t
    ));
  }, [invoiceData]);

  const tab    = tabs.find(t => t.id === activeId) ?? tabs[0];
  const setTab = patch => setTabs(prev => prev.map(t =>
    t.id === activeId ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t
  ));

  const addTab = () => {
    const newTab = makeTabData();
    setTabs(prev => [...prev, newTab]);
    setActiveId(newTab.id);
  };

  const closeTab = tabId => {
    if (tabs.length === 1) { navigate(-1); return; }
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeId === tabId) setActiveId(remaining[0].id);
  };

  /* ── Row helpers ── */
  const normalizeCount = (val) => {
    if (val === '') return val;
    const num = Number(val);
    if (Number.isNaN(num)) return val;
    return num < 0 ? '0' : val;
  };
  const updateRow = (idx, key, val) => {
    const nextVal = ['itemCount', 'qty', 'freeQty'].includes(key) ? normalizeCount(val) : val;
    setTab(t => ({ rows: t.rows.map((r, i) => i !== idx ? r : {
      ...r, [key]: nextVal,
      ...(['qty', 'rate', 'gstRate'].includes(key) ? { total: '' } : {}),
    }) }));
  };

  const updateRowTotal = (idx, val) =>
    setTab(t => ({ rows: t.rows.map((r, i) => {
      if (i !== idx) return r;
      const newRate = val === '' ? '' : String(backCalcRate(val, r.qty, r.gstRate, t.priceMode));
      return { ...r, total: val, rate: newRate };
    }) }));

  const selectItem = (idx, product) =>
    setTab(t => ({
      rows: t.rows.map((r, i) => i !== idx ? r : {
        ...r,
        productId:   product.id,
        name:        product.shortName,
        description: product.description || r.description,
        itemCount:   product.pcsPerUnit != null ? String(product.pcsPerUnit) : r.itemCount,
        batchNo:     product.batch      || '',
        expiryDate:  formatExpDate(product.expiryDate),
        mfgDate:     r.mfgDate,
        mrp:         product.mrp        != null ? String(+product.mrp)        : r.mrp,
        unit:        product.uom        || 'NO.',
        rate:        product.salesPrice != null ? String(+product.salesPrice) : r.rate,
        gstRate:     product.gstRate    != null ? String(+product.gstRate)    : r.gstRate,
        qty:         '1',
        total:       '',
      }),
    }));

  const addRow    = () => setTab(t => ({ rows: [...t.rows, emptyRow()] }));
  const removeRow = idx => setTab(t => ({
    rows: t.rows.length <= 1 ? t.rows : t.rows.filter((_, i) => i !== idx),
  }));

  const [scanSearch,  setScanSearch]  = useState('');
  const [scanShowAll, setScanShowAll] = useState(false);
  const scanRef = useRef(null);

  const filteredScan = scanSearch.trim()
    ? scanProducts.filter(p =>
        (p.shortName || '').toLowerCase().includes(scanSearch.toLowerCase()) ||
        (p.itemCode  || '').toLowerCase().includes(scanSearch.toLowerCase())
      )
    : [];
  const scanDropList = scanShowAll && !scanSearch.trim() ? scanProducts : filteredScan;
  const scanDropOpen = !!(scanSearch.trim() || scanShowAll);

  const addScannedItem = (product) => {
    setTab(t => {
      const existIdx = t.rows.findIndex(r => r.productId === product.id);
      if (existIdx >= 0) {
        return { rows: t.rows.map((r, i) => i !== existIdx ? r : { ...r, qty: String(Number(r.qty || 0) + 1) }) };
      }
      const filled = {
        ...emptyRow(),
        productId:  product.id,
        name:       product.shortName,
        batchNo:    product.batch        || '',
        expiryDate: formatExpDate(product.expiryDate),
        mrp:        product.mrp        != null ? String(+product.mrp)        : '',
        unit:       product.uom        || 'NO.',
        rate:       product.salesPrice != null ? String(+product.salesPrice) : '',
        gstRate:    product.gstRate    != null ? String(+product.gstRate)    : '',
        qty:        '1',
      };
      const emptyIdx = t.rows.findIndex(r => !r.name);
      const rows = emptyIdx >= 0
        ? t.rows.map((r, i) => i === emptyIdx ? filled : r)
        : [...t.rows, filled];
      return { rows };
    });
    setScanSearch('');
    setScanShowAll(false);
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  /* ── Computed totals ── */
  const computed = useMemo(() =>
    tab.rows.map(r => ({ ...r, ...calcRow(r, tab.priceMode) })),
    [tab.rows, tab.priceMode],
  );

  const totals = useMemo(() => {
    const count    = computed.filter(r => r.name).length;
    const qty      = computed.reduce((s, r) => s + Number(r.qty     || 0), 0);
    const freeQty  = computed.reduce((s, r) => s + Number(r.freeQty || 0), 0);
    const taxAmt   = computed.reduce((s, r) => s + r.gstAmount, 0);
    const amount   = computed.reduce((s, r) => s + r.amount, 0);
    const adj      = Number(tab.adjustment || 0);
    const subtotal = amount - taxAmt;
    const rawTotal = amount + adj;
    const roundOff = tab.roundOffOn ? Math.round(rawTotal) - rawTotal : 0;
    const grandTotal = rawTotal + roundOff;
    return { count, qty, freeQty, taxAmt, subtotal, amount, adj, roundOff, grandTotal };
  }, [computed, tab.adjustment, tab.roundOffOn]);

  const changeGiven = Math.max(0, Number(tab.totalReceived || 0) - totals.grandTotal);

  const selectedParty  = tab.partyId ? allParties.find(p => String(p.id) === String(tab.partyId)) : null;
  const prevPoints     = Number(selectedParty?.loyaltyPoints ?? 0);
  const eligiblePoints = Math.floor(totals.grandTotal / 10);
  const totalPoints    = prevPoints + eligiblePoints;

  /* ── Save ── */
  const createMut = useMutation({
    mutationFn: SalesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['next-invoice'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to save'),
  });

  const buildPayload = () => {
    const filled = computed.filter(r => r.name);
    return {
      invoice:          tab.invoiceNo,
      date:             tab.invoiceDate,
      customerName:     tab.isCash ? (tab.partyQuery || 'Cash Sale') : (tab.partyQuery || 'Walk-in Customer'),
      partyId:          tab.partyId     ? Number(tab.partyId) : undefined,
      phone:            tab.phone       || undefined,
      billingAddress:   tab.billingAddr || undefined,
      shippingAddress:  tab.shippingAddr|| undefined,
      stateOfSupply:    tab.stateSupply,
      paymentMode:      tab.paymentMode,
      subtotal: +computed.reduce((s, r) => {
        const q = Number(r.qty || 0), rt = Number(r.rate || 0);
        return s + (tab.priceMode === 'withtax' ? q * rt / (1 + Number(r.gstRate || 0) / 100) : q * rt);
      }, 0).toFixed(2),
      gst:              +totals.taxAmt.toFixed(2),
      grandTotal:       +totals.grandTotal.toFixed(2),
      totalReceived:    Number(tab.totalReceived || 0),
      changeGiven:      +changeGiven.toFixed(2),
      paymentStatus:    tab.isCash ? 'Paid' : (Number(tab.totalReceived || 0) >= totals.grandTotal ? 'Paid' : 'Unpaid'),
      notes:            tab.description || tab.termsText || undefined,
      terms:            tab.termsText   || undefined,
      vehicleNo:        tab.vehicleNo   || undefined,
      dispatchLocation: tab.dispatchLoc || undefined,
      deliveryDate:     tab.deliveryDate|| undefined,
      deliveryLocation: tab.deliveryLoc || undefined,
      items: filled.map(r => ({
        productId:   r.productId   || undefined,
        name:        r.name,
        description: r.description || undefined,
        itemCount:   Number(r.itemCount || 0),
        batchNo:     r.batchNo     || undefined,
        expiryDate:  r.expiryDate  || undefined,
        mfgDate:     r.mfgDate     || undefined,
        mrp:         Number(r.mrp     || 0),
        size:        r.size        || undefined,
        qty:         Number(r.qty     || 0),
        freeQty:     Number(r.freeQty || 0),
        unit:        r.unit        || undefined,
        rate:        Number(r.rate    || 0),
        gstRate:     Number(r.gstRate || 0),
        gstAmount:   r.gstAmount,
        amount:      r.amount,
      })),
    };
  };

  const validateTab = () => {
    if (!tab.isCash && !tab.partyId) {
      setTab({ partyError: true });
      toast.error('Select a party for credit sale');
      return false;
    }
    if (tab.invoiceNo === '…' || !invoiceData?.invoice) {
      toast.error('Invoice number not ready, please wait');
      return false;
    }
    const filled = computed.filter(r => r.name);
    if (!filled.length) { toast.error('Add at least one item'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateTab()) return;
    setIsSaving(true);
    try {
      const saved = await createMut.mutateAsync(buildPayload());
      toast.success('Sale saved');
      if (tabs.length === 1) navigate('/sales/history');
      else closeTab(activeId);
    } finally { setIsSaving(false); }
  };

  const handleSaveAndPrint = async () => {
    if (!validateTab()) return;
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const saved   = await createMut.mutateAsync(payload);
      toast.success('Sale saved');
      printSaleInvoice({ ...payload, items: payload.items, ...saved }, settings || {});
      if (tabs.length === 1) navigate('/sales/history');
      else closeTab(activeId);
    } finally { setIsSaving(false); }
  };

  const handleCameraScan = (code) => {
    setShowScanner(false);
    const product = scanProducts.find(p =>
      (p.itemCode || '').toLowerCase() === code.toLowerCase() ||
      (p.shortName || '').toLowerCase() === code.toLowerCase()
    );
    if (product) {
      addScannedItem(product);
      toast.success(`Scanned: ${product.shortName}`);
    } else {
      setScanSearch(code);
      toast.info(`Code "${code}" — select item from dropdown`);
    }
  };

  const TH = ({ children, className = '' }) => (
    <th className={`px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-slate-600
        bg-slate-50 border-r border-slate-200 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 text-gray-800">

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex items-end bg-gray-200 border-b border-gray-300 px-3 pt-1.5 gap-1">
        {tabs.map((t, i) => (
          <div key={t.id} onClick={() => setActiveId(t.id)}
            className={`flex items-center gap-2 px-6 py-2 min-w-[120px] justify-center rounded-t border-l border-r border-t cursor-pointer text-sm -mb-px z-10 transition select-none
              ${t.id === activeId
                ? 'bg-white border-gray-300 text-gray-700 font-medium'
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            <span>Sale #{i + 1}</span>
            <button type="button" onClick={e => { e.stopPropagation(); closeTab(t.id); }}
              className="text-gray-400 hover:text-gray-600 ml-1">
              <X size={12} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addTab} className="mb-1 p-0.5 text-gray-500 hover:text-gray-700" title="New sale tab">
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
        <div className="flex items-center bg-slate-200 rounded-lg p-1">
          <button type="button"
            onClick={() => setTab({ isCash: true, partyError: false })}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${tab.isCash ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Cash Sale
          </button>
          <button type="button"
            onClick={() => setTab({ isCash: false, partyError: false })}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${!tab.isCash ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Credit Sale
          </button>
        </div>
        <div className="flex items-center bg-slate-200 rounded-lg p-1">
          <button type="button"
            onClick={() => setTab({ needsTransport: false })}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${!tab.needsTransport ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            No Transport
          </button>
          <button type="button"
            onClick={() => setTab({ needsTransport: true })}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${tab.needsTransport ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Transport
          </button>
        </div>
        <div className="ml-auto">
          <select className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white focus:outline-none text-gray-700">
            <option>Godown: Main Go...</option>
          </select>
        </div>
      </div>

      {/* ── Customer + Invoice meta ── */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4">
        <div className="grid grid-cols-4 gap-4">

          {/* Col 1: Party Name + Phone No */}
          <div className="space-y-2.5">
            <PartyCombo query={tab.partyQuery}
              onQueryChange={q => setTab({ partyQuery: q, partyError: false })}
              onSelect={p => {
                if (!p) setTab({ partyId: '', partyQuery: '', phone: '', billingAddr: '', partyError: false });
                else    setTab({ partyId: String(p.id), partyQuery: p.name, phone: p.phone || '', billingAddr: p.address || '', partyError: false });
              }}
              parties={allParties}
              isCredit={!tab.isCash}
              hasError={tab.partyError} />
            <FloatInput label="Phone No." type="tel" value={tab.phone}
              onChange={e => setTab({ phone: e.target.value })} />
          </div>

          {/* Col 2: Billing Address */}
          <div>
            <FloatTextarea label="Billing Address" value={tab.billingAddr}
              onChange={e => setTab({ billingAddr: e.target.value })}
              rows={4} />
          </div>

          {/* Col 3: Time + State of Supply */}
          <div className="space-y-2.5">
            <div className="relative">
              <input type="text" value={tab.invoiceTime} readOnly placeholder=" "
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-700
                  bg-gray-50 focus:outline-none cursor-default" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Time</label>
            </div>
            <div className="relative">
              <select value={tab.stateSupply} onChange={e => setTab({ stateSupply: e.target.value })}
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
                  focus:outline-none focus:border-blue-400 bg-white appearance-none">
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">State of Supply</label>
            </div>
          </div>

          {/* Col 4: Invoice No + Date */}
          <div className="space-y-2.5">
            <div className="relative">
              <input type="text" value={tab.invoiceNo} readOnly placeholder=" "
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm font-bold text-blue-700
                  font-mono bg-gray-50 focus:outline-none cursor-default" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Invoice No.</label>
            </div>
            <div className="relative">
              <input type="date" value={tab.invoiceDate} onChange={e => setTab({ invoiceDate: e.target.value })}
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
                  focus:outline-none focus:border-blue-400 bg-white" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Invoice Date</label>
            </div>
          </div>

        </div>
      </div>

      {/* ── Items card (scan bar + table) ── */}
      <div className="flex-1 overflow-hidden px-3 py-2 bg-gray-100">
        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

          {/* Card header: title + search bar */}
          <div className="px-4 py-3 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-bold text-slate-800 text-sm">Sale Items</span>
              <span className="text-xs text-slate-400 font-normal">({totals.count})</span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-amber-500 bg-white">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={scanRef}
                  value={scanSearch}
                  onChange={e => { setScanSearch(e.target.value); setScanShowAll(false); }}
                  onKeyDown={e => {
                    if (e.key === 'F1') { e.preventDefault(); setScanShowAll(true); }
                    if (e.key === 'Enter' && scanDropList.length) addScannedItem(scanDropList[0]);
                    if (e.key === 'Escape') { setScanSearch(''); setScanShowAll(false); }
                  }}
                  placeholder="Search or Scan barcode to add item…. (F1 for All)"
                  className="flex-1 text-sm focus:outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
                {(scanSearch || scanShowAll) && (
                  <button type="button" onClick={() => { setScanSearch(''); setScanShowAll(false); scanRef.current?.focus(); }}
                    className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
                <button type="button" onClick={() => setShowScanner(true)}
                  title="Scan with camera"
                  className="shrink-0 p-1 text-slate-400 hover:text-amber-600 transition">
                  <Camera size={15} />
                </button>
              </div>
              {scanDropOpen && scanDropList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-1.5 bg-slate-100 border-b border-slate-200 sticky top-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item Name</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Item Code</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">MRP</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Purchase</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Sales</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Stock</span>
                  </div>
                  {scanDropList.map(p => (
                    <button key={p.id} type="button" onMouseDown={() => addScannedItem(p)}
                      className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-2 hover:bg-green-50 transition text-left border-b border-slate-100 last:border-0">
                      <span className="text-sm font-semibold text-slate-800 truncate pr-2">{p.shortName}</span>
                      <span className="text-xs text-slate-500 text-center self-center">{p.itemCode || '—'}</span>
                      <span className="text-xs text-slate-600 text-right self-center">₹{Number(p.mrp || 0).toFixed(2)}</span>
                      <span className="text-xs font-semibold text-amber-600 text-right self-center">₹{Number(p.purchasePrice || 0).toFixed(2)}</span>
                      <span className="text-xs font-semibold text-emerald-600 text-right self-center">₹{Number(p.salesPrice || 0).toFixed(2)}</span>
                      <span className={`text-xs font-semibold text-right self-center ${Number(p.stock) <= Number(p.reorderLevel || 10) ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {Number(p.stock || 0)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <TH className="w-7 text-center">S.No</TH>
                  <TH className="min-w-[120px]">Item</TH>
                  <TH className="w-10 text-right">Count</TH>
                  <TH className="w-16">Batch</TH>
                  <TH className="w-16">Exp.</TH>
                  <TH className="w-16">Mfg.</TH>
                  <TH className="w-14 text-right">MRP</TH>
                  <TH className="w-12 text-right">QTY</TH>
                  <TH className="w-12 text-right">Free</TH>
                  <TH className="w-12">Unit</TH>
                  <TH className="w-24">
                    <div className="flex flex-col gap-0.5">
                      <span>Price/Unit</span>
                      <select value={tab.priceMode} onChange={e => setTab({ priceMode: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] font-normal bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-600 focus:outline-none normal-case tracking-normal">
                        <option value="withtax">With Tax</option>
                        <option value="withouttax">Without Tax</option>
                      </select>
                    </div>
                  </TH>
                  <TH className="w-12 text-right">GST%</TH>
                  <TH className="w-16 text-right">GST Amt</TH>
                  <TH className="w-20 text-right">Total Amount</TH>
                  <th className="px-2 bg-slate-50 w-7 text-center border-b border-slate-200">
                    <button type="button" onClick={addRow} className="text-slate-500 hover:text-amber-500 p-0.5">
                      <Plus size={14} />
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {computed.map((row, idx) => (
                  <tr key={row._key} className="hover:bg-amber-50 transition">
                    <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100 text-xs font-semibold">{idx + 1}</td>
                    <td className="border-r border-slate-100 p-0">
                      <ItemSearchCell row={row} idx={idx} allItems={allItems}
                        onSelect={selectItem} onNameChange={(i, v) => updateRow(i, 'name', v)} />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" min="0" value={row.itemCount}
                        onChange={e => updateRow(idx, 'itemCount', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.batchNo}
                        onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cellCls} />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.expiryDate}
                        onChange={e => updateRow(idx, 'expiryDate', e.target.value)}
                        className={cellCls} placeholder="MM/YY" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.mfgDate}
                        onChange={e => updateRow(idx, 'mfgDate', e.target.value)}
                        className={cellCls} placeholder="MM/YY" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.mrp}
                        onChange={e => updateRow(idx, 'mrp', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0.00" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" min="0" value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                        onFocus={e => e.target.select()}
                        data-qty-row={idx}
                        className={`${cellCls} text-right font-semibold text-slate-700`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" min="0" value={row.freeQty}
                        onChange={e => updateRow(idx, 'freeQty', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <select value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}
                        className={`${cellCls} appearance-none`}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.rate}
                        onChange={e => updateRow(idx, 'rate', e.target.value)}
                        className={`${cellCls} text-right text-amber-600 font-semibold`} placeholder="0.00" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <select value={row.gstRate} onChange={e => updateRow(idx, 'gstRate', e.target.value)}
                        className={`${cellCls} appearance-none text-blue-600 font-semibold`}>
                        {TAX_RATES.map(r => <option key={r} value={r}>{r ? `${r}%` : 'Select'}</option>)}
                      </select>
                    </td>
                    <td className="border-r border-slate-100 px-1.5 py-1.5 text-right text-slate-500">
                      {row.gstAmount > 0 ? row.gstAmount.toFixed(2) : ''}
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number"
                        value={row.total !== '' ? row.total : (row.amount > 0 ? row.amount.toFixed(2) : '')}
                        onChange={e => updateRowTotal(idx, e.target.value)}
                        className={`${cellCls} text-right font-bold text-slate-800`}
                        placeholder="0.00" />
                    </td>
                    <td className="p-0 text-center">
                      <button type="button" onClick={() => removeRow(idx)}
                        className="p-1 text-rose-400 hover:text-rose-600 transition">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td colSpan={8} className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">Total</td>
                  <td className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200">
                    {totals.qty % 1 === 0 ? totals.qty : totals.qty.toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200">
                    {totals.freeQty % 1 === 0 ? totals.freeQty : totals.freeQty.toFixed(3)}
                  </td>
                  <td colSpan={3} className="border-r border-slate-200" />
                  <td className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200">
                    {totals.taxAmt.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-bold text-amber-600 border-r border-slate-200">
                    {totals.amount.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 sticky bottom-0 z-10 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">

        {/* Cards row */}
        <div className={`grid gap-3 px-4 pt-3 pb-2 items-stretch ${
          tab.needsTransport
            ? (selectedParty ? 'grid-cols-5' : 'grid-cols-4')
            : (selectedParty ? 'grid-cols-3' : 'grid-cols-2')
        }`}>

          {/* Transport */}
          {tab.needsTransport && (
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Transport</p>
              <FloatInput label="Vehicle Number" value={tab.vehicleNo}
                onChange={e => setTab({ vehicleNo: e.target.value })} />
              <FloatInput label="Dispatch Location" value={tab.dispatchLoc}
                onChange={e => setTab({ dispatchLoc: e.target.value })} />
            </div>
          )}

          {/* Delivery */}
          {tab.needsTransport && (
            <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-widest">Delivery</p>
              <div className="relative">
                <input type="date" value={tab.deliveryDate}
                  onChange={e => setTab({ deliveryDate: e.target.value })}
                  style={!tab.deliveryDate ? { color: 'transparent' } : undefined}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800
                    focus:outline-none focus:border-blue-400 bg-white" />
                {!tab.deliveryDate && (
                  <span className="absolute left-3 top-2.5 text-sm text-gray-400 pointer-events-none">Delivery Date</span>
                )}
              </div>
              <FloatInput label="Delivery Location" value={tab.deliveryLoc}
                onChange={e => setTab({ deliveryLoc: e.target.value })} />
            </div>
          )}

          {/* Loyalty Points (only when party selected) */}
          {selectedParty && (
            <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-widest">Loyalty Points</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Previous Points</span>
                <span className="text-sm font-semibold text-violet-700">{prevPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Eligible Points</span>
                <span className="text-sm font-semibold text-violet-700">{eligiblePoints}</span>
              </div>
              <div className="border-t border-violet-200 pt-1.5 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Total Points</span>
                <span className="text-base font-bold text-violet-700">{totalPoints}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">Payment</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600 shrink-0">Payment Mode</span>
              <select value={tab.paymentMode} onChange={e => setTab({ paymentMode: e.target.value })}
                className="flex-1 min-w-0 border border-blue-200 rounded px-2 py-1 text-xs bg-white
                  focus:outline-none focus:border-blue-400">
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600 shrink-0">Received Amount</span>
              <NonNegativeNumberInput value={tab.totalReceived}
                onValueChange={val => setTab({ totalReceived: val })}
                placeholder="0.00"
                className="w-24 border border-blue-200 rounded px-2 py-1 text-xs text-right
                  focus:outline-none focus:border-blue-400 bg-white" />
            </div>
            <div className="border-t border-blue-200 pt-1.5 flex justify-between items-center">
              <span className="text-xs text-slate-600">Change Given</span>
              <span className={`text-sm font-bold ${changeGiven > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                ₹{changeGiven.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Sub Total</span>
              <span className="text-sm text-slate-700">₹{fmt2(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Tax Amount</span>
              <span className="text-sm text-slate-700">₹{fmt2(totals.taxAmt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 shrink-0">Adjustment</span>
              <input type="number" value={tab.adjustment}
                onChange={e => setTab({ adjustment: e.target.value })}
                placeholder="0"
                className="w-20 border border-emerald-200 rounded px-1.5 py-0.5 text-xs text-right
                  focus:outline-none focus:border-emerald-400 bg-white" />
            </div>
            <div className="border-t border-emerald-200 pt-2 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Grand Total</span>
              <span className="text-lg font-bold text-emerald-700">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-100">
          <button onClick={handleSaveAndPrint} disabled={isSaving || createMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-amber-500 hover:bg-amber-600 rounded transition disabled:opacity-60">
            <Printer size={14} /> {isSaving ? 'Saving…' : 'Save & Print'}
          </button>
          <button onClick={handleSave} disabled={isSaving || createMut.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition disabled:opacity-60">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {showScanner && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      )}

    </div>
  );
}
