import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Pencil, Trash2, ChevronRight, Ban } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { ItemsAPI } from '../../api/items.js';
import { AccountsAPI } from '../../api/accounts.js';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { CategoriesAPI } from '../../api/categories.js';
import AddItemModal from './AddItemModal.jsx';
import ItemTransactions from './ItemTransactions.jsx';
import ServicesTab from './services.jsx';
import CategoryTab from './category.jsx';
import UnitTab from './unit.jsx';

export default function Items() {
  const qc = useQueryClient();
  const { data: allItems = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const { data: uoms = [] } = useQuery({ queryKey: ['uoms'], queryFn: AccountsAPI.getUOMs });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: CategoriesAPI.getAll });

  const [pageTab, setPageTab] = useState('Items');
  const [modal, setModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState('Product');
  const [editItem, setEditItem] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [txnWarning, setTxnWarning] = useState(false);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  useEffect(() => {
    if (rowMenu === null) return;
    const close = () => setRowMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [rowMenu]);

  const saveMut = useMutation({
    mutationFn: (data) => editItem ? ItemsAPI.update(editItem.id, data) : ItemsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['items']); closeModal(); toast.success(editItem ? 'Item updated' : 'Item added'); },
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

  const openAdd        = () => { setEditItem(null); setModalInitialType('Product'); setModal(true); };
  const openAddService = () => { setEditItem(null); setModalInitialType('Service'); setModal(true); };
  const openEdit       = (item) => { setEditItem(item); setModalInitialType('Product'); setModal(true); };
  const closeModal = () => { setModal(false); setEditItem(null); };

  const handleDelete = (item) => {
    const hasTxn =
      sales.some(s => s.items?.some(i => i.productId === item.id || i.name === item.shortName)) ||
      purchases.some(p => p.items?.some(i => i.name === item.shortName));
    if (hasTxn) { setTxnWarning(true); }
    else { setDeleteConfirm({ open: true, id: item.id }); }
  };

  const displayed = useMemo(() => {
    return [...allItems].sort((a, b) => {
      if (sortCol === 'stock') {
        const diff = Number(a.stock || 0) - Number(b.stock || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      const cmp = (a.shortName || '').localeCompare(b.shortName || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allItems, sortCol, sortDir]);

  const selectedItem = useMemo(
    () => displayed.find(i => String(i.id) === String(selectedItemId)) || null,
    [displayed, selectedItemId],
  );
  const lowCount = allItems.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const expCount = allItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= soon).length;

  useEffect(() => {
    if (!displayed.length) { setSelectedItemId(null); return; }
    setSelectedItemId(currentId =>
      displayed.some(i => String(i.id) === String(currentId)) ? currentId : displayed[0].id,
    );
  }, [displayed]);

  return (
    <div className="p-8 h-screen flex flex-col gap-3">

      {/* Page Tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        {['Items', 'Services', 'Category', 'Unit'].map(tab => (
          <button
            key={tab}
            onClick={() => setPageTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              pageTab === tab
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {pageTab === 'Services' && !modal && (
        <ServicesTab
          allItems={allItems}
          sales={sales}
          purchases={purchases}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          rowMenu={rowMenu}
          setRowMenu={setRowMenu}
          openAddService={openAddService}
          openEdit={openEdit}
          handleDelete={handleDelete}
        />
      )}

      {/* Category Tab */}
      {pageTab === 'Category' && (
        <CategoryTab allItems={allItems} />
      )}

      {/* Unit Tab */}
      {pageTab === 'Unit' && <UnitTab />}

      {/* Items Tab */}
      <div className={`flex-1 grid grid-cols-7 gap-4 min-h-0 ${modal || pageTab !== 'Items' ? 'hidden' : ''}`}>
        {/* Left Panel */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="border-b border-slate-200">
            <div className="flex flex-col gap-0">
              <table className="w-full text-xs border-b border-amber-200">
                <thead className="bg-amber-500 text-white">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold border-r border-amber-400">Qty</th>
                    <th className="px-3 py-1.5 text-left font-semibold">Alerts</th>
                  </tr>
                </thead>
                <tbody className="bg-amber-50 divide-y divide-amber-100">
                  <tr>
                    <td className="px-3 py-1.5 font-bold text-amber-700 border-r border-amber-100">{lowCount}</td>
                    <td className="px-3 py-1.5 text-amber-800">Low Stock</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-bold text-amber-700 border-r border-amber-100">{expCount}</td>
                    <td className="px-3 py-1.5 text-amber-800">Near Expiry</td>
                  </tr>
                </tbody>
              </table>
              <button onClick={openAdd} className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition whitespace-nowrap">
                <Plus size={15} /> Add Item
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600 w-10">S.No</th>
                  <th onClick={() => toggleSort('name')} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600 cursor-pointer select-none hover:bg-slate-700">
                    <span className="flex items-center gap-1">
                      Item
                      <span className="text-slate-400">{sortCol === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </span>
                  </th>
                  <th onClick={() => toggleSort('stock')} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600 cursor-pointer select-none hover:bg-slate-700 w-14">
                    <span className="flex items-center gap-1">
                      Qty
                      <span className="text-slate-400">{sortCol === 'stock' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </span>
                  </th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400">Loading...</td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400">No items found</td></tr>
                ) : displayed.map((p, idx) => {
                  const stock = Number(p.stock || 0);
                  const isLow = stock <= Number(p.reorderLevel || 10);
                  const isSelected = String(selectedItemId) === String(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedItemId(p.id)}
                      className={`transition-colors cursor-pointer ${isLow ? 'bg-orange-50' : ''} ${isSelected ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-2 text-slate-400 text-xs border-r border-slate-100">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 text-xs border-r border-slate-100">{p.shortName}</td>
                      <td className={`px-3 py-2 font-bold text-center text-xs border-r border-slate-100 ${stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                      <td className="px-2 py-2 text-center relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === p.id ? null : p.id); }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={13} />
                        </button>
                        {rowMenu === p.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-32 py-1 text-left">
                            <button
                              onClick={() => { setRowMenu(null); openEdit(p); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700">
                              <Pencil size={12} /> View / Edit
                            </button>
                            <button
                              onClick={() => { setRowMenu(null); handleDelete(p); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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

      {modal && (
        <AddItemModal
          key={modalKey}
          editData={editItem}
          initialType={modalInitialType}
          uoms={uoms}
          categories={categories}
          existingItems={allItems}
          onClose={closeModal}
          onSave={(data) => saveMut.mutate(data)}
          onSaveAndNew={(data) => {
            const api = editItem ? ItemsAPI.update(editItem.id, data) : ItemsAPI.create(data);
            api.then(() => {
              qc.invalidateQueries(['items']);
              setEditItem(null);
              setModalKey(k => k + 1);
              toast.success('Item saved');
            }).catch(err => toast.error(err?.message || 'Failed to save'));
          }}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Item"
        message="This item will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />

      {txnWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Ban size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Cannot Delete Item</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This item is linked to existing sales or purchase transactions. Deleting it would break transaction records.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setTxnWarning(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
