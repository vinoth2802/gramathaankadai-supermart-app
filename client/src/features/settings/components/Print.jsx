import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, FileText, Eye, LayoutTemplate, AlignLeft,
  ToggleLeft, Save, RotateCcw, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '@features/settings/resources/settings-service';

const DEFAULTS = {
  paperSize:           'A4',
  invoiceTitle:        'Tax Invoice',
  copies:              1,
  showLogo:            false,
  showAddress:         true,
  showGstin:           true,
  showPhone:           true,
  showHsn:             true,
  showBatch:           false,
  showExpiry:          false,
  showMrp:             true,
  showFreeQty:         false,
  showGstBreakdown:    true,
  showGstSplit:        false,
  footerText:          'Thank you for shopping with us!',
  showSignature:       false,
  showTerms:           false,
  termsText:           'Goods once sold will not be returned.',
  showLoyaltyPoints:   true,
  showCustomerDetails: true,
  showDueDate:         true,
};

/* ── Shared components ── */
const inp = 'w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
          <Icon size={14} className="text-amber-600" />
        </div>
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
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

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer group">
      <div>
        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-amber-500' : 'bg-slate-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </label>
  );
}

/* ── Print Preview ── */
function PrintPreview({ form, shop }) {
  const isThermal = form.paperSize === '80mm' || form.paperSize === '58mm';
  const width = form.paperSize === '58mm' ? 'w-[200px]' : isThermal ? 'w-[260px]' : 'w-full';

  return (
    <div className="bg-slate-100 rounded-xl p-4 flex flex-col items-center min-h-[400px]">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Live Preview</p>

      <div className={`${width} bg-white shadow-md rounded text-[10px] font-mono overflow-hidden`}
        style={{ fontFamily: isThermal ? 'monospace' : 'sans-serif', fontSize: isThermal ? '9px' : '10px' }}>

        {/* Header */}
        <div className={`px-3 py-2 ${isThermal ? 'text-center' : 'text-left'} border-b border-dashed border-slate-300`}>
          {form.showLogo && (
            <div className="mx-auto mb-1 w-10 h-10 bg-amber-100 rounded flex items-center justify-center">
              <Receipt size={16} className="text-amber-600" />
            </div>
          )}
          <div className={`font-bold ${isThermal ? 'text-[11px]' : 'text-sm'}`}>
            {shop?.tenantName || shop?.shopName || 'Your Shop Name'}
          </div>
          {form.showAddress && shop?.address && (
            <div className="text-slate-500 mt-0.5">{shop.address}</div>
          )}
          {form.showPhone && shop?.phone && (
            <div className="text-slate-500">Ph: {shop.phone}</div>
          )}
          {form.showGstin && shop?.gstin && (
            <div className="text-slate-500">GSTIN: {shop.gstin}</div>
          )}
        </div>

        {/* Invoice title + meta */}
        <div className={`px-3 py-1.5 border-b border-dashed border-slate-300 ${isThermal ? 'text-center' : ''}`}>
          <div className="font-bold">{form.invoiceTitle || 'Tax Invoice'}</div>
          <div className="text-slate-500 flex gap-3 flex-wrap mt-0.5">
            <span>Inv: INV-001</span>
            <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
          </div>
          {form.showCustomerDetails && (
            <div className="text-slate-500 mt-0.5">Customer: Walk-in Customer</div>
          )}
          {form.showDueDate && (
            <div className="text-slate-500">Due: —</div>
          )}
        </div>

        {/* Items header */}
        <div className="px-3 pt-1.5 grid gap-0.5">
          <div className="flex text-slate-400 font-semibold border-b border-slate-200 pb-0.5">
            <span className="flex-1">Item</span>
            {form.showHsn    && <span className="w-10 text-right">HSN</span>}
            {form.showMrp    && <span className="w-10 text-right">MRP</span>}
            <span className="w-8 text-right">Qty</span>
            <span className="w-10 text-right">Rate</span>
            <span className="w-12 text-right">Amt</span>
          </div>
          {/* Sample rows */}
          {[
            { name: 'Rice 1kg', hsn: '1006', mrp: '65.00', qty: '2', rate: '60.00', amt: '120.00', batch: 'B001', exp: '12/25' },
            { name: 'Sugar 1kg', hsn: '1701', mrp: '45.00', qty: '1', rate: '42.00', amt: '42.00',  batch: 'B002', exp: '06/26' },
          ].map((it, i) => (
            <div key={i}>
              <div className="flex py-0.5">
                <span className="flex-1 truncate">{it.name}</span>
                {form.showHsn    && <span className="w-10 text-right text-slate-400">{it.hsn}</span>}
                {form.showMrp    && <span className="w-10 text-right text-slate-400">{it.mrp}</span>}
                <span className="w-8 text-right">{it.qty}</span>
                <span className="w-10 text-right">{it.rate}</span>
                <span className="w-12 text-right font-semibold">{it.amt}</span>
              </div>
              {(form.showBatch || form.showExpiry) && (
                <div className="text-slate-400 pl-1">
                  {form.showBatch  && `Batch: ${it.batch} `}
                  {form.showExpiry && `Exp: ${it.exp}`}
                </div>
              )}
              {form.showFreeQty && <div className="text-slate-400 pl-1">Free: 0</div>}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-3 py-1.5 border-t border-dashed border-slate-300 space-y-0.5">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹ 162.00</span></div>
          {form.showGstBreakdown && (
            form.showGstSplit ? (
              <>
                <div className="flex justify-between text-slate-400"><span>CGST (2.5%)</span><span>₹ 2.03</span></div>
                <div className="flex justify-between text-slate-400"><span>SGST (2.5%)</span><span>₹ 2.03</span></div>
              </>
            ) : (
              <div className="flex justify-between text-slate-400"><span>GST (5%)</span><span>₹ 8.10</span></div>
            )
          )}
          <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5">
            <span>Grand Total</span><span>₹ 170.10</span>
          </div>
        </div>

        {/* Loyalty */}
        {form.showLoyaltyPoints && (
          <div className="px-3 py-1 border-t border-dashed border-slate-300 text-slate-500">
            Points Earned: 170 | Balance: 850
          </div>
        )}

        {/* Footer */}
        {(form.footerText || form.showTerms || form.showSignature) && (
          <div className="px-3 py-1.5 border-t border-dashed border-slate-300 text-center space-y-1">
            {form.footerText && <div className="text-slate-600">{form.footerText}</div>}
            {form.showTerms && form.termsText && (
              <div className="text-slate-400 text-[8px]">{form.termsText}</div>
            )}
            {form.showSignature && (
              <div className="mt-3 border-t border-slate-300 pt-1 text-slate-400">
                Authorised Signature
              </div>
            )}
          </div>
        )}

        {/* Copies watermark */}
        {form.copies > 1 && (
          <div className="px-3 py-1 bg-slate-50 text-center text-slate-400">
            Copy 1 of {form.copies}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function SettingsPrint() {
  const [form, setForm] = useState(DEFAULTS);
  const { data: shop } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get });
  const { data: printData } = useQuery({ queryKey: ['settings-print'], queryFn: SettingsAPI.getPrint });

  useEffect(() => {
    if (printData) setForm({ ...DEFAULTS, ...printData });
  }, [printData]);

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), []);

  const handleSave = async () => {
    try {
      await SettingsAPI.savePrint(form);
      toast.success('Print settings saved');
    } catch { toast.error('Failed to save print settings'); }
  };

  const handleReset = async () => {
    try {
      await SettingsAPI.savePrint(DEFAULTS);
      setForm({ ...DEFAULTS });
      toast.success('Print settings reset to defaults');
    } catch { toast.error('Failed to reset print settings'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Printer size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Print Settings</h1>
              <p className="text-xs text-slate-500">Configure how invoices and bills are printed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition">
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm">
              <Save size={13} /> Save Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5 items-start">

          {/* ── Settings column ── */}
          <div className="col-span-3 space-y-4">

            {/* Paper & Layout */}
            <SectionCard icon={LayoutTemplate} title="Paper & Layout">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Paper Size">
                  <select value={form.paperSize} onChange={e => set('paperSize', e.target.value)} className={inp}>
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="A5">A5 (148 × 210 mm)</option>
                    <option value="80mm">Thermal 80mm</option>
                    <option value="58mm">Thermal 58mm</option>
                  </select>
                </Field>
                <Field label="Invoice Title">
                  <select value={form.invoiceTitle} onChange={e => set('invoiceTitle', e.target.value)} className={inp}>
                    <option>Tax Invoice</option>
                    <option>Bill of Supply</option>
                    <option>Cash Memo</option>
                    <option>Retail Invoice</option>
                    <option>Sales Invoice</option>
                  </select>
                </Field>
              </div>
              <Field label="Number of Copies" hint="How many copies print per invoice">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(n => (
                    <button key={n} type="button"
                      onClick={() => set('copies', n)}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold border transition ${
                        form.copies === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}>
                      {n === 1 ? 'Original' : n === 2 ? 'Duplicate' : 'Triplicate'}
                    </button>
                  ))}
                </div>
              </Field>
            </SectionCard>

            {/* Invoice Header */}
            <SectionCard icon={FileText} title="Invoice Header">
              <Toggle label="Show Logo" hint="Display your shop logo at the top"
                checked={form.showLogo} onChange={v => set('showLogo', v)} />
              <Toggle label="Show Shop Address"
                checked={form.showAddress} onChange={v => set('showAddress', v)} />
              <Toggle label="Show Phone Number"
                checked={form.showPhone} onChange={v => set('showPhone', v)} />
              <Toggle label="Show GSTIN"
                checked={form.showGstin} onChange={v => set('showGstin', v)} />
            </SectionCard>

            {/* Customer Details */}
            <SectionCard icon={AlignLeft} title="Customer & Order Details">
              <Toggle label="Show Customer Name / Details"
                checked={form.showCustomerDetails} onChange={v => set('showCustomerDetails', v)} />
              <Toggle label="Show Due Date"
                hint="Applicable for credit sales"
                checked={form.showDueDate} onChange={v => set('showDueDate', v)} />
            </SectionCard>

            {/* Item display */}
            <SectionCard icon={Eye} title="Item Columns">
              <Toggle label="Show HSN Code"
                checked={form.showHsn} onChange={v => set('showHsn', v)} />
              <Toggle label="Show MRP"
                checked={form.showMrp} onChange={v => set('showMrp', v)} />
              <Toggle label="Show Batch Number"
                checked={form.showBatch} onChange={v => set('showBatch', v)} />
              <Toggle label="Show Expiry Date"
                checked={form.showExpiry} onChange={v => set('showExpiry', v)} />
              <Toggle label="Show Free Qty"
                checked={form.showFreeQty} onChange={v => set('showFreeQty', v)} />
            </SectionCard>

            {/* Tax */}
            <SectionCard icon={Receipt} title="Tax & GST">
              <Toggle label="Show GST Breakdown"
                hint="Display GST amount separately at the bottom"
                checked={form.showGstBreakdown} onChange={v => set('showGstBreakdown', v)} />
              {form.showGstBreakdown && (
                <Toggle label="Split CGST / SGST"
                  hint="Show CGST and SGST as separate lines instead of combined GST"
                  checked={form.showGstSplit} onChange={v => set('showGstSplit', v)} />
              )}
            </SectionCard>

            {/* Footer */}
            <SectionCard icon={ToggleLeft} title="Footer & Options">
              <Toggle label="Show Loyalty Points"
                hint="Display points earned and balance on invoice"
                checked={form.showLoyaltyPoints} onChange={v => set('showLoyaltyPoints', v)} />
              <Toggle label="Show Signature Line"
                hint="Print 'Authorised Signature' area at bottom"
                checked={form.showSignature} onChange={v => set('showSignature', v)} />
              <Toggle label="Show Terms & Conditions"
                checked={form.showTerms} onChange={v => set('showTerms', v)} />

              {form.showTerms && (
                <Field label="Terms Text">
                  <textarea value={form.termsText}
                    onChange={e => set('termsText', e.target.value)}
                    rows={2} className={inp}
                    placeholder="Enter terms and conditions..." />
                </Field>
              )}

              <Field label="Footer Message">
                <input value={form.footerText}
                  onChange={e => set('footerText', e.target.value)}
                  className={inp}
                  placeholder="e.g. Thank you for shopping with us!" />
              </Field>
            </SectionCard>

          </div>

          {/* ── Preview column ── */}
          <div className="col-span-2 sticky top-4">
            <PrintPreview form={form} shop={shop} />
            <p className="text-xs text-slate-400 text-center mt-2">
              Preview updates as you change settings
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
