import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCog, Save, RotateCcw, Users, ShieldAlert, CreditCard, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '@features/settings/resources/settings-service';

const DEFAULTS = {
  defaultType:        'customer',
  defaultPartyType:   'B2C',
  requirePhone:       false,
  requireGstin:       false,
  enableCreditLimit:  false,
  defaultCreditLimit: 0,
  duplicateCheck:     true,
  showBalance:        true,
  autoWhatsapp:       false,
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
      <div className="p-5 space-y-3">{children}</div>
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

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer group">
      <div>
        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-amber-500' : 'bg-slate-200'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function RadioCard({ label, sub, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition w-full ${selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${selected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

export default function SettingsParty() {
  const [form, setForm] = useState(DEFAULTS);
  const { data } = useQuery({ queryKey: ['settings-party'], queryFn: SettingsAPI.getParty });

  useEffect(() => { if (data) setForm({ ...DEFAULTS, ...data }); }, [data]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try { await SettingsAPI.saveParty(form); toast.success('Party settings saved'); }
    catch { toast.error('Failed to save party settings'); }
  };
  const handleReset = async () => {
    try { await SettingsAPI.saveParty(DEFAULTS); setForm({ ...DEFAULTS }); toast.success('Reset to defaults'); }
    catch { toast.error('Failed to reset'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <UserCog size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Party Settings</h1>
              <p className="text-xs text-slate-500">Defaults and rules for customers and suppliers</p>
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

        <div className="space-y-5">

          {/* Defaults */}
          <SectionCard icon={Users} title="New Party Defaults" subtitle="Pre-filled values when adding a new party">
            <Field label="Default Party Role">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: 'customer', label: 'Customer', sub: 'Sells to' },
                  { val: 'supplier', label: 'Supplier', sub: 'Buys from' },
                  { val: 'both',     label: 'Both',     sub: 'Customer & supplier' },
                ].map(o => (
                  <RadioCard key={o.val} label={o.label} sub={o.sub}
                    selected={form.defaultType === o.val}
                    onClick={() => set('defaultType', o.val)} />
                ))}
              </div>
            </Field>

            <Field label="Default Registration Type" hint="B2C for individuals, B2B for businesses with GSTIN">
              <div className="grid grid-cols-2 gap-3">
                <RadioCard label="B2C — Individual" sub="No GSTIN, retail customer"
                  selected={form.defaultPartyType === 'B2C'} onClick={() => set('defaultPartyType', 'B2C')} />
                <RadioCard label="B2B — Business" sub="Has GSTIN, wholesale buyer"
                  selected={form.defaultPartyType === 'B2B'} onClick={() => set('defaultPartyType', 'B2B')} />
              </div>
            </Field>
          </SectionCard>

          {/* Validation */}
          <SectionCard icon={ShieldAlert} title="Validation Rules"
            subtitle="Mandatory fields and duplicate checks"
            iconColor="text-rose-500" iconBg="bg-rose-50">
            <Toggle
              label="Require phone number"
              hint="Block saving a party without a phone number"
              checked={form.requirePhone}
              onChange={v => set('requirePhone', v)}
            />
            <Toggle
              label="Require GSTIN for B2B parties"
              hint="Block saving a B2B party without a valid GSTIN"
              checked={form.requireGstin}
              onChange={v => set('requireGstin', v)}
            />
            <Toggle
              label="Check for duplicate party names"
              hint="Warn if a party with the same name already exists"
              checked={form.duplicateCheck}
              onChange={v => set('duplicateCheck', v)}
            />
          </SectionCard>

          {/* Credit limit */}
          <SectionCard icon={CreditCard} title="Credit Limit"
            subtitle="Set a spending limit for credit customers"
            iconColor="text-blue-600" iconBg="bg-blue-50">
            <div className={`rounded-xl border p-4 transition ${form.enableCreditLimit ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-slate-50'}`}>
              <Toggle
                label="Enable credit limit"
                hint="Warn or block a sale when the party exceeds their credit limit"
                checked={form.enableCreditLimit}
                onChange={v => set('enableCreditLimit', v)}
              />
              {form.enableCreditLimit && (
                <div className="mt-3 ml-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Default credit limit (₹)
                  </label>
                  <input type="number" min="0" step="100"
                    value={form.defaultCreditLimit}
                    onChange={e => set('defaultCreditLimit', Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-3.5 py-2 text-sm w-44 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    placeholder="0 = unlimited"
                  />
                  <p className="text-xs text-slate-400 mt-1">Applied to new parties. 0 means no limit.</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Display */}
          <SectionCard icon={Bell} title="Display & Notifications"
            iconColor="text-emerald-600" iconBg="bg-emerald-50">
            <Toggle
              label="Show outstanding balance in party list"
              hint="Display receivable / payable balance next to each party"
              checked={form.showBalance}
              onChange={v => set('showBalance', v)}
            />
            <Toggle
              label="WhatsApp payment reminder"
              hint="Show a WhatsApp share button when a party has an overdue balance"
              checked={form.autoWhatsapp}
              onChange={v => set('autoWhatsapp', v)}
            />
          </SectionCard>

          <div className="flex justify-end pt-1 pb-4">
            <button onClick={handleSave} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} /> Save Party Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
