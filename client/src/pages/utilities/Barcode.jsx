import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Barcode from 'react-barcode';
import { Plus, Trash2, Printer, Eye, QrCode, X, Search, ChevronDown } from 'lucide-react';
import { ItemsAPI } from '../../api/items.js';
import { toast } from 'sonner';

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 bg-white';
const lbl = 'block text-xs font-semibold text-slate-500 mb-1';

const LABEL_SIZES = {
  '38x25': { label: '2 Labels (38×25mm)', widthPx: 144, heightPx: 95,  barH: 40, barW: 1.2 },
  '50x25': { label: '2 Labels (50×25mm)', widthPx: 189, heightPx: 95,  barH: 40, barW: 1.5 },
  custom:  { label: 'Custom Size',         widthPx: 200, heightPx: 120, barH: 50, barW: 1.5 },
};

const EMPTY = {
  itemId: '', itemName: '', itemCode: '', noOfLabels: 1,
  header: '', line1: '', line2: '', line3: '', line4: '',
};

function ScaledBarcode({ value, targetWidth, barH }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;
    const nw = parseFloat(svg.getAttribute('width') || 0);
    const nh = parseFloat(svg.getAttribute('height') || 0);
    if (nw && nh) {
      svg.setAttribute('viewBox', `0 0 ${nw} ${nh}`);
      svg.setAttribute('width', targetWidth);
      svg.setAttribute('height', nh * (targetWidth / nw));
    }
  });
  return (
    <div ref={ref}>
      <Barcode value={value} width={1.5} height={barH} fontSize={8} margin={2} />
    </div>
  );
}

