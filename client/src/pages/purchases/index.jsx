import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PurchasesAPI } from '../../api/purchases.js';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';
import { ItemsAPI } from '../../api/items.js';
import { fmt } from '../../utils/formatters.js';

const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800 bg-white';
const ITEM_ROW = { name: '', qty: 1, price: 0, total: 0 };
const RS = '₹';

export default function Purchases() {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] }   = useQuery({ queryKey: ['paymentModes'], queryFn: PaymentsAPI.getModes });
  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });

  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState([{ ...ITEM_ROW }]);
  const [form, setForm] = useState({ partyId: '', paymentMode: 'Cash' });

  const createMut = useMutation({
    mutationFn: PurchasesAPI.create,
    onSuccess: () => {
      qc.invalidateQueries(['purchases']); qc.invalidateQueries(['items']);
      setItems([{ ...ITEM_ROW }]); setForm({ partyId: '', paymentMode: 'Cash' });
      toast.success('Purchase recorded');
    },
    onError: () => toast.error('Failed to save purchase'),
  });

  const grandTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);

  const addRow = () => setItems(prev => [...prev, { ...ITEM_ROW }]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      updated.total = Number(updated.qty) * Number(updated.price);
      return updated;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.name && Number(i.qty) > 0 && Number(i.price) > 0);
    if (!validItems.length) { toast.warning('Add at least one valid item'); return; }
    const party = parties.find(p => p.id === Number(form.partyId));
    const invoice = 'PUR-' + Date.now();
    createMut.mutate({
      invoice, date: new Date().toISOString(),
      partyId: party?.id || null, partyName: party?.name || 'Unknown Supplier',
      items: validItems, grandTotal, paymentMode: form.paymentMode
    });
  };

  const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record stock purchased from suppliers</p>
        </div>
      </div>

      {/* New Purchase Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-7">
        <h3 className="font-bold text-slate-700 text-base mb-4">New Purchase</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
            <select value={form.partyId} onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))} className={inp}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
            <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inp}>
              {modes.map(m => <option key={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Item rows */}
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
            <span>Item Name</span><span>Qty</span><span>Price {RS}</span><span>Total {RS}</span><span></span>
          </div>
          {items.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <div className="relative">
                <input list={`items-${idx}`} value={row.name} onChange={e => {
                  const prod = products.find(p => p.shortName === e.target.value);
                  updateRow(idx, 'name', e.target.value);
                  if (prod) updateRow(idx, 'price', prod.purchasePrice);
                }} placeholder="Item name" className={inp} />
                <datalist id={`items-${idx}`}>
                  {products.map(p => <option key={p.id} value={p.shortName} />)}
                </datalist>
              </div>
              <input type="number" min="1" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} className={inp} />
              <input type="number" step="0.01" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)} className={inp} />
              <span className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-slate-50">{RS}{row.total.toFixed(2)}</span>
              <button type="button" onClick={() => removeRow(idx)} className="w-9 h-9 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={addRow} className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1.5 transition">
            <Plus size={15} /> Add Row
          </button>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-slate-800">Total: {RS}{grandTotal.toFixed(2)}</span>
            <button type="submit" disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              {createMut.isPending ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </div>
      </form>

      {/* Purchase History */}
      <h3 className="font-bold text-slate-700 text-base mb-3">Purchase History</h3>
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-slate-400">No purchases yet</div>
        ) : history.map(p => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : p.id)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition text-left">
                {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <span className="font-mono font-bold text-indigo-600">{p.invoice}</span>
                  <span className="text-slate-500">{fmt.datetime(p.date)}</span>
                  <span className="font-medium text-slate-700">{p.partyName || '—'}</span>
                  <span className="font-bold text-purple-600 text-right">{RS}{Number(p.grandTotal).toFixed(2)}</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium shrink-0">{p.paymentMode}</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="text-left pb-2">Item</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Price</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(p.items || []).map((item, i) => (
                        <tr key={i}>
                          <td className="py-1.5 text-slate-800">{item.name}</td>
                          <td className="py-1.5 text-center text-slate-600">{item.qty}</td>
                          <td className="py-1.5 text-right text-slate-600">{RS}{Number(item.price).toFixed(2)}</td>
                          <td className="py-1.5 text-right font-semibold">{RS}{Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
