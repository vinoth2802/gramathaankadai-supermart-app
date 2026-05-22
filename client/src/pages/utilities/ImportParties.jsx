import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, Trash2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

/* ── Sample template ── */
const TEMPLATE_HEADERS = [
  'Party Name*', 'Party Type', 'Phone', 'Email',
  'GST Number', 'PAN Number', 'Opening Balance', 'Balance Type (Dr/Cr)',
  'Address', 'City', 'State', 'Pincode',
];
const TEMPLATE_ROWS = [
  ['ABC Traders',   'Customer', '9876543210', 'abc@example.com', '29ABCDE1234F1Z5', 'ABCDE1234F', 5000,  'Dr', '12 Main St', 'Bangalore', 'Karnataka',   '560001'],
  ['XYZ Suppliers', 'Supplier', '9123456780', 'xyz@example.com', '27XYZAB5678G2Z1', 'XYZAB5678G', 12000, 'Cr', '45 Park Ave', 'Mumbai',    'Maharashtra', '400001'],
  ['PQR Wholesale', 'Customer', '9001234567', '',                '',                '',            0,     'Dr', '',           'Chennai',   'Tamil Nadu',  '600001'],
];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parties');
  XLSX.writeFile(wb, 'sample_import_parties.xlsx');
}

function fmtBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/* ── Icons ── */
function XlsIcon() {
  return (
    <svg viewBox="0 0 100 120" className="w-32 h-40 drop-shadow-md">
      <rect x="5" y="15" width="75" height="95" rx="4" fill="#2196F3" />
      <polygon points="65,15 80,30 65,30" fill="#1565C0" />
      <text x="20" y="75" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">xls</text>
      <rect x="12" y="108" width="72" height="8" rx="4" fill="#90CAF9" opacity="0.5" />
    </svg>
  );
}

function UploadDocIcon() {
  return (
    <svg viewBox="0 0 120 140" className="w-36 h-44 mx-auto">
      <rect x="20" y="20" width="90" height="110" rx="8" fill="#BDBDBD" opacity="0.4" />
      <rect x="10" y="10" width="90" height="110" rx="8" fill="#2196F3" />
      <polygon points="75,10 100,35 75,35" fill="#1565C0" />
      <polygon points="55,45 55,75 45,75 55,90 65,75 65,45" fill="white" />
      <rect x="35" y="92" width="50" height="4" rx="2" fill="white" opacity="0.8" />
      <rect x="40" y="100" width="40" height="4" rx="2" fill="white" opacity="0.6" />
      <rect x="45" y="108" width="30" height="4" rx="2" fill="white" opacity="0.4" />
    </svg>
  );
}

function GreenCheckIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto">
      <circle cx="32" cy="32" r="30" fill="#4CAF50" />
      <polyline points="18,33 27,43 46,22" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Verify step columns ── */
const COLS = [
  { key: 'partyName',   label: 'Party Name',     required: true,  width: 'min-w-[160px]' },
  { key: 'partyType',   label: 'Party Type',      required: false, width: 'min-w-[100px]' },
  { key: 'phone',       label: 'Phone',           required: false, width: 'min-w-[110px]' },
  { key: 'email',       label: 'Email',           required: false, width: 'min-w-[160px]' },
  { key: 'gstin',       label: 'GST Number',      required: false, width: 'min-w-[130px]' },
  { key: 'pan',         label: 'PAN Number',      required: false, width: 'min-w-[110px]' },
  { key: 'openingBal',  label: 'Opening Balance', required: false, width: 'min-w-[120px]', num: true },
  { key: 'balanceType', label: 'Bal. Type',       required: false, width: 'min-w-[80px]'  },
  { key: 'address',     label: 'Address',         required: false, width: 'min-w-[160px]' },
  { key: 'city',        label: 'City',            required: false, width: 'min-w-[90px]'  },
  { key: 'state',       label: 'State',           required: false, width: 'min-w-[90px]'  },
  { key: 'pincode',     label: 'Pincode',         required: false, width: 'min-w-[80px]'  },
];

