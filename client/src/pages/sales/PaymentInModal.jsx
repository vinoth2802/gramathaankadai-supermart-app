import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, Settings, X, ChevronDown, Calendar, Clock,
  FileText, Camera,
} from 'lucide-react';
import { PartiesAPI } from '../../api/parties.js';

const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];

function fmtDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function FloatSelect({ label, value, onChange, options, required = false, disabled = false }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition
          disabled:bg-slate-50 disabled:text-slate-500"
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
        {label}{required && ' *'}
      </label>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

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
     receiptNo  – string, passed by parent (sequential)
     editData   – object | null; if set, pre-fills the form in edit mode
     onClose    – fn
     onSave     – fn(form)
     isSaving   – bool
══════════════════════════════════════════ */
export default function PaymentInModal({ receiptNo, editData, onClose, onSave, isSaving }) {
  const now  = new Date();
  const isEdit = Boolean(editData);

  const [form, setForm] = useState(() => ({
    party:       editData ? String(editData.partyId ?? '') : '',
    paymentType: editData?.paymentType ?? 'Cash',
    received:    editData ? String(editData.received) : '',
    discount:    editData ? String(editData.discount ?? 0) : '',
    date:        editData?.displayDate ?? fmtDate(now),
    time:        editData?.displayTime ?? fmtTime(now),
  }));

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const total  = Math.max(0, Number(form.received || 0) - Number(form.discount || 0));
  const fmtNum = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

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
              <FloatSelect
                label="Party"
                required
                value={form.party}
                onChange={setF('party')}
                options={parties.map(p => ({ value: String(p.id), label: p.name }))}
              />
              <FloatSelect
                label="Payment Type"
                value={form.paymentType}
                onChange={setF('paymentType')}
                options={PAYMENT_TYPES}
              />
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                + Add Payment type
              </button>
              <button className="flex items-center gap-2 w-full border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition">
                <FileText size={15} /> ADD DESCRIPTION
              </button>
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
              <InfoRow label="Date">
                <span className="text-xs font-bold text-slate-800">{form.date}</span>
                <Calendar size={12} className="text-slate-400" />
              </InfoRow>
              <InfoRow label="Time">
                <span className="text-xs font-bold text-slate-800">{form.time}</span>
                <Clock size={12} className="text-slate-400" />
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
            onClick={() => onSave?.(form)}
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
