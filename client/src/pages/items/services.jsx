import { ChevronRight, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import ItemTransactions from './ItemTransactions.jsx';

export default function ServicesTab({
  allItems,
  sales,
  purchases,
  selectedItemId,
  setSelectedItemId,
  rowMenu,
  setRowMenu,
  openAddService,
  openEdit,
  handleDelete,
}) {
  const services = allItems.filter(i => i.type === 'Service');

  if (services.length === 0) {
    return (
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: 180, height: 156 }}>
          <svg viewBox="0 0 180 156" className="absolute inset-0 w-full h-full" style={{ opacity: 0.85 }}>
            <path d="M30,78 Q20,20 90,12 Q160,4 162,72 Q164,130 110,148 Q56,166 28,130 Q6,100 30,78 Z" fill="#dbeafe" />
          </svg>
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="text-2xl leading-none">🧺</div>
            <div className="flex items-center gap-6">
              <div className="text-2xl leading-none">🧹</div>
              <div className="text-2xl leading-none">📋</div>
              <div className="text-2xl leading-none">🛎</div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-2xl leading-none">🚗</div>
              <div className="text-2xl leading-none">📦</div>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center max-w-xs leading-relaxed">
          Add services you provide to your customers and create Sale invoices for them faster.
        </p>
        <button
          onClick={openAddService}
          className="bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm px-6 py-2.5 rounded-full transition shadow-sm">
          Add Your First Service
        </button>
      </div>
    );
  }

  const selectedSvc = services.find(i => String(i.id) === String(selectedItemId)) || services[0];

  return (
    <div className="flex-1 grid grid-cols-7 gap-4 min-h-0">
      {/* Left Panel */}
      <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="border-b border-slate-200">
          <button
            onClick={openAddService}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition whitespace-nowrap">
            <Plus size={15} /> Add Service
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600 w-10">S.No</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600">Service</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border-r border-slate-600 w-20">Rate</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((p, idx) => {
                const isSelected = String(selectedItemId) === String(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedItemId(p.id)}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2 text-slate-400 text-xs border-r border-slate-100">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800 text-xs border-r border-slate-100">{p.shortName}</td>
                    <td className="px-3 py-2 text-emerald-600 font-bold text-xs border-r border-slate-100">₹{Number(p.salesPrice || 0).toFixed(0)}</td>
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
        {selectedSvc ? (
          <ItemTransactions item={selectedSvc} sales={sales} purchases={purchases} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <ChevronRight size={48} className="mb-2 opacity-50" />
            <p className="text-sm">Select a service to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
