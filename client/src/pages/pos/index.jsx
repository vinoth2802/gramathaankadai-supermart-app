import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, User, Search, X, Check, Trash2, Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { PartiesAPI } from '../../api/parties.js';
import { SalesAPI } from '../../api/sales.js';
import { PaymentsAPI } from '../../api/payments.js';

function genInvoice(sales = []) {
  const invoiceNumbers = sales
    .map(s => String(s.invoice || '').trim())
    .filter(invoice => /^\d+$/.test(invoice))
    .map(Number);

  if (!invoiceNumbers.length) return '1';
  return String(Math.max(...invoiceNumbers) + 1);
}

const RS = '₹';
const makePaymentLines = () => [{ mode: 'Cash', amount: 0 }];
const makeSaleTab = (invoice) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  invoice,
  cart: [],
  paymentLines: makePaymentLines(),
  selectedParty: null,
  saleType: 'cash',
});

export default function POS() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: parties = [] }  = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] }    = useQuery({ queryKey: ['paymentModes'], queryFn: PaymentsAPI.getModes });
  const { data: sales = [] }    = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });

  const [search, setSearch]         = useState('');
  const [showAll, setShowAll]       = useState(false);
  const [partyModal, setPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [saleTabs, setSaleTabs]     = useState(() => [makeSaleTab(genInvoice())]);
  const [activeTabId, setActiveTabId] = useState(() => saleTabs[0].id);
  const [stockMap, setStockMap]     = useState({});
  const [clearConfirm, setClearConfirm] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const searchRef = useRef();
  const activeTab = saleTabs.find(t => t.id === activeTabId) || saleTabs[0];
  const cart = activeTab?.cart || [];
  const paymentLines = activeTab?.paymentLines || makePaymentLines();
  const selectedParty = activeTab?.selectedParty || null;
  const saleType = activeTab?.saleType || 'cash';
  const invoice = activeTab?.invoice || genInvoice(sales);

  const updateActiveTab = (updater) => {
    setSaleTabs(tabs => tabs.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const patch = typeof updater === 'function' ? updater(tab) : updater;
      return { ...tab, ...patch };
    }));
  };
  const setCart = (updater) => updateActiveTab(tab => ({
    cart: typeof updater === 'function' ? updater(tab.cart) : updater,
  }));
  const setPaymentLines = (updater) => updateActiveTab(tab => ({
    paymentLines: typeof updater === 'function' ? updater(tab.paymentLines) : updater,
  }));
  const setSelectedParty = (party) => updateActiveTab({ selectedParty: party });
  const setSaleType = (type) => updateActiveTab({ saleType: type });
  const setInvoice = (nextInvoice) => updateActiveTab({ invoice: nextInvoice });

  useEffect(() => {
    const m = {};
    products.forEach(p => { m[p.id] = Number(p.stock || 0); });
    setStockMap(m);
  }, [products]);

  useEffect(() => {
    if (!cart.length) {
      const otherTabs = saleTabs.filter(t => t.id !== activeTabId);
      const nextInvoice = genInvoice([...sales, ...otherTabs]);
      const invoiceInSales = sales.some(s => String(s.invoice) === String(invoice));
      const invoiceInOtherTab = otherTabs.some(t => String(t.invoice) === String(invoice));
      if (!invoice || invoiceInSales || invoiceInOtherTab) setInvoice(nextInvoice);
    }
  }, [activeTabId, cart.length, invoice, sales, saleTabs]);

  const createSale = useMutation({
    mutationFn: SalesAPI.create,
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['items']); }
  });

  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst        = cart.reduce((s, i) => s + (i.price * i.qty * (i.gstRate || 0) / 100), 0);
  const grandTotal     = Math.round(subtotal + gst);
  const received       = Number(receivedAmount) || 0;
  const change         = Math.max(received - grandTotal, 0);
  const prevPoints     = Number(selectedParty?.loyaltyPoints ?? 0);
  const eligiblePoints = Math.floor(grandTotal / 10);
  const totalPoints    = prevPoints + eligiblePoints;

  const filteredProducts = products.filter(p =>
    (p.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.itemCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    const avail = stockMap[product.id] ?? Number(product.stock || 0);
    if (avail <= 0) { toast.error('Out of stock!'); return; }
    setStockMap(m => ({ ...m, [product.id]: (m[product.id] ?? 0) - 1 }));
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === product.id);
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.shortName, price: Number(product.salesPrice || 0), qty: 1, gstRate: Number(product.gstRate || 0), batch: 'N/A', uom: product.uom || 'Pcs' }];
    });
    ItemsAPI.adjustStock(product.id, -1).catch(() => {});
    setSearch('');
    setShowAll(false);
    setTimeout(() => searchRef.current?.focus(), 0);
  };


  const removeFromCart = (idx) => {
    const item = cart[idx];
    setStockMap(m => ({ ...m, [item.id]: (m[item.id] ?? 0) + item.qty }));
    ItemsAPI.adjustStock(item.id, item.qty).catch(() => {});
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const doClearCart = () => {
    cart.forEach(item => ItemsAPI.adjustStock(item.id, item.qty).catch(() => {}));
    setCart([]); setPaymentLines([{ mode: modes[0]?.name || 'Cash', amount: 0 }]);
    setClearConfirm(false);
  };

  const addSaleTab = () => {
    const tab = makeSaleTab(genInvoice([...sales, ...saleTabs]));
    setSaleTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setSearch('');
  };

  const closeSaleTab = (tabId, e) => {
    e.stopPropagation();
    const tab = saleTabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.cart.forEach(item => {
      setStockMap(m => ({ ...m, [item.id]: (m[item.id] ?? 0) + item.qty }));
      ItemsAPI.adjustStock(item.id, item.qty).catch(() => {});
    });

    if (saleTabs.length === 1) {
      navigate('/dashboard');
      return;
    }

    const nextTabs = saleTabs.filter(t => t.id !== tabId);
    setSaleTabs(nextTabs);
    if (tabId === activeTabId) setActiveTabId(nextTabs[0].id);
  };

  const updatePayLine = (idx, field, value) =>
    setPaymentLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const completeSale = async (shouldPrint = false) => {
    if (!cart.length) { toast.warning('Cart is empty'); return; }
    if (saleType === 'credit' && !selectedParty) {
      toast.warning('Select a party for credit sale');
      setPartyModal(true);
      return;
    }

    const record = {
      invoice, date: new Date().toISOString(),
      customerName: selectedParty?.name || 'Cash Sale',
      partyId: selectedParty?.id || null,
      items: cart.map(i => ({ name: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty })),
      subtotal, gst, grandTotal,
      paymentMode: saleType === 'credit' ? 'Credit' : paymentLines[0]?.mode || 'Cash',
      totalReceived: received, changeGiven: change
    };
    const savedSale = await createSale.mutateAsync(record);
    if (selectedParty && (saleType === 'credit' || received < grandTotal)) {
      await PartiesAPI.updateBalance(selectedParty.id, grandTotal - received).catch(() => {});
    }
    toast.success(`Sale completed — Invoice: ${invoice} | Total: ${RS}${grandTotal.toFixed(0)}`);

    if (shouldPrint) {
      setTimeout(() => window.print(), 300);
    }

    const remainingTabs = saleTabs.filter(t => t.id !== activeTabId);
    if (remainingTabs.length) {
      setSaleTabs(remainingTabs);
      setActiveTabId(remainingTabs[0].id);
      setReceivedAmount(0);
    } else {
      const freshTab = makeSaleTab(genInvoice([...sales, savedSale]));
      setSaleTabs([freshTab]);
      setActiveTabId(freshTab.id);
      setReceivedAmount(0);
    }
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) || (p.phone || '').includes(partySearch)
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Layout 1: Sale Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
        {saleTabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`h-9 shrink-0 flex items-center border rounded-lg overflow-hidden transition ${
                isActive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <button
                onClick={() => setActiveTabId(tab.id)}
                className="h-full px-3 text-xs font-bold"
              >
                Sale {idx + 1}
              </button>
              <button
                onClick={(e) => closeSaleTab(tab.id, e)}
                className="h-full w-8 flex items-center justify-center hover:bg-white/70 text-slate-400 hover:text-rose-500"
                title="Close sale tab"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        <button
          onClick={addSaleTab}
          className="h-9 w-9 shrink-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
          title="Add invoice"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Layout 2: Invoice Info & Sale Type */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="text-sm text-slate-600 flex items-center gap-2">
          <span className="font-semibold">Invoice:</span>
          <span className="font-mono text-amber-600 font-bold">{invoice}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-xs">{new Date().toLocaleString('en-IN')}</span>
        </div>

        <div className="text-sm flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Party:</span>
            {selectedParty ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check size={12} /> {selectedParty.name}
                </span>
                <div className="text-xs text-slate-500 space-y-0.5">
                  {selectedParty.phone && <div>Mobile: {selectedParty.phone}</div>}
                  {selectedParty.gst && <div>GST: {selectedParty.gst}</div>}
                  {selectedParty.address && <div>Address: {selectedParty.address}</div>}
                </div>
              </div>
            ) : (
              <span className="text-slate-400">{saleType === 'credit' ? 'Select party' : 'Cash Sale'}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200 rounded-lg p-1">
            <button
              onClick={() => setSaleType('cash')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${saleType === 'cash' ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cash Sale
            </button>
            <button
              onClick={() => setSaleType('credit')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${saleType === 'credit' ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Credit Sale
            </button>
          </div>
          <button onClick={() => setPartyModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
            <User size={13} /> Select Party
          </button>
        </div>
      </div>

      {/* Layout 3: Items Cart Table (Full Width) */}
      <div className="flex-1 overflow-hidden p-4">
        {/* Cart Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="font-bold text-slate-800 px-5 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="text-amber-500" size={18} />
              <span>Cart Items ({cart.length})</span>
            </div>
            {/* Search bar with dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-amber-500 bg-white">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowAll(false); }}
                  onKeyDown={e => {
                    if (e.key === 'F1') { e.preventDefault(); setShowAll(true); }
                    if (e.key === 'Enter') {
                      const list = showAll && !search.trim() ? products : filteredProducts;
                      if (list.length) addToCart(list[0]);
                    }
                    if (e.key === 'Escape') { setShowAll(false); setSearch(''); }
                  }}
                  placeholder="Search or Scan barcode to add item…. (F1 for All)"
                  className="flex-1 text-sm focus:outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
                {(search || showAll) && (
                  <button type="button" onClick={() => { setSearch(''); setShowAll(false); searchRef.current?.focus(); }}
                    className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* Dropdown */}
              {(() => {
                const dropList = showAll && !search.trim() ? products : filteredProducts;
                const show = (search.trim() || showAll) && dropList.length > 0;
                if (!show) return null;
                return (
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
                  {dropList.map(p => {
                    const avail = stockMap[p.id] ?? Number(p.stock || 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => addToCart(p)}
                        className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-2 hover:bg-green-50 transition text-left border-b border-slate-100 last:border-0">
                        <span className="text-sm font-semibold text-slate-800 truncate pr-2">{p.shortName}</span>
                        <span className="text-xs text-slate-500 text-center self-center">{p.itemCode || '—'}</span>
                        <span className="text-xs text-slate-600 text-right self-center">{RS}{Number(p.mrp || 0).toFixed(2)}</span>
                        <span className="text-xs font-semibold text-amber-600 text-right self-center">{RS}{Number(p.purchasePrice || 0).toFixed(2)}</span>
                        <span className="text-xs font-semibold text-emerald-600 text-right self-center">{RS}{Number(p.salesPrice || 0).toFixed(2)}</span>
                        <span className={`text-xs font-semibold text-right self-center ${avail <= Number(p.reorderLevel || 10) ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {avail}
                        </span>
                      </button>
                    );
                  })}
                </div>
                );
              })()}
              {search.trim() && !showAll && filteredProducts.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-slate-400">
                  No products found
                </div>
              )}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10 border-r border-slate-200">S.No</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-200">Item Name</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-16 border-r border-slate-200">Batch</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-16 border-r border-slate-200">MRP</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10 border-r border-slate-200">Qty</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-12 border-r border-slate-200">Unit</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-20 border-r border-slate-200">Rate Inc Tax</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-14 border-r border-slate-200">GST %</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-24 border-r border-slate-200">Total Amount</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-3 py-8 text-center text-slate-400">Cart is empty</td>
                  </tr>
                ) : cart.map((item, i) => {
                  const itemTotal = item.price * item.qty;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-amber-50 transition">
                      <td className="px-3 py-1.5 font-semibold text-slate-600 border-r border-slate-100">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-100">{item.name}</td>
                      <td className="px-3 py-1.5 text-slate-500 border-r border-slate-100">{item.batch || 'N/A'}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-amber-600 border-r border-slate-100">{RS}{item.price.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{item.qty}</td>
                      <td className="px-3 py-1.5 text-slate-600 border-r border-slate-100">{item.uom}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-emerald-600 border-r border-slate-100">{RS}{item.price.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-blue-600 border-r border-slate-100">{item.gstRate || 0}%</td>
                      <td className="px-3 py-1.5 text-right font-bold text-slate-800 border-r border-slate-100">{RS}{itemTotal.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <button onClick={() => removeFromCart(i)} className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Layout 4: Summary & Checkout */}
      <div className="bg-white border-t border-slate-200 px-5 py-4 shrink-0">
        <div className="flex items-center gap-4">

          {/* Card 1: Totals */}
          <div className="border border-slate-200 rounded-xl overflow-hidden w-64 shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Sub Total</span>
              <span className="text-sm font-semibold text-slate-700">{RS}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Tax Amount</span>
              <span className="text-sm font-semibold text-slate-700">{RS}{gst.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
              <span className="text-sm font-bold text-slate-800">Grand Total</span>
              <span className="text-lg font-bold text-emerald-700">{RS}{grandTotal.toFixed(0)}</span>
            </div>
          </div>

          {/* Card 2: Payment */}
          <div className="border border-slate-200 rounded-xl overflow-hidden w-72 shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Received Amount</span>
              <input type="number" value={receivedAmount} onChange={e => setReceivedAmount(Number(e.target.value))}
                placeholder="0.00" className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right bg-white focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Change Given</span>
              <span className="text-sm font-semibold text-amber-600">{RS}{change.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-slate-500">Payment Type</span>
              <select value={paymentLines[0]?.mode || 'Cash'} onChange={e => updatePayLine(0, 'mode', e.target.value)}
                className="w-32 border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {modes.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Card 3: Loyalty Points — only when a party is selected */}
          {selectedParty && <div className="border border-slate-200 rounded-xl overflow-hidden w-64 shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Previous Loyalty Points</span>
              <span className="text-sm font-semibold text-slate-700">{prevPoints}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Eligible Loyalty Points</span>
              <span className="text-sm font-semibold text-emerald-600">+{eligiblePoints}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-violet-50">
              <span className="text-sm font-bold text-slate-800">Total Loyalty Points</span>
              <span className="text-lg font-bold text-violet-700">{totalPoints}</span>
            </div>
          </div>}

          {/* Action Buttons */}
          <div className="flex gap-2 items-center ml-auto">
            <button onClick={() => completeSale(false)} disabled={createSale.isPending || !cart.length}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition">
              <Check size={15} /> {createSale.isPending ? 'Saving...' : 'Complete'}
            </button>
            <button onClick={() => completeSale(true)} disabled={createSale.isPending || !cart.length}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-1.5 transition">
              <Printer size={15} /> Print
            </button>
            <button onClick={() => setClearConfirm(true)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-2.5 rounded-lg font-bold text-sm transition">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Party Selector Modal */}
      {partyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800">Select Party</h2>
              <button onClick={() => setPartyModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"><X size={20} /></button>
            </div>
            <input value={partySearch} onChange={e => setPartySearch(e.target.value)} placeholder="Search by name or phone..."
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:border-amber-500 text-sm" />
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-semibold">Name</th>
                    <th className="p-3 text-left font-semibold">Phone</th>
                    <th className="p-3 text-right font-semibold">Balance</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParties.map(p => (
                    <tr key={p.id} onClick={() => { setSelectedParty(p); setPartyModal(false); }} className="cursor-pointer hover:bg-amber-50 transition">
                      <td className="p-3 font-medium text-slate-800">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.phone || '—'}</td>
                      <td className={`p-3 text-right font-semibold ${Number(p.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {RS}{Math.abs(Number(p.balance || 0)).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <button className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">Select</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setPartyModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={() => { setSelectedParty(null); setPartyModal(false); }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
                Cash Sale
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={clearConfirm}
        title="Clear Cart"
        message="Remove all items from the cart? Stock will be restored."
        confirmLabel="Clear"
        onConfirm={doClearCart}
        onClose={() => setClearConfirm(false)}
      />
    </div>
  );
}