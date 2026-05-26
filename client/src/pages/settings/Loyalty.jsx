import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Save, RotateCcw, Gift, Coins, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '../../api/settings.js';

const DEFAULTS = {
  loyaltyEnabled:        true,
  loyaltyPointsPerRupee: 1,
  loyaltyMinPoints:      100,
  loyaltyPointsValue:    0.10,
  loyaltyExpiryDays:     365,
  loyaltyMaxDiscount:    10,
  loyaltyAllowPartial:   true,
  loyaltyShowOnInvoice:  true,
};

const inp = 'w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';

function SectionCard({ icon: Icon, title, subtitle, iconColor = 'text-amber-600', iconBg = 'bg-amber-50', children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={14} className={iconColor} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? 'opacity-50' : 'cursor-pointer group'}`}>
      <div>
        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-amber-500' : 'bg-slate-200'} ${disabled ? 'cursor-not-allowed' : ''}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

export default function SettingsLoyalty() {
  const [form, setForm] = useState(DEFAULTS);
  const { data } = useQuery({ queryKey: ['settings-loyalty'], queryFn: SettingsAPI.getLoyalty });

  useEffect(() => { if (data) setForm({ ...DEFAULTS, ...data }); }, [data]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try { await SettingsAPI.saveLoyalty(form); toast.success('Loyalty settings saved'); }
    catch { toast.error('Failed to save loyalty settings'); }
  };
  const handleReset = async () => {
    try { await SettingsAPI.saveLoyalty(DEFAULTS); setForm({ ...DEFAULTS }); toast.success('Reset to defaults'); }
    catch { toast.error('Failed to reset'); }
  };

  const pointsRupeeValue = form.loyaltyMinPoints * form.loyaltyPointsValue;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Star size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Loyalty Points</h1>
              <p className="text-xs text-slate-500">Reward customers with points on every purchase</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition">
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm">
              <Save size={12} /> Save Settings
            </button>
          </div>
        </div>

        {/* Master toggle */}
        <div className={`rounded-xl border-2 p-5 mb-5 transition ${form.loyaltyEnabled ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.loyaltyEnabled ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <Star size={18} className={form.loyaltyEnabled ? 'text-amber-500' : 'text-slate-400'} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Loyalty Programme</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {form.loyaltyEnabled ? 'Active — customers earn points on every sale' : 'Disabled — no points are awarded or redeemed'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => set('loyaltyEnabled', !form.loyaltyEnabled)}
              className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.loyaltyEnabled ? 'bg-amber-500' : 'bg-slate-200'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form.loyaltyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className={`space-y-5 transition-opacity duration-200 ${form.loyaltyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

          {/* Earn */}
          <SectionCard icon={Coins} title="Earning Points" subtitle="How customers accumulate points">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Points per ₹1 spent" hint="e.g. 1 = earn 1 point for every ₹1">
                <input type="number" min="0.01" step="0.01"
                  value={form.loyaltyPointsPerRupee}
                  onChange={e => set('loyaltyPointsPerRupee', Number(e.target.value))}
                  className={inp} />
              </Field>
              <Field label="Value of 1 point (₹)" hint="e.g. 0.10 = 1 point is worth ₹0.10">
                <input type="number" min="0.01" step="0.01"
                  value={form.loyaltyPointsValue}
                  onChange={e => set('loyaltyPointsValue', Number(e.target.value))}
                  className={inp} />
              </Field>
            </div>

            {/* Visual summary */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-xs text-amber-600 font-semibold uppercase tracking-wide block mb-0.5">Earn rate</span>
                <span className="font-bold text-slate-800">₹100 spent → {(100 * form.loyaltyPointsPerRupee).toFixed(0)} pts</span>
              </div>
              <div>
                <span className="text-xs text-amber-600 font-semibold uppercase tracking-wide block mb-0.5">Redeem rate</span>
                <span className="font-bold text-slate-800">100 pts → ₹{(100 * form.loyaltyPointsValue).toFixed(2)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Redeem */}
          <SectionCard icon={Gift} title="Redemption Rules" subtitle="When and how customers can redeem points"
            iconColor="text-rose-500" iconBg="bg-rose-50">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum points to redeem" hint="Customer must have at least this many points">
                <input type="number" min="1" step="1"
                  value={form.loyaltyMinPoints}
                  onChange={e => set('loyaltyMinPoints', Number(e.target.value))}
                  className={inp} />
                <p className="text-xs text-slate-400 mt-1">= ₹{pointsRupeeValue.toFixed(2)} minimum discount</p>
              </Field>
              <Field label="Max discount from loyalty (%)" hint="Points cannot discount more than this % of the bill">
                <input type="number" min="1" max="100" step="1"
                  value={form.loyaltyMaxDiscount}
                  onChange={e => set('loyaltyMaxDiscount', Number(e.target.value))}
                  className={inp} />
              </Field>
            </div>
            <Toggle
              label="Allow partial redemption"
              hint="Customer can redeem only some of their points instead of all"
              checked={form.loyaltyAllowPartial}
              onChange={v => set('loyaltyAllowPartial', v)}
            />
          </SectionCard>

          {/* Expiry */}
          <SectionCard icon={Clock} title="Point Expiry" subtitle="Points expire if not redeemed"
            iconColor="text-blue-600" iconBg="bg-blue-50">
            <Field label="Points expire after (days)" hint="Set 0 to never expire">
              <div className="flex items-center gap-3">
                <input type="number" min="0" step="1"
                  value={form.loyaltyExpiryDays}
                  onChange={e => set('loyaltyExpiryDays', Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3.5 py-2 text-sm w-36 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
                <span className="text-sm text-slate-500">
                  {form.loyaltyExpiryDays === 0 ? '— Points never expire' : `≈ ${(form.loyaltyExpiryDays / 30).toFixed(1)} months`}
                </span>
              </div>
            </Field>
          </SectionCard>

          {/* Display */}
          <SectionCard icon={ShieldCheck} title="Display Options"
            iconColor="text-emerald-600" iconBg="bg-emerald-50">
            <Toggle
              label="Show loyalty points on invoice"
              hint="Print points earned and current balance on the customer's invoice"
              checked={form.loyaltyShowOnInvoice}
              onChange={v => set('loyaltyShowOnInvoice', v)}
            />
          </SectionCard>

        </div>

        <div className="flex justify-end pt-4 pb-4">
          <button onClick={handleSave} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
            <Save size={15} /> Save Loyalty Settings
          </button>
        </div>
      </div>
    </div>
  );
}
