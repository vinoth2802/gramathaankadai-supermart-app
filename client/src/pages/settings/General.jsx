import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '../../api/settings.js';

const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800 bg-white';

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get });
  const [form, setForm] = useState({ shopName: '', address: '', phone: '', gstin: '', invoicePrefix: 'INV', currency: 'INR' });

  useEffect(() => {
    if (settings) setForm({
      shopName: settings.shopName || '',
      address: settings.address || '',
      phone: settings.phone || '',
      gstin: settings.gstin || '',
      invoicePrefix: settings.invoicePrefix || 'INV',
      currency: settings.currency || 'INR',
    });
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: SettingsAPI.save,
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved'); },
    onError: () => toast.error('Failed to save settings'),
  });

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Shop and business configuration</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-700 mb-4 text-base">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Shop Name</label>
            <input value={form.shopName} onChange={f('shopName')} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">GSTIN</label>
            <input value={form.gstin} onChange={f('gstin')} placeholder="33ABCDE1234F1Z5" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={f('phone')} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
            <textarea value={form.address} onChange={f('address')} rows={2} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Invoice Prefix</label>
              <input value={form.invoicePrefix} onChange={f('invoicePrefix')} placeholder="INV" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Currency</label>
              <input value={form.currency} onChange={f('currency')} placeholder="INR" className={inp} />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saveMut.isPending} className="mt-6 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
          <Save size={15} /> {saveMut.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

