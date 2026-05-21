import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import ResizableTable from '../../components/ResizableTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PurchasesAPI } from '../../api/purchases.js';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';
import { ItemsAPI } from '../../api/items.js';

const inp     = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-sm text-slate-800 bg-white';
const cellInp = 'w-full px-2 py-1 text-xs bg-transparent focus:outline-none focus:bg-amber-50 rounded';
const ITEM_ROW = {
  name: '',
  batchNo: '',
  expiryDate: '',
  mfgDate: '',
  mrp: 0,
  qty: 1,
  unit: 'PCS',
  price: 0,
  gstRate: 0,
  gstAmount: 0,
  total: 0,
};
const RS = '₹';

function calcAmounts(qty, price, gstRate, priceType) {
  const lineAmt = Number(qty) * Number(price);
  const rate = Number(gstRate) || 0;
  if (priceType === 'With Tax') {
    const gstAmount = rate > 0 ? lineAmt * rate / (100 + rate) : 0;
    return { gstAmount, total: lineAmt };
  }
  const gstAmount = lineAmt * rate / 100;
  return { gstAmount, total: lineAmt + gstAmount };
}

function backCalcFromTotal(total, qty, gstRate, priceType) {
  const t = Number(total) || 0;
  const q = Number(qty) || 1;
  const rate = Number(gstRate) || 0;
  if (priceType === 'With Tax') {
    const price = t / q;
    const gstAmount = rate > 0 ? t * rate / (100 + rate) : 0;
    return { price, gstAmount };
  }
  const price = rate > 0 ? t / (q * (1 + rate / 100)) : t / q;
  const gstAmount = t - q * price;
  return { price, gstAmount };
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chandigarh','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];

function FloatInput({ label, value, onChange, type = 'text', readOnly = false, list, wrapperClass = '' }) {
  return (
    <div className={`relative ${wrapperClass}`}>
      <input type={type} value={value} onChange={onChange} placeholder=" " readOnly={readOnly} list={list}
        className={`peer w-full border border-slate-300 rounded-lg px-3 pt-4 pb-1 text-sm text-slate-800
          focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100
          ${readOnly ? 'bg-slate-50 cursor-default' : 'bg-white'}`} />
      <label className="absolute left-3 top-1 text-[10px] text-slate-400 pointer-events-none
        transition-all duration-150
        peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm
        peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-amber-500">
        {label}
      </label>
    </div>
  );
}

function genPurchaseBill(purchases = []) {
  const billNumbers = purchases
    .map(p => String(p.invoice || '').trim())
    .filter(invoice => /^\d+$/.test(invoice))
    .map(Number);

  if (!billNumbers.length) return '1';
  return String(Math.max(...billNumbers) + 1);
}

function makePurchaseTab(invoice) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    invoice,
    purchaseType: 'cash',
    form: {
      partyId: '', partyName: '',
      paymentMode: 'Cash',
      grnDate: new Date().toISOString().split('T')[0],
      supplierInvoiceNo: '', supplierInvoiceDate: '',
      ewayBillNo: '',
      stateOfSupply: 'Tamil Nadu',
      dueDate: '',
      priceType: 'With Tax',
    },
    items: [{ ...ITEM_ROW }],
  };
}

