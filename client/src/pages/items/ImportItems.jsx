import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ArrowLeft, Upload, CheckCircle, CheckCircle2, FileSpreadsheet,
  AlertCircle, AlertTriangle, Trash2, ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ══════════════════════════════
   FIELD MAPPING DATA
══════════════════════════════ */
const APP_FIELDS = [
  { key: 'itemName',       label: 'Item name*',                    required: true },
  { key: 'itemCode',       label: 'Item code' },
  { key: 'description',    label: 'Description' },
  { key: 'category',       label: 'Category' },
  { key: 'hsn',            label: 'HSN' },
  { key: 'mrp',            label: 'Default MRP' },
  { key: 'salePrice',      label: 'Sale price' },
  { key: 'purchasePrice',  label: 'Purchase price' },
  { key: 'discountType',   label: 'Discount Type' },
  { key: 'saleDiscount',   label: 'Sale Discount' },
  { key: 'openingStock',   label: 'Opening stock quantity' },
  { key: 'minStock',       label: 'Minimum stock quantity' },
  { key: 'location',       label: 'Item Location' },
  { key: 'taxRate',        label: 'Tax Rate' },
  { key: 'taxInclusive',   label: 'Inclusive Of Tax' },
  { key: 'baseUnit',       label: 'Base Unit (x)' },
  { key: 'secondaryUnit',  label: 'Secondary Unit (y)' },
  { key: 'conversionRate', label: 'Conversion Rate (n) (x = ny)' },
];

