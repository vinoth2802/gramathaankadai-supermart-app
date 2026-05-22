import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, X, Search, ChevronDown, Calendar,
  Calculator, Settings, MoreVertical, Filter, ArrowLeft,
} from 'lucide-react';
import { ItemsAPI } from '../../api/items.js';
import { PartiesAPI } from '../../api/parties.js';
import { toast } from 'sonner';
import http from '../../api/client.js';

/* ── API ── */
const EstimatesAPI = {
  getAll:        (params)    => http.get('/estimates', { params }),
  getNextNumber: ()          => http.get('/estimates/next-number'),
  create:        (data)      => http.post('/estimates', data),
  update:        (id, data)  => http.patch(`/estimates/${id}`, data),
  delete:        (id)        => http.delete(`/estimates/${id}`),
  convert:       (id, type)  => http.post(`/estimates/${id}/convert`, { type }),
};

/* ── Constants ── */
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chandigarh','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];
const UNITS     = ['NO.','PCS','KG','G','LTR','ML','BOX','PKT','BAG','DOZ','MTR','SET'];
const TAX_RATES = ['','0','5','12','18','28'];
const PERIODS   = ['This Month','Last Month','This Quarter','This Year','All'];

/* ── Helpers ── */
const pad    = n => String(n).padStart(2, '0');
const fmt2   = n => Number(n || 0).toFixed(2);
const fmtAmt = n => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
function fmtDate(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${m} ${ap}`;
}
function getRange(label) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (label) {
    case 'This Month':   return { from: new Date(y, m, 1),     to: new Date(y, m + 1, 0) };
    case 'Last Month':   return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    case 'This Quarter': { const q = Math.floor(m / 3); return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0) }; }
    case 'This Year':    return { from: new Date(y, 0, 1),     to: new Date(y, 11, 31) };
    default:             return { from: null, to: null };
  }
}
function getLastRange(label) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (label) {
    case 'This Month':   return getRange('Last Month');
    case 'This Quarter': { const q = Math.floor(m / 3); return { from: new Date(y, q * 3 - 3, 1), to: new Date(y, q * 3, 0) }; }
    default:             return { from: null, to: null };
  }
}

let _uid = 0;
const uid = () => ++_uid;

function formatExpDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${pad(dt.getMonth() + 1)}/${String(dt.getFullYear()).slice(-2)}`;
}

function emptyRow() {
  return {
    _key: uid(), productId: null, name: '', description: '',
    itemCount: '', batchNo: '', expiryDate: '', mfgDate: '',
    mrp: '', size: '', qty: '', freeQty: '', unit: 'NO.',
    rate: '', gstRate: '', total: '',
  };
}

function makeFormData() {
  return {
    estimateDate: todayYMD(),
    estimateTime: nowTime(),
    validTill:    '',
    priceMode:    'withtax',
    stateSupply:  'Tamil Nadu',
    partyId:      '',
    partyQuery:   '',
    phone:        '',
    billingAddr:  '',
    rows:         [emptyRow(), emptyRow(), emptyRow()],
    vehicleNo:    '',
    dispatchLoc:  '',
    deliveryDate: '',
    deliveryLoc:  '',
    adjustment:   '',
    roundOffOn:   true,
    description:  '',
    partyError:   false,
  };
}

function backCalcRate(total, qty, gstRate, priceMode) {
  const t = Number(total) || 0, q = Number(qty) || 1, r = Number(gstRate) || 0;
  if (priceMode === 'withtax') return t / q;
  return r > 0 ? t / (q * (1 + r / 100)) : t / q;
}

