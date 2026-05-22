import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

/* ══════════════════════════════
   COLUMN DEFINITIONS
══════════════════════════════ */
const ALL_COLUMNS = [
  { key: 'shortName',     label: 'Item Name',       default: true  },
  { key: 'itemCode',      label: 'Item Code',        default: true  },
  { key: 'hsnCode',       label: 'HSN Code',         default: true  },
  { key: 'salesPrice',    label: 'Sale Price',        default: true  },
  { key: 'purchasePrice', label: 'Purchase Price',    default: true  },
  { key: 'mrp',           label: 'MRP',               default: true  },
  { key: 'stock',         label: 'Current Stock',     default: true  },
  { key: 'minStock',      label: 'Min Stock',         default: true  },
  { key: 'reorderLevel',  label: 'Reorder Level',     default: true  },
  { key: 'category',      label: 'Category',          default: true  },
  { key: 'gstRate',       label: 'Tax Rate',          default: true  },
  { key: 'salesPriceTax', label: 'Tax Inclusive',     default: true  },
  { key: 'location',      label: 'Item Location',     default: true  },
  { key: 'description',   label: 'Description',       default: true  },
  { key: 'uom',           label: 'Unit',              default: true  },
  { key: 'itemCode',      label: 'Barcode',           default: false, altKey: 'barcode' },
  { key: 'expiryDate',    label: 'Expiry Date',       default: false },
  { key: 'batch',         label: 'Batch No',          default: false },
  { key: 'createdAt',     label: 'Created Date',      default: false },
  { key: 'updatedAt',     label: 'Updated Date',      default: false },
  { key: 'type',          label: 'Item Type',         default: false },
];

// deduplicated by label for the checkbox list
const COLUMN_LIST = ALL_COLUMNS.filter((c, i, arr) =>
  arr.findIndex(x => x.label === c.label) === i
);

const FILTER_FIELDS = ['Stock Quantity', 'Sale Price', 'Purchase Price', 'MRP', 'Tax Rate'];
const FILTER_OPS    = ['Greater than', 'Less than', 'Equal to', 'Greater than or equal', 'Less than or equal'];

/* ══════════════════════════════
   ICONS
══════════════════════════════ */
function ExcelIcon() {
  return (
    <svg viewBox="0 0 56 56" className="w-10 h-10">
      <rect width="56" height="56" rx="8" fill="#e8f5e9" />
      <text x="28" y="38" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#2e7d32" fontFamily="sans-serif">X</text>
      <rect x="4" y="44" width="48" height="4" rx="2" fill="#a5d6a7" />
    </svg>
  );
}