function validate(rows) {
  const errors = {};
  rows.forEach((row, i) => {
    if (!String(row.partyName ?? '').trim()) errors[i] = 'Party Name is required';
  });
  return errors;
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
export default function ImportParties() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  /* step: 'upload' | 'verify' */
  const [step, setStep] = useState('upload');

  /* ── Upload step ── */
  const [fileInfo,  setFileInfo]  = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [fileError, setFileError] = useState('');

  /* ── Verify step ── */
  const [rows, setRows] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [imported,     setImported]     = useState(null);
  const [apiError,     setApiError]     = useState('');
  const [dupMap,       setDupMap]       = useState({});
  const [checkingDups, setCheckingDups] = useState(false);

  /* Check duplicates when entering verify */
  useEffect(() => {
    if (step !== 'verify') return;
    const names = [...new Set(rows.map(r => String(r.partyName ?? '').trim()).filter(Boolean))];
    if (!names.length) return;
    setCheckingDups(true);
    fetch('/api/parties/check-names', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ names }),
    })
      .then(r => r.json())
      .then(json => {
        const map = {};
        (json.existing ?? []).forEach(n => { map[n] = true; });
        setDupMap(map);
      })
      .catch(() => {})
      .finally(() => setCheckingDups(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ── Upload handlers ── */
  const processFile = useCallback(file => {
    setFileError('');
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setFileError('Please upload .xlsx or .xls file only');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb      = XLSX.read(e.target.result, { type: 'array' });
        const ws      = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const s = v => String(v ?? '').trim();
        const mapped = rawRows
          .map(row => ({
            partyName:   s(row['Party Name*'] ?? row['Party Name']),
            partyType:   s(row['Party Type']),
            phone:       s(row['Phone']),
            email:       s(row['Email']),
            gstin:       s(row['GST Number']),
            pan:         s(row['PAN Number']),
            openingBal:  row['Opening Balance'] ?? '',
            balanceType: s(row['Balance Type (Dr/Cr)'] ?? row['Balance Type']),
            address:     s(row['Address']),
            city:        s(row['City']),
            state:       s(row['State']),
            pincode:     s(row['Pincode']),
          }))
          .filter(r => r.partyName);
        setFileInfo({ name: file.name, size: file.size });
        setRows(mapped);
        setDupMap({});
        setStep('verify');
      } catch {
        setFileError('Failed to parse the file. Make sure it is a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop      = e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };
  const handleFileInput = e => processFile(e.target.files[0]);

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
      const res  = await fetch('/api/parties/bulk-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ parties: rows }),
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
            {imported.count} part{imported.count !== 1 ? 'ies' : 'y'} imported into your directory.
          </p>
        </div>
        <button
          onClick={() => navigate('/parties')}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-2.5 rounded-full transition"
        >
          Go to Parties
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
    const dupEntries = Object.keys(dupMap);
    const dupNameSet = new Set(dupEntries);

    return (
      <div className="flex flex-col h-screen bg-gray-50">

        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
          <button onClick={() => setStep('upload')}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Import Parties From Excel File</h1>
        </div>

        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Verify &amp; Import
              {fileInfo && <span className="ml-2 text-xs font-normal text-gray-400">— {fileInfo.name}</span>}
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
              {dupEntries.length} part{dupEntries.length !== 1 ? 'ies' : 'y'} already exist in your directory
            </p>
            <p className="text-xs text-amber-600 mb-2">
              Import is <strong>blocked</strong> until these are resolved. Remove the duplicate rows or rename them to proceed.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dupEntries.map(name => (
                <span key={name}
                  className="inline-flex items-center bg-amber-100 border border-amber-300 text-amber-800 text-xs font-mono rounded px-2 py-0.5">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {emptied && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <AlertCircle size={40} className="text-gray-300" />
            <p className="text-sm">All rows removed. Go back to re-upload the file.</p>
            <button onClick={() => setStep('upload')}
              className="text-sm text-blue-500 underline hover:text-blue-700 transition">
              ← Back to upload
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
                  const isDup    = dupNameSet.has(String(row.partyName ?? '').trim());
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
                              ${c.key === 'partyName' && rowError ? 'text-red-600 placeholder:text-red-300' : 'text-gray-700'}`}
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
              ? `Remove or fix the ${dupEntries.length} duplicate part${dupEntries.length !== 1 ? 'ies' : 'y'} to proceed.`
              : `${rows.length} part${rows.length !== 1 ? 'ies' : 'y'} ready to import.`}
          </p>
          <button
            onClick={handleImport}
            disabled={loading || emptied || hasErrors || dupEntries.length > 0}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300
              disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5
              rounded-full transition"
          >
            {loading ? 'Importing…' : 'Import Parties'}
          </button>
        </div>

      </div>
    );
  }

  /* ══════════════════════════════
     UPLOAD STEP (default)
  ══════════════════════════════ */
  return (
    <div className="flex flex-col h-screen bg-white">

      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-gray-700 font-medium text-base">Import Excel</h2>
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Download template */}
        <div className="w-[300px] shrink-0 flex flex-col items-center justify-center px-8 py-10 gap-6">
          <p className="text-gray-500 text-sm text-center leading-relaxed">
            Download .xls/.xlsx (excel sheet)<br />template file to enter Data
          </p>
          <XlsIcon />
          <button
            onClick={downloadTemplate}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded px-8 py-2 font-medium text-sm transition"
          >
            Download
          </button>
        </div>

        <div className="border-r border-gray-200 shrink-0" />

        {/* RIGHT: Upload zone */}
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10 gap-5">
          <p className="text-gray-500 text-sm text-center">
            Upload your .xls/ .xlsx (excel sheet)
          </p>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />

          {fileError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {fileError}
            </p>
          )}

          {fileInfo ? (
            <div className="w-full max-w-[500px] h-[340px] rounded-xl border-2 border-dashed border-green-300 bg-green-50
              flex flex-col items-center justify-center gap-3">
              <GreenCheckIcon />
              <p className="font-semibold text-gray-800 text-sm">{fileInfo.name}</p>
              <p className="text-gray-400 text-xs">{fmtBytes(fileInfo.size)}</p>
              <button
                onClick={() => { setFileInfo(null); setFileError(''); fileInputRef.current?.click(); }}
                className="text-blue-500 text-sm underline hover:text-blue-700 transition mt-1"
              >
                Change File
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-[500px] h-[340px] rounded-xl border-2 border-dashed flex flex-col
                items-center justify-center gap-3 cursor-pointer transition-all duration-150
                ${dragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-100 hover:border-blue-300 hover:bg-blue-50'}`}
            >
              <UploadDocIcon />
              <p className="text-sm text-gray-500 text-center">
                Drag and drop or{' '}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Click here to Browse
                </button>
              </p>
              <p className="text-sm text-gray-400 text-center -mt-1">
                formatted excel file to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
