import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, AlertTriangle, List, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { AccountsAPI } from '../../api/accounts.js';
import { fmt } from '../../utils/formatters.js';

const EMPTY = { shortName: '', itemCode: '', category: '', hsnCode: '', uom: 'PCS', purchasePrice: '', mrp: '', salesPrice: '', gstRate: 5, expiryDate: '', stock: 0, reorderLevel: 10 };

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

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showLow, setShowLow] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const saveMut = useMutation({
    mutationFn: (data) => editId ? ItemsAPI.update(editId, data) : ItemsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['items']); closeModal(); toast.success(editId ? 'Item updated' : 'Item added'); },
    onError: () => toast.error('Failed to save item'),
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
      hsnCode: item.hsnCode || '', uom: item.uom || 'PCS', purchasePrice: item.purchasePrice,
      mrp: item.mrp, salesPrice: item.salesPrice, gstRate: item.gstRate,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      stock: item.stock, reorderLevel: item.reorderLevel,
    });
    setEditId(item.id); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditId(null); };

  const handleDelete = (id) => setDeleteConfirm({ open: true, id });

  const exportCSV = () => {
    let csv = 'S.No,Item Name,Item Code,Category,UOM,Stock,Purchase Rs,MRP Rs,Sales Rs,GST%,Expiry\n';
    allItems.forEach((p, i) => {
      csv += `${i+1},"${p.shortName}","${p.itemCode||''}","${p.category||''}","${p.uom||''}",${p.stock||0},${p.purchasePrice||0},${p.mrp||0},${p.salesPrice||0},${p.gstRate||5},"${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : ''}"\n`;
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
    <div className="p-8">
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              {['#','Item Name','UOM','Stock','Purchase ₹','MRP ₹','Sale ₹','GST%','Expiry','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={11} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-10 text-slate-400">No items found</td></tr>
            ) : displayed.map((p, idx) => {
              const stock = Number(p.stock || 0);
              const isLow = stock <= Number(p.reorderLevel || 10);
              return (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.shortName}</td>
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
            <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Short Name *" required><input required value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} placeholder="e.g. Rice" className={inp} /></Field>
                <Field label="Item Code"><input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} placeholder="e.g. ITM001" className={inp} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Field label="Category"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Grocery" className={inp} /></Field>
                <Field label="HSN Code"><input value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} placeholder="1006080" className={inp} /></Field>
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
