import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight, Save, RotateCcw, ShoppingCart, Package,
  Hash, Percent, FileText, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '../../api/settings.js';

const DEFAULTS = {
  // Sales
  salePaymentMode:    'Cash',
  saleCreditDays:     30,
  requireCustomer:    false,
  allowNegativeStock: false,
  decimalQty:         true,
  enableSaleReturns:  true,
  saleReturnDays:     7,
  // Purchases
  purchasePaymentMode:     'Cash',
  purchaseCreditDays:      30,
  autoUpdatePurchasePrice: true,
  autoUpdateMrp:           false,
  enablePurchaseReturns:   true,
  // Invoice numbering
  purchasePrefix:     'PUR',
  estimatePrefix:     'EST',
  invoiceResetPeriod: 'never',
  invoicePadding:     4,
  // Discount
  allowItemDiscount: true,
  allowBillDiscount: true,
  maxDiscountPct:    100,
  // Estimates & stock
  enableEstimates:    true,
  lowStockWarning:    true,
  blockBelowMinStock: false,
  enableBarcode:      true,
};

/* ── Shared UI ── */
const inp = 'w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';
const inp_sm = 'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition';

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

function Field({ label, hint, children, half }) {
  return (
    <div className={half ? '' : ''}>
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

const PAYMENT_MODES = ['Cash', 'Credit', 'UPI', 'Bank Transfer', 'Cheque'];

/* ── Main Page ── */
export default function SettingsTransactions() {
  const [form, setForm] = useState(DEFAULTS);

  const { data: txnData } = useQuery({ queryKey: ['settings-transaction'], queryFn: SettingsAPI.getTransaction });
  const { data: shop } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get });

  useEffect(() => {
    if (txnData) setForm({ ...DEFAULTS, ...txnData });
  }, [txnData]);

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), []);

  const handleSave = async () => {
    try {
      await SettingsAPI.saveTransaction(form);
      toast.success('Transaction settings saved');
    } catch { toast.error('Failed to save transaction settings'); }
  };

  const handleReset = async () => {
    try {
      await SettingsAPI.saveTransaction(DEFAULTS);
      setForm({ ...DEFAULTS });
      toast.success('Transaction settings reset to defaults');
    } catch { toast.error('Failed to reset'); }
  };

  const salesPrefix = shop?.invoicePrefix ?? 'INV';

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <ArrowLeftRight size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Transaction Settings</h1>
              <p className="text-xs text-slate-500">Configure behaviour for sales, purchases, invoicing and discounts</p>
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

          {/* ── Sales Settings ── */}
          <SectionCard icon={ShoppingCart} title="Sales" subtitle="Default behaviour when creating a sale">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Payment Mode">
                <select value={form.salePaymentMode} onChange={e => set('salePaymentMode', e.target.value)} className={inp}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Default Credit Days" hint="Days before credit sale is due">
                <input type="number" min="0" max="365"
                  value={form.saleCreditDays}
                  onChange={e => set('saleCreditDays', Number(e.target.value))}
                  className={inp}
                />
              </Field>
            </div>

            <Toggle
              label="Require customer name on every sale"
              hint="Prevent saving a sale without selecting or typing a customer"
              checked={form.requireCustomer}
              onChange={v => set('requireCustomer', v)}
            />
            <Toggle
              label="Allow sale when stock is zero or negative"
              hint="If disabled, a warning stops the sale when item stock is insufficient"
              checked={form.allowNegativeStock}
              onChange={v => set('allowNegativeStock', v)}
            />
            <Toggle
              label="Allow decimal quantities"
              hint="e.g. 0.5 kg, 2.25 litres — uncheck for whole-number quantities only"
              checked={form.decimalQty}
              onChange={v => set('decimalQty', v)}
            />
            <div className={`rounded-xl border p-4 transition ${form.enableSaleReturns ? 'border-amber-100 bg-amber-50/40' : 'border-slate-100 bg-slate-50'}`}>
              <Toggle
                label="Enable sale returns"
                hint="Allow creating return / credit notes against sales"
                checked={form.enableSaleReturns}
                onChange={v => set('enableSaleReturns', v)}
              />
              {form.enableSaleReturns && (
                <div className="mt-3 ml-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Return window (days)
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="365"
                      value={form.saleReturnDays}
                      onChange={e => set('saleReturnDays', Number(e.target.value))}
                      className={`${inp_sm} w-28`}
                    />
                    <span className="text-xs text-slate-400">days after sale date</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Purchase Settings ── */}
          <SectionCard icon={Package} title="Purchases" subtitle="Default behaviour when creating a purchase"
            iconColor="text-blue-600" iconBg="bg-blue-50">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Payment Mode">
                <select value={form.purchasePaymentMode} onChange={e => set('purchasePaymentMode', e.target.value)} className={inp}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Default Credit Days" hint="Days before credit purchase is due">
                <input type="number" min="0" max="365"
                  value={form.purchaseCreditDays}
                  onChange={e => set('purchaseCreditDays', Number(e.target.value))}
                  className={inp}
                />
              </Field>
            </div>

            <Toggle
              label="Auto-update item purchase price"
              hint="When a purchase is saved, update the item's purchase price to the latest rate"
              checked={form.autoUpdatePurchasePrice}
              onChange={v => set('autoUpdatePurchasePrice', v)}
            />
            <Toggle
              label="Auto-update item MRP"
              hint="Also update the item's MRP when a new purchase is saved"
              checked={form.autoUpdateMrp}
              onChange={v => set('autoUpdateMrp', v)}
            />
            <Toggle
              label="Enable purchase returns"
              hint="Allow creating debit notes / return vouchers against purchases"
              checked={form.enablePurchaseReturns}
              onChange={v => set('enablePurchaseReturns', v)}
            />
          </SectionCard>

          {/* ── Invoice Numbering ── */}
          <SectionCard icon={Hash} title="Invoice Numbering" subtitle="Prefixes and format for auto-generated invoice numbers">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Sales Invoice Prefix" hint="Managed in Shop Settings">
                <input value={salesPrefix} disabled className={`${inp} bg-slate-50 text-slate-400 cursor-not-allowed`} />
              </Field>
              <Field label="Purchase Invoice Prefix">
                <input value={form.purchasePrefix}
                  onChange={e => set('purchasePrefix', e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="PUR"
                  className={inp}
                />
              </Field>
              <Field label="Estimate Prefix">
                <input value={form.estimatePrefix}
                  onChange={e => set('estimatePrefix', e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="EST"
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Number Padding" hint="Minimum digits — e.g. padding 4 → INV-0001">
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <button key={n} type="button"
                      onClick={() => set('invoicePadding', n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                        form.invoicePadding === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}>
                      {n} digits
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Reset Invoice Number" hint="When the sequence restarts from 1">
                <select value={form.invoiceResetPeriod} onChange={e => set('invoiceResetPeriod', e.target.value)} className={inp}>
                  <option value="never">Never (continuous)</option>
                  <option value="financial_year">Every Financial Year</option>
                  <option value="calendar_year">Every Calendar Year</option>
                  <option value="monthly">Every Month</option>
                </select>
              </Field>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-6 text-sm">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Preview</span>
              {[
                { label: 'Sale', prefix: salesPrefix },
                { label: 'Purchase', prefix: form.purchasePrefix || 'PUR' },
                { label: 'Estimate', prefix: form.estimatePrefix || 'EST' },
              ].map(({ label, prefix }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 mb-0.5">{label}</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {prefix}-{String(1).padStart(form.invoicePadding, '0')}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Discount Settings ── */}
          <SectionCard icon={Percent} title="Discounts" subtitle="Control where and how much discount can be applied"
            iconColor="text-rose-500" iconBg="bg-rose-50">
            <Toggle
              label="Allow item-level discount"
              hint="Show discount field on each line item in the sale / purchase form"
              checked={form.allowItemDiscount}
              onChange={v => set('allowItemDiscount', v)}
            />
            <Toggle
              label="Allow bill-level discount"
              hint="Show an overall discount field at the bottom of the bill"
              checked={form.allowBillDiscount}
              onChange={v => set('allowBillDiscount', v)}
            />
            <Field label="Maximum Discount %" hint="Cashier cannot apply a discount above this percentage (100 = no limit)">
              <div className="flex items-center gap-3">
                <input type="number" min="0" max="100" step="0.5"
                  value={form.maxDiscountPct}
                  onChange={e => set('maxDiscountPct', Number(e.target.value))}
                  className={`${inp_sm} w-32`}
                />
                <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(form.maxDiscountPct, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 w-10 text-right">{form.maxDiscountPct}%</span>
              </div>
            </Field>
          </SectionCard>

          {/* ── Estimates ── */}
          <SectionCard icon={FileText} title="Estimates & Quotations"
            iconColor="text-violet-600" iconBg="bg-violet-50">
            <Toggle
              label="Enable estimates / quotations"
              hint="Show the Estimates module in the navigation"
              checked={form.enableEstimates}
              onChange={v => set('enableEstimates', v)}
            />
          </SectionCard>

          {/* ── Stock & Inventory ── */}
          <SectionCard icon={Layers} title="Stock & Inventory"
            subtitle="Controls shown during transaction entry"
            iconColor="text-emerald-600" iconBg="bg-emerald-50">
            <Toggle
              label="Show low stock warning during sale"
              hint="Alert cashier when the item's stock is below the reorder level"
              checked={form.lowStockWarning}
              onChange={v => set('lowStockWarning', v)}
            />
            <Toggle
              label="Block sale when stock is below minimum"
              hint="Prevent saving the sale if stock will fall below the item's minimum stock level"
              checked={form.blockBelowMinStock}
              onChange={v => set('blockBelowMinStock', v)}
            />
            <Toggle
              label="Enable barcode scanning"
              hint="Allow adding items to a sale by scanning their barcode"
              checked={form.enableBarcode}
              onChange={v => set('enableBarcode', v)}
            />
          </SectionCard>

          {/* Bottom save */}
          <div className="flex items-center justify-end pt-1 pb-4">
            <button onClick={handleSave}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} /> Save Transaction Settings
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