function LabelCard({ row, sizeKey = '38x25', style = {} }) {
  const sz = LABEL_SIZES[sizeKey] || LABEL_SIZES['38x25'];
  const innerW = sz.widthPx - 12;
  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 6, textAlign: 'center', width: sz.widthPx, boxSizing: 'border-box', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {row.header && <p style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2, lineHeight: 1.2 }}>{row.header}</p>}
      {row.itemCode
        ? <ScaledBarcode value={row.itemCode} targetWidth={innerW} barH={sz.barH} />
        : <div style={{ height: sz.barH + 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>No barcode</div>
      }
      {(row.line1 || row.line2 || row.line3 || row.line4) && (
        <div style={{ display: 'flex', width: '100%', marginTop: 2, gap: 4 }}>
          <div style={{ flex: 1, textAlign: 'left' }}>
            {row.line1 && <p style={{ fontSize: 9, margin: '1px 0', lineHeight: 1.2 }}>{row.line1}</p>}
            {row.line2 && <p style={{ fontSize: 9, margin: '1px 0', lineHeight: 1.2 }}>{row.line2}</p>}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            {row.line3 && <p style={{ fontSize: 9, margin: '1px 0', lineHeight: 1.2 }}><strong>PKD:</strong> {row.line3}</p>}
            {row.line4 && <p style={{ fontSize: 9, margin: '1px 0', lineHeight: 1.2 }}><strong>EXP:</strong> {row.line4}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemSearchDropdown({ items, value, onSelect }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const ref                   = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = items.filter(i =>
    (i.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.itemCode  || '').toLowerCase().includes(search.toLowerCase())
  );

  const selected = items.find(i => String(i.id) === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 transition">
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? selected.shortName : '-- Select Item --'}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search item name or code…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          {/* Results */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No items found</p>
            ) : filtered.map(i => (
              <button key={i.id} type="button"
                onClick={() => { onSelect(i); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition flex items-center justify-between ${String(i.id) === value ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-700'}`}>
                <span>{i.shortName}</span>
                {i.itemCode && <span className="text-xs text-slate-400 font-mono">{i.itemCode}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BarcodeGenerator() {
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: ItemsAPI.getAll });
  const [form, setForm]         = useState({ ...EMPTY });
  const [rows, setRows]         = useState([]);
  const [checked, setChecked]   = useState(new Set());
  const [preview, setPreview]   = useState(false);
  const [labelSize, setLabelSize]     = useState('38x25');
  const [printerType, setPrinterType] = useState('Label Printer');

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onItemChange = (item) => {
    if (!item) { setForm({ ...EMPTY }); return; }
    setForm(f => ({
      ...f,
      itemId:   String(item.id),
      itemName: item.shortName,
      itemCode: item.itemCode  || '',
      header:   item.shortName || '',
      line1:    item.mrp       != null ? `MRP: ₹${Number(item.mrp).toFixed(2)}`         : '',
      line2:    item.salesPrice != null ? `Sale: ₹${Number(item.salesPrice).toFixed(2)}` : '',
    }));
  };

  const addRow = () => {
    if (!form.itemName) { toast.error('Select an item first'); return; }
    setRows(r => [...r, { ...form, _id: Date.now() }]);
    setForm({ ...EMPTY });
  };

  const deleteRow = (id) => {
    setRows(r => r.filter(x => x._id !== id));
    setChecked(c => { const s = new Set(c); s.delete(id); return s; });
  };

  const toggle    = (id) => setChecked(c => { const s = new Set(c); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setChecked(rows.length && checked.size === rows.length ? new Set() : new Set(rows.map(r => r._id)));

  const printRows = checked.size > 0 ? rows.filter(r => checked.has(r._id)) : rows;

  const injectPrintCss = () => {
    let el = document.getElementById('__barcode_print_css__');
    if (!el) { el = document.createElement('style'); el.id = '__barcode_print_css__'; document.head.appendChild(el); }
    el.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
        #barcode-print-area {
          position: fixed; inset: 0;
          display: flex !important;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 12px;
          padding: 20px;
          background: white;
        }
      }
    `;
  };

  const handleGenerate = () => {
    if (!printRows.length) return;
    injectPrintCss();
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="p-6 h-screen flex flex-col gap-4 bg-slate-50 overflow-hidden">

      {/* ── Form + Preview ── */}
      <div className="grid grid-cols-2 gap-4 shrink-0">

        {/* Left: Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide shrink-0">Label Settings</p>
            <div className="flex items-center gap-2">
              <select value={printerType} onChange={e => setPrinterType(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 transition">
                <option>Label Printer</option>
                <option>Regular Printer</option>
              </select>
              <select value={labelSize} onChange={e => setLabelSize(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 transition">
                {Object.entries(LABEL_SIZES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Item Name *</label>
            <ItemSearchDropdown items={items} value={form.itemId} onSelect={onItemChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Item Code</label>
              <input value={form.itemCode} readOnly placeholder="Auto-filled" className={inp + ' bg-slate-50 text-slate-400 cursor-not-allowed'} />
            </div>
            <div>
              <label className={lbl}>No. of Labels</label>
              <input type="number" min={1} max={999} value={form.noOfLabels}
                onChange={e => setF('noOfLabels', Math.max(1, Number(e.target.value) || 1))} className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Item Name</label>
            <input value={form.header} onChange={e => setF('header', e.target.value)} placeholder="Item name on label" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'line1', label: 'MRP',        placeholder: 'e.g. ₹99.00' },
              { key: 'line2', label: 'Sale Price',  placeholder: 'e.g. ₹89.00' },
              { key: 'line3', label: 'PKD',        placeholder: 'e.g. 01/2025' },
              { key: 'line4', label: 'EXP',        placeholder: 'e.g. 01/2027' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <input value={form[key]} onChange={e => setF(key, e.target.value)} placeholder={placeholder} className={inp} />
              </div>
            ))}
          </div>

          <button onClick={addRow}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm py-2.5 rounded-lg transition">
            <Plus size={15} /> Add for Barcode
          </button>
        </div>

        {/* Right: Live Preview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Live Preview</p>
          {form.itemCode ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-center p-4">
                {form.header && <p className="text-sm font-bold text-slate-800 mb-1">{form.header}</p>}
                <Barcode value={form.itemCode} width={2} height={70} fontSize={11} margin={4} />
                {(form.line1 || form.line2 || form.line3 || form.line4) && (
                  <div className="flex w-full mt-1 gap-2">
                    <div className="flex-1 text-left">
                      {form.line1 && <p className="text-xs text-slate-700">{form.line1}</p>}
                      {form.line2 && <p className="text-xs text-slate-600">{form.line2}</p>}
                    </div>
                    <div className="flex-1 text-right">
                      {form.line3 && <p className="text-xs text-slate-600"><strong>PKD:</strong> {form.line3}</p>}
                      {form.line4 && <p className="text-xs text-slate-600"><strong>EXP:</strong> {form.line4}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-300">
              <QrCode size={64} strokeWidth={1} />
              <p className="text-sm text-slate-400">Select an item to preview the barcode</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <QrCode size={72} strokeWidth={0.8} className="text-slate-200" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-400">No items added yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Use the form above to add items for barcode generation</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center border-r border-slate-700">
                    <input type="checkbox"
                      checked={checked.size === rows.length && rows.length > 0}
                      onChange={toggleAll}
                      className="cursor-pointer accent-amber-500" />
                  </th>
                  {['Item Name', 'No. of Labels', 'Item Name (Label)', 'MRP', 'Sale Price', 'PKD', 'EXP'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-700">{h}</th>
                  ))}
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row._id} className={`transition ${checked.has(row._id) ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      <input type="checkbox" checked={checked.has(row._id)} onChange={() => toggle(row._id)}
                        className="cursor-pointer accent-amber-500" />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 border-r border-slate-100">{row.itemName}</td>
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">{row.noOfLabels}</td>
                    <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">{row.header || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">{row.line1 || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">{row.line2 || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">{row.line3 || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">{row.line4 || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => deleteRow(row._id)} className="text-rose-400 hover:text-rose-600 transition">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">
            {rows.length} item{rows.length !== 1 ? 's' : ''}
            {checked.size > 0 ? ` · ${checked.size} selected` : ' · all will print'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setPreview(true)} disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition disabled:opacity-40">
              <Eye size={14} /> Preview
            </button>
            <button onClick={handleGenerate} disabled={rows.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40">
              <Printer size={14} /> Generate
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-bold text-slate-800">Label Preview</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPreview(false); handleGenerate(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="flex flex-wrap gap-3">
                {printRows.flatMap(row =>
                  Array.from({ length: Number(row.noOfLabels) || 1 }, (_, i) => (
                    <LabelCard key={`${row._id}-${i}`} row={row} sizeKey={labelSize} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden Print Area ── */}
      <div id="barcode-print-area" style={{ display: 'none' }}>
        {printRows.flatMap(row =>
          Array.from({ length: Number(row.noOfLabels) || 1 }, (_, i) => (
            <LabelCard key={`${row._id}-${i}`} row={row} sizeKey={labelSize} />
          ))
        )}
      </div>
    </div>
  );
}