function CsvIcon() {
  return (
    <svg viewBox="0 0 56 56" className="w-10 h-10">
      <rect width="56" height="56" rx="8" fill="#f5f5f5" />
      <text x="28" y="36" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#757575" fontFamily="sans-serif">CSV</text>
      <rect x="8" y="40" width="40" height="3" rx="1.5" fill="#bdbdbd" />
    </svg>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
          transform transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

function Radio({ selected }) {
  return selected ? (
    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
    </div>
  ) : (
    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
  );
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
export default function ExportItems() {
  const navigate = useNavigate();

  /* Format */
  const [format, setFormat] = useState('xlsx');

  /* Filter */
  const [filterMode,      setFilterMode]      = useState('all');
  const [categories,      setCategories]      = useState([]);
  const [selectedCats,    setSelectedCats]    = useState([]);
  const [typeProducts,    setTypeProducts]    = useState(true);
  const [typeServices,    setTypeServices]    = useState(true);
  const [customFilters,   setCustomFilters]   = useState([
    { field: 'Stock Quantity', op: 'Greater than', value: '' },
  ]);

  /* Columns */
  const initCols = () => {
    const m = {};
    COLUMN_LIST.forEach(c => { m[c.label] = c.default; });
    return m;
  };
  const [colChecked, setColChecked] = useState(initCols);

  /* Options */
  const [includeHeader,    setIncludeHeader]    = useState(true);
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [includeInactive,  setIncludeInactive]  = useState(false);

  /* Data */
  const [allItems,   setAllItems]   = useState([]);
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllItems(data);
          const cats = [...new Set(data.map(it => it.category).filter(Boolean))].sort();
          setCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  /* ── Apply filters ── */
  const filteredItems = useMemo(() => {
    let items = [...allItems];

    if (!includeZeroStock) items = items.filter(it => (it.stock ?? 0) > 0);
    if (!includeInactive)  items = items.filter(it => it.active !== false);

    if (filterMode === 'category' && selectedCats.length > 0) {
      items = items.filter(it => selectedCats.includes(it.category));
    } else if (filterMode === 'type') {
      const types = [];
      if (typeProducts) types.push('Product', 'product');
      if (typeServices) types.push('Service', 'service');
      items = items.filter(it => types.includes(it.type));
    } else if (filterMode === 'custom') {
      customFilters.forEach(f => {
        if (!f.value && f.value !== 0) return;
        const val = Number(f.value);
        const fieldMap = {
          'Stock Quantity':   'stock',
          'Sale Price':       'salesPrice',
          'Purchase Price':   'purchasePrice',
          'MRP':              'mrp',
          'Tax Rate':         'gstRate',
        };
        const key = fieldMap[f.field];
        if (!key) return;
        items = items.filter(it => {
          const v = Number(it[key] ?? 0);
          if (f.op === 'Greater than')              return v >  val;
          if (f.op === 'Less than')                 return v <  val;
          if (f.op === 'Equal to')                  return v === val;
          if (f.op === 'Greater than or equal')     return v >= val;
          if (f.op === 'Less than or equal')        return v <= val;
          return true;
        });
      });
    }

    return items;
  }, [allItems, filterMode, selectedCats, typeProducts, typeServices, customFilters, includeZeroStock, includeInactive]);

  /* ── Columns selected ── */
  const selectedCols = COLUMN_LIST.filter(c => colChecked[c.label]);
  const allSelected  = COLUMN_LIST.every(c => colChecked[c.label]);

  const toggleAll = () => {
    const next = !allSelected;
    const m = {};
    COLUMN_LIST.forEach(c => { m[c.label] = next; });
    setColChecked(m);
  };

  /* ── Build export row ── */
  const buildRow = item => {
    const row = {};
    selectedCols.forEach(c => {
      let val = item[c.key] ?? '';
      if (c.label === 'Tax Inclusive') val = item.salesPriceTax === 'with' ? 'Y' : 'N';
      if (c.label === 'Expiry Date' || c.label === 'Created Date' || c.label === 'Updated Date') {
        val = val ? new Date(val).toLocaleDateString('en-IN') : '';
      }
      row[c.label] = val;
    });
    return row;
  };

  /* ── Export ── */
  const handleExport = () => {
    if (filteredItems.length === 0) return;
    setExporting(true);
    try {
      const rows = filteredItems.map(buildRow);
      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: !includeHeader });
        if (includeHeader) ws['!cols'] = selectedCols.map(() => ({ wch: 20 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Items');
        XLSX.writeFile(wb, 'export_items.xlsx');
      } else {
        const headers = includeHeader ? selectedCols.map(c => c.label).join(',') + '\n' : '';
        const body    = rows.map(r =>
          selectedCols.map(c => {
            const v = String(r[c.label] ?? '');
            return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
          }).join(',')
        ).join('\n');
        const blob = new Blob([headers + body], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'export_items.csv'; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  /* ── Preview rows ── */
  const previewRows = filteredItems.slice(0, 5).map(buildRow);

  /* ── Custom filter helpers ── */
  const addFilter = () =>
    setCustomFilters(f => [...f, { field: 'Stock Quantity', op: 'Greater than', value: '' }]);
  const updateFilter = (i, key, val) =>
    setCustomFilters(f => f.map((x, idx) => idx === i ? { ...x, [key]: val } : x));
  const removeFilter = i =>
    setCustomFilters(f => f.filter((_, idx) => idx !== i));

  const selectClass = 'border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-400 bg-white';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-1 text-gray-500 hover:text-gray-700 rounded transition">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Export Items</h1>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto mt-8 px-4 space-y-8">

          {/* ── FORMAT ── */}
          <section>
            <p className="text-base font-semibold text-gray-800">Select Export Format</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-4">Choose the format you want to export your items in</p>
            <div className="grid grid-cols-2 gap-4">

              {/* Excel card */}
              <div
                onClick={() => setFormat('xlsx')}
                className={`relative flex flex-col items-center p-6 bg-white rounded-xl cursor-pointer transition
                  ${format === 'xlsx' ? 'border-2 border-blue-500 shadow-sm' : 'border border-gray-200 hover:shadow-sm'}`}
              >
                <span className="absolute top-3 left-3 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  RECOMMENDED
                </span>
                <div className="absolute top-3 right-3"><Radio selected={format === 'xlsx'} /></div>
                <div className="bg-green-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mt-4 mb-3">
                  <ExcelIcon />
                </div>
                <p className="font-bold text-gray-800 text-sm">Excel (.xlsx)</p>
                <p className="text-xs text-gray-500 text-center mt-1">Export as Microsoft Excel spreadsheet</p>
              </div>

              {/* CSV card */}
              <div
                onClick={() => setFormat('csv')}
                className={`relative flex flex-col items-center p-6 bg-white rounded-xl cursor-pointer transition
                  ${format === 'csv' ? 'border-2 border-blue-500 shadow-sm' : 'border border-gray-200 hover:shadow-sm'}`}
              >
                <div className="absolute top-3 right-3"><Radio selected={format === 'csv'} /></div>
                <div className="bg-gray-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mt-4 mb-3">
                  <CsvIcon />
                </div>
                <p className="font-bold text-gray-800 text-sm">CSV (.csv)</p>
                <p className="text-xs text-gray-500 text-center mt-1">Export as comma-separated values file</p>
              </div>
            </div>
          </section>

          {/* ── FILTER ── */}
          <section>
            <p className="text-base font-semibold text-gray-800 mb-4">Select Items to Export</p>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

              {/* All Items */}
              <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                <input type="radio" checked={filterMode === 'all'} onChange={() => setFilterMode('all')}
                  className="mt-0.5 accent-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">All Items</p>
                  <p className="text-xs text-gray-500">Export all items in your inventory</p>
                </div>
              </label>

              {/* By Category */}
              <div>
                <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                  <input type="radio" checked={filterMode === 'category'} onChange={() => setFilterMode('category')}
                    className="mt-0.5 accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">By Category</p>
                    <p className="text-xs text-gray-500">Export items from selected categories</p>
                  </div>
                </label>
                {filterMode === 'category' && (
                  <div className="px-10 pb-3">
                    <select
                      multiple
                      value={selectedCats}
                      onChange={e => setSelectedCats([...e.target.selectedOptions].map(o => o.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                        focus:outline-none focus:border-blue-400 bg-white h-28"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Hold Ctrl / Cmd to select multiple categories</p>
                  </div>
                )}
              </div>

              {/* By Item Type */}
              <div>
                <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                  <input type="radio" checked={filterMode === 'type'} onChange={() => setFilterMode('type')}
                    className="mt-0.5 accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">By Item Type</p>
                    <p className="text-xs text-gray-500">Filter by product or service type</p>
                  </div>
                </label>
                {filterMode === 'type' && (
                  <div className="px-10 pb-3 flex gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={typeProducts} onChange={e => setTypeProducts(e.target.checked)}
                        className="accent-blue-500" />
                      Products
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={typeServices} onChange={e => setTypeServices(e.target.checked)}
                        className="accent-blue-500" />
                      Services
                    </label>
                  </div>
                )}
              </div>

              {/* Custom Filter */}
              <div>
                <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                  <input type="radio" checked={filterMode === 'custom'} onChange={() => setFilterMode('custom')}
                    className="mt-0.5 accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Custom Filter</p>
                    <p className="text-xs text-gray-500">Build your own filter conditions</p>
                  </div>
                </label>
                {filterMode === 'custom' && (
                  <div className="px-10 pb-3 space-y-2">
                    {customFilters.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <select value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)}
                          className={selectClass}>
                          {FILTER_FIELDS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <select value={f.op} onChange={e => updateFilter(i, 'op', e.target.value)}
                          className={selectClass}>
                          {FILTER_OPS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <input
                          type="number"
                          value={f.value}
                          onChange={e => updateFilter(i, 'value', e.target.value)}
                          placeholder="Value"
                          className={`${selectClass} w-20`}
                        />
                        {customFilters.length > 1 && (
                          <button onClick={() => removeFilter(i)}
                            className="text-xs text-red-400 hover:text-red-600 transition">✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addFilter}
                      className="flex items-center gap-1 text-blue-500 text-xs hover:text-blue-700 transition mt-1">
                      <Plus size={12} /> Add Filter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── COLUMNS ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold text-gray-800">Select Columns to Export</p>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-blue-500" />
                Select All
              </label>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                {COLUMN_LIST.map(c => (
                  <label key={c.label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colChecked[c.label] ?? false}
                      onChange={e => setColChecked(prev => ({ ...prev, [c.label]: e.target.checked }))}
                      className="accent-blue-500"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* ── ADDITIONAL OPTIONS ── */}
          <section>
            <p className="text-base font-semibold text-gray-800 mb-4">Additional Options</p>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {[
                {
                  label: 'Include Header Row', sub: 'First row will contain column names',
                  val: includeHeader, set: setIncludeHeader,
                },
                {
                  label: 'Include Items with Zero Stock', sub: 'Include items that have no stock',
                  val: includeZeroStock, set: setIncludeZeroStock,
                },
                {
                  label: 'Include Inactive Items', sub: 'Include items marked as inactive',
                  val: includeInactive, set: setIncludeInactive,
                },
              ].map(opt => (
                <div key={opt.label} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                  </div>
                  <Toggle checked={opt.val} onChange={opt.set} />
                </div>
              ))}
            </div>
          </section>

          {/* ── PREVIEW ── */}
          <section>
            <p className="text-base font-semibold text-gray-800 mb-2">Preview</p>
            {selectedCols.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Select at least one column to preview.</p>
            ) : previewRows.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No items match the current filter.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        {selectedCols.map(c => (
                          <th key={c.label} className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-blue-500 last:border-r-0">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {selectedCols.map(c => (
                            <td key={c.label} className="px-2 py-1.5 text-gray-700 border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                              {String(row[c.label] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Showing preview of first {previewRows.length} item{previewRows.length !== 1 ? 's' : ''} · {filteredItems.length} total will be exported
                </p>
              </>
            )}
          </section>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{filteredItems.length}</span> item{filteredItems.length !== 1 ? 's' : ''} will be exported
          {selectedCols.length > 0 && (
            <span className="ml-2 text-gray-400">· {selectedCols.length} column{selectedCols.length !== 1 ? 's' : ''} selected</span>
          )}
        </p>
        <button
          onClick={handleExport}
          disabled={exporting || filteredItems.length === 0 || selectedCols.length === 0}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed
            text-white text-sm font-semibold px-7 py-2.5 rounded-full transition"
        >
          {exporting ? 'Exporting…' : `Export ${format === 'xlsx' ? 'Excel' : 'CSV'}`}
        </button>
      </div>

    </div>
  );
}