export default function Purchases() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] } = useQuery({ queryKey: ['paymentModes'], queryFn: PaymentsAPI.getModes });
  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });

  const [purchaseTabs, setPurchaseTabs] = useState(() => [makePurchaseTab(genPurchaseBill())]);
  const [activeTabId, setActiveTabId] = useState(() => purchaseTabs[0].id);
  const [saveConfirm, setSaveConfirm] = useState(false);

  const activeTab = purchaseTabs.find(t => t.id === activeTabId) || purchaseTabs[0];
  const items = activeTab?.items || [{ ...ITEM_ROW }];
  const form = activeTab?.form || { partyId: '', paymentMode: 'Cash', grnDate: new Date().toISOString().split('T')[0], supplierInvoiceNo: '', supplierInvoiceDate: '' };
  const invoice = activeTab?.invoice || genPurchaseBill(purchases);
  const purchaseType = activeTab?.purchaseType || 'cash';

  const createMut = useMutation({
    mutationFn: PurchasesAPI.create,
    onError: () => toast.error('Failed to save purchase'),
  });

  const updateActiveTab = (updater) => {
    setPurchaseTabs(tabs => tabs.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const patch = typeof updater === 'function' ? updater(tab) : updater;
      return { ...tab, ...patch };
    }));
  };

  const setItems = (updater) => updateActiveTab(tab => ({
    items: typeof updater === 'function' ? updater(tab.items) : updater,
  }));
  const setForm = (updater) => updateActiveTab(tab => ({
    form: typeof updater === 'function' ? updater(tab.form) : updater,
  }));
  const setPurchaseType = (type) => updateActiveTab({ purchaseType: type });
  const setInvoice = (nextInvoice) => updateActiveTab({ invoice: nextInvoice });

  useEffect(() => {
    const otherTabs = purchaseTabs.filter(t => t.id !== activeTabId);
    const nextInvoice = genPurchaseBill([...purchases, ...otherTabs]);
    const invoiceInPurchases = purchases.some(p => String(p.invoice) === String(invoice));
    const invoiceInOtherTab = otherTabs.some(t => String(t.invoice) === String(invoice));
    const hasLines = items.some(i => i.name || Number(i.qty) !== 1 || Number(i.price) > 0);

    if (!hasLines && (!invoice || invoiceInPurchases || invoiceInOtherTab)) {
      setInvoice(nextInvoice);
    }
  }, [activeTabId, invoice, items, purchaseTabs, purchases]);

  const grandTotal    = items.reduce((s, i) => s + Number(i.total    || 0), 0);
  const totalQty      = items.reduce((s, i) => s + Number(i.qty      || 0), 0);
  const totalGstAmt   = items.reduce((s, i) => s + Number(i.gstAmount|| 0), 0);
  const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');

  const addPurchaseTab = () => {
    const tab = makePurchaseTab(genPurchaseBill([...purchases, ...purchaseTabs]));
    setPurchaseTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closePurchaseTab = (tabId, e) => {
    e.stopPropagation();
    if (purchaseTabs.length === 1) {
      navigate('/dashboard');
      return;
    }

    const nextTabs = purchaseTabs.filter(t => t.id !== tabId);
    setPurchaseTabs(nextTabs);
    if (tabId === activeTabId) setActiveTabId(nextTabs[0].id);
  };

  const closeCompletedTab = (savedPurchase) => {
    const remainingTabs = purchaseTabs.filter(t => t.id !== activeTabId);
    if (remainingTabs.length) {
      setPurchaseTabs(remainingTabs);
      setActiveTabId(remainingTabs[0].id);
      return;
    }

    const freshTab = makePurchaseTab(genPurchaseBill([...purchases, savedPurchase]));
    setPurchaseTabs([freshTab]);
    setActiveTabId(freshTab.id);
  };

  const [scanSearch, setScanSearch]   = useState('');
  const [scanShowAll, setScanShowAll] = useState(false);
  const scanRef = useRef(null);

  const filteredScan = scanSearch.trim()
    ? products.filter(p =>
        (p.shortName || '').toLowerCase().includes(scanSearch.toLowerCase()) ||
        (p.itemCode  || '').toLowerCase().includes(scanSearch.toLowerCase())
      )
    : [];

  const scanDropList = scanShowAll && !scanSearch.trim() ? products : filteredScan;
  const scanDropOpen = scanSearch.trim() || scanShowAll;

  const addProductRow = (prod) => {
    const priceType = form.priceType;
    setItems(prev => {
      const existIdx = prev.findIndex(r => r.name === prod.shortName);
      if (existIdx >= 0) {
        return prev.map((r, i) => {
          if (i !== existIdx) return r;
          const newQty = Number(r.qty) + 1;
          const { gstAmount, total } = calcAmounts(newQty, r.price, r.gstRate, priceType);
          return { ...r, qty: newQty, gstAmount, total };
        });
      }
      const price   = Number(prod.purchasePrice || 0);
      const gstRate = Number(prod.gstRate || 0);
      const { gstAmount, total } = calcAmounts(1, price, gstRate, priceType);
      const newRow = { ...ITEM_ROW, name: prod.shortName, unit: prod.uom || 'PCS', price, mrp: Number(prod.mrp || 0), gstRate, gstAmount, total };
      const emptyIdx = prev.findIndex(r => !r.name);
      if (emptyIdx >= 0) return prev.map((r, i) => i === emptyIdx ? newRow : r);
      return [...prev, newRow];
    });
    setScanSearch('');
    setScanShowAll(false);
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  const addRow = () => setItems(prev => [...prev, { ...ITEM_ROW }]);
  const removeRow = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ ...ITEM_ROW }]);
  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      const { gstAmount, total } = calcAmounts(updated.qty, updated.price, updated.gstRate, form.priceType);
      return { ...updated, gstAmount, total };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.name && Number(i.qty) > 0 && Number(i.price) > 0);
    if (!validItems.length) { toast.warning('Add at least one valid item'); return; }
    if (purchaseType === 'credit' && !form.partyName.trim()) { toast.warning('Enter supplier name for credit purchase'); return; }

    const party = suppliers.find(p => String(p.id) === String(form.partyId));
    const savedPurchase = await createMut.mutateAsync({
      invoice,
      date: form.grnDate ? new Date(form.grnDate).toISOString() : new Date().toISOString(),
      supplierInvoiceNo: form.supplierInvoiceNo || null,
      supplierInvoiceDate: form.supplierInvoiceDate || null,
      partyId: party?.id || null,
      partyName: form.partyName || party?.name || 'Unknown Supplier',
      items: validItems,
      grandTotal,
      paymentMode: purchaseType === 'credit' ? `Credit (${form.paymentMode})` : form.paymentMode,
    });

    qc.invalidateQueries(['purchases']);
    qc.invalidateQueries(['items']);
    toast.success(`Purchase recorded — Bill: ${invoice}`);
    closeCompletedTab(savedPurchase);
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {purchaseTabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`h-9 shrink-0 flex items-center border rounded-lg overflow-hidden transition ${
                  isActive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <button type="button" onClick={() => setActiveTabId(tab.id)} className="h-full px-3 text-xs font-bold">
                  Purchase {idx + 1}
                </button>
                <button
                  type="button"
                  onClick={(e) => closePurchaseTab(tab.id, e)}
                  className="h-full w-8 flex items-center justify-center hover:bg-white/70 text-slate-400 hover:text-rose-500"
                  title="Close purchase tab"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addPurchaseTab}
            className="h-9 w-9 shrink-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            title="Add purchase bill"
          >
            <Plus size={16} />
          </button>
          <div className="ml-auto flex items-center bg-slate-200 rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => setPurchaseType('cash')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${purchaseType === 'cash' ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cash Purchase
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType('credit')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${purchaseType === 'credit' ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Credit Purchase
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* ── Four-column header ── */}
          <div className="grid grid-cols-4 gap-4 mb-6">

            {/* Column 1 — Supplier Name, Supplier Invoice No */}
            <div className="space-y-3">
              <FloatInput
                label="Supplier Name"
                value={form.partyName}
                list="supplier-datalist"
                onChange={e => {
                  const match = suppliers.find(s => s.name === e.target.value);
                  setForm(f => ({ ...f, partyName: e.target.value, partyId: match ? String(match.id) : '' }));
                }}
              />
              <datalist id="supplier-datalist">
                {suppliers.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
              <FloatInput
                label="Supplier Invoice No"
                value={form.supplierInvoiceNo}
                onChange={e => setForm(f => ({ ...f, supplierInvoiceNo: e.target.value }))}
              />
            </div>

            {/* Column 2 — Supplier Invoice Date, E-Way Bill No */}
            <div className="space-y-3">
              <FloatInput
                label="Supplier Invoice Date"
                type="date"
                value={form.supplierInvoiceDate}
                onChange={e => setForm(f => ({ ...f, supplierInvoiceDate: e.target.value }))}
              />
              <FloatInput
                label="E-Way Bill No"
                value={form.ewayBillNo}
                onChange={e => setForm(f => ({ ...f, ewayBillNo: e.target.value }))}
              />
            </div>

            {/* Column 3 — State of Supply, Due Date */}
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={form.stateOfSupply}
                  onChange={e => setForm(f => ({ ...f, stateOfSupply: e.target.value }))}
                  className="peer w-full border border-slate-300 rounded-lg px-3 pt-4 pb-1 text-sm text-slate-800
                    focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 bg-white appearance-none">
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                <label className="absolute left-3 top-1 text-[10px] text-slate-400 pointer-events-none">State of Supply</label>
              </div>
              <FloatInput
                label="Due Date"
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            {/* Column 4 — GRN No, GRN Date */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={invoice}
                  readOnly
                  placeholder=" "
                  className="peer w-full border border-slate-300 rounded-lg px-3 pt-4 pb-1 text-sm font-bold
                    text-amber-600 font-mono bg-slate-50 cursor-default focus:outline-none"
                />
                <label className="absolute left-3 top-1 text-[10px] text-slate-400 pointer-events-none">GRN No</label>
              </div>
              <FloatInput
                label="GRN Date"
                type="date"
                value={form.grnDate}
                onChange={e => setForm(f => ({ ...f, grnDate: e.target.value }))}
              />
            </div>

          </div>


          {/* ── Scan / Search bar ── */}
          <div className="mb-3 relative">
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:border-amber-500 bg-white">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                ref={scanRef}
                value={scanSearch}
                onChange={e => { setScanSearch(e.target.value); setScanShowAll(false); }}
                onKeyDown={e => {
                  if (e.key === 'F1') { e.preventDefault(); setScanShowAll(true); }
                  if (e.key === 'Enter') {
                    if (scanDropList.length) addProductRow(scanDropList[0]);
                  }
                  if (e.key === 'Escape') { setScanSearch(''); setScanShowAll(false); }
                }}
                placeholder="Search or scan barcode to add item… (F1 for all)"
                className="flex-1 text-sm focus:outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
              />
              {(scanSearch || scanShowAll) && (
                <button type="button" onClick={() => { setScanSearch(''); setScanShowAll(false); scanRef.current?.focus(); }}
                  className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            {scanDropOpen && scanDropList.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-1.5 bg-slate-100 border-b border-slate-200 sticky top-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item Name</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Item Code</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">MRP</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Purchase</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Sales</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Stock</span>
                </div>
                {scanDropList.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => addProductRow(p)}
                    className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-2 hover:bg-amber-50 transition text-left border-b border-slate-100 last:border-0">
                    <span className="text-sm font-semibold text-slate-800 truncate pr-2">{p.shortName}</span>
                    <span className="text-xs text-slate-500 text-center self-center">{p.itemCode || '—'}</span>
                    <span className="text-xs text-slate-600 text-right self-center">{RS}{Number(p.mrp || 0).toFixed(2)}</span>
                    <span className="text-xs font-semibold text-amber-600 text-right self-center">{RS}{Number(p.purchasePrice || 0).toFixed(2)}</span>
                    <span className="text-xs text-emerald-600 text-right self-center">{RS}{Number(p.salesPrice || 0).toFixed(2)}</span>
                    <span className={`text-xs font-semibold text-right self-center ${Number(p.stock) <= Number(p.reorderLevel || 10) ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {Number(p.stock || 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <ResizableTable
              defaultWidths={{ 1: 16 }}
              headers={['S.No', 'ITEM', 'COUNT', 'BATCH NO.', 'EXP. DATE', 'MFG. DATE', 'MRP', 'QTY', 'FREE QTY', 'UNIT',
                <div key="price" className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide">Price/Unit</span>
                  <select
                    value={form.priceType}
                    onChange={e => {
                      const pt = e.target.value;
                      setForm(f => ({ ...f, priceType: pt }));
                      setItems(prev => prev.map(r => {
                        const { gstAmount, total } = calcAmounts(r.qty, r.price, r.gstRate, pt);
                        return { ...r, gstAmount, total };
                      }));
                    }}
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] font-normal bg-slate-700 border border-slate-500 rounded px-1 py-0.5 text-white focus:outline-none normal-case tracking-normal">
                    <option value="With Tax">With Tax</option>
                    <option value="Without Tax">Without Tax</option>
                  </select>
                </div>,
                'GST RATE', 'GST AMOUNT', 'TOTAL AMOUNT', '']}
              className="border border-slate-200 overflow-x-auto"
            >
              {items.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                  <td className="px-2 py-1 text-center text-xs text-slate-400 border-r border-slate-200">{idx + 1}</td>
                  <td className="border-r border-slate-200 p-0">
                    <input list={`items-${activeTab?.id}-${idx}`} value={row.name} onChange={e => {
                      const prod = products.find(p => p.shortName === e.target.value);
                      if (prod) {
                        const pt = form.priceType;
                        setItems(prev => {
                          const existIdx = prev.findIndex((r, i) => i !== idx && r.name === prod.shortName);
                          if (existIdx >= 0) {
                            return prev.map((r, i) => {
                              if (i === existIdx) {
                                const newQty = Number(r.qty) + Number(prev[idx].qty || 1);
                                const { gstAmount, total } = calcAmounts(newQty, r.price, r.gstRate, pt);
                                return { ...r, qty: newQty, gstAmount, total };
                              }
                              if (i === idx) return { ...ITEM_ROW };
                              return r;
                            });
                          }
                          return prev.map((r, i) => {
                            if (i !== idx) return r;
                            const price   = Number(prod.purchasePrice || 0);
                            const gstRate = Number(prod.gstRate || 0);
                            const { gstAmount, total } = calcAmounts(r.qty, price, gstRate, pt);
                            return { ...r, name: e.target.value, unit: prod.uom || r.unit || 'PCS', price, mrp: Number(prod.mrp || 0), gstRate, gstAmount, total };
                          });
                        });
                      } else {
                        updateRow(idx, 'name', e.target.value);
                      }
                    }} placeholder="Item name…" className={cellInp} />
                    <datalist id={`items-${activeTab?.id}-${idx}`}>
                      {products.map(p => <option key={p.id} value={p.shortName} />)}
                    </datalist>
                  </td>
                  <td className="border-r border-slate-200 p-0"><input value={row.count || ''} onChange={e => updateRow(idx, 'count', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.batchNo} onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="text" value={row.expiryDate} onChange={e => updateRow(idx, 'expiryDate', e.target.value)} placeholder="MM/YY" className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="text" value={row.mfgDate} onChange={e => updateRow(idx, 'mfgDate', e.target.value)} placeholder="MM/YY" className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.mrp} onChange={e => updateRow(idx, 'mrp', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" min="1" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} className={`${cellInp} text-right font-semibold`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.freeQty || ''} onChange={e => updateRow(idx, 'freeQty', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0">
                    <input type="number" step="0.01" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)} className={`${cellInp} text-right`} />
                  </td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.gstRate ?? ''} onChange={e => updateRow(idx, 'gstRate', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 px-2 py-1 text-right text-xs text-slate-600">{Number(row.gstAmount || 0).toFixed(2)}</td>
                  <td className="border-r border-slate-200 p-0">
                    <input
                      type="number" step="0.01" min="0"
                      value={row.total || ''}
                      onChange={e => {
                        const raw = e.target.value;
                        setItems(prev => prev.map((r, i) => {
                          if (i !== idx) return r;
                          if (raw === '') return { ...r, price: 0, gstAmount: 0, total: '' };
                          const { price, gstAmount } = backCalcFromTotal(raw, r.qty, r.gstRate, form.priceType);
                          return { ...r, price, gstAmount, total: raw };
                        }));
                      }}
                      className={`${cellInp} text-right font-semibold`}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button type="button" onClick={() => removeRow(idx)} className="p-1 text-slate-300 hover:text-rose-500 transition">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                <td colSpan={7} className="px-3 py-2 text-xs text-slate-500 text-right border-r border-slate-200">Total</td>
                <td className="border-r border-slate-200 px-2 py-2 text-right text-xs text-slate-800">{totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}</td>
                <td colSpan={4} className="border-r border-slate-200" />
                <td className="border-r border-slate-200 px-2 py-2 text-right text-xs text-slate-800">{totalGstAmt.toFixed(2)}</td>
                <td className="border-r border-slate-200 px-2 py-2 text-right text-xs text-amber-700">{grandTotal.toFixed(2)}</td>
                <td />
              </tr>
            </ResizableTable>
          </div>

          <div className="mb-4">
            <button type="button" onClick={addRow} className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1.5 transition">
              <Plus size={15} /> Add Row
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="w-80">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inp}>
                {modes.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Summary box */}
            <div className="w-72 shrink-0 border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500">Sub Total</span>
                <span className="text-sm font-semibold text-slate-700">{RS}{(grandTotal - totalGstAmt).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500">Tax Amount</span>
                <span className="text-sm font-semibold text-slate-700">{RS}{totalGstAmt.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50">
                <span className="text-sm font-bold text-slate-800">Grand Total</span>
                <span className="text-lg font-bold text-amber-700">{RS}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button type="button" onClick={() => setItems([{ ...ITEM_ROW }])}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition">
              <Trash2 size={15} /> Clear
            </button>
            <button type="button" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition">
              <Check size={15} /> Draft Purchase
            </button>
            <button type="button" className="bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition">
              <Check size={15} /> Print Purchase
            </button>
            <button type="button" onClick={() => setSaveConfirm(true)} disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-sm">
              <Check size={15} /> {createMut.isPending ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={saveConfirm}
        title="Save Purchase"
        message={`Save purchase bill ${invoice} with ${items.filter(i => i.name).length} item(s)? Total: ₹${grandTotal.toFixed(2)}`}
        confirmLabel="Save"
        onConfirm={() => { setSaveConfirm(false); handleSubmit({ preventDefault: () => {} }); }}
        onClose={() => setSaveConfirm(false)}
      />
    </div>
  );
}
