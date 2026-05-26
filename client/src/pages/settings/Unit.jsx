import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler, Save, RotateCcw, Plus, Trash2, ArrowRightLeft, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '../../api/settings.js';
import http from '../../api/client.js';

const DEFAULTS = {
  defaultCode:      'PCS',
  enableConversion: false,
  enableSecondary:  false,
};

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

export default function SettingsUnit() {
  const qc = useQueryClient();

  // Settings
  const [form, setForm] = useState(DEFAULTS);
  const { data: settingsData } = useQuery({ queryKey: ['settings-unit'], queryFn: SettingsAPI.getUnit });
  useEffect(() => { if (settingsData) setForm({ ...DEFAULTS, ...settingsData }); }, [settingsData]);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Unit list
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => http.get('/units') });

  const [newFull, setNewFull] = useState('');
  const [newShort, setNewShort] = useState('');
  const [editId, setEditId] = useState(null);
  const [editFull, setEditFull] = useState('');
  const [editShort, setEditShort] = useState('');

  const addUnit = async () => {
    if (!newFull.trim() || !newShort.trim()) { toast.error('Both full name and short name are required'); return; }
    try {
      await http.post('/units', { fullName: newFull.trim(), shortName: newShort.trim() });
      qc.invalidateQueries({ queryKey: ['units'] });
      setNewFull(''); setNewShort('');
      toast.success('Unit added');
    } catch (err) {
      toast.error(err?.error || 'Failed to add unit');
    }
  };

  const startEdit = (unit) => {
    setEditId(unit.id);
    setEditFull(unit.descr);
    setEditShort(unit.code);
  };

  const saveEdit = async (id) => {
    if (!editFull.trim() || !editShort.trim()) { toast.error('Both fields required'); return; }
    try {
      await http.put(`/units/${id}`, { fullName: editFull.trim(), shortName: editShort.trim() });
      qc.invalidateQueries({ queryKey: ['units'] });
      setEditId(null);
      toast.success('Unit updated');
    } catch (err) {
      toast.error(err?.error || 'Failed to update unit');
    }
  };

  const deleteUnit = async (id) => {
    try {
      await http.delete(`/units/${id}`);
      qc.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit deleted');
    } catch (err) {
      toast.error(err?.error || 'Cannot delete — unit may be in use');
    }
  };

  const handleSave = async () => {
    try { await SettingsAPI.saveUnit(form); toast.success('Unit settings saved'); }
    catch { toast.error('Failed to save unit settings'); }
  };
  const handleReset = async () => {
    try { await SettingsAPI.saveUnit(DEFAULTS); setForm({ ...DEFAULTS }); toast.success('Reset to defaults'); }
    catch { toast.error('Failed to reset'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Ruler size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Unit Settings</h1>
              <p className="text-xs text-slate-500">Manage units of measure and default preferences</p>
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

          {/* Default unit */}
          <SectionCard icon={Ruler} title="Default Unit">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Default unit for new items
              </label>
              <select value={form.defaultCode} onChange={e => set('defaultCode', e.target.value)} className={inp}>
                {units.map(u => (
                  <option key={u.id} value={u.code}>{u.code} — {u.descr}</option>
                ))}
              </select>
            </div>
          </SectionCard>

          {/* Features */}
          <SectionCard icon={ArrowRightLeft} title="Unit Features"
            subtitle="Enable advanced unit capabilities"
            iconColor="text-blue-600" iconBg="bg-blue-50">
            <Toggle
              label="Enable secondary units (bulk ↔ retail)"
              hint="e.g. 1 Box = 12 PCS — lets you buy in boxes and sell in pieces"
              checked={form.enableSecondary}
              onChange={v => set('enableSecondary', v)}
            />
            <Toggle
              label="Enable unit conversions"
              hint="Convert between units automatically — e.g. 1 KG = 1000 G"
              checked={form.enableConversion}
              onChange={v => set('enableConversion', v)}
            />
          </SectionCard>

          {/* Unit list */}
          <SectionCard icon={Layers} title="Units of Measure"
            subtitle="All units available for items"
            iconColor="text-emerald-600" iconBg="bg-emerald-50">

            {/* Add new */}
            <div className="flex items-center gap-2">
              <input
                value={newShort} onChange={e => setNewShort(e.target.value.toUpperCase())}
                placeholder="Short (e.g. KG)"
                maxLength={10}
                className={`${inp_sm} w-28`}
              />
              <input
                value={newFull} onChange={e => setNewFull(e.target.value)}
                placeholder="Full name (e.g. Kilogram)"
                className={`${inp_sm} flex-1`}
                onKeyDown={e => e.key === 'Enter' && addUnit()}
              />
              <button type="button" onClick={addUnit}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition shrink-0">
                <Plus size={13} /> Add
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 mt-1">
              {units.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No units added yet</p>
              )}
              {units.map(u => (
                <div key={u.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white transition">
                  {editId === u.id ? (
                    <>
                      <input value={editShort} onChange={e => setEditShort(e.target.value.toUpperCase())}
                        className={`${inp_sm} w-24`} maxLength={10} />
                      <input value={editFull} onChange={e => setEditFull(e.target.value)}
                        className={`${inp_sm} flex-1`} />
                      <button onClick={() => saveEdit(u.id)}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition">
                        Save
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold min-w-[42px] justify-center">
                        {u.code}
                      </span>
                      <span className="flex-1 text-sm text-slate-700">{u.descr}</span>
                      {form.defaultCode === u.code && (
                        <span className="text-xs text-emerald-600 font-semibold">Default</span>
                      )}
                      <button onClick={() => startEdit(u)}
                        className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded transition">
                        Edit
                      </button>
                      <button onClick={() => deleteUnit(u.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex justify-end pt-1 pb-4">
            <button onClick={handleSave} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} /> Save Unit Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
