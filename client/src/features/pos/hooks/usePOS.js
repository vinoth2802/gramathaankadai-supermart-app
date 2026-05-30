import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ItemsAPI } from '@features/inventory/resources/inventory-service';
import { PartiesAPI } from '@features/parties/resources/parties-service';
import { SalesAPI } from '@features/sales/resources/sales-service';
import { PaymentsAPI } from '@features/payments/resources/payments-service';
import { SettingsAPI } from '@features/settings/resources/settings-service';
import { usePartySave } from '@features/parties/hooks/usePartySave';
import { genNextInvoice, makePaymentLines, makeSaleTab, RS } from '../resources/constants';

export function usePOS() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const searchRef = useRef();

  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });
  const { data: nextInvData } = useQuery({ queryKey: ['next-invoice'], queryFn: SalesAPI.getNextNumber, staleTime: 0 });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get, staleTime: 60_000 });

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [partyModal, setPartyModal] = useState(false);
  const [addPartyModal, setAddPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [saleTabs, setSaleTabs] = useState(() => [makeSaleTab('…')]);
  const [activeTabId, setActiveTabId] = useState(() => saleTabs[0].id);
  const [stockMap, setStockMap] = useState({});
  const [clearConfirm, setClearConfirm] = useState(false);
  const [printSale, setPrintSale] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [payDialog, setPayDialog] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);

  const activeTab = saleTabs.find(t => t.id === activeTabId) || saleTabs[0];
  const cart = activeTab?.cart || [];
  const paymentLines = activeTab?.paymentLines || makePaymentLines();
  const selectedParty = activeTab?.selectedParty || null;
  const saleType = activeTab?.saleType || 'cash';
  const invoice = activeTab?.invoice || nextInvData?.invoice || genNextInvoice(sales);

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

  const partySave = usePartySave({
    onClose: () => setAddPartyModal(false),
    onSaved: (savedParty, data) => {
      setSelectedParty(savedParty || data);
      setPartyModal(false);
    },
  });

  useEffect(() => {
    const m = {};
    products.forEach(p => { m[p.id] = Number(p.stock || 0); });
    setStockMap(m);
  }, [products]);

  useEffect(() => {
    if (!cart.length) {
      const otherTabs = saleTabs.filter(t => t.id !== activeTabId);
      const taken = new Set([
        ...sales.map(s => String(s.invoice)),
        ...otherTabs.map(t => String(t.invoice)),
      ]);
      const invoiceConflicts = !invoice || invoice === '…' || taken.has(String(invoice));
      if (invoiceConflicts) {
        let next = nextInvData?.invoice ?? genNextInvoice([...sales, ...otherTabs]);
        while (taken.has(next)) {
          const m = String(next).match(/^([^0-9]*)(\d+)$/);
          if (!m) break;
          next = `${m[1]}${Number(m[2]) + 1}`;
        }
        setInvoice(next);
      }
    }
  }, [activeTabId, cart.length, invoice, sales, saleTabs, nextInvData?.invoice]);

  const createSale = useMutation({
    mutationFn: SalesAPI.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['next-invoice'] });
    },
  });

  // salesPrice is tax-inclusive, so price * qty is already the grand total.
  // Back-calculate GST from the inclusive amount: gst = total × rate / (100 + rate)
  const grandTotal = Math.round(cart.reduce((s, i) => s + i.price * i.qty, 0));
  const gst        = cart.reduce((s, i) => {
    const rate = i.gstRate || 0;
    return s + (i.price * i.qty) * rate / (100 + rate);
  }, 0);
  const subtotal = grandTotal - gst;
  const received = Number(receivedAmount) || 0;
  const change = Math.max(received - grandTotal, 0);
  const prevPoints = Number(selectedParty?.loyaltyPoints ?? 0);
  const eligiblePoints = Math.floor(grandTotal / 10);
  const totalPoints = prevPoints + eligiblePoints;

  const filteredProducts = products.filter(p =>
    (p.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.itemCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) || (p.phone || '').includes(partySearch)
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
    setCart([]);
    setPaymentLines([{ mode: modes[0]?.name || 'Cash', amount: 0 }]);
    setClearConfirm(false);
  };

  const addSaleTab = () => {
    const taken = new Set(saleTabs.map(t => String(t.invoice)));
    let inv = nextInvData?.invoice ?? genNextInvoice([...sales, ...saleTabs]);
    while (taken.has(inv)) {
      const m = String(inv).match(/^([^0-9]*)(\d+)$/);
      if (!m) break;
      inv = `${m[1]}${Number(m[2]) + 1}`;
    }
    const tab = makeSaleTab(inv);
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

  const updateReceivedAmount = (value) => {
    setReceivedAmount(value === '' ? '' : Math.max(Number(value) || 0, 0));
  };

  const openPayDialog = () => {
    if (!cart.length) { toast.warning('Cart is empty'); return; }
    if (saleType === 'credit' && !selectedParty) {
      toast.warning('Select a party for credit sale');
      setPartyModal(true);
      return;
    }
    setPayDialog(true);
  };

  const completeSale = async (shouldPrint = false) => {
    if (!cart.length) { toast.warning('Cart is empty'); return; }

    const record = {
      invoice,
      date: new Date().toISOString(),
      customerName: selectedParty?.name || 'Cash Sale',
      partyId: selectedParty?.id || null,
      items: cart.map(i => ({ name: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty })),
      subtotal,
      gst,
      grandTotal,
      paymentMode: saleType === 'credit' ? 'Credit' : paymentLines[0]?.mode || 'Cash',
      totalReceived: received,
      changeGiven: change,
    };
    const savedSale = await createSale.mutateAsync(record);
    if (selectedParty && (saleType === 'credit' || received < grandTotal)) {
      await PartiesAPI.updateBalance(selectedParty.id, grandTotal - received).catch(() => {});
    }
    toast.success(`Sale completed — Invoice: ${invoice} | Total: ${RS}${grandTotal.toFixed(0)}`);
    setPayDialog(false);

    if (shouldPrint) setPrintSale({ ...record, party: selectedParty });

    const remainingTabs = saleTabs.filter(t => t.id !== activeTabId);
    if (remainingTabs.length) {
      setSaleTabs(remainingTabs);
      setActiveTabId(remainingTabs[0].id);
    } else {
      const freshInvResult = await SalesAPI.getNextNumber().catch(() => null);
      const freshInv = freshInvResult?.invoice ?? genNextInvoice([...sales, savedSale]);
      const freshTab = makeSaleTab(freshInv);
      setSaleTabs([freshTab]);
      setActiveTabId(freshTab.id);
    }
    setReceivedAmount('');
  };

  return {
    products, modes, settings, searchRef,
    search, setSearch, showAll, setShowAll,
    partyModal, setPartyModal, addPartyModal, setAddPartyModal, partySearch, setPartySearch,
    saleTabs, activeTabId, setActiveTabId, stockMap,
    clearConfirm, setClearConfirm, printSale, setPrintSale,
    payDialog, setPayDialog, openPayDialog,
    receivedAmount, updateReceivedAmount,
    cart, paymentLines, selectedParty, saleType, setSaleType, setSelectedParty,
    invoice, subtotal, gst, grandTotal, change, prevPoints, eligiblePoints, totalPoints,
    filteredProducts, filteredParties,
    addToCart, removeFromCart, doClearCart, addSaleTab, closeSaleTab, updatePayLine, completeSale,
    createSale,
    partySave,
    redirectTo,
  };
}