function normalize(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function findMatch(label, headers) {
  const normLabel = normalize(label);
  const exact = headers.find(h => normalize(h) === normLabel);
  if (exact) return exact;
  return headers.find(h => {
    const normH = normalize(h);
    return normH.includes(normLabel) || normLabel.includes(normH);
  }) ?? '';
}
function autoMatch(headers) {
  const m = {};
  APP_FIELDS.forEach(f => { m[f.key] = findMatch(f.label, headers); });
  return m;
}
function applyMapping(rawRows, mapping) {
  return rawRows.map(row => {
    const item = {};
    APP_FIELDS.forEach(({ key }) => {
      const col = mapping[key];
      item[key] = col !== '' ? (row[col] ?? '') : '';
    });
    return item;
  });
}

/* ══════════════════════════════
   SHARED ICONS
══════════════════════════════ */
function Radio({ selected }) {
  return selected ? (
    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
    </div>
  ) : (
    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
  );
}

function BarcodeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="10" width="36" height="24" rx="3" fill="#0d9488" opacity="0.15" />
      <rect x="6" y="10" width="36" height="24" rx="3" stroke="#0d9488" strokeWidth="2" />
      <rect x="11" y="15" width="2" height="14" rx="1" fill="#0d9488" />
      <rect x="15" y="15" width="1" height="14" rx="0.5" fill="#0d9488" />
      <rect x="18" y="15" width="3" height="14" rx="1" fill="#0d9488" />
      <rect x="23" y="15" width="1" height="14" rx="0.5" fill="#0d9488" />
      <rect x="26" y="15" width="2" height="14" rx="1" fill="#0d9488" />
      <rect x="30" y="15" width="1" height="14" rx="0.5" fill="#0d9488" />
      <rect x="33" y="15" width="3" height="14" rx="1" fill="#0d9488" />
      <rect x="20" y="34" width="8" height="6" rx="2" fill="#0d9488" opacity="0.6" />
      <line x1="6" y1="22" x2="42" y2="22" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 1" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="4" width="28" height="36" rx="3" fill="#dbeafe" />
      <rect x="8" y="4" width="28" height="36" rx="3" stroke="#3b82f6" strokeWidth="1.5" />
      <path d="M28 4 L36 12 L28 12 Z" fill="#93c5fd" />
      <line x1="12" y1="18" x2="32" y2="18" stroke="#93c5fd" strokeWidth="1" />
      <line x1="12" y1="23" x2="32" y2="23" stroke="#93c5fd" strokeWidth="1" />
      <line x1="12" y1="28" x2="32" y2="28" stroke="#93c5fd" strokeWidth="1" />
      <line x1="20" y1="15" x2="20" y2="33" stroke="#93c5fd" strokeWidth="1" />
      <path d="M14 20 L18 24 M18 20 L14 24" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloudUploadIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="text-gray-300">
      <path d="M54 46.5C59.799 46.5 64.5 41.799 64.5 36C64.5 30.687 60.6 26.271 55.467 25.6C53.811 19.512 48.27 15 41.625 15C36.594 15 32.16 17.55 29.52 21.438C27.927 20.832 26.208 20.5 24.375 20.5C17.124 20.5 11.25 26.373 11.25 33.625C11.25 40.875 17.124 46.5 24.375 46.5H54Z"
        fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M36 55V36M36 36L30 42M36 36L42 42" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ══════════════════════════════
   UPLOAD STEP — sample data
══════════════════════════════ */
const SAMPLE_HEADERS = [
  'Item Code', 'Item Name*', 'HSN', 'MRP', 'Sale Price', 'Purchase Price',
  'Opening Stock Quantity', 'Minimum Stock Quantity', 'Reorder Level',
  'Item Location', 'Tax Rate', 'Tax Inclusive (Y=With Tax, N=Without Tax)',
];
const SAMPLE_ROWS = [
  ['a101','Item 1','H001',6,5,4,20,5,10,'Store 1','5%','N'],
  ['a102','Item 2','H002',12,10,8,40,10,20,'Store 2','5%','N'],
  ['a103','Item 3','H003',18,15,12,60,15,30,'Store 3','12%','Y'],
  ['a104','Item 4','H004',24,20,16,80,20,40,'Store 4','12%','Y'],
  ['a105','Item 5','H005',30,25,20,100,25,50,'Store 5','18%','N'],
  ['a106','Item 6','H006',36,30,24,120,30,60,'Store 6','18%','N'],
  ['a107','Item 7','H007',42,35,28,140,35,70,'Store 7','0%','N'],
];

function downloadSample() {
  const ws = XLSX.utils.aoa_to_sheet([SAMPLE_HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = SAMPLE_HEADERS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  XLSX.writeFile(wb, 'sample_import_items.xlsx');
}

function fmtBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/* ══════════════════════════════
   VERIFY STEP — columns
══════════════════════════════ */
const COLS = [
  { key: 'itemName',      label: 'Item Name',     required: true,  width: 'min-w-[160px]' },
  { key: 'itemCode',      label: 'Item Code',      required: false, width: 'min-w-[90px]'  },
  { key: 'hsn',           label: 'HSN',            required: false, width: 'min-w-[80px]'  },
  { key: 'mrp',           label: 'MRP',            required: false, width: 'min-w-[70px]',  num: true },
  { key: 'salePrice',     label: 'Sale Price',     required: false, width: 'min-w-[80px]',  num: true },
  { key: 'purchasePrice', label: 'Purchase Price', required: false, width: 'min-w-[100px]', num: true },
  { key: 'openingStock',  label: 'Opening Qty',    required: false, width: 'min-w-[90px]',  num: true },
  { key: 'minStock',      label: 'Min Qty',        required: false, width: 'min-w-[70px]',  num: true },
  { key: 'location',      label: 'Location',       required: false, width: 'min-w-[90px]'  },
  { key: 'taxRate',       label: 'Tax Rate',       required: false, width: 'min-w-[80px]'  },
  { key: 'taxInclusive',  label: 'Tax Incl.',      required: false, width: 'min-w-[70px]'  },
  { key: 'category',      label: 'Category',       required: false, width: 'min-w-[90px]'  },
  { key: 'description',   label: 'Description',    required: false, width: 'min-w-[140px]' },
];

function validate(rows) {
  const errors = {};
  rows.forEach((row, i) => {
    if (!String(row.itemName ?? '').trim()) errors[i] = 'Item Name is required';
  });
  return errors;
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
export default function ImportItems() {
  const navigate = useNavigate();

  /* step: 'select' | 'upload' | 'mapping' | 'verify' */
  const [step, setStep] = useState('select');

  /* ── Select step ── */
  const [selected, setSelected] = useState('excel');

  /* ── Upload step ── */
  const fileInputRef                  = useRef(null);
  const [fileInfo,    setFileInfo]    = useState(null);
  const [rawRows,     setRawRows]     = useState(null);
  const [headers,     setHeaders]     = useState([]);
  const [parseError,  setParseError]  = useState('');
  const [dragging,    setDragging]    = useState(false);

  /* ── Mapping step ── */
  const [mapping,      setMapping]      = useState({});
  const [mappingError, setMappingError] = useState('');

  /* ── Verify step ── */
  const [rows, setRows] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [imported,     setImported]     = useState(null);
  const [apiError,     setApiError]     = useState('');
  const [dupMap,       setDupMap]       = useState({});
  const [checkingDups, setCheckingDups] = useState(false);

  /* Check duplicates on entering verify */
  useEffect(() => {
    if (step !== 'verify') return;
    const codes = [...new Set(rows.map(r => String(r.itemCode ?? '').trim()).filter(Boolean))];
    if (!codes.length) return;
    setCheckingDups(true);
    fetch('/api/items/check-codes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemCodes: codes }),
    })
      .then(r => r.json())
      .then(json => {
        const map = {};
        (json.existing ?? []).forEach(({ code, name }) => { map[code] = name; });
        setDupMap(map);
      })
      .catch(() => {})
      .finally(() => setCheckingDups(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ── Upload handlers ── */
  const processFile = useCallback(file => {
    setParseError('');
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setParseError('Please upload only .xlsx or .xls files');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raws = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const hdrs = (XLSX.utils.sheet_to_json(ws, { header: 1 })[0] ?? []).map(String);
        setFileInfo({ name: file.name, size: file.size });
        setRawRows(raws);
        setHeaders(hdrs);
      } catch {
        setParseError('Failed to parse the file. Make sure it matches the expected format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop      = e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };
  const handleFileInput = e => processFile(e.target.files[0]);
  const clearFile       = () => {
    setFileInfo(null); setRawRows(null); setHeaders([]); setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const goToMapping = () => {
    setMapping(autoMatch(headers));
    setMappingError('');
    setStep('mapping');
  };

  /* ── Mapping step handlers ── */
  const setField = (key, val) => setMapping(m => ({ ...m, [key]: val }));

  const handleProceed = () => {
    if (!mapping.itemName) {
      setMappingError('Item Name is required. Please map it.');
      return;
    }
    setMappingError('');
    const mapped = applyMapping(rawRows, mapping).filter(r => String(r.itemName ?? '').trim());
    setRows(mapped);
    setDupMap({});
    setStep('verify');
  };

  /* ── Verify handlers ── */
  const errors     = validate(rows);
  const updateCell = (rowIdx, key, val) =>
    setRows(rs => rs.map((r, i) => i === rowIdx ? { ...r, [key]: val } : r));
  const removeRow  = idx => setRows(rs => rs.filter((_, i) => i !== idx));

  const handleImport = async () => {
    if (Object.keys(errors).length) return;
    setLoading(true);
    setApiError('');
    try {
      const res  = await fetch('/api/items/bulk-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items: rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setImported({ count: json.imported });
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════
     SUCCESS SCREEN
  ══════════════════════════════ */
  if (imported) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center gap-6">
        <CheckCircle2 size={72} className="text-green-500" />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">Import Successful!</p>
          <p className="text-gray-500 mt-1">
            {imported.count} item{imported.count !== 1 ? 's' : ''} were imported into your inventory.
          </p>
        </div>
        <button
          onClick={() => navigate('/items')}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-2.5 rounded-full transition"
        >
          Go to Items
        </button>
      </div>
    );
  }

  /* ══════════════════════════════
     VERIFY STEP
  ══════════════════════════════ */
  if (step === 'verify') {
    const hasErrors  = Object.keys(errors).length > 0;
    const emptied    = rows.length === 0;
    const dupEntries = Object.entries(dupMap);
    const dupCodeSet = new Set(Object.keys(dupMap));

    return (
      <div className="flex flex-col h-screen bg-gray-50">

        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Import Items From Excel File</h1>
        </div>

        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Verify &amp; Import
              {fileInfo && (
                <span className="ml-2 text-xs font-normal text-gray-400">— {fileInfo.name}</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Review all rows before importing. Inline editing is supported.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
              ${rows.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              {rows.length} row{rows.length !== 1 ? 's' : ''}
            </span>
            {hasErrors && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                <AlertCircle size={11} />
                {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''}
              </span>
            )}
            {checkingDups && <span className="text-xs text-gray-400 italic">Checking duplicates…</span>}
            {!checkingDups && dupEntries.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle size={11} />
                {dupEntries.length} duplicate{dupEntries.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {apiError && (
          <div className="shrink-0 mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
            {apiError}
          </div>
        )}

        {dupEntries.length > 0 && (
          <div className="shrink-0 mx-6 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-2">
              <AlertTriangle size={14} />
              {dupEntries.length} item code{dupEntries.length !== 1 ? 's' : ''} already exist in your inventory
            </p>
            <p className="text-xs text-amber-600 mb-2">
              Import is <strong>blocked</strong> until these are resolved. Remove the duplicate rows or change their item codes to proceed.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dupEntries.map(([code, name]) => (
                <span key={code}
                  className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-mono rounded px-2 py-0.5">
                  {code}
                  <span className="text-amber-500 font-sans font-normal">— {name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {emptied && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <AlertCircle size={40} className="text-gray-300" />
            <p className="text-sm">All rows removed. Go back to re-upload or adjust the mapping.</p>
            <button onClick={() => navigate(-1)}
              className="text-sm text-blue-500 underline hover:text-blue-700 transition">
              ← Back to field mapping
            </button>
          </div>
        )}

        {!emptied && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-blue-600 text-white">
                <tr>
                  <th className="px-2 py-2.5 text-center font-semibold w-10 border-r border-blue-500">#</th>
                  {COLS.map(c => (
                    <th key={c.key}
                      className={`px-2 py-2.5 text-left font-semibold whitespace-nowrap border-r border-blue-500 ${c.width}`}>
                      {c.label}{c.required && <span className="text-red-300 ml-0.5">*</span>}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowError = errors[i];
                  const isDup    = dupCodeSet.has(String(row.itemCode ?? '').trim());
                  return (
                    <tr key={i}
                      className={`border-b border-gray-100 ${
                        rowError ? 'bg-red-50' : isDup ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                      <td className="px-2 py-1 text-center text-gray-400 font-mono border-r border-gray-100 align-middle">
                        {rowError
                          ? <AlertCircle   size={12} className="text-red-400   mx-auto" />
                          : isDup
                          ? <AlertTriangle size={12} className="text-amber-500 mx-auto" />
                          : i + 1}
                      </td>
                      {COLS.map(c => (
                        <td key={c.key} className="p-0 border-r border-gray-100">
                          <input
                            type={c.num ? 'number' : 'text'}
                            value={row[c.key] ?? ''}
                            onChange={e => updateCell(i, c.key, e.target.value)}
                            className={`w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none
                              focus:bg-blue-50 rounded placeholder:text-gray-300
                              ${c.num ? 'text-right' : ''}
                              ${c.key === 'itemName' && rowError ? 'text-red-600 placeholder:text-red-300' : 'text-gray-700'}`}
                            placeholder={c.required ? 'Required' : '—'}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center align-middle">
                        <button onClick={() => removeRow(i)}
                          className="p-1 text-rose-400 hover:text-rose-600 transition rounded">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {hasErrors
              ? 'Fix the highlighted errors before importing.'
              : dupEntries.length > 0
              ? `Remove or fix the ${dupEntries.length} duplicate item code${dupEntries.length !== 1 ? 's' : ''} to proceed.`
              : `${rows.length} item${rows.length !== 1 ? 's' : ''} ready to import.`}
          </p>
          <button
            onClick={handleImport}
            disabled={loading || emptied || hasErrors || dupEntries.length > 0}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300
              disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5
              rounded-full transition"
          >
            {loading ? 'Importing…' : 'Import Items'}
          </button>
        </div>

      </div>
    );
  }

  /* ══════════════════════════════
     UPLOAD STEP
  ══════════════════════════════ */
  if (step === 'upload') {
    return (
      <div className="flex flex-col h-screen bg-gray-50">

        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-1 text-gray-500 hover:text-gray-700 rounded transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Import Items From Excel File</h1>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT PANEL */}
          <div className="w-[580px] shrink-0 border-r border-gray-200 bg-white overflow-y-auto px-8 py-6 space-y-7">
            <p className="text-base font-bold text-gray-800">Steps to Import</p>

            <div className="space-y-3">
              <p className="text-red-500 font-bold text-sm tracking-wide">STEP 1</p>
              <p className="text-sm text-gray-500">Create an Excel file with the following format.</p>
              <button onClick={downloadSample}
                className="border border-blue-500 text-blue-500 rounded px-4 py-1.5 text-sm hover:bg-blue-50 transition">
                Download Sample
              </button>
              <div className="overflow-x-auto rounded-lg border border-gray-200 mt-3">
                <table className="text-[10px] border-collapse w-full">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      {SAMPLE_HEADERS.map(h => (
                        <th key={h} className="px-1.5 py-1 border border-blue-500 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-1.5 py-1 border border-gray-200 whitespace-nowrap text-gray-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-red-500 font-bold text-sm tracking-wide">STEP 2</p>
              <p className="text-sm text-gray-500">
                <Upload size={13} className="inline mr-1 text-gray-400" />
                Upload the file (<strong>.xlsx or .xls</strong>) by clicking on the Upload File button below.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-red-500 font-bold text-sm tracking-wide">STEP 3</p>
              <p className="text-sm text-gray-500">Verify the items from the file &amp; complete the import.</p>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col items-center justify-start pt-10 px-10 overflow-y-auto">
            <p className="text-sm text-gray-500 mb-5">
              Upload your <strong>.xls/ .xlsx</strong> (excel sheet)
            </p>

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />

            {parseError && (
              <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {parseError}
              </p>
            )}

            {fileInfo && rawRows ? (
              <div className="w-full max-w-md bg-white border-2 border-green-300 rounded-xl p-8 flex flex-col items-center gap-4 shadow-sm">
                <CheckCircle size={56} className="text-green-500" />
                <p className="text-green-600 font-bold text-lg">File uploaded successfully!</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800">{fileInfo.name}</p>
                    <p className="text-gray-400 text-xs">{fmtBytes(fileInfo.size)} · {rawRows.length} rows found</p>
                  </div>
                </div>
                <button onClick={clearFile} className="text-xs text-red-400 hover:text-red-600 underline transition">
                  Remove &amp; re-upload
                </button>
                <div className="flex gap-3 mt-2">
                  <button onClick={goToMapping}
                    className="border border-blue-500 text-blue-500 hover:bg-blue-50 rounded-full px-6 py-2 text-sm font-semibold transition">
                    Preview Data
                  </button>
                  <button onClick={goToMapping}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2 text-sm font-semibold transition">
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`w-full max-w-lg h-72 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all duration-150 cursor-pointer
                  ${dragging
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadIcon />
                <p className="text-gray-400 text-lg">Drag &amp; Drop files here</p>
                <p className="text-gray-400 text-xs">or</p>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition shadow-sm"
                >
                  <Upload size={15} />
                  Upload File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════
     MAPPING STEP
  ══════════════════════════════ */
  if (step === 'mapping') {
    return (
      <div className="flex flex-col h-screen bg-gray-50">

        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
          <button onClick={() => setStep('upload')}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Import Items From Excel File</h1>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6 pb-24">
          <p className="text-sm text-gray-500 mb-1">Map your fields to SuperMart's fields</p>
          <p className="text-base font-bold text-gray-800 mb-4">Item Details</p>

          {!headers.length && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700 mb-4">
              No file data found. Please go back and upload an Excel file first.
            </div>
          )}

          {mappingError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {mappingError}
            </p>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-3 text-left w-72 border-r border-blue-100">
                    Fields available in SuperMart
                  </th>
                  <th className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-3 text-left">
                    Select your field
                  </th>
                </tr>
              </thead>
              <tbody>
                {APP_FIELDS.map((field, i) => (
                  <tr key={field.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 border-b border-r border-gray-100 text-sm text-gray-600 w-72 whitespace-nowrap">
                      {field.label}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="relative max-w-sm">
                        <select
                          value={mapping[field.key] ?? ''}
                          onChange={e => setField(field.key, e.target.value)}
                          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700
                            appearance-none focus:outline-none focus:border-blue-400 bg-white pr-8 cursor-pointer"
                        >
                          <option value="">-- Not Mapped --</option>
                          {headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={handleProceed}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded px-8 py-2.5 text-sm font-semibold transition"
          >
            Proceed
          </button>
        </div>

      </div>
    );
  }

  /* ══════════════════════════════
     SELECT STEP (default)
  ══════════════════════════════ */
  const cardBase       = 'relative flex flex-col items-center p-6 bg-white rounded-xl cursor-pointer transition-all duration-150';
  const cardSelected   = 'border-2 border-blue-500 shadow-md';
  const cardUnselected = 'border border-gray-200 hover:shadow-sm';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Import Items</h1>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full mt-8 px-4 pb-28">
        <p className="text-xl font-bold text-gray-800 text-center mb-6">Select Import Method</p>

        <div className="grid grid-cols-2 gap-4 mb-6">

          <div
            className={`${cardBase} ${selected === 'barcode' ? cardSelected : cardUnselected}`}
            onClick={() => setSelected('barcode')}
          >
            <span className="absolute top-3 left-3 bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
              RECOMMENDED
            </span>
            <div className="absolute top-3 right-3"><Radio selected={selected === 'barcode'} /></div>
            <div className="bg-blue-50 rounded-full p-5 w-24 h-24 flex items-center justify-center mt-6 mb-4">
              <BarcodeIcon />
            </div>
            <p className="font-bold text-gray-800 text-sm mb-2 text-center">Import From Barcode</p>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Import item details by scanning barcodes. SuperMart uses a library of 100 Mn+ standard
              barcodes to fetch all details of your items in seconds.
            </p>
          </div>

          <div
            className={`${cardBase} ${selected === 'excel' ? cardSelected : cardUnselected}`}
            onClick={() => setSelected('excel')}
          >
            <div className="absolute top-3 right-3"><Radio selected={selected === 'excel'} /></div>
            <div className="bg-blue-50 rounded-full p-5 w-24 h-24 flex items-center justify-center mt-6 mb-4">
              <ExcelIcon />
            </div>
            <p className="font-bold text-gray-800 text-sm mb-2 text-center">Import From Excel</p>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Import item data from excel files in your system
            </p>
          </div>

        </div>

        <div className="flex items-center gap-4 my-5">
          <hr className="flex-1 border-gray-300" />
          <span className="text-gray-400 text-sm">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <div
          className={`flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer transition-all duration-150 ${
            selected === 'library' ? 'border-2 border-blue-500 shadow-md' : 'border border-gray-200 hover:shadow-sm'
          }`}
          onClick={() => setSelected('library')}
        >
          <div>
            <p className="font-bold text-gray-800 text-sm">Import From SuperMart Library</p>
            <p className="text-xs text-gray-500 mt-0.5">Import items from SuperMart's database</p>
          </div>
          <Radio selected={selected === 'library'} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end">
        <button
          onClick={() => {
            if (selected === 'excel')   setStep('upload');
            else if (selected === 'barcode') navigate('/utilities/barcode');
            else if (selected === 'library') navigate('/items/import/library');
          }}
          disabled={!selected}
          className={`px-8 py-2.5 rounded-full font-semibold text-sm transition ${
            selected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>

    </div>
  );
}
