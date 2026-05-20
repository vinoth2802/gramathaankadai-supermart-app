import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Check } from 'lucide-react';

const OPTIONS = [
  'All Payment-In Invoices',
  'This Month',
  'Last Month',
  'This Quarter',
  'This Year',
  'Custom',
];

const pad = (n) => String(n).padStart(2, '0');

function fmtDate(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function toInputVal(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromInputVal(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function getAutoRange(label) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  switch (label) {
    case 'This Month':
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case 'Last Month':
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    case 'This Quarter': {
      const q = Math.floor(m / 3);
      return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0) };
    }
    case 'This Year':
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    default:
      return { from: null, to: null };
  }
}

/* ══════════════════════════════════════════
   DateFilterDropdown
   Props:
     defaultValue – string option label (default: 'This Month')
     onChange     – fn({ label, from, to }) called on every change
══════════════════════════════════════════ */
export default function DateFilterDropdown({ defaultValue = 'This Month', onChange }) {
  const [selected,    setSelected]    = useState(defaultValue);
  const [open,        setOpen]        = useState(false);
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const containerRef = useRef(null);

  /* ── Notify parent on mount with initial range ── */
  useEffect(() => {
    const range = getAutoRange(defaultValue);
    onChange?.({ label: defaultValue, ...range });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isCustom  = selected === 'Custom';
  const autoRange = isCustom ? null : getAutoRange(selected);
  const from      = isCustom ? fromInputVal(customFrom) : autoRange?.from;
  const to        = isCustom ? fromInputVal(customTo)   : autoRange?.to;
  const showRange = selected !== 'All Payment-In Invoices';

  const handleSelect = (opt) => {
    setSelected(opt);
    setOpen(false);
    const range = opt === 'Custom'
      ? { label: opt, from: fromInputVal(customFrom), to: fromInputVal(customTo) }
      : { label: opt, ...getAutoRange(opt) };
    onChange?.(range);
  };

  const handleCustomFrom = (val) => {
    setCustomFrom(val);
    onChange?.({ label: 'Custom', from: fromInputVal(val), to: fromInputVal(customTo) });
  };

  const handleCustomTo = (val) => {
    setCustomTo(val);
    onChange?.({ label: 'Custom', from: fromInputVal(customFrom), to: fromInputVal(val) });
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2">

      {/* ── Trigger button ── */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition whitespace-nowrap"
        >
          {selected}
          <ChevronDown
            size={13}
            className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* ── Dropdown menu ── */}
        {open && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px] z-50 overflow-hidden">
            {OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition"
              >
                <span className={selected === opt ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                  {opt}
                </span>
                {selected === opt && <Check size={14} className="text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Date range display / inputs ── */}
      {showRange && (
        <div className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 bg-white text-sm">
          <Calendar size={13} className="text-gray-400 shrink-0" />

          {isCustom ? (
            /* Editable date inputs for Custom */
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => handleCustomFrom(e.target.value)}
                className="text-xs text-gray-700 border-none outline-none bg-transparent w-[105px] cursor-pointer"
              />
              <span className="text-gray-400 text-xs">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => handleCustomTo(e.target.value)}
                className="text-xs text-gray-700 border-none outline-none bg-transparent w-[105px] cursor-pointer"
              />
            </div>
          ) : from && to ? (
            /* Auto-calculated read-only range */
            <span className="text-xs text-gray-700 whitespace-nowrap">
              {fmtDate(from)} To {fmtDate(to)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
