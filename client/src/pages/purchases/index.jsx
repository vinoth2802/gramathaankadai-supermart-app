import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import ResizableTable from '../../components/ResizableTable.jsx';
import { PurchasesAPI } from '../../api/purchases.js';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';
import { ItemsAPI } from '../../api/items.js';

const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800 bg-white';
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
    form: { partyId: '', paymentMode: 'Cash', grnDate: new Date().toISOString().split('T')[0], supplierInvoiceNo: '', supplierInvoiceDate: '' },
    items: [{ ...ITEM_ROW }],
  };
}

export default function Purchases() {
  const qc = useQueryClient();
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] } = useQuery({ queryKey: ['paymentModes'], queryFn: PaymentsAPI.getModes });
  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });

  const [purchaseTabs, setPurchaseTabs] = useState(() => [makePurchaseTab(genPurchaseBill())]);
  const [activeTabId, setActiveTabId] = useState(() => purchaseTabs[0].id);

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

  const grandTotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');

  const addPurchaseTab = () => {
    const tab = makePurchaseTab(genPurchaseBill([...purchases, ...purchaseTabs]));
    setPurchaseTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closePurchaseTab = (tabId, e) => {
    e.stopPropagation();
    if (purchaseTabs.length === 1) {
      const freshTab = makePurchaseTab(genPurchaseBill(purchases));
      setPurchaseTabs([freshTab]);
      setActiveTabId(freshTab.id);
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

  const addRow = () => setItems(prev => [...prev, { ...ITEM_ROW }]);
  const removeRow = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ ...ITEM_ROW }]);
  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      const taxable = Number(updated.qty) * Number(updated.price);
      updated.gstAmount = taxable * (Number(updated.gstRate) || 0) / 100;
      updated.total = taxable + updated.gstAmount;
      return updated;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.name && Number(i.qty) > 0 && Number(i.price) > 0);
    if (!validItems.length) { toast.warning('Add at least one valid item'); return; }
    if (purchaseType === 'credit' && !form.partyId) { toast.warning('Select supplier for credit purchase'); return; }

    const party = parties.find(p => p.id === Number(form.partyId));
    const savedPurchase = await createMut.mutateAsync({
      invoice,
      date: form.grnDate ? new Date(form.grnDate).toISOString() : new Date().toISOString(),
      supplierInvoiceNo: form.supplierInvoiceNo || null,
      supplierInvoiceDate: form.supplierInvoiceDate || null,
      partyId: party?.id || null,
      partyName: party?.name || 'Unknown Supplier',
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
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record stock purchased from suppliers</p>
        </div>
      </div>

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
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="font-bold text-slate-700 text-base">New Purchase</h3>
            <div className="flex items-center bg-slate-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPurchaseType('cash')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${purchaseType === 'cash' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cash Purchase
              </button>
              <button
                type="button"
                onClick={() => setPurchaseType('credit')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${purchaseType === 'credit' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Credit Purchase
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">GRN No</label>
              <input value={invoice} readOnly className={`${inp} bg-slate-50 font-mono font-bold text-amber-600`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">GRN Date</label>
              <input type="date" value={form.grnDate} onChange={e => setForm(f => ({ ...f, grnDate: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
              <select value={form.partyId} onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))} className={inp}>
                <option value="">— Select Supplier —</option>
                {suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier Invoice No</label>
              <input value={form.supplierInvoiceNo} onChange={e => setForm(f => ({ ...f, supplierInvoiceNo: e.target.value }))} placeholder="Supplier bill no" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier Invoice Date</label>
              <input type="date" value={form.supplierInvoiceDate} onChange={e => setForm(f => ({ ...f, supplierInvoiceDate: e.target.value }))} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inp}>
                {modes.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {purchaseType === 'credit' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-700">
              <p className="font-semibold">Credit Purchase</p>
              <p className="text-xs mt-1">This bill will be saved as unpaid credit for the selected supplier.</p>
            </div>
          )}

          <div className="mb-4">
            <ResizableTable 
              headers={['S.No', 'Item Name', 'Batch No', 'Expiry Date', 'MFG Date', 'MRP', 'Qty', 'Unit', 'Purchase Price', 'GST Rate', 'GST Amount', 'Total Amount', '']}
              className="border border-slate-200 rounded-xl overflow-x-auto"
            >
              {items.map((row, idx) => (
                <tr key={idx} className="align-top border-b border-slate-100 divide-x divide-slate-100 last:border-b-0 hover:bg-slate-50 transition">
                  <td className="px-3 py-2 text-slate-400 flex-shrink-0">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input list={`items-${activeTab?.id}-${idx}`} value={row.name} onChange={e => {
                      const prod = products.find(p => p.shortName === e.target.value);
                      updateRow(idx, 'name', e.target.value);
                      if (prod) {
                        setItems(prev => prev.map((r, i) => {
                          if (i !== idx) return r;
                          const updated = {
                            ...r,
                            name: e.target.value,
                            unit: prod.uom || r.unit || 'PCS',
                            price: Number(prod.purchasePrice || 0),
                            mrp: Number(prod.mrp || 0),
                            gstRate: Number(prod.gstRate || 0),
                          };
                          const taxable = Number(updated.qty) * Number(updated.price);
                          updated.gstAmount = taxable * (Number(updated.gstRate) || 0) / 100;
                          updated.total = taxable + updated.gstAmount;
                          return updated;
                        }));
                      }
                    }} placeholder="Item name" className={inp} />
                    <datalist id={`items-${activeTab?.id}-${idx}`}>
                      {products.map(p => <option key={p.id} value={p.shortName} />)}
                    </datalist>
                  </td>
                  <td className="px-3 py-2"><input value={row.batchNo} onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="date" value={row.expiryDate} onChange={e => updateRow(idx, 'expiryDate', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="date" value={row.mfgDate} onChange={e => updateRow(idx, 'mfgDate', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={row.mrp} onChange={e => updateRow(idx, 'mrp', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="number" min="1" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={row.gstRate} onChange={e => updateRow(idx, 'gstRate', e.target.value)} className={inp} /></td>
                  <td className="px-3 py-2 font-semibold text-slate-700 flex-shrink-0">{RS}{Number(row.gstAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold text-slate-800 flex-shrink-0">{RS}{Number(row.total || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 flex-shrink-0">
                    <button type="button" onClick={() => removeRow(idx)} className="w-9 h-9 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </ResizableTable>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={addRow} className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1.5 transition">
              <Plus size={15} /> Add Row
            </button>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-slate-800">Total: {RS}{grandTotal.toFixed(2)}</span>
              <button type="submit" disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-sm">
                <Check size={15} /> {createMut.isPending ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
