import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, Settings, X, ChevronDown, Clock,
  FileText, Camera, Search,
} from 'lucide-react';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';

const PAYMENT_TYPES_FALLBACK = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];

const pad = (n) => String(n).padStart(2, '0');

function fmtTime(d) {
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/* YYYY-MM-DD from Date */
function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


/* Convert editData.displayDate (DD/MM/YYYY) → YYYY-MM-DD */
function dmyToYmd(s) {
  if (!s) return '';
  const [d, m, y] = s.split('/');
  return `${y}-${pad(m)}-${pad(d)}`;
}

/* ── Floating label select ── */
function FloatSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition"
      >
        <option value="" disabled hidden />
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <label className={`absolute left-3 pointer-events-none transition-all duration-150
        ${value
          ? 'top-2 text-xs text-slate-500'
          : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'}
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-blue-600`}>
        {label}
      </label>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

/* ── Party search combobox ── */
function PartySearch({ value, query, onQueryChange, onSelect, parties }) {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = query.toLowerCase();
  const filtered = q.length === 0
    ? parties
    : parties.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q),
      );

  const handleInput = (e) => {
    onQueryChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (p) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="Search party by name or phone *"
          className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-3 text-sm text-slate-800
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition
            placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => { onQueryChange(''); onSelect(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 transition
                ${String(p.id) === value ? 'bg-blue-50' : ''}`}
            >
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
              {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}

      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3">
          <span className="text-sm text-slate-400">No parties found</span>
        </div>
      )}
    </div>
  );
}

/* ── Info row ── */
function InfoRow({ label, children, border = true }) {
  return (
    <div className={`flex items-center justify-between py-2 ${border ? 'border-b border-slate-100' : ''}`}>
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PaymentInModal
   Props:
     receiptNo  – number | null
     editData   – object | null
     onClose    – fn
     onSave     – fn(form)
     isSaving   – bool
══════════════════════════════════════════ */
export default function PaymentInModal({ receiptNo, editData, onClose, onSave, isSaving }) {
  const now    = new Date();
  const isEdit = Boolean(editData);

  const [form, setForm] = useState(() => ({
    party:       editData ? String(editData.partyId ?? '') : '',
    paymentType: editData?.paymentType ?? 'Cash',
    received:    editData ? String(editData.received) : '',
    discount:    editData ? String(editData.discount ?? 0) : '',
    date:        editData?.displayDate ? dmyToYmd(editData.displayDate) : ymd(now),
    time:        editData?.displayTime ?? fmtTime(now),
    notes:       editData?.notes ?? '',
  }));

  /* Party search state (separate from form.party which holds the ID) */
  const [partyQuery, setPartyQuery] = useState(editData?.party ?? '');
  const [showDesc,   setShowDesc]   = useState(Boolean(editData?.notes));

  /* Entry date — auto from createdAt (edit) or now (new); not editable */
  const entryDateDisplay = (() => {
    const d = isEdit && editData.entryDate ? new Date(editData.entryDate) : now;
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${h}:${m} ${ampm}`;
  })();

  const { data: parties = [] }    = useQuery({ queryKey: ['parties'],        queryFn: PartiesAPI.getAll });
  const { data: payOptions = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });
  const PAYMENT_TYPES = payOptions.length ? payOptions.map(o => o.name) : PAYMENT_TYPES_FALLBACK;

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handlePartySelect = (p) => {
    if (!p) {
      setPartyQuery('');
      setForm(prev => ({ ...prev, party: '' }));
    } else {
      setPartyQuery(p.name);
      setForm(prev => ({ ...prev, party: String(p.id) }));
    }
  };

  const total  = Math.max(0, Number(form.received || 0) - Number(form.discount || 0));
  const fmtNum = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  /* Pass YYYY-MM-DD date directly — PaymentIn.jsx handleSave uses it as-is */
  const handleSave = () => onSave?.({ ...form });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'Edit Payment-In' : 'Payment-In'}
          </h2>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Calculator size={16} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Settings size={16} />
            </button>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <div className="flex gap-6">

            {/* LEFT */}
            <div className="flex-1 space-y-3">

              {/* Party search */}
              <PartySearch
                value={form.party}
                query={partyQuery}
                onQueryChange={setPartyQuery}
                onSelect={handlePartySelect}
                parties={parties}
              />

              {/* Payment type */}
              <FloatSelect
                label="Payment Type"
                value={form.paymentType}
                onChange={setF('paymentType')}
                options={PAYMENT_TYPES}
              />

              {/* Description toggle */}
              {showDesc ? (
                <div className="relative">
                  <textarea
                    autoFocus
                    value={form.notes}
                    onChange={setF('notes')}
                    rows={3}
                    placeholder="Add a description…"
                    className="w-full border border-blue-400 rounded-lg px-3 py-2.5 text-sm text-slate-800
                      focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none transition
                      placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowDesc(false); setForm(p => ({ ...p, notes: '' })); }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    title="Remove description"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDesc(true)}
                  className="flex items-center gap-2 w-full border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
                >
                  <FileText size={15} /> ADD DESCRIPTION
                </button>
              )}

              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition">
                <Camera size={16} />
              </button>
            </div>

            {/* RIGHT */}
            <div className="w-64 shrink-0">
              <InfoRow label="Receipt No">
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {receiptNo != null ? `#${receiptNo}` : 'Auto'}
                </span>
              </InfoRow>

              {/* Pay In Date — editable via calendar or keyboard */}
              <InfoRow label="Pay In Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={setF('date')}
                  className="text-xs font-bold text-slate-800 border border-slate-200 rounded-md
                    px-2 py-0.5 focus:outline-none focus:border-blue-400 bg-white cursor-pointer"
                />
              </InfoRow>

              {/* Pay In Entry Date — read-only system timestamp */}
              <InfoRow label="Pay In Entry Date">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    {entryDateDisplay}
                  </span>
                  <Clock size={12} className="text-slate-400 shrink-0" />
                </div>
              </InfoRow>

              <div className="h-4" />

              {/* Received */}
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 shrink-0">Received</span>
                <input
                  type="number" min="0"
                  value={form.received}
                  onChange={setF('received')}
                  placeholder="0"
                  className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right text-slate-800
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition"
                />
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 shrink-0">Discount</span>
                <input
                  type="number" min="0"
                  value={form.discount}
                  onChange={setF('discount')}
                  placeholder="0"
                  className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right text-slate-800
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-bold text-slate-700">Total</span>
                <span className="text-xl font-bold text-blue-600">{fmtNum(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Print
            </button>
            <div className="w-px bg-slate-300" />
            <button className="px-2.5 py-2 text-slate-500 hover:bg-slate-50 transition">
              <ChevronDown size={14} />
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !form.party}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
