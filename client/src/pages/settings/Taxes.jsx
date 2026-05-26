import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Percent, Save, RotateCcw, Plus, Trash2, Shield,
  Calculator, Building2, FileText, AlertCircle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '../../api/settings.js';

const STANDARD_SLABS = [
  { id: 'gst-0',  rate: 0,   label: 'Exempt',   description: 'Fresh vegetables, milk, eggs, salt',       locked: true  },
  { id: 'gst-3',  rate: 3,   label: '3%',        description: 'Gold, silver, precious metals & stones',   locked: false },
  { id: 'gst-5',  rate: 5,   label: '5%',        description: 'Edible oil, sugar, tea, coffee, medicines', locked: false },
  { id: 'gst-12', rate: 12,  label: '12%',        description: 'Processed food, computers, mobile phones', locked: false },
  { id: 'gst-18', rate: 18,  label: '18%',        description: 'Most goods and services',                 locked: false },
  { id: 'gst-28', rate: 28,  label: '28%',        description: 'Luxury goods, tobacco, aerated drinks',   locked: false },
];

const DEFAULTS = {
  taxMethod:         'exclusive',
  defaultGstRate:    5,
  roundOff:          'nearest_rupee',
  supplyType:        'intrastate',
  businessType:      'regular',
  compositionRate:   1,
  enableTcs:         false,
  tcsRate:           1,
  enableTds:         false,
  tdsRate:           2,
  enableCess:        false,
  cessRate:          0,
  enableReverseCharge: false,
  activeSlabs:       [0, 5, 12, 18, 28],
  customSlabs:       [],
};


/* ── Shared UI ── */
const inp = 'w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';
const inp_sm = 'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition';