function calcRow(row, priceMode) {
  const qty = Number(row.qty || 0), rate = Number(row.rate || 0), gstRate = Number(row.gstRate || 0);
  const gross = qty * rate;
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

/* ── FloatInput ── */
function FloatInput({ label, value, onChange, type = 'text', wrapperClass = '', readOnly = false }) {
  return (
    <div className={`relative ${wrapperClass}`}>
      <input type={type} value={value} onChange={onChange} readOnly={readOnly} placeholder=" "
        className={`peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
          focus:outline-none focus:border-blue-400 ${readOnly ? 'bg-gray-50 cursor-default' : 'bg-white'}`} />
      <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none
        transition-all duration-150
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-blue-500">
        {label}
      </label>
    </div>
  );
}

/* ── FloatTextarea ── */
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

/* ── ItemSearchCell ── */
function ItemSearchCell({ row, idx, allItems, onSelect, onNameChange }) {
  const [searchQ, setSearchQ] = useState('');
  const [dbQ, setDbQ]         = useState('');
  const [open, setOpen]       = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => { const t = setTimeout(() => setDbQ(searchQ), 300); return () => clearTimeout(t); }, [searchQ]);
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
    queryKey:  ['items-search', dbQ],
    queryFn:   () => ItemsAPI.search(dbQ),
    select:    d => d.data,
    enabled:   dbQ.trim().length > 0,
    staleTime: 30_000,
  });

  const localMatches = searchQ.length > 0
    ? allItems.filter(it =>
        it.shortName.toLowerCase().includes(searchQ.toLowerCase()) ||
        (it.itemCode ?? '').toLowerCase().includes(searchQ.toLowerCase())
      ).slice(0, 20)
    : allItems.slice(0, 15);

  const matches = (dbQ.trim().length > 0 && apiResults) ? apiResults : localMatches;

  const handleChange = e => { setSearchQ(e.target.value); onNameChange(idx, e.target.value); calcPos(); setOpen(true); };
  const handleFocus  = () => { setSearchQ(''); calcPos(); setOpen(true); };
  const handleSelect = it => { onSelect(idx, it); setSearchQ(''); setOpen(false); };
  const displayValue = open ? searchQ : (row.name || '');
  const showDrop = open && (matches.length > 0 || isFetching || (searchQ.length > 0 && !isFetching));

  function highlight(text, query) {
    if (!query) return text;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return text;
    return (<>{text.slice(0, i)}<mark className="bg-yellow-100 text-gray-900 rounded-sm">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>);
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="text" value={displayValue} onChange={handleChange} onFocus={handleFocus}
        placeholder="Name or item code…"
        className="w-full px-2 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded placeholder:text-gray-300" />
      {showDrop && createPortal(
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: '18rem', zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto">
          {isFetching && dbQ && <div className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">Searching…</div>}
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

/* ── PartyCombo ── */
function PartyCombo({ query, onQueryChange, onSelect, parties, hasError }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const q = query.toLowerCase();
  const filtered = q.length === 0 ? parties : parties.filter(p =>
    p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q)
  );
  const borderCls = hasError ? 'border-red-400' : 'border-gray-300 focus:border-blue-400';
  return (
    <div ref={ref} className="relative">
      <input type="text" value={query}
        onChange={e => { onQueryChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder=" "
        className={`peer w-full border rounded px-3 pt-5 pb-1.5 text-sm text-gray-800 focus:outline-none bg-white ${borderCls}`} />
      <label className={`absolute left-3 top-1.5 text-[10px] pointer-events-none transition-all duration-150
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-blue-500
        ${hasError ? 'text-red-400' : 'text-gray-400'}`}>
        Party Name / Phone
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
      {hasError && <p className="absolute -bottom-4 left-0 text-xs text-red-500">Party required</p>}
    </div>
  );
}

const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 rounded';

/* ── StatusBadge ── */
function StatusBadge({ status }) {
  const cls = { Open: 'text-orange-500', Converted: 'text-green-600', Cancelled: 'text-red-500' };
  return <span className={`text-xs font-semibold ${cls[status] ?? 'text-gray-500'}`}>{status ?? 'Open'}</span>;
}

/* ── ConvertDropdown ── */
function ConvertDropdown({ onConvert, onCancel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 rounded px-2 py-1 bg-white hover:bg-blue-50 transition">
        Convert <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-52 py-1">
          {[
            { label: 'Convert to Sale Invoice',     value: 'sale' },
            { label: 'Convert to Purchase',         value: 'purchase' },
            { label: 'Convert to Delivery Challan', value: 'challan' },
          ].map(o => (
            <button key={o.value} type="button"
              onClick={() => { setOpen(false); onConvert(o.value); }}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition">
              {o.label}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button type="button"
              onClick={() => { setOpen(false); onCancel(); }}
              className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition">
              Mark as Cancelled
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   EstimateList
══════════════════════════════════════════ */
function EstimateList({ onAdd, onEdit, queryClient }) {
  const [period, setPeriod]         = useState('This Month');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [searchQ, setSearchQ]       = useState('');
  const [sortCol, setSortCol]       = useState('date');
  const [sortDir, setSortDir]       = useState('desc');
  const periodRef = useRef(null);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  useEffect(() => {
    const fn = e => { if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const { from, to } = useMemo(() => getRange(period), [period]);
  const fromStr = from ? `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}` : undefined;
  const toStr   = to   ? `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`     : undefined;

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates', fromStr, toStr],
    queryFn:  () => EstimatesAPI.getAll(fromStr ? { from: fromStr, to: toStr } : {}),
    staleTime: 30_000,
  });

  const lastRange = useMemo(() => getLastRange(period), [period]);
  const lastFromStr = lastRange.from ? `${lastRange.from.getFullYear()}-${pad(lastRange.from.getMonth() + 1)}-${pad(lastRange.from.getDate())}` : undefined;
  const lastToStr   = lastRange.to   ? `${lastRange.to.getFullYear()}-${pad(lastRange.to.getMonth() + 1)}-${pad(lastRange.to.getDate())}`     : undefined;

  const { data: lastEstimates = [] } = useQuery({
    queryKey: ['estimates', lastFromStr, lastToStr],
    queryFn:  () => EstimatesAPI.getAll({ from: lastFromStr, to: lastToStr }),
    enabled:  !!lastFromStr,
    staleTime: 30_000,
  });

  const total     = estimates.reduce((s, e) => s + Number(e.grandTotal ?? 0), 0);
  const converted = estimates.filter(e => e.status === 'Converted').reduce((s, e) => s + Number(e.grandTotal ?? 0), 0);
  const open      = estimates.filter(e => (e.status ?? 'Open') === 'Open').reduce((s, e) => s + Number(e.grandTotal ?? 0), 0);
  const lastTotal = lastEstimates.reduce((s, e) => s + Number(e.grandTotal ?? 0), 0);
  const pctChange = lastTotal > 0 ? ((total - lastTotal) / lastTotal) * 100 : null;

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    let rows = q
      ? estimates.filter(e =>
          (e.customerName || '').toLowerCase().includes(q) ||
          String(e.estimateNo ?? '').includes(q)
        )
      : [...estimates];

    rows.sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case 'date':   av = new Date(a.createdAt || a.estimateDate || 0).getTime(); bv = new Date(b.createdAt || b.estimateDate || 0).getTime(); break;
        case 'ref':    av = Number(a.estimateNo ?? 0); bv = Number(b.estimateNo ?? 0); break;
        case 'party':  av = (a.customerName || '').toLowerCase(); bv = (b.customerName || '').toLowerCase(); break;
        case 'amount': av = Number(a.grandTotal ?? 0); bv = Number(b.grandTotal ?? 0); break;
        case 'balance':av = Number(a.balance ?? a.grandTotal ?? 0); bv = Number(b.balance ?? b.grandTotal ?? 0); break;
        case 'status': av = (a.status || '').toLowerCase(); bv = (b.status || '').toLowerCase(); break;
        default:       return 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return rows;
  }, [estimates, searchQ, sortCol, sortDir]);

  const convertMut = useMutation({
    mutationFn: ({ id, type }) => EstimatesAPI.convert(id, type),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Converted successfully'); },
    onError: () => toast.error('Conversion failed'),
  });

  const pillCls = 'flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm bg-white text-gray-700 hover:border-gray-400 transition cursor-pointer select-none';

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Estimate</h1>
        <button onClick={onAdd}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm">
          <Plus size={15} /> Add Estimate
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 shrink-0">Filter by:</span>

        {/* Period pill */}
        <div ref={periodRef} className="relative">
          <button type="button" onClick={() => setPeriodOpen(o => !o)} className={pillCls}>
            {period} <ChevronDown size={13} />
          </button>
          {periodOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] py-1">
              {PERIODS.map(p => (
                <button key={p} type="button"
                  onClick={() => { setPeriod(p); setPeriodOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${p === period ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range pill */}
        {from && to && (
          <div className={pillCls}>
            <Calendar size={13} className="text-gray-400" />
            <span>{fmtDate(from)} To {fmtDate(to)}</span>
          </div>
        )}

        {/* Static pills */}
        {['All Firms', 'All Users', 'All Godown'].map(p => (
          <div key={p} className={pillCls}>
            {p} <ChevronDown size={13} />
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div className="inline-block bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 min-w-[300px]">
        <div className="flex items-start justify-between gap-10">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Quotations</p>
            <p className="text-2xl font-bold text-gray-900">{fmtAmt(total)}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${pctChange === null || pctChange >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {pctChange !== null ? `${pctChange.toFixed(2)}%` : '—'} {pctChange === null || pctChange >= 0 ? '↗' : '↘'}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">vs last month</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2 flex items-center gap-1">
          Converted: <span className="text-gray-600 font-medium">{fmtAmt(converted)}</span>
          <span className="text-gray-300 mx-1">|</span>
          Open: <span className="text-gray-600 font-medium">{fmtAmt(open)}</span>
        </p>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Transactions</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search party or ref no…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-52 bg-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                {[
                  { label: 'Date',         col: 'date',    right: false },
                  { label: 'Reference No', col: 'ref',     right: false },
                  { label: 'Party Name',   col: 'party',   right: false },
                  { label: 'Amount',       col: 'amount',  right: true  },
                  { label: 'Balance',      col: 'balance', right: true  },
                  { label: 'Status',       col: 'status',  right: false },
                  { label: 'Actions',      col: null,      right: false },
                ].map(({ label, col, right }) => (
                  <th key={label} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
                    {col ? (
                      <button type="button" onClick={() => handleSort(col)}
                        className={`flex items-center gap-1 hover:text-gray-900 transition ${right ? 'ml-auto' : ''}`}>
                        {label}
                        <span className="text-gray-400 text-[10px] leading-none">
                          {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm text-gray-400">No estimates found</p>
                    <p className="text-xs text-gray-300 mt-1">Click "+ Add Estimate" to create one</p>
                  </td>
                </tr>
              )}
              {filtered.map((est, idx) => (
                <tr key={est.id ?? idx} className="hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => onEdit(est)}>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {fmtDt(est.createdAt || est.estimateDate)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{est.estimateNo ?? idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                    {(est.customerName || est.party?.name || 'WALK-IN').toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right">
                    {fmtAmt(est.grandTotal ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {fmtAmt(est.balance ?? est.grandTotal ?? 0)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={est.status} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <ConvertDropdown
                        onConvert={type => convertMut.mutate({ id: est.id, type })}
                        onCancel={() => convertMut.mutate({ id: est.id, type: 'cancel' })}
                      />
                      <button type="button" className="p-1 text-gray-400 hover:text-gray-600 transition rounded">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   EstimateForm
══════════════════════════════════════════ */
function EstimateForm({ editData, onClose, queryClient }) {
  const [form,     setForm]     = useState(() => ({ ...makeFormData(), ...(editData ? {
    estimateDate: editData.estimateDate || todayYMD(),
    validTill:    editData.validTill    || '',
    partyId:      editData.partyId      ? String(editData.partyId) : '',
    partyQuery:   editData.customerName || '',
    phone:        editData.phone        || '',
    billingAddr:  editData.billingAddress || '',
    rows:         (editData.items?.length ? editData.items.map(it => ({
      _key: uid(), productId: it.productId ?? null,
      name: it.name || '', description: it.description || '',
      itemCount: it.itemCount ?? '', batchNo: it.batchNo || '',
      expiryDate: it.expiryDate || '', mfgDate: it.mfgDate || '',
      mrp: it.mrp ?? '', size: it.size || '',
      qty: it.qty ?? '', freeQty: it.freeQty ?? '', unit: it.unit || 'NO.',
      rate: it.rate ?? '', gstRate: it.gstRate ?? '', total: '',
    })) : [emptyRow(), emptyRow(), emptyRow()]),
    adjustment: editData.adjustment ?? '',
  } : {}) }));
  const [isSaving, setIsSaving] = useState(false);

  const { data: nextNoData } = useQuery({
    queryKey: ['estimates-next-number'],
    queryFn:  EstimatesAPI.getNextNumber,
    staleTime: 0,
    retry: 2,
  });
  const estimateNo = editData?.estimateNo ?? nextNoData?.estimateNo ?? '…';

  const { data: allItems   = [] } = useQuery({ queryKey: ['items'],   queryFn: ItemsAPI.getAll });
  const { data: allParties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });

  const [scanSearch,  setScanSearch]  = useState('');
  const [scanShowAll, setScanShowAll] = useState(false);
  const scanRef = useRef(null);

  const setF = patch => setForm(f => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));

  const updateRow = (idx, key, val) =>
    setF(f => ({ rows: f.rows.map((r, i) => i !== idx ? r : {
      ...r, [key]: val,
      ...(['qty','rate','gstRate'].includes(key) ? { total: '' } : {}),
    }) }));

  const updateRowTotal = (idx, val) =>
    setF(f => ({ rows: f.rows.map((r, i) => {
      if (i !== idx) return r;
      return { ...r, total: val, rate: val === '' ? '' : String(backCalcRate(val, r.qty, r.gstRate, f.priceMode)) };
    }) }));

  const selectItem = (idx, product) =>
    setF(f => ({ rows: f.rows.map((r, i) => i !== idx ? r : {
      ...r,
      productId:  product.id,
      name:       product.shortName,
      description: product.description || r.description,
      itemCount:  product.pcsPerUnit != null ? String(product.pcsPerUnit) : r.itemCount,
      batchNo:    product.batch        || '',
      expiryDate: formatExpDate(product.expiryDate),
      mrp:        product.mrp        != null ? String(+product.mrp)        : r.mrp,
      unit:       product.uom        || 'NO.',
      rate:       product.salesPrice != null ? String(+product.salesPrice) : r.rate,
      gstRate:    product.gstRate    != null ? String(+product.gstRate)    : r.gstRate,
      total: '',
    }) }));

  const addRow    = () => setF(f => ({ rows: [...f.rows, emptyRow()] }));
  const removeRow = idx => setF(f => ({ rows: f.rows.length <= 1 ? f.rows : f.rows.filter((_, i) => i !== idx) }));

  const filteredScan = scanSearch.trim()
    ? allItems.filter(p =>
        (p.shortName || '').toLowerCase().includes(scanSearch.toLowerCase()) ||
        (p.itemCode  || '').toLowerCase().includes(scanSearch.toLowerCase())
      )
    : [];
  const scanDropList = scanShowAll && !scanSearch.trim() ? allItems : filteredScan;
  const scanDropOpen = !!(scanSearch.trim() || scanShowAll);

  const addScannedItem = product => {
    setF(f => {
      const existIdx = f.rows.findIndex(r => r.productId === product.id);
      if (existIdx >= 0) {
        return { rows: f.rows.map((r, i) => i !== existIdx ? r : { ...r, qty: String(Number(r.qty || 0) + 1) }) };
      }
      const filled = {
        ...emptyRow(),
        productId:  product.id, name: product.shortName,
        batchNo:    product.batch        || '',
        expiryDate: formatExpDate(product.expiryDate),
        mrp:        product.mrp        != null ? String(+product.mrp)        : '',
        unit:       product.uom        || 'NO.',
        rate:       product.salesPrice != null ? String(+product.salesPrice) : '',
        gstRate:    product.gstRate    != null ? String(+product.gstRate)    : '',
        qty:        '1',
      };
      const emptyIdx = f.rows.findIndex(r => !r.name);
      return { rows: emptyIdx >= 0 ? f.rows.map((r, i) => i === emptyIdx ? filled : r) : [...f.rows, filled] };
    });
    setScanSearch(''); setScanShowAll(false);
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  const computed = useMemo(() => form.rows.map(r => ({ ...r, ...calcRow(r, form.priceMode) })), [form.rows, form.priceMode]);

  const totals = useMemo(() => {
    const count   = computed.filter(r => r.name).length;
    const qty     = computed.reduce((s, r) => s + Number(r.qty     || 0), 0);
    const freeQty = computed.reduce((s, r) => s + Number(r.freeQty || 0), 0);
    const taxAmt  = computed.reduce((s, r) => s + r.gstAmount, 0);
    const amount  = computed.reduce((s, r) => s + r.amount, 0);
    const adj     = Number(form.adjustment || 0);
    const rawTotal = amount + adj;
    const roundOff = form.roundOffOn ? Math.round(rawTotal) - rawTotal : 0;
    const grandTotal = rawTotal + roundOff;
    return { count, qty, freeQty, taxAmt, subtotal: amount - taxAmt, amount, adj, roundOff, grandTotal };
  }, [computed, form.adjustment, form.roundOffOn]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['estimates'] });
    queryClient.invalidateQueries({ queryKey: ['estimates-next-number'] });
  };

  const createMut = useMutation({
    mutationFn: EstimatesAPI.create,
    onSuccess: () => { invalidateAll(); toast.success('Estimate saved'); onClose(); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => EstimatesAPI.update(id, data),
    onSuccess: () => { invalidateAll(); toast.success('Estimate updated'); onClose(); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to save'),
  });

  const handleSave = async (convertToSale = false) => {
    const filled = computed.filter(r => r.name);
    if (!filled.length) { toast.error('Add at least one item'); return; }
    if (estimateNo === '…') { toast.error('Please wait — loading estimate number'); return; }
    setIsSaving(true);
    try {
      const payload = {
        estimateNo,
        estimateDate:   form.estimateDate,
        validTill:      form.validTill     || undefined,
        customerName:   form.partyQuery    || 'Walk-in Customer',
        partyId:        form.partyId       ? Number(form.partyId) : undefined,
        phone:          form.phone         || undefined,
        billingAddress: form.billingAddr   || undefined,
        stateOfSupply:  form.stateSupply,
        subtotal:       +computed.reduce((s, r) => {
          const q = Number(r.qty || 0), rt = Number(r.rate || 0);
          return s + (form.priceMode === 'withtax' ? q * rt / (1 + Number(r.gstRate || 0) / 100) : q * rt);
        }, 0).toFixed(2),
        gst:            +totals.taxAmt.toFixed(2),
        grandTotal:     +totals.grandTotal.toFixed(2),
        adjustment:     form.adjustment    || undefined,
        notes:          form.description   || undefined,
        status:         convertToSale ? 'Converted' : 'Open',
        items: filled.map(r => ({
          productId:  r.productId   || undefined,
          name:       r.name,
          description: r.description || undefined,
          itemCount:  Number(r.itemCount || 0),
          batchNo:    r.batchNo     || undefined,
          expiryDate: r.expiryDate  || undefined,
          mfgDate:    r.mfgDate     || undefined,
          mrp:        Number(r.mrp     || 0),
          size:       r.size        || undefined,
          qty:        Number(r.qty     || 0),
          freeQty:    Number(r.freeQty || 0),
          unit:       r.unit        || undefined,
          rate:       Number(r.rate    || 0),
          gstRate:    Number(r.gstRate || 0),
          gstAmount:  r.gstAmount,
          amount:     r.amount,
        })),
      };
      if (editData?.id) {
        await updateMut.mutateAsync({ id: editData.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
    } finally { setIsSaving(false); }
  };

  const TH = ({ children, className = '' }) => (
    <th className={`px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-slate-600
        bg-slate-50 border-r border-slate-200 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 text-gray-800">

      {/* Tab bar */}
      <div className="shrink-0 flex items-center bg-gray-200 border-b border-gray-300 px-3 pt-1.5 gap-1 h-11">
        <div className="flex items-center gap-2 px-6 py-2 min-w-[140px] justify-center rounded-t border-l border-r border-t border-gray-300 bg-white text-gray-700 font-medium text-sm -mb-px z-10">
          <span>{editData ? `Edit Estimate` : 'New Estimate'}</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X size={12} /></button>
        </div>
        <div className="ml-auto mb-1 flex items-center gap-1">
          <button className="p-1 text-gray-500 hover:bg-gray-300 rounded"><Calculator size={14} /></button>
          <button className="p-1 text-gray-500 hover:bg-gray-300 rounded"><Settings size={14} /></button>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-300 rounded"><X size={14} /></button>
        </div>
      </div>

      {/* Header bar */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200">
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition rounded">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-bold text-gray-800">Estimate</span>
        <div className="ml-auto">
          <select className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white focus:outline-none text-gray-700">
            <option>Godown: Main Go...</option>
          </select>
        </div>
      </div>

      {/* Customer + meta */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4">
        <div className="grid grid-cols-4 gap-4">

          {/* Col 1: Party + Phone */}
          <div className="space-y-2.5">
            <PartyCombo query={form.partyQuery}
              onQueryChange={q => setF({ partyQuery: q, partyError: false })}
              onSelect={p => {
                if (!p) setF({ partyId: '', partyQuery: '', phone: '', billingAddr: '', partyError: false });
                else    setF({ partyId: String(p.id), partyQuery: p.name, phone: p.phone || '', billingAddr: p.address || '', partyError: false });
              }}
              parties={allParties}
              hasError={form.partyError} />
            <FloatInput label="Phone No." type="tel" value={form.phone}
              onChange={e => setF({ phone: e.target.value })} />
          </div>

          {/* Col 2: Billing Address */}
          <FloatTextarea label="Billing Address" value={form.billingAddr}
            onChange={e => setF({ billingAddr: e.target.value })} rows={4} />

          {/* Col 3: Time + State */}
          <div className="space-y-2.5">
            <div className="relative">
              <input type="text" value={form.estimateTime} readOnly placeholder=" "
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none cursor-default" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Time</label>
            </div>
            <div className="relative">
              <select value={form.stateSupply} onChange={e => setF({ stateSupply: e.target.value })}
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
                  focus:outline-none focus:border-blue-400 bg-white appearance-none">
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">State of Supply</label>
            </div>
          </div>

          {/* Col 4: Estimate No + Date + Valid Till */}
          <div className="space-y-2.5">
            <div className="relative">
              <input type="text" value={estimateNo} readOnly placeholder=" "
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm font-bold text-blue-700
                  font-mono bg-gray-50 focus:outline-none cursor-default" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Estimate No.</label>
            </div>
            <div className="relative">
              <input type="date" value={form.estimateDate} onChange={e => setF({ estimateDate: e.target.value })}
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
                  focus:outline-none focus:border-blue-400 bg-white" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Estimate Date</label>
            </div>
            <div className="relative">
              <input type="date" value={form.validTill} onChange={e => setF({ validTill: e.target.value })}
                className="peer w-full border border-gray-300 rounded px-3 pt-5 pb-1.5 text-sm text-gray-800
                  focus:outline-none focus:border-blue-400 bg-white" />
              <label className="absolute left-3 top-1.5 text-[10px] text-gray-400 pointer-events-none">Valid Till</label>
            </div>
          </div>

        </div>
      </div>

      {/* Items card */}
      <div className="flex-1 overflow-hidden px-3 py-2 bg-gray-100">
        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

          {/* Card header */}
          <div className="px-4 py-3 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-bold text-slate-800 text-sm">Estimate Items</span>
              <span className="text-xs text-slate-400">({totals.count})</span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-amber-500 bg-white">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input ref={scanRef} value={scanSearch}
                  onChange={e => { setScanSearch(e.target.value); setScanShowAll(false); }}
                  onKeyDown={e => {
                    if (e.key === 'F1') { e.preventDefault(); setScanShowAll(true); }
                    if (e.key === 'Enter' && scanDropList.length) addScannedItem(scanDropList[0]);
                    if (e.key === 'Escape') { setScanSearch(''); setScanShowAll(false); }
                  }}
                  placeholder="Search or scan barcode to add item… (F1 for all)"
                  className="flex-1 text-sm focus:outline-none bg-transparent text-slate-800 placeholder:text-slate-400" />
                {(scanSearch || scanShowAll) && (
                  <button type="button" onClick={() => { setScanSearch(''); setScanShowAll(false); scanRef.current?.focus(); }}
                    className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
                )}
              </div>
              {scanDropOpen && scanDropList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-3 py-1.5 bg-slate-100 border-b border-slate-200 sticky top-0">
                    {['Item Name','Item Code','MRP','Purchase','Sales','Stock'].map(h => (
                      <span key={h} className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>
                  {scanDropList.map(p => (
                    <button key={p.id} type="button" onMouseDown={() => addScannedItem(p)}
                      className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-3 py-2 hover:bg-green-50 transition text-left border-b border-slate-100 last:border-0">
                      <span className="text-sm font-semibold text-slate-800 truncate pr-2">{p.shortName}</span>
                      <span className="text-xs text-slate-500 self-center">{p.itemCode || '—'}</span>
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
                  <TH className="w-10">Size</TH>
                  <TH className="w-12 text-right">QTY</TH>
                  <TH className="w-12 text-right">Free</TH>
                  <TH className="w-12">Unit</TH>
                  <TH className="w-24">
                    <div className="flex flex-col gap-0.5">
                      <span>Price/Unit</span>
                      <select value={form.priceMode} onChange={e => setF({ priceMode: e.target.value })}
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
                      <input type="number" value={row.itemCount} onChange={e => updateRow(idx, 'itemCount', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.batchNo} onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cellCls} />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.expiryDate} onChange={e => updateRow(idx, 'expiryDate', e.target.value)}
                        className={cellCls} placeholder="MM/YY" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.mfgDate} onChange={e => updateRow(idx, 'mfgDate', e.target.value)}
                        className={cellCls} placeholder="MM/YY" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.mrp} onChange={e => updateRow(idx, 'mrp', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0.00" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" value={row.size} onChange={e => updateRow(idx, 'size', e.target.value)} className={cellCls} />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)}
                        className={`${cellCls} text-right font-semibold text-slate-700`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.freeQty} onChange={e => updateRow(idx, 'freeQty', e.target.value)}
                        className={`${cellCls} text-right`} placeholder="0" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <select value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} className={`${cellCls} appearance-none`}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="number" value={row.rate} onChange={e => updateRow(idx, 'rate', e.target.value)}
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
                        className={`${cellCls} text-right font-bold text-slate-800`} placeholder="0.00" />
                    </td>
                    <td className="p-0 text-center">
                      <button type="button" onClick={() => removeRow(idx)} className="p-1 text-rose-400 hover:text-rose-600 transition">
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
                  <td className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200">{totals.taxAmt.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right text-xs font-bold text-amber-600 border-r border-slate-200">{totals.amount.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 sticky bottom-0 z-10 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-3 gap-3 px-4 pt-3 pb-2">

          {/* Transport */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Transport</p>
            <FloatInput label="Vehicle Number" value={form.vehicleNo}
              onChange={e => setF({ vehicleNo: e.target.value })} />
            <FloatInput label="Dispatch Location" value={form.dispatchLoc}
              onChange={e => setF({ dispatchLoc: e.target.value })} />
          </div>

          {/* Delivery */}
          <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-widest">Delivery</p>
            <div className="relative">
              <input type="date" value={form.deliveryDate} onChange={e => setF({ deliveryDate: e.target.value })}
                style={!form.deliveryDate ? { color: 'transparent' } : undefined}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 bg-white" />
              {!form.deliveryDate && <span className="absolute left-3 top-2.5 text-sm text-gray-400 pointer-events-none">Delivery Date</span>}
            </div>
            <FloatInput label="Delivery Location" value={form.deliveryLoc}
              onChange={e => setF({ deliveryLoc: e.target.value })} />
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
              <input type="number" value={form.adjustment} onChange={e => setF({ adjustment: e.target.value })}
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

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition">
            Cancel
          </button>
          <button onClick={() => handleSave(false)} disabled={isSaving || createMut.isPending || updateMut.isPending}
            className="px-4 py-2 text-sm text-white bg-violet-500 hover:bg-violet-600 rounded transition disabled:opacity-60">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => handleSave(true)} disabled={isSaving || createMut.isPending || updateMut.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition disabled:opacity-60">
            Convert to Sale
          </button>
        </div>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════
   Estimate (root)
══════════════════════════════════════════ */
export default function Estimate() {
  const queryClient = useQueryClient();
  const [view,     setView]     = useState('list');
  const [editData, setEditData] = useState(null);

  if (view === 'form') {
    return (
      <EstimateForm
        editData={editData}
        onClose={() => { setEditData(null); setView('list'); }}
        queryClient={queryClient}
      />
    );
  }

  return (
    <EstimateList
      onAdd={() => { setEditData(null); setView('form'); }}
      onEdit={e => { setEditData(e); setView('form'); }}
      queryClient={queryClient}
    />
  );
}
