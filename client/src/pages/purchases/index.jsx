import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import ResizableTable from '../../components/ResizableTable.jsx';
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
          {/* ── Two-column header ── */}
          <div className="flex gap-10 mb-6">

            {/* Left — supplier details */}
            <div className="flex-1 space-y-2">
              <FloatInput
                label="Supplier Name"
                value={form.partyName}
                list="supplier-datalist"
                onChange={e => {
                  const match = suppliers.find(s => s.name === e.target.value);
                  setForm(f => ({ ...f, partyName: e.target.value, partyId: match ? String(match.id) : '' }));
                }}
                wrapperClass="w-64"
              />
              <datalist id="supplier-datalist">
                {suppliers.map(s => <option key={s.id} value={s.name} />)}
              </datalist>

              <FloatInput
                label="Supplier Invoice No"
                value={form.supplierInvoiceNo}
                onChange={e => setForm(f => ({ ...f, supplierInvoiceNo: e.target.value }))}
                wrapperClass="w-64"
              />
              <FloatInput
                label="Supplier Invoice Date"
                type="date"
                value={form.supplierInvoiceDate}
                onChange={e => setForm(f => ({ ...f, supplierInvoiceDate: e.target.value }))}
                wrapperClass="w-64"
              />
              <FloatInput
                label="E-way Bill No"
                value={form.ewayBillNo}
                onChange={e => setForm(f => ({ ...f, ewayBillNo: e.target.value }))}
                wrapperClass="w-64"
              />
            </div>

            {/* Right — GRN meta */}
            <div className="w-72 shrink-0 space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">GRN No</span>
                <span className="text-sm font-bold text-amber-600 font-mono">{invoice}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 shrink-0">GRN Date</span>
                <input type="date" value={form.grnDate}
                  onChange={e => setForm(f => ({ ...f, grnDate: e.target.value }))}
                  className="w-44 text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5
                    focus:outline-none focus:border-amber-500 bg-white" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 shrink-0">State of Supply</span>
                <select value={form.stateOfSupply}
                  onChange={e => setForm(f => ({ ...f, stateOfSupply: e.target.value }))}
                  className="w-44 text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5
                    focus:outline-none focus:border-amber-500 bg-white">
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 shrink-0">Due Date</span>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-44 text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5
                    focus:outline-none focus:border-amber-500 bg-white" />
              </div>
            </div>

          </div>


          <div className="mb-4">
            <ResizableTable 
              headers={['ITEM', 'DESCRIPTION', 'COUNT', 'BATCH NO.', 'EXP. DATE', 'MFG. DATE', 'MRP', 'SIZE', 'QTY', 'FREE QTY', 'UNIT', 'PRICE/UNIT', 'DISCOUNT %', 'DISCOUNT AMOUNT', 'TAX %', 'TAX AMOUNT', 'AMOUNT', '']}
              className="border border-slate-200 overflow-x-auto"
            >
              {items.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                  <td className="px-2 py-1 text-center text-xs text-slate-400 border-r border-slate-200">{idx + 1}</td>
                  <td className="border-r border-slate-200 p-0">
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
                    }} placeholder="Item name…" className={cellInp} />
                    <datalist id={`items-${activeTab?.id}-${idx}`}>
                      {products.map(p => <option key={p.id} value={p.shortName} />)}
                    </datalist>
                  </td>
                  <td className="border-r border-slate-200 p-0"><input value={row.description || ''} onChange={e => updateRow(idx, 'description', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.count || ''} onChange={e => updateRow(idx, 'count', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.batchNo} onChange={e => updateRow(idx, 'batchNo', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="text" value={row.expiryDate} onChange={e => updateRow(idx, 'expiryDate', e.target.value)} placeholder="MM/YY" className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="text" value={row.mfgDate} onChange={e => updateRow(idx, 'mfgDate', e.target.value)} placeholder="MM/YY" className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.mrp} onChange={e => updateRow(idx, 'mrp', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.size || ''} onChange={e => updateRow(idx, 'size', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" min="1" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} className={`${cellInp} text-right font-semibold`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.freeQty || ''} onChange={e => updateRow(idx, 'freeQty', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} className={cellInp} /></td>
                  <td className="border-r border-slate-200 p-0">
                    <select value={row.priceType || 'With Tax'} onChange={e => updateRow(idx, 'priceType', e.target.value)} className={`${cellInp} appearance-none`}>
                      <option value="With Tax">With Tax</option>
                      <option value="Without Tax">Without Tax</option>
                    </select>
                  </td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.discountRate || ''} onChange={e => updateRow(idx, 'discountRate', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.discountAmount || ''} onChange={e => updateRow(idx, 'discountAmount', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 p-0"><input type="number" step="0.01" value={row.taxRate || ''} onChange={e => updateRow(idx, 'taxRate', e.target.value)} className={`${cellInp} text-right`} /></td>
                  <td className="border-r border-slate-200 px-2 py-1 text-right text-xs text-slate-600">{Number(row.taxAmount || 0).toFixed(2)}</td>
                  <td className="border-r border-slate-200 px-2 py-1 text-right text-xs font-semibold text-slate-800">{Number(row.amount || 0).toFixed(2)}</td>
                  <td className="px-1 py-1 text-center">
                    <button type="button" onClick={() => removeRow(idx)} className="p-1 text-slate-300 hover:text-rose-500 transition">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </ResizableTable>
          </div>

          <div className="mb-4">
            <button type="button" onClick={addRow} className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1.5 transition">
              <Plus size={15} /> Add Row
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="w-80">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inp}>
                {modes.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-lg font-bold text-slate-800">Total: {RS}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button type="button" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition">
              <Check size={15} /> Draft Purchase
            </button>
            <button type="button" className="bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition">
              <Check size={15} /> Print Purchase
            </button>
            <button type="submit" disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-sm">
              <Check size={15} /> {createMut.isPending ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