function SectionCard({ icon: Icon, iconColor = 'text-amber-600', iconBg = 'bg-amber-50', title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, cols }) {
  return (
    <div className={cols}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? 'opacity-50' : 'cursor-pointer group'}`}>
      <div>
        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-amber-500' : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function GstBadge({ rate }) {
  const colors = {
    0:  'bg-slate-100 text-slate-600 border-slate-200',
    3:  'bg-yellow-50 text-yellow-700 border-yellow-200',
    5:  'bg-green-50 text-green-700 border-green-200',
    12: 'bg-blue-50 text-blue-700 border-blue-200',
    18: 'bg-purple-50 text-purple-700 border-purple-200',
    28: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  const cls = colors[rate] ?? 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {rate}%
    </span>
  );
}

/* ── Main Component ── */
export default function SettingsTaxes() {
  const [form, setForm] = useState(DEFAULTS);
  const [newRate, setNewRate] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const { data: taxData } = useQuery({ queryKey: ['settings-tax'], queryFn: SettingsAPI.getTax });

  useEffect(() => {
    if (taxData) setForm({ ...DEFAULTS, ...taxData });
  }, [taxData]);

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), []);

  const toggleSlab = (rate) => {
    setForm(prev => {
      const active = prev.activeSlabs.includes(rate)
        ? prev.activeSlabs.filter(r => r !== rate)
        : [...prev.activeSlabs, rate].sort((a, b) => a - b);
      return { ...prev, activeSlabs: active };
    });
  };

  const addCustomSlab = () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error('Enter a valid rate between 0 and 100'); return; }
    const allRates = [...STANDARD_SLABS.map(s => s.rate), ...form.customSlabs.map(s => s.rate)];
    if (allRates.includes(rate)) { toast.error('This rate already exists'); return; }
    const slab = { id: `custom-${Date.now()}`, rate, label: newLabel || `${rate}%`, description: 'Custom rate', locked: false };
    setForm(prev => ({
      ...prev,
      customSlabs: [...prev.customSlabs, slab].sort((a, b) => a.rate - b.rate),
      activeSlabs: [...prev.activeSlabs, rate].sort((a, b) => a - b),
    }));
    setNewRate(''); setNewLabel('');
    toast.success(`${rate}% slab added`);
  };

  const removeCustomSlab = (id, rate) => {
    setForm(prev => ({
      ...prev,
      customSlabs: prev.customSlabs.filter(s => s.id !== id),
      activeSlabs: prev.activeSlabs.filter(r => r !== rate),
    }));
  };

  const handleSave = async () => {
    try {
      await SettingsAPI.saveTax(form);
      toast.success('Tax settings saved');
    } catch { toast.error('Failed to save tax settings'); }
  };

  const handleReset = async () => {
    try {
      await SettingsAPI.saveTax(DEFAULTS);
      setForm({ ...DEFAULTS });
      toast.success('Tax settings reset to defaults');
    } catch { toast.error('Failed to reset tax settings'); }
  };

  const allSlabs = [...STANDARD_SLABS, ...form.customSlabs].sort((a, b) => a.rate - b.rate);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Percent size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Taxes & GST</h1>
              <p className="text-xs text-slate-500">Configure GST rates, tax calculation and business registration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition">
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm">
              <Save size={12} /> Save Settings
            </button>
          </div>
        </div>

        <div className="space-y-5">

          {/* ── GST Calculation Settings ── */}
          <SectionCard icon={Calculator} title="GST Calculation" subtitle="How GST is applied on sales and purchases">
            <div className="grid grid-cols-3 gap-4">

              <Field label="Tax Method" hint="How prices are entered in items">
                <select value={form.taxMethod} onChange={e => set('taxMethod', e.target.value)} className={inp}>
                  <option value="exclusive">Exclusive (price + tax)</option>
                  <option value="inclusive">Inclusive (price with tax)</option>
                </select>
              </Field>

              <Field label="Default GST Rate" hint="Applied to new items automatically">
                <select value={form.defaultGstRate} onChange={e => set('defaultGstRate', Number(e.target.value))} className={inp}>
                  {allSlabs.filter(s => form.activeSlabs.includes(s.rate)).map(s => (
                    <option key={s.id} value={s.rate}>{s.rate === 0 ? '0% — Exempt' : `${s.rate}%`}</option>
                  ))}
                </select>
              </Field>

              <Field label="Round Off" hint="How tax totals are rounded">
                <select value={form.roundOff} onChange={e => set('roundOff', e.target.value)} className={inp}>
                  <option value="none">No rounding</option>
                  <option value="nearest_paise">Nearest Paise</option>
                  <option value="nearest_rupee">Nearest Rupee</option>
                  <option value="round_up">Always Round Up</option>
                  <option value="round_down">Always Round Down</option>
                </select>
              </Field>
            </div>

            <Field label="Supply Type" hint="Determines CGST+SGST vs IGST on transactions">
              <div className="flex gap-3">
                {[
                  { val: 'intrastate', label: 'Intra-state', sub: 'CGST + SGST', icon: '🏠' },
                  { val: 'interstate', label: 'Inter-state',  sub: 'IGST',        icon: '🚚' },
                ].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => set('supplyType', opt.val)}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                      form.supplyType === opt.val
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className={`text-sm font-semibold ${form.supplyType === opt.val ? 'text-amber-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-400">{opt.sub}</div>
                    </div>
                    {form.supplyType === opt.val && (
                      <Check size={15} className="ml-auto text-amber-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </Field>
          </SectionCard>

          {/* ── GST Rate Slabs ── */}
          <SectionCard icon={Percent} title="GST Rate Slabs" subtitle="Enable the rates used in your business. Enabled rates appear in item selection.">
            <div className="space-y-2">
              {allSlabs.map(slab => {
                const isActive = form.activeSlabs.includes(slab.rate);
                const isCustom = form.customSlabs.some(s => s.id === slab.id);
                return (
                  <div key={slab.id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition ${
                      isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}>
                    <GstBadge rate={slab.rate} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-700">{slab.label}</div>
                      <div className="text-xs text-slate-400 truncate">{slab.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={11} /> Active
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSlab(slab.rate)}
                        disabled={slab.locked}
                        title={slab.locked ? 'This slab cannot be disabled' : (isActive ? 'Disable' : 'Enable')}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                          isActive ? 'bg-amber-500' : 'bg-slate-200'
                        } ${slab.locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      {isCustom && (
                        <button type="button" onClick={() => removeCustomSlab(slab.id, slab.rate)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add custom rate */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add Custom Rate</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={newRate} onChange={e => setNewRate(e.target.value)}
                  placeholder="Rate %"
                  className={`${inp_sm} w-28`}
                />
                <input
                  value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className={`${inp_sm} flex-1`}
                />
                <button type="button" onClick={addCustomSlab}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition shrink-0">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ── Business Registration ── */}
          <SectionCard icon={Building2} title="Business Registration" subtitle="Your GST registration type affects tax applicability">
            <Field label="Business Type">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    val: 'regular',
                    label: 'Regular Taxpayer',
                    sub: 'Collect and pay full GST. Can claim Input Tax Credit.',
                    color: 'amber',
                  },
                  {
                    val: 'composition',
                    label: 'Composition Scheme',
                    sub: 'Pay flat turnover-based tax. Cannot collect GST from buyers.',
                    color: 'blue',
                  },
                ].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => set('businessType', opt.val)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition ${
                      form.businessType === opt.val
                        ? `border-${opt.color}-400 bg-${opt.color}-50`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                      form.businessType === opt.val ? `border-${opt.color}-500 bg-${opt.color}-500` : 'border-slate-300'
                    }`}>
                      {form.businessType === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            {form.businessType === 'composition' && (
              <Field label="Composition Rate (%)" hint="Flat percentage of turnover to pay as tax">
                <input type="number" min="0" max="6" step="0.1"
                  value={form.compositionRate}
                  onChange={e => set('compositionRate', Number(e.target.value))}
                  className={`${inp} w-40`}
                />
              </Field>
            )}
          </SectionCard>

          {/* ── Additional Taxes ── */}
          <SectionCard icon={Shield} title="Additional Taxes & Deductions"
            subtitle="TDS, TCS, Cess applicable for specific business scenarios"
            iconColor="text-blue-600" iconBg="bg-blue-50">

            <div className="space-y-4">

              {/* TCS */}
              <div className={`rounded-xl border p-4 transition ${form.enableTcs ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                <Toggle
                  label="Tax Collected at Source (TCS)"
                  hint="Applicable if your annual turnover exceeds ₹50 lakhs"
                  checked={form.enableTcs}
                  onChange={v => set('enableTcs', v)}
                />
                {form.enableTcs && (
                  <div className="mt-3 ml-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">TCS Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.01"
                      value={form.tcsRate}
                      onChange={e => set('tcsRate', Number(e.target.value))}
                      className={`${inp_sm} w-36`}
                    />
                  </div>
                )}
              </div>

              {/* TDS */}
              <div className={`rounded-xl border p-4 transition ${form.enableTds ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                <Toggle
                  label="Tax Deducted at Source (TDS)"
                  hint="Applicable on payments made to suppliers in certain categories"
                  checked={form.enableTds}
                  onChange={v => set('enableTds', v)}
                />
                {form.enableTds && (
                  <div className="mt-3 ml-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">TDS Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.01"
                      value={form.tdsRate}
                      onChange={e => set('tdsRate', Number(e.target.value))}
                      className={`${inp_sm} w-36`}
                    />
                  </div>
                )}
              </div>

              {/* Cess */}
              <div className={`rounded-xl border p-4 transition ${form.enableCess ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                <Toggle
                  label="Cess"
                  hint="Additional surcharge on top of GST (e.g. 12% Cess on tobacco products)"
                  checked={form.enableCess}
                  onChange={v => set('enableCess', v)}
                />
                {form.enableCess && (
                  <div className="mt-3 ml-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Cess Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.01"
                      value={form.cessRate}
                      onChange={e => set('cessRate', Number(e.target.value))}
                      className={`${inp_sm} w-36`}
                    />
                  </div>
                )}
              </div>

              {/* Reverse Charge */}
              <div className={`rounded-xl border p-4 transition ${form.enableReverseCharge ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                <Toggle
                  label="Reverse Charge Mechanism (RCM)"
                  hint="Buyer pays GST directly to government instead of supplier"
                  checked={form.enableReverseCharge}
                  onChange={v => set('enableReverseCharge', v)}
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Info box ── */}
          <SectionCard icon={FileText} title="GST Filing Reference"
            subtitle="Quick reference for GST return types"
            iconColor="text-slate-500" iconBg="bg-slate-100">
            <div className="grid grid-cols-2 gap-3">
              {[
                { form: 'GSTR-1', freq: 'Monthly / Quarterly', desc: 'Outward supplies (sales) details' },
                { form: 'GSTR-2B', freq: 'Monthly', desc: 'Auto-drafted inward supplies (purchases)' },
                { form: 'GSTR-3B', freq: 'Monthly / Quarterly', desc: 'Summary return of inward & outward supplies' },
                { form: 'GSTR-9', freq: 'Annual', desc: 'Annual consolidated return' },
              ].map(r => (
                <div key={r.form} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle size={12} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{r.form}
                      <span className="ml-2 text-xs font-normal text-slate-400">{r.freq}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Save */}
          <div className="flex items-center justify-end pt-1 pb-4">
            <button onClick={handleSave}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} /> Save Tax Settings
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
