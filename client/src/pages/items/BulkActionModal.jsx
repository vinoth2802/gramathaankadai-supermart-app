import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  X, Check, Search, ToggleLeft, ToggleRight, Hash, Ruler, RefreshCw,
  ChevronDown, Loader2, ArrowUp, ArrowDown, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../../api/client.js';

/* ── Shared input styles ── */
const cellCls = 'w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 bg-white';

function NumberCell({ value, onChange, placeholder = '' }) {
  return <input type="number" step="0.01" min="0" value={value} onChange={onChange} placeholder={placeholder} className={cellCls} />;
}
function TextCell({ value, onChange, placeholder = '' }) {
  return <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={cellCls} />;
}
function DateCell({ value, onChange }) {
  return <input type="date" value={value} onChange={onChange} className={cellCls} />;
}
function TaxSelect({ value, onChange }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={`${cellCls} appearance-none pr-5`}>
        <option value="with">With Tax</option>
        <option value="without">Without Tax</option>
      </select>
      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}
function SelectCell({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={`${cellCls} appearance-none pr-5`}>
        <option value="">—</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

/* ── Default / min column widths ── */
const DEFAULT_WIDTHS = {
  shortName:        180,
  category:         130,
  hsnCode:          100,
  purchasePrice:    115,
  purchasePriceTax: 120,
  salesPrice:       110,
  salesPriceTax:    120,
  gstRate:           90,
  stock:            115,
  atPrice:          115,
  asOfDate:         140,
  minStock:         100,
  location:         130,
  itemCode:         115,
  uom:              100,
  secondaryUnit:    130,
};
const MIN_COL_W = 60;

/* ── Numeric cols for sort comparison ── */
const NUMERIC_COLS = new Set(['purchasePrice', 'salesPrice', 'gstRate', 'stock', 'atPrice', 'minStock']);

/* ── Sortable + resizable column header ── */
function SortTh({ col, sortCol, sortDir, menuCol, onSort, onToggleMenu, onResizeStart, children }) {
  const isActive = col === sortCol;
  const menuOpen = col === menuCol;

  return (
    <th
      data-sort-menu
      onClick={() => onToggleMenu(menuOpen ? null : col)}
      className="relative group cursor-pointer select-none hover:bg-slate-700 border-r border-slate-600 overflow-visible"
      style={{ padding: 0 }}>

      {/* Header label + sort icon */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
        <span className="flex-1">{children}</span>
        {isActive
          ? sortDir === 'asc'
            ? <ArrowUp   size={10} className="shrink-0 text-amber-300" />
            : <ArrowDown size={10} className="shrink-0 text-amber-300" />
          : <Filter size={9} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
        }
      </div>

      {/* Sort dropdown menu */}
      {menuOpen && (
        <div data-sort-menu
          className="absolute top-full left-0 mt-0.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[165px] text-slate-800 font-normal normal-case tracking-normal text-xs">
          <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Sort</p>
          <button
            onClick={e => { e.stopPropagation(); onSort(col, 'asc'); onToggleMenu(null); }}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-amber-50 transition ${isActive && sortDir === 'asc' ? 'text-amber-600 font-semibold' : ''}`}>
            <ArrowUp size={11} /> Ascending
          </button>
          <button
            onClick={e => { e.stopPropagation(); onSort(col, 'desc'); onToggleMenu(null); }}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-amber-50 transition ${isActive && sortDir === 'desc' ? 'text-amber-600 font-semibold' : ''}`}>
            <ArrowDown size={11} /> Descending
          </button>
          {isActive && (
            <>
              <hr className="border-slate-100 my-1" />
              <button
                onClick={e => { e.stopPropagation(); onSort(null, 'asc'); onToggleMenu(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:bg-slate-50 transition">
                <X size={11} /> Clear Sort
              </button>
            </>
          )}
        </div>
      )}

      {/* Resize handle — right edge */}
      <div
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(e, col); }}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-20 flex items-center justify-center group/rh"
        title="Drag to resize">
        <div className="w-px h-4/5 bg-slate-500 opacity-0 group-hover/rh:opacity-100 transition-opacity rounded-full" />
      </div>
    </th>
  );
}

/* ── Non-update mode metadata ── */
const MODE_META = {
  inactive:   { icon: ToggleLeft,  label: 'Bulk Inactive',    color: 'bg-rose-500',    hover: 'hover:bg-rose-600',    desc: 'Select items to mark as Inactive' },
  active:     { icon: ToggleRight, label: 'Bulk Active',      color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', desc: 'Select items to mark as Active' },
  assignCode: { icon: Hash,        label: 'Bulk Assign Code', color: 'bg-blue-500',    hover: 'hover:bg-blue-600',    desc: 'Auto-generate item codes for selected items' },
  assignUnit: { icon: Ruler,       label: 'Bulk Assign Units',color: 'bg-violet-500',  hover: 'hover:bg-violet-600',  desc: 'Set unit of measure for selected items' },
};

/* ═══════════════════════════════
   UpdateScreen — table-based
═══════════════════════════════ */
function UpdateScreen({ items, uoms, categories, onClose }) {
  const qc = useQueryClient();
  const [subTab, setSubTab]           = useState('pricing');
  const [search, setSearch]           = useState('');
  const [applying, setApplying]       = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortCol, setSortCol]         = useState(null);
  const [sortDir, setSortDir]         = useState('asc');
  const [sortMenuCol, setSortMenuCol] = useState(null);
  const [colWidths, setColWidths]     = useState({ ...DEFAULT_WIDTHS });

  /* Close sort menu on outside click */
  useEffect(() => {
    if (!sortMenuCol) return;
    const close = (e) => { if (!e.target.closest('[data-sort-menu]')) setSortMenuCol(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [sortMenuCol]);

  /* Reset sort when switching tabs */
  const switchTab = (tab) => { setSubTab(tab); setSortCol(null); setSortMenuCol(null); };

  const handleSort = (col, dir) => { setSortCol(col); setSortDir(dir || 'asc'); };

  /* Column resize — drag handler */
  const startResize = (e, col) => {
    const startX = e.clientX;
    const startW = colWidths[col] ?? DEFAULT_WIDTHS[col] ?? 100;
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      const newW = Math.max(MIN_COL_W, startW + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [col]: newW }));
    };
    const onUp = () => {
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  /* Shared SortTh props */
  const sp = { sortCol, sortDir, menuCol: sortMenuCol, onSort: handleSort, onToggleMenu: setSortMenuCol, onResizeStart: startResize };

  const [rowEdits, setRowEdits] = useState(() => {
    const map = {};
    items.forEach(item => {
      map[item.id] = {
        shortName:        item.shortName             || '',
        purchasePrice:    String(item.purchasePrice  ?? ''),
        purchasePriceTax: item.purchasePriceTax      || 'with',
        salesPrice:       String(item.salesPrice     ?? ''),
        salesPriceTax:    item.salesPriceTax         || 'with',
        gstRate:          String(item.gstRate        ?? ''),
        category:         item.category              || '',
        hsnCode:          item.hsnCode               || '',
        stock:            String(item.stock          ?? ''),
        atPrice:          String(item.atPrice        ?? ''),
        asOfDate:         item.asOfDate ? new Date(item.asOfDate).toISOString().split('T')[0] : '',
        minStock:         String(item.minStock       ?? ''),
        location:         item.location              || '',
        itemCode:         item.itemCode              || '',
        uom:              item.uom                   || 'PCS',
        secondaryUnit:    item.secondaryUnit         || '',
      };
    });
    return map;
  });

  const sf = (id, field, val) => {
    setRowEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    setSelectedIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() =>
    items.filter(i =>
      !search ||
      (i.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.hsnCode   || '').toLowerCase().includes(search.toLowerCase())
    ), [items, search]);

  const sortedFiltered = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      if (NUMERIC_COLS.has(sortCol)) {
        const diff = Number(va) - Number(vb);
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortCol === 'asOfDate') {
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every(i => selectedIds.has(i.id));
  const toggleAll   = () => setSelectedIds(allSelected ? new Set() : new Set(sortedFiltered.map(i => i.id)));
  const toggleOne   = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const catOptions = categories.map(c => ({ value: c.name, label: c.name }));
  const uomOptions = uoms.map(u => ({ value: u.code, label: u.code }));

  const handleApply = async () => {
    const ids = [...selectedIds];
    if (!ids.length) { toast.error('Select at least one item'); return; }
    setApplying(true);
    try {
      await Promise.all(ids.map(id => {
        const e = rowEdits[id] || {};
        let data = {};
        if (subTab === 'pricing') {
          data = {
            shortName:        e.shortName        || undefined,
            category:         e.category         || undefined,
            hsnCode:          e.hsnCode          || null,
            purchasePrice:    Number(e.purchasePrice) || 0,
            purchasePriceTax: e.purchasePriceTax  || 'with',
            salesPrice:       Number(e.salesPrice)    || 0,
            salesPriceTax:    e.salesPriceTax     || 'with',
            gstRate:          Number(e.gstRate)       || 0,
          };
        } else if (subTab === 'stock') {
          data = {
            shortName: e.shortName || undefined,
            stock:    Number(e.stock)    || 0,
            atPrice:  Number(e.atPrice)  || 0,
            asOfDate: e.asOfDate         || null,
            minStock: Number(e.minStock) || 0,
            location: e.location         || null,
          };
        } else {
          data = {
            shortName:     e.shortName     || undefined,
            category:      e.category      || undefined,
            hsnCode:       e.hsnCode       || null,
            itemCode:      e.itemCode      || null,
            uom:           e.uom           || 'PCS',
            secondaryUnit: e.secondaryUnit || null,
          };
        }
        return http.patch(`/items/${id}`, data);
      }));
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success(`Updated ${ids.length} item${ids.length > 1 ? 's' : ''}`);
      onClose();
    } catch {
      toast.error('Failed to update some items');
    } finally {
      setApplying(false);
    }
  };

  /* colgroup per tab */
  const ColGroup = () => {
    if (subTab === 'pricing') return (
      <colgroup>
        <col style={{ width: 40 }} />
        <col style={{ width: 40 }} />
        <col style={{ width: colWidths.shortName }} />
        <col style={{ width: colWidths.category }} />
        <col style={{ width: colWidths.hsnCode }} />
        <col style={{ width: colWidths.purchasePrice }} />
        <col style={{ width: colWidths.purchasePriceTax }} />
        <col style={{ width: colWidths.salesPrice }} />
        <col style={{ width: colWidths.salesPriceTax }} />
        <col style={{ width: colWidths.gstRate }} />
      </colgroup>
    );
    if (subTab === 'stock') return (
      <colgroup>
        <col style={{ width: 40 }} />
        <col style={{ width: 40 }} />
        <col style={{ width: colWidths.shortName }} />
        <col style={{ width: colWidths.stock }} />
        <col style={{ width: colWidths.atPrice }} />
        <col style={{ width: colWidths.asOfDate }} />
        <col style={{ width: colWidths.minStock }} />
        <col style={{ width: colWidths.location }} />
      </colgroup>
    );
    return (
      <colgroup>
        <col style={{ width: 40 }} />
        <col style={{ width: 40 }} />
        <col style={{ width: colWidths.shortName }} />
        <col style={{ width: colWidths.category }} />
        <col style={{ width: colWidths.hsnCode }} />
        <col style={{ width: colWidths.itemCode }} />
        <col style={{ width: colWidths.uom }} />
        <col style={{ width: colWidths.secondaryUnit }} />
      </colgroup>
    );
  };

  const fixedThCls = 'px-3 py-2.5 text-left border-r border-slate-600 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 bg-amber-500 text-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <RefreshCw size={18} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base">Bulk Update Items</h2>
            <p className="text-xs opacity-80">Check rows · edit inline · drag column edges to resize · click Apply Changes</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        {/* Search + Radio tabs */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0 flex-wrap gap-y-2">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Item Name / HSN Code"
              className="flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
            {[
              { value: 'pricing', label: 'Pricing' },
              { value: 'stock',   label: 'Stock' },
              { value: 'info',    label: 'Item Information' },
            ].map(({ value, label }) => (
              <button key={value} type="button" onClick={() => switchTab(value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition select-none ${
                  subTab === value ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {/* Reset widths */}
          <button
            onClick={() => setColWidths({ ...DEFAULT_WIDTHS })}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition shrink-0"
            title="Reset column widths">
            Reset Widths
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <ColGroup />
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                {/* Fixed non-resizable columns */}
                <th className={`${fixedThCls} w-10 text-center`}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-amber-400 cursor-pointer" />
                </th>
                <th className={`${fixedThCls} w-10`}>#</th>

                {/* Sortable + resizable columns */}
                <SortTh col="shortName" {...sp}>Item Name</SortTh>

                {subTab === 'pricing' && (<>
                  <SortTh col="category"         {...sp}>Category</SortTh>
                  <SortTh col="hsnCode"          {...sp}>HSN Code</SortTh>
                  <SortTh col="purchasePrice"    {...sp}>Purchase Price</SortTh>
                  <SortTh col="purchasePriceTax" {...sp}>Tax Type</SortTh>
                  <SortTh col="salesPrice"       {...sp}>Sales Price</SortTh>
                  <SortTh col="salesPriceTax"    {...sp}>Tax Type</SortTh>
                  <SortTh col="gstRate"          {...sp}>Tax Rate %</SortTh>
                </>)}

                {subTab === 'stock' && (<>
                  <SortTh col="stock"    {...sp}>Opening Qty</SortTh>
                  <SortTh col="atPrice"  {...sp}>At Price (₹)</SortTh>
                  <SortTh col="asOfDate" {...sp}>As of Date</SortTh>
                  <SortTh col="minStock" {...sp}>Min Stock</SortTh>
                  <SortTh col="location" {...sp}>Location</SortTh>
                </>)}

                {subTab === 'info' && (<>
                  <SortTh col="category"      {...sp}>Category</SortTh>
                  <SortTh col="hsnCode"       {...sp}>Item HSN</SortTh>
                  <SortTh col="itemCode"      {...sp}>Item Code</SortTh>
                  <SortTh col="uom"           {...sp}>Unit</SortTh>
                  <SortTh col="secondaryUnit" {...sp}>Secondary Unit</SortTh>
                </>)}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedFiltered.length === 0 ? (
                <tr><td colSpan={20} className="text-center py-10 text-slate-400">No items found</td></tr>
              ) : sortedFiltered.map((item, idx) => {
                const checked = selectedIds.has(item.id);
                const e = rowEdits[item.id] || {};
                return (
                  <tr key={item.id}
                    className={`transition-colors ${checked ? 'bg-amber-50' : 'bg-white hover:bg-slate-50'} ${!item.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-1.5 border-r border-slate-100 text-center overflow-hidden">
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(item.id)} className="accent-amber-500 cursor-pointer" />
                    </td>
                    <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 tabular-nums overflow-hidden">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                      <TextCell
                        value={e.shortName ?? item.shortName}
                        onChange={ev => sf(item.id, 'shortName', ev.target.value)}
                        placeholder="Item Name"
                      />
                      {!item.isActive && <span className="block text-[10px] text-slate-400 mt-0.5">(inactive)</span>}
                    </td>

                    {subTab === 'pricing' && (<>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <SelectCell value={e.category || ''} onChange={ev => sf(item.id, 'category', ev.target.value)} options={catOptions} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TextCell value={e.hsnCode || ''} onChange={ev => sf(item.id, 'hsnCode', ev.target.value)} placeholder="HSN" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.purchasePrice || ''} onChange={ev => sf(item.id, 'purchasePrice', ev.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TaxSelect value={e.purchasePriceTax || 'with'} onChange={ev => sf(item.id, 'purchasePriceTax', ev.target.value)} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.salesPrice || ''} onChange={ev => sf(item.id, 'salesPrice', ev.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TaxSelect value={e.salesPriceTax || 'with'} onChange={ev => sf(item.id, 'salesPriceTax', ev.target.value)} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.gstRate || ''} onChange={ev => sf(item.id, 'gstRate', ev.target.value)} placeholder="0" />
                      </td>
                    </>)}

                    {subTab === 'stock' && (<>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.stock || ''} onChange={ev => sf(item.id, 'stock', ev.target.value)} placeholder="0" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.atPrice || ''} onChange={ev => sf(item.id, 'atPrice', ev.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <DateCell value={e.asOfDate || ''} onChange={ev => sf(item.id, 'asOfDate', ev.target.value)} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <NumberCell value={e.minStock || ''} onChange={ev => sf(item.id, 'minStock', ev.target.value)} placeholder="0" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TextCell value={e.location || ''} onChange={ev => sf(item.id, 'location', ev.target.value)} placeholder="Location" />
                      </td>
                    </>)}

                    {subTab === 'info' && (<>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <SelectCell value={e.category || ''} onChange={ev => sf(item.id, 'category', ev.target.value)} options={catOptions} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TextCell value={e.hsnCode || ''} onChange={ev => sf(item.id, 'hsnCode', ev.target.value)} placeholder="HSN Code" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TextCell value={e.itemCode || ''} onChange={ev => sf(item.id, 'itemCode', ev.target.value)} placeholder="Item Code" />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <SelectCell value={e.uom || 'PCS'} onChange={ev => sf(item.id, 'uom', ev.target.value)} options={uomOptions} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
                        <TextCell value={e.secondaryUnit || ''} onChange={ev => sf(item.id, 'secondaryUnit', ev.target.value)} placeholder="Secondary Unit" />
                      </td>
                    </>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{selectedIds.size}</span> item{selectedIds.size !== 1 ? 's' : ''} selected
            {sortedFiltered.length !== items.length && (
              <span className="ml-2 text-xs text-slate-400">· {sortedFiltered.length} of {items.length} shown</span>
            )}
            {sortCol && (
              <span className="ml-2 text-xs text-amber-600">· sorted by {sortCol} {sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button onClick={handleApply} disabled={applying || selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition disabled:opacity-40 bg-amber-500 hover:bg-amber-600">
              {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {applying ? 'Saving…' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   BulkActionModal — other modes
═══════════════════════════════ */
export default function BulkActionModal({ mode, items = [], uoms = [], categories = [], onApply, onClose }) {
  if (mode === 'update') {
    return <UpdateScreen items={items} uoms={uoms} categories={categories} onClose={onClose} />;
  }

  const meta = MODE_META[mode];
  const Icon = meta.icon;

  const [search, setSearch]           = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [codePrefix, setCodePrefix]   = useState('');
  const [codeStart, setCodeStart]     = useState(1);
  const [bulkUnit, setBulkUnit]       = useState(uoms[0]?.code || 'PCS');

  const filtered = useMemo(() =>
    items.filter(i =>
      !search ||
      (i.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.itemCode  || '').toLowerCase().includes(search.toLowerCase())
    ), [items, search]);

  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id));
  const toggleAll   = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(i => i.id)));
  const toggleOne   = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const previewCode = (idx = 0) => {
    const pad = Math.max(String(codeStart).length, 3);
    return codePrefix
      ? `${codePrefix}-${String(codeStart + idx).padStart(pad, '0')}`
      : String(codeStart + idx).padStart(pad, '0');
  };

  const handleApply = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (mode === 'inactive')   return onApply(ids, { isActive: false });
    if (mode === 'active')     return onApply(ids, { isActive: true  });
    if (mode === 'assignUnit') return onApply(ids, { uom: bulkUnit    });
    if (mode === 'assignCode') {
      const pad = Math.max(String(codeStart).length, 3);
      const codes = ids.map((id, i) => ({
        id,
        itemCode: codePrefix
          ? `${codePrefix}-${String(codeStart + i).padStart(pad, '0')}`
          : String(codeStart + i).padStart(pad, '0'),
      }));
      return onApply(ids, { codes });
    }
  };

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className={`flex items-center gap-3 px-6 py-4 ${meta.color} text-white shrink-0`}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base">{meta.label}</h2>
            <p className="text-xs opacity-80">{meta.desc}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 divide-x divide-slate-100">
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search items…"
                className="flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400" />
              <span className="text-xs text-slate-400 font-medium shrink-0">{selectedIds.size} / {items.length}</span>
            </div>
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-amber-500 cursor-pointer" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {allSelected ? 'Deselect All' : 'Select All'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No items found</p>
              ) : filtered.map(item => (
                <label key={item.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition border-b border-slate-50 last:border-0 ${
                    selectedIds.has(item.id) ? 'bg-amber-50' : 'hover:bg-slate-50'
                  }`}>
                  <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleOne(item.id)}
                    className="accent-amber-500 cursor-pointer shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-slate-800 truncate ${!item.isActive ? 'opacity-50' : ''}`}>
                      {item.shortName}
                      {!item.isActive && <span className="ml-1 text-xs text-slate-400 font-normal">(inactive)</span>}
                    </p>
                    {item.itemCode && <p className="text-xs text-slate-400 truncate">{item.itemCode}</p>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{item.uom || 'PCS'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col w-1/2 min-h-0 p-5 gap-4 overflow-y-auto">
            {(mode === 'inactive' || mode === 'active') && (
              <div className="flex flex-col gap-3">
                <div className={`rounded-xl p-4 ${mode === 'inactive' ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <p className={`text-sm font-semibold ${mode === 'inactive' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {mode === 'inactive' ? 'Mark selected items as Inactive' : 'Mark selected items as Active'}
                  </p>
                  <p className={`text-xs mt-1 ${mode === 'inactive' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {mode === 'inactive'
                      ? 'Inactive items are hidden from POS and sales. Reactivate anytime.'
                      : 'Active items appear in POS and sales transactions.'}
                  </p>
                </div>
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-slate-800">{selectedIds.size}</p>
                  <p className="text-sm text-slate-400 mt-1">item{selectedIds.size !== 1 ? 's' : ''} selected</p>
                </div>
              </div>
            )}

            {mode === 'assignCode' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Code Prefix</label>
                  <input value={codePrefix} onChange={e => setCodePrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. ITEM or P (optional)" className={inp} maxLength={10} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Starting Number</label>
                  <input type="number" min="1" value={codeStart}
                    onChange={e => setCodeStart(Math.max(1, Number(e.target.value)))} className={inp} />
                </div>
                {selectedIds.size > 0 && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Preview</p>
                    <div className="space-y-1">
                      {[...selectedIds].slice(0, 4).map((id, i) => {
                        const item = items.find(x => x.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 truncate max-w-[130px]">{item?.shortName}</span>
                            <span className="font-mono font-bold text-blue-700">{previewCode(i)}</span>
                          </div>
                        );
                      })}
                      {selectedIds.size > 4 && <p className="text-xs text-blue-400 mt-1">…and {selectedIds.size - 4} more</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'assignUnit' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Unit</label>
                  <div className="relative">
                    <select value={bulkUnit} onChange={e => setBulkUnit(e.target.value)} className={`${inp} appearance-none pr-8`}>
                      {uoms.map(u => (
                        <option key={u.id || u.code} value={u.code}>{u.code} — {u.descr || u.fullName || u.code}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">Effect</p>
                  <p className="text-sm text-violet-700">
                    Unit for <strong>{selectedIds.size}</strong> item{selectedIds.size !== 1 ? 's' : ''} will be set to <strong>{bulkUnit}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{selectedIds.size}</span> item{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button onClick={handleApply} disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition disabled:opacity-40 ${meta.color} ${meta.hover}`}>
              <Check size={14} />
              {mode === 'inactive'   ? 'Set Inactive' :
               mode === 'active'    ? 'Set Active'   :
               mode === 'assignCode'? 'Assign Codes' : 'Assign Unit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
