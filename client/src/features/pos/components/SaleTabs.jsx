import { Plus, X } from 'lucide-react';

export function SaleTabs({ saleTabs, activeTabId, setActiveTabId, closeSaleTab, addSaleTab }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
      {saleTabs.map((tab, idx) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`h-9 shrink-0 flex items-center border rounded-lg overflow-hidden transition ${
              isActive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <button onClick={() => setActiveTabId(tab.id)} className="h-full px-3 text-xs font-bold">
              Sale {idx + 1}
            </button>
            <button
              onClick={(e) => closeSaleTab(tab.id, e)}
              className="h-full w-8 flex items-center justify-center hover:bg-white/70 text-slate-400 hover:text-rose-500"
              title="Close sale tab"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <button
        onClick={addSaleTab}
        className="h-9 w-9 shrink-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
        title="Add invoice"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
