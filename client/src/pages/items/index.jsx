import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, AlertTriangle, List, MoreVertical, Pencil, Trash2, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { AccountsAPI } from '../../api/accounts.js';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { fmt } from '../../utils/formatters.js';

const EMPTY = { shortName: '', itemCode: '', category: '', hsnCode: '', batch: '', uom: 'PCS', purchasePrice: '0', mrp: '0', salesPrice: '0', gstRate: 5, expiryDate: '', stock: 0, reorderLevel: 10 };

function ItemTransactions({ item, sales = [], purchases = [] }) {
  const itemTransactions = [];
  
  sales.forEach(s => {
    if (s.items) {
      const itemInSale = s.items.find(si => si.itemId === item.id);
      if (itemInSale) {
        itemTransactions.push({
          type: 'Sale',
          date: s.date,
          invoiceNo: s.invoiceNo,
          quantity: itemInSale.quantity,
          price: itemInSale.salePrice,
          total: itemInSale.quantity * itemInSale.salePrice,
          party: s.partyName,
        });
      }
    }
  });

  purchases.forEach(p => {
    if (p.items) {
      const itemInPurchase = p.items.find(pi => pi.itemId === item.id);
      if (itemInPurchase) {
        itemTransactions.push({
          type: 'Purchase',
          date: p.date,
          invoiceNo: p.billNo,
          quantity: itemInPurchase.quantity,
          price: itemInPurchase.purchasePrice,
          total: itemInPurchase.quantity * itemInPurchase.purchasePrice,
          party: p.partyName,
        });
      }
    }
  });

  const sorted = itemTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-800">{item.shortName}</h3>
        <p className="text-xs text-slate-500 mt-1">Item Code: {item.itemCode || '—'}</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-blue-50 px-3 py-2 rounded-lg">
            <p className="text-xs text-slate-500">Stock</p>
            <p className="text-xl font-bold text-blue-600">{item.stock}</p>
          </div>
          <div className="bg-emerald-50 px-3 py-2 rounded-lg">
            <p className="text-xs text-slate-500">Sale Price</p>
            <p className="text-xl font-bold text-emerald-600">₹{Number(item.salesPrice || 0).toFixed(2)}</p>
          </div>
          <div className="bg-amber-50 px-3 py-2 rounded-lg">
            <p className="text-xs text-slate-500">Purchase Price</p>
            <p className="text-xl font-bold text-amber-600">₹{Number(item.purchasePrice || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <h4 className="font-semibold text-slate-700 text-sm mb-4">Transactions ({sorted.length})</h4>
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No transactions found for this item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((txn, idx) => (
                <div key={idx} className={`border rounded-lg p-3.5 ${txn.type === 'Sale' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${txn.type === 'Sale' ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-200 text-amber-700'}`}>
                        {txn.type}
                      </span>
                      <p className="text-xs text-slate-600 mt-1">{txn.party}</p>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(txn.date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 mb-2">Inv#: {txn.invoiceNo}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Qty</span>
                      <p className="font-bold">{txn.quantity}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Rate</span>
                      <p className="font-bold">₹{Number(txn.price).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Total</span>
                      <p className="font-bold">₹{Number(txn.total).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ item }) {
  const stock = Number(item.stock || 0);
  const reorder = Number(item.reorderLevel || 10);
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const nearExpiry = item.expiryDate && new Date(item.expiryDate) <= soon;

  if (stock <= reorder)
    return <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-semibold">Low Stock</span>;
  if (nearExpiry)
    return <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Near Expiry</span>;
  return <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">Normal</span>;
}

function RowMenu({ item, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[150px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            <button onClick={() => { setOpen(false); onEdit(item); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Pencil size={13} className="text-slate-400" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onDelete(item.id); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Items() {
  const qc = useQueryClient();
  const { data: allItems = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: uoms = [] } = useQuery({ queryKey: ['uoms'], queryFn: AccountsAPI.getUOMs });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showLow, setShowLow] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [selectedItem, setSelectedItem] = useState(null);

  const saveMut = useMutation({
    mutationFn: (data) => editId ? ItemsAPI.update(editId, data) : ItemsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['items']); closeModal(); toast.success(editId ? 'Item updated' : 'Item added'); },
    onError: (err) => toast.error(err?.message || 'Failed to save item'),
  });

  const deleteMut = useMutation({
    mutationFn: ItemsAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['items']); toast.success('Item deleted'); },
    onError: () => toast.error('Failed to delete item'),
  });

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (item) => {
    setForm({
      shortName: item.shortName, itemCode: item.itemCode || '', category: item.category || '',
      hsnCode: item.hsnCode || '', batch: item.batch || '', uom: item.uom || 'PCS', purchasePrice: item.purchasePrice,
      mrp: item.mrp, salesPrice: item.salesPrice, gstRate: item.gstRate,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      stock: item.stock, reorderLevel: item.reorderLevel,
    });
    setEditId(item.id); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditId(null); };

  const handleDelete = (id) => setDeleteConfirm({ open: true, id });

  const exportCSV = () => {
    let csv = 'S.No,Item Name,Item Code,Batch,Category,UOM,Stock,Purchase Rs,MRP Rs,Sales Rs,GST%,Expiry\n';
    allItems.forEach((p, i) => {
      csv += `${i+1},"${p.shortName}","${p.itemCode||''}","${p.batch||''}","${p.category||''}","${p.uom||''}",${p.stock||0},${p.purchasePrice||0},${p.mrp||0},${p.salesPrice||0},${p.gstRate||5},"${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : ''}"\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Inventory_${fmt.today()}.csv`; a.click();
  };

  const displayed = showLow ? allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)) : allItems;
  const lowCount  = allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const expCount  = allItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= soon).length;

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Items</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your stock and item catalogue</p>
        </div>
      </div>

      {/* Alert box */}
      <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 px-5 py-3.5 rounded-xl mb-5 flex items-center gap-2">
        <AlertTriangle className="text-amber-500" size={16} />
        <span className="text-amber-800 font-semibold text-sm">Alerts:</span>
        <span className="text-amber-700 text-sm">{lowCount} low stock | {expCount} near expiry</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm">
          <Plus size={15} /> Add Item
        </button>
        <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm">
          <Download size={15} /> Export
        </button>
        <button onClick={() => setShowLow(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm">
          <AlertTriangle size={15} /> Low Stock
        </button>
        <button onClick={() => setShowLow(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition">
          <List size={15} /> All Items
        </button>
      </div>

      {/* Split Layout - Items List and Details */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Left Panel - Items List */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <table className="w-full text-sm flex-1">
            <thead className="bg-slate-800 text-white">
              <tr>
                {['#','Item Name','Batch','UOM','Stock','Purchase ₹','MRP ₹','Sale ₹','GST%','Expiry','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 overflow-y-auto">
              {isLoading ? (
                <tr><td colSpan={12} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-10 text-slate-400">No items found</td></tr>
              ) : displayed.map((p, idx) => {
                const stock = Number(p.stock || 0);
                const isLow = stock <= Number(p.reorderLevel || 10);
                const isSelected = selectedItem?.id === p.id;
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => setSelectedItem(p)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isLow ? 'bg-orange-50' : ''} ${isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}>
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.shortName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.batch || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.uom}</td>
                    <td className={`px-4 py-3 font-bold text-center ${stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                    <td className="px-4 py-3 text-slate-600">{'₹'}{Number(p.purchasePrice || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{'₹'}{Number(p.mrp || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-amber-600">{'₹'}{Number(p.salesPrice || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.gstRate}%</td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge item={p} /></td>
                    <td className="px-4 py-3 text-center"><RowMenu item={p} onEdit={openEdit} onDelete={handleDelete} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Panel - Item Details and Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {selectedItem ? (
            <ItemTransactions item={selectedItem} sales={sales} purchases={purchases} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ChevronRight size={48} className="mb-2 opacity-50" />
              <p className="text-sm">Select an item to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const data = {
                ...form,
                purchasePrice: Number(form.purchasePrice) || 0,
                mrp: Number(form.mrp) || 0,
                salesPrice: Number(form.salesPrice) || 0,
                gstRate: Number(form.gstRate) || 5,
                stock: Number(form.stock) || 0,
                reorderLevel: Number(form.reorderLevel) || 10,
              };
              saveMut.mutate(data);
            }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Short Name *" required><input required value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} placeholder="e.g. Rice" className={inp} /></Field>
                <Field label="Item Code"><input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} placeholder="e.g. ITM001" className={inp} /></Field>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Field label="Category"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Grocery" className={inp} /></Field>
                <Field label="HSN Code"><input value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} placeholder="1006080" className={inp} /></Field>
                <Field label="Batch"><input value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} placeholder="e.g. AKD001" className={inp} /></Field>
                <Field label="UOM">
                  <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} className={inp}>
                    {uoms.length ? uoms.map(u => <option key={u.id} value={u.code}>{u.code} {'–'} {u.descr}</option>) : <option value={form.uom}>{form.uom}</option>}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Field label={`Purchase ₹ *`}><input required type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} className={inp} /></Field>
                <Field label={`MRP ₹ *`}><input required type="number" step="0.01" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} className={inp} /></Field>
                <Field label={`Sales ₹ *`}><input required type="number" step="0.01" value={form.salesPrice} onChange={e => setForm(f => ({ ...f, salesPrice: e.target.value }))} className={inp} /></Field>
                <Field label="GST %"><input type="number" step="0.01" value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-7">
                <Field label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className={inp} /></Field>
                <Field label="Opening Stock"><input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className={inp} /></Field>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saveMut.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition">
                  {saveMut.isPending ? 'Saving...' : 'Save Item'}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Item"
        message="This item will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}

const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800 bg-white';
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
