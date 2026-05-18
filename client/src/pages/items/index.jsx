import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, AlertTriangle, List, MoreVertical, Pencil, Trash2, X, ChevronRight, Ban, Copy, FileText, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { AccountsAPI } from '../../api/accounts.js';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { fmt } from '../../utils/formatters.js';

const EMPTY = { shortName: '', itemCode: '', category: '', hsnCode: '', batch: '', uom: 'PCS', purchasePrice: '0', mrp: '0', salesPrice: '0', gstRate: 5, expiryDate: '', stock: 0, reorderLevel: 10 };

const normalizeKey = (value) => String(value ?? '').trim().toLowerCase();

function isItemLine(line, item) {
  const lineItemId = line.itemId ?? line.productId;
  if (lineItemId !== undefined && String(lineItemId) === String(item.id)) return true;
  if (normalizeKey(line.name) === normalizeKey(item.shortName)) return true;
  return item.itemCode && normalizeKey(line.itemCode) === normalizeKey(item.itemCode);
}

function ItemTransactions({ item, sales = [], purchases = [] }) {
  const itemTransactions = useMemo(() => {
    const transactions = [];

    sales.forEach(s => {
      if (s.items) {
        const itemInSale = s.items.find(si => isItemLine(si, item));
        if (itemInSale) {
          const quantity = Number(itemInSale.quantity ?? itemInSale.qty ?? 0);
          const price = Number(itemInSale.salePrice ?? itemInSale.rate ?? itemInSale.price ?? 0);

          transactions.push({
            type: 'Sale',
            date: s.date,
            invoiceNo: s.invoiceNo ?? s.invoice,
            quantity,
            price,
            total: Number(itemInSale.total ?? itemInSale.amount ?? quantity * price),
            party: s.partyName ?? s.customerName ?? s.customer_name ?? 'Walk-in Customer',
          });
        }
      }
    });

    purchases.forEach(p => {
      if (p.items) {
        const itemInPurchase = p.items.find(pi => isItemLine(pi, item));
        if (itemInPurchase) {
          const quantity = Number(itemInPurchase.quantity ?? itemInPurchase.qty ?? 0);
          const price = Number(itemInPurchase.purchasePrice ?? itemInPurchase.price ?? 0);

          transactions.push({
            type: 'Purchase',
            date: p.date,
            invoiceNo: p.billNo ?? p.invoice,
            quantity,
            price,
            total: Number(itemInPurchase.total ?? quantity * price),
            party: p.partyName ?? 'Supplier',
          });
        }
      }
    });

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [item, sales, purchases]);

  const saleCount = itemTransactions.filter(t => t.type === 'Sale').length;
  const purchaseCount = itemTransactions.filter(t => t.type === 'Purchase').length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="grid grid-cols-6 gap-3 items-center">
          <div className="col-span-2">
            <h3 className="text-lg font-bold text-slate-800">{item.shortName}</h3>
            <p className="text-xs text-slate-500 mt-1">Item Code: {item.itemCode || '—'}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg">
            <p className="text-xs text-slate-500 font-semibold">Purchase Price</p>
            <p className="text-lg font-bold text-amber-600">₹{Number(item.purchasePrice || 0).toFixed(2)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-lg">
            <p className="text-xs text-slate-500 font-semibold">Sales Price</p>
            <p className="text-lg font-bold text-emerald-600">₹{Number(item.salesPrice || 0).toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 px-3 py-2.5 rounded-lg">
            <p className="text-xs text-slate-500 font-semibold">MRP</p>
            <p className="text-lg font-bold text-purple-600">₹{Number(item.mrp || 0).toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-3 py-2.5 rounded-lg">
            <p className="text-xs text-slate-500 font-semibold">Stock</p>
            <p className="text-lg font-bold text-blue-600">{item.stock}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 text-xs font-semibold">
        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{itemTransactions.length} Total</span>
        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{saleCount} Sales</span>
        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{purchaseCount} Purchases</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <h4 className="font-semibold text-slate-700 text-sm mb-4">Transactions ({itemTransactions.length})</h4>
          {itemTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No transactions found for this item</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    {['S.No', 'Invoice No', 'Date', 'Party Name', 'Qty', 'Unit Rate', 'Type', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemTransactions.map((txn, idx) => (
                    <tr key={`${txn.type}-${txn.invoiceNo}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">{txn.invoiceNo || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{txn.party || '—'}</td>
                      <td className="px-4 py-3 font-bold text-center text-slate-700">{txn.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">₹{Number(txn.price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${txn.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TransactionMenu txn={txn} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function TransactionMenu({ txn }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  const actions = [
    { label: 'View/Edit', icon: Pencil, tone: 'text-slate-700', message: `Open ${txn.type} ${txn.invoiceNo || ''}` },
    { label: 'Cancel', icon: Ban, tone: 'text-amber-600', message: `Cancel ${txn.type} ${txn.invoiceNo || ''}` },
    { label: 'Delete', icon: Trash2, tone: 'text-rose-600', message: `Delete ${txn.type} ${txn.invoiceNo || ''}` },
    { label: 'Duplicate', icon: Copy, tone: 'text-slate-700', message: `Duplicate ${txn.type} ${txn.invoiceNo || ''}` },
    { label: 'Open PDF', icon: FileText, tone: 'text-blue-600', message: `Open PDF for ${txn.invoiceNo || txn.type}` },
    { label: 'Convert to Return', icon: RotateCcw, tone: 'text-purple-600', message: `Convert ${txn.type} ${txn.invoiceNo || ''} to return` },
    { label: 'Payment History', icon: History, tone: 'text-slate-700', message: `Payment history for ${txn.invoiceNo || txn.type}` },
  ];

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[190px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}
          >
            {actions.map(({ label, icon: Icon, tone, message }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  toast.info(message.trim());
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${tone}`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
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
  const [selectedItemId, setSelectedItemId] = useState(null);

  const saveMut = useMutation({
    mutationFn: (data) => editId ? ItemsAPI.update(editId, data) : ItemsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['items']); closeModal(); toast.success(editId ? 'Item updated' : 'Item added'); },
    onError: (err) => toast.error(err?.message || 'Failed to save item'),
  });

  const deleteMut = useMutation({
    mutationFn: ItemsAPI.delete,
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries(['items']);
      if (String(selectedItemId) === String(deletedId)) setSelectedItemId(null);
      setDeleteConfirm({ open: false, id: null });
      toast.success('Item deleted');
    },
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

  const displayed = useMemo(
    () => showLow ? allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)) : allItems,
    [allItems, showLow],
  );
  const selectedItem = useMemo(
    () => displayed.find(i => String(i.id) === String(selectedItemId)) || null,
    [displayed, selectedItemId],
  );
  const lowCount  = allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const expCount  = allItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= soon).length;

  useEffect(() => {
    if (!displayed.length) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId(currentId =>
      displayed.some(i => String(i.id) === String(currentId)) ? currentId : displayed[0].id,
    );
  }, [displayed]);

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
      <div className="flex-1 grid grid-cols-6 gap-4 min-h-0">
        {/* Left Panel - Items List */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <table className="w-full text-sm flex-1">
            <thead className="bg-slate-800 text-white">
              <tr>
                {['S.No','Item Name','Qty','Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 overflow-y-auto">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No items found</td></tr>
              ) : displayed.map((p, idx) => {
                const stock = Number(p.stock || 0);
                const isLow = stock <= Number(p.reorderLevel || 10);
                const isSelected = String(selectedItemId) === String(p.id);
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => setSelectedItemId(p.id)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isLow ? 'bg-orange-50' : ''} ${isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}>
                    <td className="px-4 py-1.5 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-1.5 font-semibold text-slate-800">{p.shortName}</td>
                    <td className={`px-4 py-1.5 font-bold text-center ${stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                    <td className="px-4 py-1.5 text-center"><RowMenu item={p} onEdit={openEdit} onDelete={handleDelete} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Panel - Item Details and Transactions */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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
