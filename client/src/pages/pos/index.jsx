import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, User, Search, X, Check, Trash2, Minus, Plus } from 'lucide-react';
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

export default function POS() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: parties = [] }  = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: modes = [] }    = useQuery({ queryKey: ['paymentModes'], queryFn: PaymentsAPI.getModes });
  const { data: sales = [] }    = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });

  const [search, setSearch]         = useState('');
  const [cart, setCart]             = useState([]);
  const [paymentLines, setPaymentLines] = useState([{ mode: 'Cash', amount: 0 }]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyModal, setPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [invoice, setInvoice]       = useState(() => genInvoice());
  const [stockMap, setStockMap]     = useState({});
  const [clearConfirm, setClearConfirm] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    const m = {};
    products.forEach(p => { m[p.id] = Number(p.stock || 0); });
    setStockMap(m);
  }, [products]);

  useEffect(() => {
    if (!cart.length) setInvoice(genInvoice(sales));
  }, [cart.length, sales]);

  const createSale = useMutation({
    mutationFn: SalesAPI.create,
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['items']); }
  });

  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst       = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;
  const received  = paymentLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const change    = Math.max(received - grandTotal, 0);

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
      return [...prev, { id: product.id, name: product.shortName, price: Number(product.salesPrice || 0), qty: 1 }];
    });
    ItemsAPI.adjustStock(product.id, -1).catch(() => {});
  };

  const changeQty = (idx, delta) => {
    const item = cart[idx];
    if (delta === -1 && item.qty === 1) { removeFromCart(idx); return; }
    const avail = stockMap[item.id] ?? 0;
    if (delta === 1 && avail <= 0) { toast.error('Out of stock!'); return; }
    setStockMap(m => ({ ...m, [item.id]: (m[item.id] ?? 0) - delta }));
    setCart(prev => prev.map((i, j) => j === idx ? { ...i, qty: i.qty + delta } : i));
    ItemsAPI.adjustStock(item.id, delta).catch(() => {});
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
  };

  const updatePayLine = (idx, field, value) =>
    setPaymentLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const completeSale = async () => {
    if (!cart.length) { toast.warning('Cart is empty'); return; }
    const record = {
      invoice, date: new Date().toISOString(),
      customerName: selectedParty?.name || 'Walk-in Customer',
      partyId: selectedParty?.id || null,
      items: cart.map(i => ({ name: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty })),
      subtotal, gst, grandTotal,
      paymentMode: paymentLines[0]?.mode || 'Cash',
      totalReceived: received, changeGiven: change
    };
    const savedSale = await createSale.mutateAsync(record);
    if (selectedParty && received < grandTotal) {
      await PartiesAPI.updateBalance(selectedParty.id, grandTotal - received).catch(() => {});
    }
    toast.success(`Sale completed — Invoice: ${invoice} | Total: ${RS}${grandTotal.toFixed(2)}`);
    setCart([]); setPaymentLines([{ mode: modes[0]?.name || 'Cash', amount: 0 }]);
    setSelectedParty(null); setInvoice(genInvoice([...sales, savedSale]));
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) || (p.phone || '').includes(partySearch)
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '16px', height: 'calc(100vh - 0px)', padding: '16px' }}>
      {/* Products panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold">Invoice:</span>
            <span className="font-mono text-amber-600 font-bold ml-1">{invoice}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500 text-xs">{new Date().toLocaleString('en-IN')}</span>
          </div>
          <button onClick={() => setPartyModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
            <User size={13} /> Select Party
          </button>
          <div className="text-xs text-slate-500 w-full">
            {selectedParty
              ? <span className="text-emerald-700 font-semibold"><Check size={12} className="inline mr-1" />{selectedParty.name}{selectedParty.phone ? ` (${selectedParty.phone})` : ''}</span>
              : <span className="text-slate-400">Cash / Walk-in Customer</span>}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && filteredProducts.length) addToCart(filteredProducts[0]); }}
              placeholder="Search by name or code... (Enter to add first)"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm" />
          </div>
        </div>

        {/* Product table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr>
                {['Item Name','Code','Stock','UOM','Price',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const avail = stockMap[p.id] ?? Number(p.stock || 0);
                return (
                  <tr key={p.id} className="hover:bg-amber-50 transition border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800 text-sm">{p.shortName}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.itemCode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{p.itemCode || '—'}</td>
                    <td className={`px-4 py-2.5 font-bold text-sm ${avail <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{avail}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{p.uom}</td>
                    <td className="px-4 py-2.5 font-bold text-amber-600 text-sm">{RS}{Number(p.salesPrice || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => addToCart(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition w-14">Add</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-amber-500" size={18} /> Cart
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
          </h2>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto max-h-64 mb-4 space-y-0">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-300 text-sm">Cart is empty</div>
          ) : cart.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <div>
                <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                <div className="text-xs text-slate-400">{RS}{item.price} &times; {item.qty}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{RS}{(item.price * item.qty).toFixed(2)}</span>
                <div className="flex gap-1">
                  <button onClick={() => changeQty(i, -1)} className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 flex items-center justify-center"><Minus size={10} /></button>
                  <button onClick={() => changeQty(i, 1)}  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 flex items-center justify-center"><Plus size={10} /></button>
                  <button onClick={() => removeFromCart(i)} className="w-6 h-6 bg-rose-50 hover:bg-rose-100 rounded text-xs font-bold text-rose-500 flex items-center justify-center"><X size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-200">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Payment</h3>
          <div className="space-y-2 mb-3">
            {paymentLines.map((line, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={line.mode} onChange={e => updatePayLine(i, 'mode', e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:border-amber-400">
                  {modes.map(m => <option key={m.id}>{m.name}</option>)}
                </select>
                <input type="number" value={line.amount} step="0.01"
                  onChange={e => updatePayLine(i, 'amount', Number(e.target.value))}
                  className="w-28 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-amber-400" />
                {paymentLines.length > 1 &&
                  <button onClick={() => setPaymentLines(prev => prev.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 p-1 rounded transition"><X size={14} /></button>}
              </div>
            ))}
          </div>
          {/* Quick cash */}
          <div className="flex gap-2 mb-2">
            {[100, 500, 1000].map(v => (
              <button key={v} onClick={() => setPaymentLines(prev => [{ ...prev[0], amount: v }, ...prev.slice(1)])}
                className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition">{RS}{v}</button>
            ))}
          </div>
          <button onClick={() => setPaymentLines(prev => [{ ...prev[0], amount: grandTotal }, ...prev.slice(1)])}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white py-2 rounded-lg font-semibold text-sm transition">
            Pay Exact Amount
          </button>
        </div>

        {/* Totals */}
        <div className="mb-4 px-1 space-y-1 text-sm text-slate-500">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-slate-700">{RS}{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST (5%)</span><span className="font-medium text-slate-700">{RS}{gst.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t-2 border-slate-100 pt-2 mt-2 text-slate-800"><span>Grand Total</span><span className="text-emerald-600">{RS}{grandTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Received</span><span className="font-bold text-emerald-600">{RS}{received.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Change</span><span className="font-bold text-amber-600">{RS}{change.toFixed(2)}</span></div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button onClick={completeSale} disabled={createSale.isPending || !cart.length}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm">
            <Check size={16} /> {createSale.isPending ? 'Saving...' : 'Complete Sale'}
          </button>
          <button onClick={() => setClearConfirm(true)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 px-4 rounded-xl font-bold text-sm transition">
            <Trash2 size={16} />
          </button>
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
                Cash / Walk-in
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
