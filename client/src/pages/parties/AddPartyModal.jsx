import { useState } from 'react';
import { Settings, X, ChevronDown, Info } from 'lucide-react';

const TABS = ['GST & Address', 'Credit & Balance', 'Additional Fields'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const GST_TYPES = ['Unregistered/Consumer', 'B2B Regular', 'B2B Composition'];
const PARTY_GROUPS = ['Customer', 'Supplier', 'Both'];

const today = new Date().toISOString().split('T')[0];

const EMPTY = {
  name: '', gstin: '', phone: '', partyGroup: '',
  gstType: 'Unregistered/Consumer', state: '', email: '',
  billingAddress: '', shippingAddress: '',
  openingBalance: '', asOfDate: '2026-04-01',
  loyaltyOpeningBalance: '', loyaltyAsOfDate: '2026-05-19',
  notes: '',
  contactPerson: '', website: '', customField1: '', customField2: '',
};

/* ── Floating label input ── */
function FloatInput({ label, type = 'text', value, onChange, className = '', ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        {...rest}
      />
      <label className="absolute left-3 top-2 text-xs text-slate-500 pointer-events-none transition-all duration-150
        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-blue-600">
        {label}
      </label>
    </div>
  );
}

/* ── Floating label select ── */
function FloatSelect({ label, value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition"
      >
        <option value="" disabled hidden></option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
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

/* ── Floating label textarea ── */
function FloatTextarea({ label, value, onChange, rows = 4, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value}
        onChange={onChange}
        placeholder=" "
        rows={rows}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-6 pb-2 text-sm text-slate-800 bg-white resize-none
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
      />
      <label className="absolute left-3 top-2 text-xs text-slate-500 pointer-events-none transition-all duration-150
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400
        peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600">
        {label}
      </label>
    </div>
  );
}

/* ── Floating label date input (label always pinned at top) ── */
function FloatDate({ label, value, onChange, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
      />
      <label className="absolute left-3 top-2 text-xs text-blue-600 pointer-events-none">
        {label}
      </label>
    </div>
  );
}

/* ══════════════════════════════════════════
   AddPartyModal
══════════════════════════════════════════ */
export default function AddPartyModal({ editData, onClose, onSave, onSaveAndNew, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY, ...(editData ?? {}) });
  const [tab, setTab] = useState(0);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const f = (k) => (e) => setF(k, e.target.value);

  const handleSave = (andNew = false) => {
    if (!form.name.trim()) return;
    andNew ? onSaveAndNew?.(form) : onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {editData ? 'Edit Party' : 'Add Party'}
          </h2>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Settings size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">

          {/* Top row: 3 inputs */}
          <div className="grid grid-cols-3 gap-3">
            <FloatInput label="Party Name *" value={form.name} onChange={f('name')} />
            <FloatInput label="GSTIN" value={form.gstin} onChange={f('gstin')} />
            <FloatInput label="Mobile Number" value={form.phone} onChange={f('phone')} type="tel" />
          </div>

          {/* Party Group */}
          <FloatSelect
            label="Party Group"
            value={form.partyGroup}
            onChange={f('partyGroup')}
            options={PARTY_GROUPS}
            className="w-[260px]"
          />

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    tab === i
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab 0: GST & Address ── */}
          {tab === 0 && (
            <div className="grid grid-cols-3 gap-4">
              {/* Left column */}
              <div className="space-y-3">
                <FloatSelect
                  label="GST Type"
                  value={form.gstType}
                  onChange={f('gstType')}
                  options={GST_TYPES}
                />
                <FloatSelect
                  label="State"
                  value={form.state}
                  onChange={f('state')}
                  options={INDIAN_STATES}
                />
                <FloatInput label="Email ID" value={form.email} onChange={f('email')} type="email" />
              </div>

              {/* Middle column */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Billing Address
                </label>
                <textarea
                  value={form.billingAddress}
                  onChange={f('billingAddress')}
                  rows={6}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none
                    focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              {/* Right column */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Shipping Address
                </label>
                <textarea
                  value={form.shippingAddress}
                  onChange={f('shippingAddress')}
                  rows={6}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none
                    focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          )}

          {/* ── Tab 1: Credit & Balance ── */}
          {tab === 1 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* Row 1 */}
              <FloatInput
                label="Opening Balance"
                value={form.openingBalance}
                onChange={f('openingBalance')}
                type="number"
                min="0"
              />
              <FloatDate
                label="As Of Date"
                value={form.asOfDate}
                onChange={f('asOfDate')}
              />

              {/* Row 2 */}
              <FloatInput
                label="Loyalty Points Opening Balance"
                value={form.loyaltyOpeningBalance}
                onChange={f('loyaltyOpeningBalance')}
                type="number"
                min="0"
              />
              <FloatDate
                label="Loyalty Balance As of Date"
                value={form.loyaltyAsOfDate}
                onChange={f('loyaltyAsOfDate')}
              />
            </div>
          )}

          {/* ── Tab 2: Additional Fields ── */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FloatInput label="Contact Person" value={form.contactPerson} onChange={f('contactPerson')} />
                <FloatInput label="Website" value={form.website} onChange={f('website')} type="url" />
                <FloatInput label="Custom Field 1" value={form.customField1} onChange={f('customField1')} />
                <FloatInput label="Custom Field 2" value={form.customField2} onChange={f('customField2')} />
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  You can add more custom fields from{' '}
                  <span className="font-semibold">Settings → Custom Fields</span>
                </p>
              </div>

              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                + Add Custom Field
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-5 py-2 border border-blue-500 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition disabled:opacity-60"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
