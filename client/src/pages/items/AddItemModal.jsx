import { useState } from 'react';
import { X, Search, Camera, Settings, Plus } from 'lucide-react';

const TABS = ['Pricing', 'Stock', 'Manufacturing'];

const EMPTY_FORM = {
  shortName: '', hsnCode: '', itemCode: '', uom: 'PCS', category: '',
  description: '', mrp: '', salesPrice: '', salesPriceTax: 'without',
  wholesalePrice: '', wholesaleQty: '', purchasePrice: '', purchasePriceTax: 'without',
  taxRate: 'None', openingQty: '', atPrice: '', asOfDate: '', minStock: '',
};

const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), material: '', qty: '', unit: 'None', purchasePrice: 0 });

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 text-sm text-slate-800 bg-white';
const lbl = 'block text-xs font-semibold text-slate-500 mb-1.5';
const card = 'bg-slate-50 border border-slate-200 rounded-xl p-4';

function Field({ label, required, children }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function AddItemModal({ onClose, onSave, onSaveAndNew, uoms = [], editData = null, existingItems = [] }) {
  const [productType, setProductType] = useState('Product');
  const [activeTab, setActiveTab] = useState('Pricing');
  const [form, setForm] = useState(() => editData ? {
    ...EMPTY_FORM,
    shortName: editData.shortName || '',
    hsnCode: editData.hsnCode || '',
    itemCode: editData.itemCode || '',
    uom: editData.uom || 'PCS',
    category: editData.category || '',
    mrp: editData.mrp ?? '',
    salesPrice: editData.salesPrice ?? '',
    purchasePrice: editData.purchasePrice ?? '',
    taxRate: editData.gstRate ? `GST@${editData.gstRate}%` : 'None',
    openingQty: editData.stock ?? '',
    minStock: editData.reorderLevel ?? '',
  } : { ...EMPTY_FORM });

  const [rawMaterials, setRawMaterials] = useState([EMPTY_ROW(), EMPTY_ROW()]);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateRawMaterial = (idx, field, value) =>
    setRawMaterials(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const totalMaterialCost = rawMaterials.reduce(
    (s, r) => s + (Number(r.qty) || 0) * (Number(r.purchasePrice) || 0), 0,
  );

  const buildPayload = () => ({
    shortName: form.shortName,
    hsnCode: form.hsnCode || '',
    itemCode: form.itemCode || '',
    uom: form.uom || 'PCS',
    category: form.category || '',
    mrp: Number(form.mrp) || 0,
    salesPrice: Number(form.salesPrice) || 0,
    purchasePrice: Number(form.purchasePrice) || 0,
    gstRate: form.taxRate === 'None' ? 0 : parseFloat(form.taxRate.replace('GST@', '').replace('%', '')) || 0,
    stock: Number(form.openingQty) || 0,
    reorderLevel: Number(form.minStock) || 10,
    batch: '',
    expiryDate: '',
  });

  const handleSave = () => { if (form.shortName) onSave(buildPayload()); };
  const handleSaveAndNew = () => { if (form.shortName) onSaveAndNew(buildPayload()); };

  const autoAssignCode = () => {
    const existingCodes = new Set(existingItems.map(i => i.itemCode).filter(Boolean));
    let code;
    let attempts = 0;
    do {
      // 11-digit numeric code: leading digit 1-9, then 10 more random digits
      const first = String(Math.floor(Math.random() * 9) + 1);
      const rest = String(Math.floor(Math.random() * 10_000_000_000)).padStart(10, '0');
      code = first + rest;
      attempts++;
    } while (existingCodes.has(code) && attempts < 200);
    setF('itemCode', code);
  };

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{editData ? 'Edit Item' : 'Add Item'}</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-full p-1">
              {['Product', 'Service'].map(t => (
                <button key={t} onClick={() => setProductType(t)}
                  className={`px-4 py-1 rounded-full text-sm font-semibold transition ${productType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><Settings size={17} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><X size={19} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Row 1 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Field label="Item Name" required>
              <input value={form.shortName} onChange={e => setF('shortName', e.target.value)} placeholder="Enter item name" className={inp} />
            </Field>
            <Field label="Item HSN">
              <div className="relative">
                <input value={form.hsnCode} onChange={e => setF('hsnCode', e.target.value)} placeholder="Search HSN..." className={inp + ' pr-9'} />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="Item Code">
              <div className="flex gap-2">
                <input value={form.itemCode} onChange={e => setF('itemCode', e.target.value)} placeholder="e.g. ITM001" className={inp} />
                <button onClick={autoAssignCode} className="shrink-0 px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 whitespace-nowrap transition">
                  Assign Code
                </button>
              </div>
            </Field>
            <Field label="Select Unit">
              <select value={form.uom} onChange={e => setF('uom', e.target.value)} className={inp}>
                {uoms.length
                  ? uoms.map(u => <option key={u.id} value={u.code}>{u.code} – {u.descr}</option>)
                  : ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'PKT', 'BAG'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Field label="Category">
              <select value={form.category} onChange={e => setF('category', e.target.value)} className={inp}>
                <option value="">Select Category</option>
                {['Grocery', 'Beverage', 'Dairy', 'Snacks', 'Personal Care', 'Household', 'Electronics', 'Stationery'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Short description" className={inp} />
            </Field>
            <Field label="Item Image">
              <button className="w-full h-[38px] border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-amber-400 hover:text-amber-600 flex items-center justify-center gap-2 transition">
                <Camera size={14} /> Add Item Image
              </button>
            </Field>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-5">
            <div className="flex">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${activeTab === tab ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Pricing Tab ── */}
          {activeTab === 'Pricing' && (
            <div className="space-y-4">
              <div className={card}>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">MRP</p>
                <div className="w-52">
                  <Field label="MRP (₹)">
                    <input type="number" step="0.01" value={form.mrp} onChange={e => setF('mrp', e.target.value)} placeholder="0.00" className={inp} />
                  </Field>
                </div>
              </div>

              <div className={card}>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Sale Price</p>
                <div className="grid grid-cols-4 gap-4">
                  <Field label="Sale Price (₹)">
                    <input type="number" step="0.01" value={form.salesPrice} onChange={e => setF('salesPrice', e.target.value)} placeholder="0.00" className={inp} />
                  </Field>
                  <Field label="Tax">
                    <select value={form.salesPriceTax} onChange={e => setF('salesPriceTax', e.target.value)} className={inp}>
                      <option value="without">Without Tax</option>
                      <option value="with">With Tax</option>
                    </select>
                  </Field>
                  <Field label="Wholesale Price (₹)">
                    <input type="number" step="0.01" value={form.wholesalePrice} onChange={e => setF('wholesalePrice', e.target.value)} placeholder="0.00" className={inp} />
                  </Field>
                  <Field label="Wholesale Qty">
                    <input type="number" value={form.wholesaleQty} onChange={e => setF('wholesaleQty', e.target.value)} placeholder="0" className={inp} />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={card}>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Purchase Price</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Purchase Price (₹)">
                      <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setF('purchasePrice', e.target.value)} placeholder="0.00" className={inp} />
                    </Field>
                    <Field label="Tax">
                      <select value={form.purchasePriceTax} onChange={e => setF('purchasePriceTax', e.target.value)} className={inp}>
                        <option value="without">Without Tax</option>
                        <option value="with">With Tax</option>
                      </select>
                    </Field>
                  </div>
                </div>
                <div className={card}>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Taxes</p>
                  <Field label="Tax Rate">
                    <select value={form.taxRate} onChange={e => setF('taxRate', e.target.value)} className={inp}>
                      <option value="None">None</option>
                      <option value="GST@0%">GST @ 0%</option>
                      <option value="GST@5%">GST @ 5%</option>
                      <option value="GST@12%">GST @ 12%</option>
                      <option value="GST@18%">GST @ 18%</option>
                      <option value="GST@28%">GST @ 28%</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Stock Tab ── */}
          {activeTab === 'Stock' && (
            <div className="grid grid-cols-2 gap-4">
              <div className={card}>
                <Field label="Opening Qty">
                  <input type="number" value={form.openingQty} onChange={e => setF('openingQty', e.target.value)} placeholder="0" className={inp} />
                </Field>
              </div>
              <div className={card}>
                <Field label="At Price (₹)">
                  <input type="number" step="0.01" value={form.atPrice} onChange={e => setF('atPrice', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
              </div>
              <div className={card}>
                <Field label="As of Date">
                  <input type="date" value={form.asOfDate} onChange={e => setF('asOfDate', e.target.value)} className={inp} />
                </Field>
              </div>
              <div className={card}>
                <Field label="Minimum Stock">
                  <input type="number" value={form.minStock} onChange={e => setF('minStock', e.target.value)} placeholder="0" className={inp} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Manufacturing Tab ── */}
          {activeTab === 'Manufacturing' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Raw Material</p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center text-xs font-semibold border-r border-slate-700">S.No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">RAW MATERIAL</th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">QTY</th>
                      <th className="w-28 px-3 py-2 text-left text-xs font-semibold border-r border-slate-700">UNIT</th>
                      <th className="w-44 px-3 py-2 text-right text-xs font-semibold border-r border-slate-700">PURCHASE PRICE/UNIT (₹)</th>
                      <th className="w-40 px-3 py-2 text-right text-xs font-semibold">ESTIMATED COST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawMaterials.map((row, idx) => {
                      const estimated = (Number(row.qty) || 0) * (Number(row.purchasePrice) || 0);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="w-10 px-3 py-2 text-slate-400 text-center text-xs border-r border-slate-100">{idx + 1}</td>
                          <td className="px-3 py-2 border-r border-slate-100">
                            <input value={row.material} onChange={e => updateRawMaterial(idx, 'material', e.target.value)}
                              placeholder="Enter raw material" className="w-full text-sm text-slate-800 focus:outline-none bg-transparent placeholder:text-slate-300" />
                          </td>
                          <td className="w-24 px-3 py-2 border-r border-slate-100">
                            <input type="number" value={row.qty} onChange={e => updateRawMaterial(idx, 'qty', e.target.value)}
                              placeholder="0" className="w-full text-sm text-slate-800 focus:outline-none bg-transparent text-center placeholder:text-slate-300" />
                          </td>
                          <td className="w-28 px-3 py-2 border-r border-slate-100">
                            <select value={row.unit} onChange={e => updateRawMaterial(idx, 'unit', e.target.value)}
                              className="w-full text-sm text-slate-800 focus:outline-none bg-transparent">
                              <option value="None">None</option>
                              {['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'PKT', 'BAG'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="w-44 px-3 py-2 text-right border-r border-slate-100">
                            <input type="number" value={row.purchasePrice} onChange={e => updateRawMaterial(idx, 'purchasePrice', e.target.value)}
                              placeholder="0.00" className="w-full text-sm text-slate-400 focus:outline-none bg-transparent text-right placeholder:text-slate-300" />
                          </td>
                          <td className="w-40 px-3 py-2 text-right text-slate-400 text-sm">
                            {estimated.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setRawMaterials(r => [...r, EMPTY_ROW()])}
                  className="text-blue-600 text-sm font-semibold hover:text-blue-700 flex items-center gap-1 transition">
                  <Plus size={14} /> Add Row
                </button>
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  TOTAL: ₹{totalMaterialCost.toFixed(2)}
                </span>
              </div>

              <div>
                <button className="px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-semibold rounded-full hover:bg-blue-100 transition flex items-center gap-1.5 border border-blue-100">
                  <Plus size={13} /> Add Additional Cost
                </button>
              </div>

              <div className="flex justify-end">
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 text-sm text-slate-600">
                  Total Estimated Cost (Raw Material + Additional Cost) ={' '}
                  <span className="font-bold text-slate-800">₹{totalMaterialCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button onClick={handleSaveAndNew} disabled={!form.shortName}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition disabled:opacity-40">
            Save &amp; New
          </button>
          <button onClick={handleSave} disabled={!form.shortName}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition disabled:opacity-40">
            Save
          </button>
        </div>
    </div>
  );
}
