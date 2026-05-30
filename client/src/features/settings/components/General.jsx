import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Save, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsAPI } from '@features/settings/resources/settings-service';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const inp = 'w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition';

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Icon size={16} className="text-amber-600" />
        </div>
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function Settings() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: SettingsAPI.get });
  const [form, setForm] = useState({
    shopName: '', firmName: '', address: '', pincode: '', state: '',
    phone: '', gstin: '', currency: 'INR',
  });

  useEffect(() => {
    if (settings) setForm({
      shopName: settings.shopName || '',
      firmName: settings.firmName || '',
      address:  settings.address  || '',
      pincode:  settings.pincode  || '',
      state:    settings.state    || '',
      phone:    settings.phone    || '',
      gstin:    settings.gstin    || '',
      currency: settings.currency || 'INR',
    });
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: SettingsAPI.save,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
      navigate('/dashboard');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (isLoading) return (
    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">General Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your shop and business details</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-5">

          {/* Business Info */}
          <SectionCard icon={Building2} title="Business Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Shop Name">
                <input value={form.shopName} onChange={f('shopName')} placeholder="Your Shop Name" className={inp} />
              </Field>
              <Field label="Firm / Company Name">
                <input value={form.firmName} onChange={f('firmName')} placeholder="Legal company name" className={inp} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="GSTIN">
                <input value={form.gstin} onChange={f('gstin')} placeholder="33ABCDE1234F1Z5" className={inp} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={f('phone')} placeholder="+91 XXXXX XXXXX" className={inp} />
              </Field>
              <Field label="Currency">
                <input value={form.currency} onChange={f('currency')} placeholder="INR" className={inp} />
              </Field>
            </div>
          </SectionCard>

          {/* Address */}
          <SectionCard icon={MapPin} title="Address">
            <Field label="Street Address">
              <textarea value={form.address} onChange={f('address')} rows={2}
                placeholder="Door No, Street, Area" className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pincode">
                <input value={form.pincode} onChange={f('pincode')} placeholder="6-digit pin code" maxLength={6} className={inp} />
              </Field>
              <Field label="State">
                <select value={form.state} onChange={f('state')} className={inp}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          <div className="flex items-center justify-end pt-1">
            <button type="submit" disabled={saveMut.isPending}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">
              <Save size={15} />
              {saveMut.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
