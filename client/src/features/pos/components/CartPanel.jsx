import { Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { RS } from '../resources/constants';

export function CartPanel({
  cart, products, filteredProducts, stockMap, search, setSearch, showAll, setShowAll,
  searchRef, addToCart, removeFromCart,
}) {
  const dropList = showAll && !search.trim() ? products : filteredProducts;
  const showDropdown = (search.trim() || showAll) && dropList.length > 0;

  return (
    <div className="flex-1 overflow-hidden p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-visible h-full">
        <div className="font-bold text-slate-800 px-5 py-3 border-b border-slate-200 relative z-20">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="text-amber-500" size={18} />
            <span>Cart Items ({cart.length})</span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-amber-500 focus-within:ring-0 bg-white">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => { setSearch(e.target.value); setShowAll(false); }}
                onKeyDown={e => {
                  if (e.key === 'F1') { e.preventDefault(); setShowAll(true); }
                  if (e.key === 'Enter' && dropList.length) addToCart(dropList[0]);
                  if (e.key === 'Escape') { setShowAll(false); setSearch(''); }
                }}
                placeholder="Search or Scan barcode to add item…. (F1 for All)"
                className="h-auto flex-1 border-0 bg-transparent p-0 text-sm text-slate-800 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
              />
              {(search || showAll) && (
                <button type="button" onClick={() => { setSearch(''); setShowAll(false); searchRef.current?.focus(); }} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-1.5 bg-slate-100 border-b border-slate-200 sticky top-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item Name</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Item Code</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">MRP</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Purchase</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Sales</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Stock</span>
                </div>
                {dropList.map(p => {
                  const avail = stockMap[p.id] ?? Number(p.stock || 0);
                  return (
                    <button key={p.id} type="button" onMouseDown={() => addToCart(p)} className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-3 py-2 hover:bg-green-50 transition text-left border-b border-slate-100 last:border-0">
                      <span className="text-sm font-semibold text-slate-800 truncate pr-2">{p.shortName}</span>
                      <span className="text-xs text-slate-500 text-center self-center">{p.itemCode || '—'}</span>
                      <span className="text-xs text-slate-600 text-right self-center">{RS}{Number(p.mrp || 0).toFixed(2)}</span>
                      <span className="text-xs font-semibold text-amber-600 text-right self-center">{RS}{Number(p.purchasePrice || 0).toFixed(2)}</span>
                      <span className="text-xs font-semibold text-emerald-600 text-right self-center">{RS}{Number(p.salesPrice || 0).toFixed(2)}</span>
                      <span className={`text-xs font-semibold text-right self-center ${avail <= Number(p.reorderLevel || 10) ? 'text-rose-500' : 'text-emerald-600'}`}>{avail}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {search.trim() && !showAll && filteredProducts.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-slate-400">
                No products found
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 rounded-b-xl">
          {cart.length === 0 ? <EmptyCart /> : <CartTable cart={cart} removeFromCart={removeFromCart} />}
        </div>
        {cart.length > 0 && <CartTotal cart={cart} />}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center bg-slate-50/60 px-6 py-10">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600">
          <ShoppingCart size={28} />
        </div>
        <div className="text-base font-bold text-slate-800">Cart is empty</div>
        <div className="mt-1 text-sm text-slate-500">Search or scan an item above to start this sale.</div>
        <div className="mt-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">Press F1 to view all items</div>
      </div>
    </div>
  );
}

function CartTable({ cart, removeFromCart }) {
  return (
    <table className="w-full min-w-[1060px] table-fixed text-xs">
      <colgroup>
        <col className="w-14" /><col className="w-[30%]" /><col className="w-24" /><col className="w-24" /><col className="w-16" />
        <col className="w-20" /><col className="w-32" /><col className="w-20" /><col className="w-36" /><col className="w-16" />
      </colgroup>
      <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
        <tr>
          {['S.No', 'Item Name', 'Batch', 'MRP', 'Qty', 'Unit', 'Rate Inc Tax', 'GST %', 'Total Amount', 'Action'].map((h, idx) => (
            <th key={h} className={`px-2 py-2 text-center font-semibold text-slate-600 ${idx < 9 ? 'border-r border-slate-200' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cart.map((item, i) => {
          const itemTotal = item.price * item.qty;
          return (
            <tr key={i} className="border-b border-slate-50 hover:bg-amber-50 transition">
              <td className="px-3 py-1.5 font-semibold text-slate-600 border-r border-slate-100">{i + 1}</td>
              <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-100 truncate" title={item.name}>{item.name}</td>
              <td className="px-3 py-1.5 text-slate-500 border-r border-slate-100 truncate">{item.batch || 'N/A'}</td>
              <td className="px-3 py-1.5 text-right font-bold text-amber-600 border-r border-slate-100">{RS}{item.price.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{item.qty}</td>
              <td className="px-3 py-1.5 text-slate-600 border-r border-slate-100">{item.uom}</td>
              <td className="px-3 py-1.5 text-right font-bold text-emerald-600 border-r border-slate-100">{RS}{item.price.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right font-bold text-blue-600 border-r border-slate-100">{item.gstRate || 0}%</td>
              <td className="px-3 py-1.5 text-right font-bold text-slate-800 border-r border-slate-100">{RS}{itemTotal.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-center">
                <button onClick={() => removeFromCart(i)} className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition"><Trash2 size={13} /></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CartTotal({ cart }) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2">
      <div className="grid grid-cols-[1fr_120px_180px_48px] items-center gap-3 text-xs">
        <div className="font-bold uppercase tracking-wide text-slate-500">Cart Total</div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
          <span className="mr-2 text-slate-400">Qty</span>
          <span className="font-bold text-slate-800">{cart.reduce((s, i) => s + i.qty, 0)}</span>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
          <span className="mr-2 text-emerald-700/70">Amount</span>
          <span className="text-sm font-extrabold text-emerald-700">{RS}{cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}</span>
        </div>
        <div />
      </div>
    </div>
  );
}
