import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CategoriesAPI } from '../../api/categories.js';
import { ItemsAPI } from '../../api/items.js';

export default function CategoryTab({ allItems }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: CategoriesAPI.getAll });

  const [catForm, setCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEditId, setCatEditId] = useState(null);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [moveCatOpen, setMoveCatOpen] = useState(false);
  const [moveCatSearch, setMoveCatSearch] = useState('');
  const [moveCatSelected, setMoveCatSelected] = useState([]);
  const [catSearch, setCatSearch] = useState('');
  const [showCatSearch, setShowCatSearch] = useState(false);

  const catCreateMut = useMutation({
    mutationFn: CategoriesAPI.create,
    onSuccess: () => { qc.invalidateQueries(['categories']); setCatName(''); setCatForm(false); toast.success('Category created'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to create category'),
  });
  const catUpdateMut = useMutation({
    mutationFn: ({ id, data }) => CategoriesAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['categories']); setCatEditId(null); setCatName(''); toast.success('Category updated'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update category'),
  });
  const catDeleteMut = useMutation({
    mutationFn: CategoriesAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['categories']); setSelectedCatId(null); toast.success('Category deleted'); },
    onError: () => toast.error('Failed to delete category'),
  });
  const moveToCatMut = useMutation({
    mutationFn: ({ ids, category }) => Promise.all(ids.map(id => ItemsAPI.update(id, { category }))),
    onSuccess: (_, { ids, category }) => {
      qc.invalidateQueries(['items']);
      setMoveCatOpen(false);
      setMoveCatSelected([]);
      setMoveCatSearch('');
      toast.success(`${ids.length} item${ids.length !== 1 ? 's' : ''} moved to "${category}"`);
    },
    onError: () => toast.error('Failed to move items'),
  });

  if (categories.length === 0 && !catForm) return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-5">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <Plus size={28} className="text-amber-500" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 text-base">No Categories Yet</p>
        <p className="text-slate-400 text-sm mt-1">Organise your items by creating categories.</p>
      </div>
      <button
        onClick={() => setCatForm(true)}
        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-6 py-2.5 rounded-full transition shadow-sm">
        Add Your Category
      </button>
    </div>
  );

  if (catForm) return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col gap-5">
        <h3 className="text-lg font-bold text-slate-800">Add Category</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
          <input
            autoFocus
            type="text"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && catName.trim()) catCreateMut.mutate({ name: catName }); }}
            placeholder="e.g. Beverages"
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100" />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setCatForm(false); setCatName(''); }}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
            Cancel
          </button>
          <button
            disabled={!catName.trim() || catCreateMut.isPending}
            onClick={() => catCreateMut.mutate({ name: catName })}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition disabled:opacity-40">
            {catCreateMut.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const catNames = new Set(categories.map(c => c.name));
  const allCats = [{ id: 'general', name: 'General' }, ...categories];
  const activeCat = allCats.find(c => c.id === selectedCatId) || allCats[0];

  const getCatItems = (cat) => {
    if (cat.name === 'General')
      return allItems.filter(i => !i.category || i.category === 'General' || !catNames.has(i.category));
    return allItems.filter(i => i.category === cat.name);
  };
  const catItems = getCatItems(activeCat);

  return (
    <div className="flex-1 grid grid-cols-7 gap-4 min-h-0">
      {/* Left Panel */}
      <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 flex items-center gap-2 px-2 py-2">
          <button
            onClick={() => setShowCatSearch(s => !s)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition shrink-0">
            <Search size={15} />
          </button>
          {showCatSearch && (
            <input
              autoFocus
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400" />
          )}
          <button
            onClick={() => { setCatForm(true); setCatName(''); setCatEditId(null); }}
            className="ml-auto flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0">
            <Plus size={13} /> Add Category
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600 w-10">S.No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600 w-12">Items</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allCats.filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase())).map((cat, idx) => {
                const count = getCatItems(cat).length;
                const isSelected = activeCat.id === cat.id;
                const isDefault = cat.id === 'general';
                return (
                  <tr
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2 text-xs text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-800 border-r border-slate-100">
                      {!isDefault && catEditId === cat.id ? (
                        <input
                          autoFocus
                          value={catName}
                          onChange={e => setCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && catName.trim()) catUpdateMut.mutate({ id: cat.id, data: { name: catName } });
                            if (e.key === 'Escape') { setCatEditId(null); setCatName(''); }
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-full border border-amber-400 rounded px-1 py-0.5 text-xs focus:outline-none" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {cat.name}
                          {isDefault && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">default</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-center text-emerald-600 border-r border-slate-100">{count}</td>
                    <td className="px-2 py-2 text-center relative" onClick={e => e.stopPropagation()}>
                      {!isDefault && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === cat.id ? null : cat.id); }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreVertical size={13} />
                          </button>
                          {rowMenu === cat.id && (
                            <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-28 py-1 text-left">
                              <button
                                onClick={() => { setRowMenu(null); setCatEditId(cat.id); setCatName(cat.name); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700">
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={() => { setRowMenu(null); catDeleteMut.mutate(cat.id); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </>
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
      <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        <div className="px-5 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800 text-sm">{activeCat?.name}</p>
            <p className="text-xs text-slate-400">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Stock Value</p>
              <p className="text-sm font-bold text-emerald-700">
                ₹{catItems.reduce((s, i) => s + Number(i.stock || 0) * Number(i.purchasePrice || 0), 0).toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => { setMoveCatOpen(true); setMoveCatSelected([]); setMoveCatSearch(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap">
              <Plus size={12} /> Move to this Category
            </button>
          </div>
        </div>

        {/* Move-to-category overlay */}
        {moveCatOpen && (
          <div className="absolute inset-0 z-40 bg-black/30 flex items-center justify-center rounded-xl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '75vh' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Move Items</p>
                  <p className="text-xs text-slate-400">Select items to move to <span className="font-semibold text-amber-600">{activeCat?.name}</span></p>
                </div>
                <button onClick={() => setMoveCatOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={moveCatSearch}
                    onChange={e => setMoveCatSearch(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              {(() => {
                const filtered = allItems.filter(i =>
                  i.category !== activeCat?.name &&
                  (i.shortName || '').toLowerCase().includes(moveCatSearch.toLowerCase())
                );
                const allChecked = filtered.length > 0 && filtered.every(i => moveCatSelected.includes(i.id));
                return (
                  <>
                    <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                      <input type="checkbox" id="move-all"
                        checked={allChecked}
                        onChange={() => setMoveCatSelected(allChecked ? [] : filtered.map(i => i.id))}
                        className="w-4 h-4 accent-green-700 cursor-pointer" />
                      <label htmlFor="move-all" className="text-xs font-semibold text-slate-600 cursor-pointer">
                        Select All ({filtered.length})
                      </label>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {filtered.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-8">No items found</p>
                      ) : filtered.map(item => (
                        <label key={item.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox"
                            checked={moveCatSelected.includes(item.id)}
                            onChange={() => setMoveCatSelected(prev =>
                              prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id]
                            )}
                            className="w-4 h-4 accent-green-700 cursor-pointer shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{item.shortName}</p>
                            <p className="text-xs text-slate-400">{item.category || 'General'} · {item.itemCode || '—'}</p>
                          </div>
                          <span className={`text-xs font-bold ${Number(item.stock) <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            Qty: {Number(item.stock || 0)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-xs text-slate-500">{moveCatSelected.length} item{moveCatSelected.length !== 1 ? 's' : ''} selected</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMoveCatOpen(false)}
                          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition">
                          Cancel
                        </button>
                        <button
                          disabled={moveCatSelected.length === 0 || moveToCatMut.isPending}
                          onClick={() => moveToCatMut.mutate({ ids: moveCatSelected, category: activeCat?.name })}
                          className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition disabled:opacity-40">
                          {moveToCatMut.isPending ? 'Moving...' : 'Move'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {catItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No items in this category</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600 w-10">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600">Item Name</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide border-r border-slate-600 w-24">Stock Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide w-28">Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catItems.map((item, i) => {
                  const stockQty = Number(item.stock || 0);
                  const stockVal = stockQty * Number(item.purchasePrice || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs text-slate-400 border-r border-slate-100">{i + 1}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-slate-800 border-r border-slate-100">{item.shortName}</td>
                      <td className={`px-4 py-2 text-xs font-bold text-right border-r border-slate-100 ${stockQty <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{stockQty}</td>
                      <td className="px-4 py-2 text-xs font-bold text-right text-amber-700">₹{stockVal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
