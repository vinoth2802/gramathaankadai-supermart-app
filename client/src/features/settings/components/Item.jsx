import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Save, RotateCcw, Layers, ScanLine, Hash, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '@features/settings/resources/settings-service';

const DEFAULTS = {
  defaultUom:          'PCS',
  enableBatch:         false,
  enableExpiry:        false,
  enableMrp:           true,
  enableHsn:           true,
  enableLocation:      false,
  defaultReorderLevel: 10,
  priceDecimals:       2,
  qtyDecimals:         3,
  enableWholesale:     false,
  barcodeType:         'EAN13',
  negativeStockAlert:  true,
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

const BARCODE_TYPES = ['EAN13', 'EAN8', 'CODE128', 'CODE39', 'QR'];
const COMMON_UOMS = ['PCS', 'KG', 'G', 'LTR', 'ML', 'MTR', 'BOX', 'PKT', 'DOZ', 'BAG'];

export default function SettingsItem() {
  const [form, setForm] = useState(DEFAULTS);
  const { data } = useQuery({ queryKey: ['settings-item'], queryFn: SettingsAPI.getItem });

  useEffect(() => { if (data) setForm({ ...DEFAULTS, ...data }); }, [data]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try { await SettingsAPI.saveItem(form); toast.success('Item settings saved'); }
    catch { toast.error('Failed to save item settings'); }
  };
  const handleReset = async () => {
    try { await SettingsAPI.saveItem(DEFAULTS); setForm({ ...DEFAULTS }); toast.success('Reset to defaults'); }
    catch { toast.error('Failed to reset'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Box size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Item Settings</h1>
              <p className="text-xs text-slate-500">Defaults and field visibility for products and inventory</p>
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
          <SectionCard icon={Settings2} title="New Item Defaults" subtitle="Pre-filled values when adding a new item">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Unit of Measure">
                <select value={form.defaultUom} onChange={e => set('defaultUom', e.target.value)} className={inp}>
                  {COMMON_UOMS.map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Default Reorder Level" hint="Stock level that triggers a low stock alert">
                <input type="number" min="0" step="1"
                  value={form.defaultReorderLevel}
                  onChange={e => set('defaultReorderLevel', Number(e.target.value))}
                  className={inp} />
              </Field>
            </div>
          </SectionCard>

          {/* Visible fields */}
          <SectionCard icon={Layers} title="Item Form Fields"
            subtitle="Toggle which fields appear when adding or editing an item"
            iconColor="text-blue-600" iconBg="bg-blue-50">
            <Toggle
              label="Show MRP field"
              hint="Maximum Retail Price — displayed on shelf and invoice"
              checked={form.enableMrp}
              onChange={v => set('enableMrp', v)}
            />
            <Toggle
              label="Show HSN code field"
              hint="Harmonised System Nomenclature — required for GST invoices"
              checked={form.enableHsn}
              onChange={v => set('enableHsn', v)}
            />
            <Toggle
              label="Show Batch Number field"
              hint="Track items by manufacturing batch"
              checked={form.enableBatch}
              onChange={v => set('enableBatch', v)}
            />
            <Toggle
              label="Show Expiry Date field"
              hint="Track expiry for medicines, food, and perishables"
              checked={form.enableExpiry}
              onChange={v => set('enableExpiry', v)}
            />
            <Toggle
              label="Show Rack / Location field"
              hint="Record where the item is stored in the warehouse or shop"
              checked={form.enableLocation}
              onChange={v => set('enableLocation', v)}
            />
            <Toggle
              label="Enable wholesale pricing"
              hint="Show wholesale price and minimum quantity fields"
              checked={form.enableWholesale}
              onChange={v => set('enableWholesale', v)}
            />
          </SectionCard>

          {/* Precision */}
          <SectionCard icon={Hash} title="Decimal Precision"
            subtitle="Number of decimal places for prices and quantities"
            iconColor="text-violet-600" iconBg="bg-violet-50">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Price decimal places" hint="e.g. 2 → ₹12.50 | 3 → ₹12.500">
                <div className="flex gap-2">
                  {[0, 2, 3, 4].map(n => (
                    <button key={n} type="button"
                      onClick={() => set('priceDecimals', n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                        form.priceDecimals === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}>{n}</button>
                  ))}
                </div>
              </Field>
              <Field label="Quantity decimal places" hint="e.g. 0 → 5 units | 3 → 5.250 kg">
                <div className="flex gap-2">
                  {[0, 2, 3, 4].map(n => (
                    <button key={n} type="button"
                      onClick={() => set('qtyDecimals', n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                        form.qtyDecimals === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}>{n}</button>
                  ))}
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* Barcode */}
          <SectionCard icon={ScanLine} title="Barcode"
            iconColor="text-slate-600" iconBg="bg-slate-100">
            <Field label="Default barcode format" hint="Format used when generating barcodes for items">
              <div className="flex flex-wrap gap-2">
                {BARCODE_TYPES.map(bt => (
                  <button key={bt} type="button"
                    onClick={() => set('barcodeType', bt)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      form.barcodeType === bt
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}>{bt}</button>
                ))}
              </div>
            </Field>
            <Toggle
              label="Alert on negative stock"
              hint="Show a warning badge on items with zero or negative stock"
              checked={form.negativeStockAlert}
              onChange={v => set('negativeStockAlert', v)}
            />
          </SectionCard>

          <div className="flex justify-end pt-1 pb-4">
            <button onClick={handleSave} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} /> Save Item Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
