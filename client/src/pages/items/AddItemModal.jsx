import { useState } from 'react';
import { X, Search, Settings, Plus, Trash2 } from 'lucide-react';

const TABS = ['Pricing', 'Stock', 'Manufacturing'];

const EMPTY_FORM = {
  shortName: '', hsnCode: '', itemCode: '', uom: 'PCS', secondaryUnit: '', category: '',
  description: '', mrp: '', salesPrice: '', salesPriceTax: 'with',
  wholesalePrice: '', wholesaleQty: '', purchasePrice: '', purchasePriceTax: 'with',
  taxRate: 'None', openingQty: '', atPrice: '', asOfDate: '', location: '', minStock: '', reorderLevel: '',
};

const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), material: '', qty: '', unit: 'None', purchasePrice: 0 });

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 text-sm text-slate-800 bg-white';
const lbl = 'block text-xs font-semibold text-slate-500 mb-1';

function Field({ label, required, children }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function AddItemModal({ onClose, onSave, onSaveAndNew, uoms = [], editData = null, existingItems = [], initialType = 'Product', categories = [] }) {
  const [productType, setProductType] = useState(editData?.type || initialType);
  const [isBulk, setIsBulk]           = useState(editData?.isBulk ?? false);
  const [activeTab, setActiveTab]      = useState('Pricing');
  const [form, setForm] = useState(() => editData ? {
    ...EMPTY_FORM,
    shortName:        editData.shortName        || '',
    description:      editData.description      || '',
    hsnCode:          editData.hsnCode          || '',
    itemCode:         editData.itemCode         || '',
    uom:              editData.uom              || 'PCS',
    secondaryUnit:    editData.secondaryUnit    || '',
    category:         editData.category         || '',
    mrp:              editData.mrp              ?? '',
    salesPrice:       editData.salesPrice       ?? '',
    salesPriceTax:    editData.salesPriceTax    || 'with',
    wholesalePrice:   editData.wholesalePrice   ?? '',
    wholesaleQty:     editData.wholesaleQty     ?? '',
    purchasePrice:    editData.purchasePrice    ?? '',
    purchasePriceTax: editData.purchasePriceTax || 'with',
    taxRate:          editData.gstRate ? `GST@${editData.gstRate}%` : 'None',
    openingQty:       editData.stock            ?? '',
    atPrice:          editData.atPrice          ?? '',
    asOfDate:         editData.asOfDate         ? editData.asOfDate.slice(0, 10) : '',
    location:         editData.location         || '',
    minStock:         editData.minStock          ?? '',
    reorderLevel:     editData.reorderLevel     ?? '',
  } : { ...EMPTY_FORM });

  const [rawMaterials, setRawMaterials] = useState([EMPTY_ROW()]);
  const [hoveredRow, setHoveredRow] = useState(null);

  const deleteRawMaterial = (idx) =>
    setRawMaterials(r => r.filter((_, i) => i !== idx));

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateRawMaterial = (idx, field, value) =>
    setRawMaterials(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const totalMaterialCost = rawMaterials.reduce(
    (s, r) => s + (Number(r.qty) || 0) * (Number(r.purchasePrice) || 0), 0,
  );

  const buildPayload = () => ({
    shortName:        form.shortName,
    type:             productType,
    isBulk,
    secondaryUnit:    isBulk ? (form.secondaryUnit || '') : '',
    hsnCode:          form.hsnCode          || '',
    itemCode:         form.itemCode         || '',
    uom:              form.uom              || 'PCS',
    category:         form.category         || '',
    description:      form.description      || '',
    mrp:              Number(form.mrp)              || 0,
    salesPrice:       Number(form.salesPrice)       || 0,
    salesPriceTax:    form.salesPriceTax    || 'with',
    wholesalePrice:   Number(form.wholesalePrice)   || 0,
    wholesaleQty:     Number(form.wholesaleQty)     || 0,
    purchasePrice:    Number(form.purchasePrice)    || 0,
    purchasePriceTax: form.purchasePriceTax || 'with',
    gstRate:          form.taxRate === 'None' ? 0 : parseFloat(form.taxRate.replace('GST@', '').replace('%', '')) || 0,
    stock:            Number(form.openingQty)       || 0,
    atPrice:          Number(form.atPrice)          || 0,
    asOfDate:         form.asOfDate         || '',
    location:         form.location         || '',
    minStock:         Number(form.minStock)         || 0,
    reorderLevel:     Number(form.reorderLevel)     || 10,
    batch:            '',
    expiryDate:       '',
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
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{editData ? 'Edit Item' : 'Add Item'}</h2>

          {/* Bulk toggle — centred */}
          <div className={`absolute left-1/2 -translate-x-1/2 flex items-center bg-slate-100 rounded-full p-1 ${productType === 'Service' ? 'opacity-40 pointer-events-none' : ''}`}>
            {[{ label: 'NON BULK', value: false }, { label: 'BULK', value: true }].map(({ label, value }) => (
              <button key={label} onClick={() => setIsBulk(value)}
                className={`px-4 py-1 rounded-full text-xs font-semibold transition whitespace-nowrap ${isBulk === value ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-full p-1">
              {['Product', 'Service'].map(t => (
                <button key={t} onClick={() => { setProductType(t); if (t === 'Service') setIsBulk(false); }}
                  className={`px-4 py-1 rounded-full text-sm font-semibold transition ${productType === t ? 'bg-green-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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

          {/* Fields — 4-column layout with pipe separators */}
          <div className="grid grid-cols-4 divide-x divide-slate-200 mb-5">

            {/* Col 1: Item Name + Description */}
            <div className="flex flex-col gap-4 pr-5">
              <Field label="Item Name" required>
                <input value={form.shortName} onChange={e => setF('shortName', e.target.value)} placeholder="Enter item name" className={inp} />
              </Field>
              <Field label="Description">
                <input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Short description" className={inp} />
              </Field>
            </div>

            {/* Col 2: Category */}
            <div className="flex flex-col gap-4 px-5">
              <Field label="Category">
                <select value={form.category} onChange={e => setF('category', e.target.value)} className={inp}>
                  <option value="General">General</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Col 3: Item Code + HSN Code */}
            <div className="flex flex-col gap-4 px-5">
              <Field label="Item Code">
                <div className="flex items-center w-full border border-slate-300 rounded-lg overflow-hidden focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-100 bg-white">
                  <input
                    value={form.itemCode}
                    onChange={e => setF('itemCode', e.target.value)}
                    placeholder="e.g. ITM001"
                    className="flex-1 px-3 py-2 text-sm text-slate-800 focus:outline-none bg-transparent"
                  />
                  <span className="w-px h-5 bg-slate-300 shrink-0" />
                  <button
                    onClick={autoAssignCode}
                    className="px-2.5 py-2 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition whitespace-nowrap"
                  >
                    Assign
                  </button>
                </div>
              </Field>
              <Field label="HSN Code">
                <div className="relative">
                  <input value={form.hsnCode} onChange={e => setF('hsnCode', e.target.value)} placeholder="Search HSN..." className={inp + ' pr-9'} />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>
            </div>

            {/* Col 4: Select Unit + Secondary Unit (Bulk only) */}
            <div className="flex flex-col gap-4 pl-5">
              <Field label="Select Unit">
                <select value={form.uom} onChange={e => setF('uom', e.target.value)} className={inp}>
                  {uoms.length
                    ? uoms.map(u => <option key={u.id} value={u.code}>{u.code} – {u.descr}</option>)
                    : ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'PKT', 'BAG'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              {isBulk && (
                <Field label="Secondary Unit">
                  <select value={form.secondaryUnit} onChange={e => setF('secondaryUnit', e.target.value)} className={inp}>
                    <option value="">-- None --</option>
                    {uoms.length
                      ? uoms.map(u => <option key={u.id} value={u.code}>{u.code} – {u.descr}</option>)
                      : ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'PKT', 'BAG'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              )}
            </div>

          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-5">
            <div className="flex">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2.5 text-sm font-semibold transition rounded-t-lg ${activeTab === tab ? 'bg-green-800 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Pricing Tab ── */}
          {activeTab === 'Pricing' && (
            <div className="grid grid-cols-3 gap-4">

              {/* Card 1 — MRP · Sale Price · Purchase Price */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Prices</p>
                <Field label="MRP (₹)">
                  <input type="number" step="0.01" value={form.mrp} onChange={e => setF('mrp', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
                <Field label="Sale Price (₹)">
                  <input type="number" step="0.01" value={form.salesPrice} onChange={e => setF('salesPrice', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
                <Field label="Purchase Price (₹)">
                  <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setF('purchasePrice', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
              </div>

              {/* Card 2 — Wholesale */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Wholesale</p>
                <Field label="Wholesale Price (₹)">
                  <input type="number" step="0.01" value={form.wholesalePrice} onChange={e => setF('wholesalePrice', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
                <Field label="Wholesale Qty">
                  <input type="number" value={form.wholesaleQty} onChange={e => setF('wholesaleQty', e.target.value)} placeholder="0" className={inp} />
                </Field>
              </div>

              {/* Card 3 — Tax */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Tax</p>
                <Field label="Sale Price Tax">
                  <select value={form.salesPriceTax} onChange={e => setF('salesPriceTax', e.target.value)} className={inp}>
                    <option value="without">Without Tax</option>
                    <option value="with">With Tax</option>
                  </select>
                </Field>
                <Field label="Purchase Price Tax">
                  <select value={form.purchasePriceTax} onChange={e => setF('purchasePriceTax', e.target.value)} className={inp}>
                    <option value="without">Without Tax</option>
                    <option value="with">With Tax</option>
                  </select>
                </Field>
                <Field label="GST Rate">
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
          )}

          {/* ── Stock Tab ── */}
          {activeTab === 'Stock' && (
            <div className="grid grid-cols-3 gap-4">

              {/* Card 1 — Opening Stock */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Opening Stock</p>
                <Field label="Opening Qty">
                  <input type="number" value={form.openingQty} onChange={e => setF('openingQty', e.target.value)} placeholder="0" className={inp} />
                </Field>
                <Field label="At Price (₹)">
                  <input type="number" step="0.01" value={form.atPrice} onChange={e => setF('atPrice', e.target.value)} placeholder="0.00" className={inp} />
                </Field>
              </div>

              {/* Card 2 — Date & Location */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-sky-700 uppercase tracking-wide">Date & Location</p>
                <Field label="As of Date">
                  <input type="date" value={form.asOfDate} onChange={e => setF('asOfDate', e.target.value)} className={inp} />
                </Field>
                <Field label="Location">
                  <input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Shelf A3" className={inp} />
                </Field>
              </div>

              {/* Card 3 — Stock Limits */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Stock Limits</p>
                <Field label="Minimum Stock">
                  <input type="number" value={form.minStock} onChange={e => setF('minStock', e.target.value)} placeholder="0" className={inp} />
                </Field>
                <Field label="Re Order Level">
                  <input type="number" value={form.reorderLevel} onChange={e => setF('reorderLevel', e.target.value)} placeholder="0" className={inp} />
                </Field>
              </div>

            </div>
          )}

          {/* ── Manufacturing Tab ── */}
          {activeTab === 'Manufacturing' && (
            <div className="space-y-4">
              {!isBulk && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <p className="text-sm font-semibold text-slate-500">Raw material entry is only available for <span className="text-green-800">BULK</span> items.</p>
                  <p className="text-xs text-slate-400">Switch to <strong>BULK</strong> in the header to add raw materials.</p>
                </div>
              )}
              {isBulk && <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Raw Material</p>}

              {isBulk && (
                <>
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
                            <tr key={row.id} className="hover:bg-slate-50"
                              onMouseEnter={() => setHoveredRow(idx)}
                              onMouseLeave={() => setHoveredRow(null)}>
                              <td className="w-10 px-3 py-2 text-center text-xs border-r border-slate-100">
                                {hoveredRow === idx
                                  ? <button onClick={() => deleteRawMaterial(idx)} className="text-rose-500 hover:text-rose-700 transition"><Trash2 size={13} /></button>
                                  : <span className="text-slate-400">{idx + 1}</span>
                                }
                              </td>
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
                </>
              )}
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
