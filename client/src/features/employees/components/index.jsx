import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserCheck, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  X, User, Phone, Mail, MapPin, Briefcase, Building2, Calendar,
  Banknote, FileText, BadgeCheck, ChevronDown, Check,
  ChevronLeft, ChevronRight, TrendingUp, Gift, Star, Users, ArrowUp, CalendarCheck, RotateCcw,
} from 'lucide-react';
import { EmployeesAPI }     from '@features/employees/resources/employees-service';
import { DesignationsAPI }  from '@features/employees/resources/employees-service';
import { SalaryRecordsAPI } from '@features/employees/resources/employees-service';
import { AttendanceAPI }    from '@features/employees/resources/employees-service';
import ConfirmDialog        from '@components/ConfirmDialog';
import { COLOR, PAY_STATUS } from '@constants';
import { fmtINR, fmtDateShort } from '@utils/formatters';

/* ─── Salary constants ─── */
const TYPE_META = {
  salary:    { label: 'Salary',    icon: Banknote,   color: 'blue'    },
  increment: { label: 'Increment', icon: TrendingUp, color: 'emerald' },
  incentive: { label: 'Incentive', icon: Star,       color: 'amber'   },
  bonus:     { label: 'Bonus',     icon: Gift,       color: 'violet'  },
};

const EMPTY_FORM = {
  name:'', employeeCode:'', phone:'', email:'',
  designation:'', department:'', dateOfJoining:'',
  basicSalary:'', salaryType:'perMonth', address:'', notes:'',
  employeeType:'dailyWages',
};

const fmt     = fmtINR;
const fmtDate = fmtDateShort;
const nextPayStatus = s => s === 'unpaid' ? 'paid' : s === 'paid' ? 'partial' : 'unpaid';

/* ─── Shared form atoms ─── */
function Field({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </label>
      {children}
    </div>
  );
}
function Input({ className = '', ...props }) {
  return (
    <input className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800
      focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
      placeholder:text-slate-300 ${className}`} {...props} />
  );
}
function Textarea({ ...props }) {
  return (
    <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800
      focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
      placeholder:text-slate-300 resize-none" {...props} />
  );
}

/* ─── Designation dropdown ─── */
function DesignationSelect({ value, onChange }) {
  const qc = useQueryClient();
  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn:  () => DesignationsAPI.getAll(),
  });
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() =>
    designations.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [designations, search],
  );

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await DesignationsAPI.create(newName.trim());
      qc.invalidateQueries({ queryKey: ['designations'] });
      onChange(res.name);
      setNewName(''); setAdding(false); setOpen(false);
      toast.success('Designation added');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add designation');
    } finally { setSaving(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); setAdding(false); }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition
          focus:outline-none focus:ring-2 focus:ring-amber-400
          ${open ? 'border-amber-400 ring-2 ring-amber-400' : 'border-slate-200'}
          ${value ? 'text-slate-800' : 'text-slate-300'}`}
      >
        <span>{value || 'Select designation…'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200
                  focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400 text-center">No designations found</li>
            ) : filtered.map(d => (
              <li key={d.id}>
                <button type="button"
                  onClick={() => { onChange(d.name); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 hover:text-amber-700 transition text-left">
                  {d.name}
                  {value === d.name && <Check size={13} className="text-amber-500 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 p-2">
            {adding ? (
              <div className="flex gap-1">
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                  placeholder="e.g. Cashier"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-amber-400
                    focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <button type="button" onClick={handleAdd} disabled={saving || !newName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition">
                  {saving ? '…' : 'Add'}
                </button>
                <button type="button" onClick={() => { setAdding(false); setNewName(''); }}
                  className="px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs
                  font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition">
                <Plus size={13} /> Add Designation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Employee Add / Edit Modal ─── */
function EmployeeModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState(
    employee ? {
      name:             employee.name          || '',
      employeeCode:     employee.employeeCode  || '',
      phone:            employee.phone         || '',
      email:            employee.email         || '',
      designation:      employee.designation   || '',
      department:       employee.department    || '',
      dateOfJoining:    employee.dateOfJoining
        ? new Date(employee.dateOfJoining).toISOString().slice(0, 10) : '',
      basicSalary:      employee.basicSalary      != null ? String(employee.basicSalary)      : '',
      salaryType:       employee.salaryType        || 'perMonth',
      address:          employee.address           || '',
      notes:            employee.notes             || '',
      employeeType:     employee.employeeType      || 'dailyWages',
    } : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const dec = v => v ? Number(v) : 0;
      const payload = {
        ...form,
        basicSalary:      dec(form.basicSalary),
        dateOfJoining:    form.dateOfJoining || null,
      };
      if (employee) { await EmployeesAPI.update(employee.id, payload); toast.success('Employee updated'); }
      else          { await EmployeesAPI.create(payload);              toast.success('Employee added');   }
      onSaved(); onClose();
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to save employee'); }
    finally       { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full mx-4 overflow-hidden flex flex-col max-h-[90vh] ${form.employeeType === 'regular' ? 'max-w-2xl' : 'max-w-xl'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex flex-col gap-4">

          {/* Employee Type Toggle */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Employee Type</label>
            <div className="flex rounded-xl border border-slate-200 text-sm font-semibold w-fit overflow-hidden">
              <button type="button"
                onClick={() => set('employeeType', 'dailyWages')}
                className={`px-6 py-2 transition ${form.employeeType !== 'regular' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                Daily Wages
              </button>
              <button type="button"
                onClick={() => { set('employeeType', 'regular'); set('salaryType', 'perMonth'); }}
                className={`px-6 py-2 transition ${form.employeeType === 'regular' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                Regular
              </button>
            </div>
          </div>

          {/* Personal details — 2-col grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Full Name *" icon={User}>
                <Input placeholder="e.g. Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
            </div>
            <Field label="Employee Code" icon={BadgeCheck}>
              <Input placeholder="e.g. EMP001" value={form.employeeCode} onChange={e => set('employeeCode', e.target.value)} />
            </Field>
            <Field label="Phone" icon={Phone}>
              <Input placeholder="e.g. 9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Email" icon={Mail}>
              <Input type="email" placeholder="e.g. ravi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Designation" icon={Briefcase}>
              <DesignationSelect value={form.designation} onChange={v => set('designation', v)} />
            </Field>
            <Field label="Department" icon={Building2}>
              <Input placeholder="e.g. Sales" value={form.department} onChange={e => set('department', e.target.value)} />
            </Field>
            <Field label="Date of Joining" icon={Calendar}>
              <Input type="date" value={form.dateOfJoining} onChange={e => set('dateOfJoining', e.target.value)} />
            </Field>
          </div>

          {/* Daily Wages: basic salary + type toggle */}
          {form.employeeType !== 'regular' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Banknote size={12} /> Basic Salary (₹)</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" placeholder="0" value={form.basicSalary}
                  onChange={e => set('basicSalary', e.target.value)} className="flex-1" />
                <button type="button"
                  onClick={() => set('salaryType', form.salaryType === 'perMonth' ? 'perDay' : 'perMonth')}
                  className={`flex items-center rounded-lg border text-xs font-semibold px-1 py-1 gap-1 transition-colors select-none whitespace-nowrap ${
                    form.salaryType === 'perDay' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
                  }`}>
                  <span className={`px-2 py-1 rounded-md transition-colors ${form.salaryType === 'perDay' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>/Day</span>
                  <span className={`px-2 py-1 rounded-md transition-colors ${form.salaryType === 'perMonth' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>/Month</span>
                </button>
              </div>
            </div>
          )}

          {/* Regular: Salary Structure */}
          {form.employeeType === 'regular' && (
            <div className="rounded-xl border border-emerald-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Banknote size={13} /> Monthly Salary
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  ₹{Number(form.basicSalary || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-4 bg-emerald-50/30">
                <Field label="Basic Pay (₹)" icon={Banknote}>
                  <Input type="number" min="0" placeholder="0" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* Address & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Address" icon={MapPin}>
                <Input placeholder="Street, City, State" value={form.address} onChange={e => set('address', e.target.value)} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes" icon={FileText}>
                <Textarea placeholder="Any additional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition">
            {saving ? 'Saving…' : employee ? 'Update' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Salary Record Modal ─── */
function AddSalaryModal({ type, employee, onClose, onSaved }) {
  const meta  = TYPE_META[type];
  const color = COLOR[meta.color];
  const Icon  = meta.icon;
  const [form, setForm] = useState({
    amount:'', effectiveDate: new Date().toISOString().slice(0,10),
    paidDate:'', payStatus:'unpaid', description:'',
  });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.amount || !form.effectiveDate) { toast.error('Amount and effective date are required'); return; }
    setSaving(true);
    try {
      await SalaryRecordsAPI.create({
        employeeId:     employee.id,
        type,
        amount:         Number(form.amount),
        previousSalary: type === 'increment' ? Number(employee.basicSalary) : null,
        effectiveDate:  form.effectiveDate,
        paidDate:       form.paidDate   || null,
        payStatus:      form.payStatus,
        description:    form.description || null,
      });
      toast.success(`${meta.label} added`);
      onSaved(); onClose();
    } catch { toast.error(`Failed to save ${meta.label.toLowerCase()}`); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center`}><Icon size={16} className={color.text} /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Add {meta.label}</h2>
              <p className="text-xs text-slate-500">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          {type === 'increment' && (
            <div className={`rounded-xl px-4 py-3 ${color.light} flex items-center justify-between`}>
              <span className="text-xs text-slate-600">Current Salary</span>
              <span className="text-sm font-bold text-slate-800">
                {fmt(employee.basicSalary)}
                <span className="text-xs text-slate-400 ml-1 font-normal">{employee.salaryType === 'perDay' ? '/day' : '/mo'}</span>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Banknote size={12} /> {type === 'increment' ? 'New Salary (₹) *' : 'Amount (₹) *'}
            </label>
            <input type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            {type === 'increment' && form.amount && Number(form.amount) > Number(employee.basicSalary) && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <ArrowUp size={11} />
                +{fmt(Number(form.amount) - Number(employee.basicSalary))}
                {' '}({(((Number(form.amount) - Number(employee.basicSalary)) / Number(employee.basicSalary)) * 100).toFixed(1)}% raise)
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Calendar size={12} /> Created Date *</label>
            <input type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Calendar size={12} /> Paid Date</label>
            <input type="date" value={form.paidDate} onChange={e => set('paidDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <div className="flex gap-2">
              {[['unpaid','Unpaid'],['paid','Paid'],['partial','Partial']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => set('payStatus', val)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition ${
                    form.payStatus === val
                      ? PAY_STATUS[val].cls + ' border-transparent'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <FileText size={12} /> {type === 'increment' ? 'Reason' : 'Description'}
            </label>
            <textarea rows={2}
              placeholder={type === 'increment' ? 'e.g. Annual appraisal' : 'e.g. Diwali bonus'}
              value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-300" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition ${color.btn}`}>
            {saving ? 'Saving…' : `Add ${meta.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Salary Records Table ─── */
function RecordsTable({ records, type, monthLabel, onDelete, onStatusUpdate }) {
  const isAll = type === 'all';
  const meta  = isAll ? null : TYPE_META[type];
  const color = isAll ? null : COLOR[meta.color];
  if (records.length === 0) {
    const Icon = isAll ? Banknote : meta.icon;
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
        <Icon size={36} className="opacity-20" />
        <p className="text-sm">No {isAll ? '' : meta.label.toLowerCase() + ' '}records for {monthLabel}</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
        <tr>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Created Date</th>
          {isAll && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>}
          {!isAll && type === 'increment' && (
            <>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Previous</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">New Salary</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Change</th>
            </>
          )}
          {(isAll || type !== 'increment') && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>}
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Paid Date</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{!isAll && type === 'increment' ? 'Reason' : 'Description'}</th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {records.map(r => {
          const rowMeta  = TYPE_META[r.type] ?? TYPE_META.salary;
          const rowColor = COLOR[rowMeta.color];
          const change   = !isAll && type === 'increment' && r.previousSalary != null
            ? Number(r.amount) - Number(r.previousSalary) : null;
          const ps       = PAY_STATUS[r.payStatus] ?? PAY_STATUS.unpaid;
          const RowIcon  = rowMeta.icon;
          return (
            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(r.effectiveDate)}</td>
              {isAll && (
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rowColor.light} ${rowColor.text}`}>
                    <RowIcon size={11} /> {rowMeta.label}
                  </span>
                </td>
              )}
              {!isAll && type === 'increment' && (
                <>
                  <td className="px-4 py-3 text-slate-500">{r.previousSalary != null ? fmt(r.previousSalary) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(r.amount)}</td>
                  <td className="px-4 py-3">
                    {change !== null && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {change >= 0 ? '+' : ''}{fmt(change)}
                        {r.previousSalary > 0 && (
                          <span className="ml-0.5 opacity-70">
                            ({change >= 0 ? '+' : ''}{((change / Number(r.previousSalary)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </>
              )}
              {(isAll || type !== 'increment') && (
                <td className="px-4 py-3"><span className={`font-semibold ${isAll ? rowColor.text : color.text}`}>{fmt(r.amount)}</span></td>
              )}
              <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.paidDate)}</td>
              <td className="px-4 py-3">
                <button
                  title="Click to change status"
                  onClick={() => onStatusUpdate(r.id, nextPayStatus(r.payStatus ?? 'unpaid'))}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition hover:opacity-75 ${ps.cls}`}
                >
                  {ps.label}
                </button>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.description || '—'}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onDelete(r.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── Attendance Tab ─── */
const ATT_STATUS = {
  present: { label: 'P', cls: 'bg-emerald-100 text-emerald-700', full: 'Present'  },
  halfday: { label: 'H', cls: 'bg-amber-100 text-amber-700',     full: 'Half Day' },
  absent:  { label: 'A', cls: 'bg-rose-100 text-rose-600',       full: 'Absent'   },
  leave:   { label: 'L', cls: 'bg-indigo-100 text-indigo-600',   full: 'Leave'    },
};
const ATT_CYCLE = ['present', 'halfday', 'absent', 'leave'];

function AttendanceTab({ employeeId, month, basicSalary, salaryType }) {
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance-emp', employeeId, month],
    queryFn:  () => AttendanceAPI.getByEmployee(employeeId, month),
    enabled:  !!employeeId && !!month,
  });

  const markMut = useMutation({
    mutationFn: ({ date, status }) => AttendanceAPI.save({ employeeId, date, status }),
    onSuccess:  () => { refetch(); qc.invalidateQueries({ queryKey: ['attendance-summary'] }); },
    onError:    () => toast.error('Failed to mark attendance'),
  });

  const delMut = useMutation({
    mutationFn: (id) => AttendanceAPI.delete(id),
    onSuccess:  () => { refetch(); qc.invalidateQueries({ queryKey: ['attendance-summary'] }); },
    onError:    () => toast.error('Failed to clear day'),
  });

  const handleDayClick = (day, rec) => {
    const [y, m] = month.split('-').map(Number);
    const date = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if (!rec) {
      markMut.mutate({ date, status: 'present' });
    } else {
      const idx = ATT_CYCLE.indexOf(rec.status);
      if (idx === ATT_CYCLE.length - 1) {
        delMut.mutate(rec.id);
      } else {
        markMut.mutate({ date, status: ATT_CYCLE[idx + 1] });
      }
    }
  };

  const handleReset = async () => {
    if (!records.length) return;
    setResetting(true);
    try {
      await Promise.all(records.map(r => AttendanceAPI.delete(r.id)));
      refetch();
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      toast.success('Attendance reset');
    } catch { toast.error('Failed to reset attendance'); }
    finally   { setResetting(false); }
  };

  const { days, summary, earned } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const map = {};
    records.forEach(r => { map[new Date(r.date).getDate()] = r; });
    const days     = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, rec: map[i + 1] ?? null }));
    const present  = records.filter(r => r.status === 'present').length;
    const halfday  = records.filter(r => r.status === 'halfday').length;
    const absent   = records.filter(r => r.status === 'absent').length;
    const leave    = records.filter(r => r.status === 'leave').length;
    const payable  = present + halfday * 0.5;
    const salary   = salaryType === 'perDay'
      ? Number(basicSalary) * payable
      : Number(basicSalary) * (payable / daysInMonth);
    return { days, summary: { present, halfday, absent, leave, daysInMonth }, earned: Math.round(salary) };
  }, [records, month, basicSalary, salaryType]);

  if (isLoading) return <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading...</div>;

  const busy = markMut.isPending || delMut.isPending;

  return (
    <div className="p-4">
      {/* Summary row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {[
          { lbl: 'Present',      val: summary.present,                         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Half Day',     val: summary.halfday,                         cls: 'bg-amber-50 text-amber-700 border-amber-200'       },
          { lbl: 'Absent',       val: summary.absent,                          cls: 'bg-rose-50 text-rose-600 border-rose-200'          },
          { lbl: 'Leave',        val: summary.leave,                           cls: 'bg-indigo-50 text-indigo-600 border-indigo-200'    },
          { lbl: 'Payable Days', val: summary.present + summary.halfday * 0.5, cls: 'bg-slate-50 text-slate-700 border-slate-200'       },
          { lbl: 'Earned',       val: `₹${earned.toLocaleString('en-IN')}`,    cls: 'bg-blue-50 text-blue-700 border-blue-200'          },
        ].map(({ lbl, val, cls }) => (
          <div key={lbl} className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex gap-1.5 items-center ${cls}`}>
            <span className="opacity-60">{lbl}</span>
            <span className="font-bold">{val}</span>
          </div>
        ))}
        <button onClick={handleReset} disabled={resetting || !records.length}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 transition disabled:opacity-40 shrink-0">
          <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} /> Reset
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {Object.entries(ATT_STATUS).map(([key, s]) => (
          <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label} — {s.full}</span>
        ))}
        <span className="text-xs text-slate-400">· Click to cycle, click last to clear</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
        ))}
        {Array.from({ length: new Date(month + '-01').getDay() }).map((_, i) => <div key={'o'+i} />)}
        {days.map(({ day, rec }) => {
          const s = rec ? (ATT_STATUS[rec.status] ?? ATT_STATUS.present) : null;
          return (
            <button key={day} onClick={() => handleDayClick(day, rec)} disabled={busy}
              className={`rounded-lg p-1.5 flex flex-col items-center gap-0.5 border transition active:scale-95 ${
                s ? `${s.cls} border-transparent hover:opacity-75`
                  : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-400'
              } ${busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <span className="text-xs font-bold">{day}</span>
              {s && <span className="text-[10px] font-semibold leading-none">{s.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Bulk Salary Modal ─── */
function BulkSalaryModal({ defaultMonth, employees, onClose }) {
  const qc = useQueryClient();
  const [month, setMonth]   = useState(defaultMonth);
  const [saving, setSaving] = useState(false);

  const mLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  };
  const fmtYM = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const goPrev = () => { const [y,m] = month.split('-').map(Number); setMonth(fmtYM(new Date(y,m-2,1))); };
  const goNext = () => { const [y,m] = month.split('-').map(Number); setMonth(fmtYM(new Date(y,m,1))); };

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['attendance-summary', month],
    queryFn:  () => AttendanceAPI.getSummary(month),
  });
  const [selected, setSelected] = useState(new Set());

  const rows = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return summary
      .filter(s => s.present > 0 || s.halfday > 0)
      .map(s => {
        const emp = employees.find(e => e.id === s.id);
        if (!emp) return null;
        const payableDays = s.present + s.halfday * 0.5;
        const amount = emp.salaryType === 'perDay'
          ? Number(emp.basicSalary) * payableDays
          : Number(emp.basicSalary) * (payableDays / daysInMonth);
        return {
          id: s.id, name: s.name, designation: s.designation, isActive: s.isActive,
          basicSalary: emp.basicSalary, salaryType: emp.salaryType,
          present: s.present, halfday: s.halfday, absent: s.absent, leave: s.leave,
          payableDays, daysInMonth, amount: Math.round(amount),
        };
      }).filter(Boolean);
  }, [summary, employees, month]);

  useEffect(() => { setSelected(new Set(rows.map(r => r.id))); }, [rows]);

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  const totalPayable = rows.filter(r => selected.has(r.id)).reduce((s, r) => s + r.amount, 0);

  const handleProcess = async () => {
    const toProcess = rows.filter(r => selected.has(r.id));
    if (!toProcess.length) { toast.error('Select at least one employee'); return; }
    setSaving(true);
    try {
      const effectiveDate = month + '-01';
      await Promise.all(toProcess.map(r => SalaryRecordsAPI.create({
        employeeId: r.id, type: 'salary', amount: r.amount,
        effectiveDate, description: `Monthly Salary — ${mLabel(month)}`,
      })));
      toast.success(`Salary saved for ${toProcess.length} employee${toProcess.length > 1 ? 's' : ''}`);
      qc.invalidateQueries({ queryKey: ['salary-records'] });
      onClose();
    } catch { toast.error('Failed to save salary'); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bulk Salary</h2>
              <p className="text-xs text-slate-500">Attendance-based salary calculation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronLeft size={14} /></button>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
            <button onClick={goNext} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronRight size={14} /></button>
            <button onClick={onClose} className="ml-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading attendance data…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <Users size={36} className="opacity-20" />
              <p className="text-sm">No attendance records for {mLabel(month)}</p>
              <p className="text-xs">Mark attendance first to calculate salaries</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                  </th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Basic Rate</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-emerald-600">Present</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-amber-500">Half Day</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-rose-500">Absent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-blue-500">Leave</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Payable Days</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700">Payable Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => {
                  const isSel = selected.has(r.id);
                  return (
                    <tr key={r.id} onClick={() => toggleSelect(r.id)}
                      className={`cursor-pointer transition-colors ${isSel ? 'bg-white hover:bg-amber-50' : 'bg-slate-50 opacity-40 hover:opacity-60'}`}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                      </td>
                      <td className="px-2 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                            {r.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-slate-800">{r.name}</span>
                              {!r.isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">Inactive</span>}
                            </div>
                            <div className="text-xs text-slate-400">{r.designation || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.salaryType === 'perDay' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {r.salaryType === 'perDay' ? 'Per Day' : 'Per Month'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">{fmt(r.basicSalary)}</td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{r.present}</span></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{r.halfday}</span></td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">{r.absent}</span></td>
                      <td className="px-4 py-3 text-center text-slate-500 text-xs">{r.leave}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-slate-700">
                          {r.payableDays}<span className="text-xs text-slate-400 font-normal ml-0.5">/ {r.daysInMonth}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right"><span className="text-sm font-bold text-emerald-700">{fmt(r.amount)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{selected.size}</span> of {rows.length} employees selected
              <span className="mx-2 text-slate-300">·</span>{rows[0]?.daysInMonth} calendar days in {mLabel(month)}
              <span className="mx-2 text-slate-300">·</span>Half day = 0.5 days
            </p>
            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <div className="text-xs text-slate-500">Total Payable</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(totalPayable)}</div>
              </div>
              <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-200 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleProcess} disabled={saving || selected.size === 0}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition">
                {saving ? 'Saving…' : `Save ${selected.size} Salaries`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function EmployeePage() {
  const qc = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => EmployeesAPI.getAll(),
  });

  /* employee list */
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('active');
  const [selEmp, setSelEmp]         = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [editEmp, setEditEmp]       = useState(null);
  const [toggleId, setToggleId]     = useState(null);
  const [deleteEmpId, setDeleteEmpId] = useState(null);

  /* right panel */
  const [rightTab, setRightTab]     = useState('salary');

  /* salary */
  const [activeTab, setActiveTab]   = useState('all');
  const [selMonth, setSelMonth]     = useState(new Date().toISOString().slice(0, 7));
  const [addType, setAddType]       = useState(null);
  const [bulkOpen, setBulkOpen]     = useState(false);
  const [deleteRecId, setDeleteRecId] = useState(null);

  /* salary records query */
  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ['salary-records', selEmp?.id],
    queryFn:  () => selEmp ? SalaryRecordsAPI.getByEmployee(selEmp.id) : Promise.resolve([]),
    enabled:  !!selEmp,
  });

  /* unpaid summary across all employees (for left panel) */
  const { data: unpaidRecords = [], refetch: refetchUnpaid } = useQuery({
    queryKey: ['salary-records-unpaid'],
    queryFn:  () => SalaryRecordsAPI.getAll({ payStatus: 'unpaid' }),
  });
  const unpaidByEmp = useMemo(() => {
    const map = {};
    unpaidRecords.forEach(r => {
      map[r.employeeId] = (map[r.employeeId] || 0) + Number(r.amount);
    });
    return map;
  }, [unpaidRecords]);

  /* mutations */
  const refetchEmps = () => qc.invalidateQueries({ queryKey: ['employees'] });

  const toggleMut = useMutation({
    mutationFn: id => EmployeesAPI.toggle(id),
    onSuccess:  () => { toast.success('Status updated'); refetchEmps(); setToggleId(null); },
    onError:    () => toast.error('Failed to update status'),
  });
  const deleteEmpMut = useMutation({
    mutationFn: id => EmployeesAPI.delete(id),
    onSuccess:  () => { toast.success('Employee deleted'); refetchEmps(); setSelEmp(null); setDeleteEmpId(null); },
    onError:    () => toast.error('Failed to delete'),
  });
  const deleteRecMut = useMutation({
    mutationFn: id => SalaryRecordsAPI.delete(id),
    onSuccess:  () => { toast.success('Record deleted'); refetchRecords(); refetchEmps(); refetchUnpaid(); },
    onError:    () => toast.error('Failed to delete'),
  });
  const statusUpdateMut = useMutation({
    mutationFn: ({ id, payStatus }) => SalaryRecordsAPI.update(id, { payStatus }),
    onSuccess:  () => { refetchRecords(); refetchUnpaid(); },
    onError:    () => toast.error('Failed to update status'),
  });

  /* derived */
  const filteredEmps = useMemo(() => {
    let list = employees.filter(e => filter === 'active' ? e.isActive : filter === 'inactive' ? !e.isActive : true);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.employeeCode || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [employees, filter, search]);

  const stats = useMemo(() => ({
    total:    employees.length,
    active:   employees.filter(e => e.isActive).length,
    inactive: employees.filter(e => !e.isActive).length,
  }), [employees]);

  const fmtYM = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevMonth = () => { const [y,m] = selMonth.split('-').map(Number); setSelMonth(fmtYM(new Date(y,m-2,1))); };
  const nextMonth = () => { const [y,m] = selMonth.split('-').map(Number); setSelMonth(fmtYM(new Date(y,m,1))); };
  const monthLabel = (ym) => { const [y,m] = ym.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}); };

  const monthRecords = useMemo(() => records.filter(r => r.effectiveDate?.slice(0,7) === selMonth), [records, selMonth]);
  const tabRecords   = useMemo(() => activeTab === 'all' ? monthRecords : monthRecords.filter(r => r.type === activeTab), [monthRecords, activeTab]);

  const currentEmployee = selEmp ? (employees.find(e => e.id === selEmp.id) ?? selEmp) : null;

  /* keep selEmp in sync after refetch */
  useEffect(() => {
    if (selEmp && employees.length) {
      const updated = employees.find(e => e.id === selEmp.id);
      if (updated) setSelEmp(updated);
    }
  }, [employees]); // eslint-disable-line

  const handleSalaryAdded = () => {
    refetchRecords();
    refetchEmps();
    refetchUnpaid();
    if (addType === 'increment') setSelEmp(prev => employees.find(e => e.id === prev?.id) ?? prev);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* ── Top header ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <UserCheck size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Employee Management</h1>
            <p className="text-xs text-slate-500">Employees · Salary · Records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats chips */}
          <div className="flex items-center gap-3 text-xs mr-1">
            <span className="text-slate-500">Total <span className="font-bold text-slate-700">{stats.total}</span></span>
            <span className="text-emerald-600">Active <span className="font-bold">{stats.active}</span></span>
            <span className="text-rose-500">Inactive <span className="font-bold">{stats.inactive}</span></span>
          </div>
          <button onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm">
            <Users size={14} /> Bulk Salary
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm">
            <Plus size={15} /> Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: employee list ── */}
        <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
                className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200
                  focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
            </div>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
              {[['active','Active'],['inactive','Inactive'],['all','All']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`flex-1 py-1.5 font-medium transition ${filter === val ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-xs">Loading…</div>
            ) : filteredEmps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-1">
                <UserCheck size={24} className="opacity-25" />
                {employees.length === 0 ? 'No employees yet' : 'No employees match'}
              </div>
            ) : filteredEmps.map(emp => (
              <button key={emp.id}
                onClick={() => { setSelEmp(emp); setRightTab('salary'); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition border-b border-slate-50 ${
                  selEmp?.id === emp.id ? 'bg-amber-50 border-l-2 border-l-amber-500' : 'hover:bg-slate-50'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  emp.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {emp.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-slate-800 truncate">{emp.name}</span>
                    {!emp.isActive && <span className="text-xs px-1 rounded-full bg-rose-100 text-rose-500 font-medium shrink-0">Off</span>}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{emp.designation || 'No designation'}</div>
                </div>
                <div className="text-right shrink-0">
                  {(() => {
                    const unpaid = unpaidByEmp[emp.id] ?? 0;
                    if (unpaid > 0)  return <div className="text-xs font-semibold text-rose-600">{fmt(unpaid)}</div>;
                    if (unpaid < 0)  return <div className="text-xs font-semibold text-emerald-600">{fmt(Math.abs(unpaid))}</div>;
                    return <div className="text-xs font-semibold text-amber-500">₹0</div>;
                  })()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: detail panel ── */}
        {!currentEmployee ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <UserCheck size={48} className="opacity-20" />
            <p className="text-sm font-medium">Select an employee</p>
            <p className="text-xs">to view details and salary records</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Employee card */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                    currentEmployee.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentEmployee.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{currentEmployee.name}</span>
                      {currentEmployee.employeeCode && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{currentEmployee.employeeCode}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentEmployee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {currentEmployee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {currentEmployee.designation || 'No designation'}
                      {currentEmployee.department && ` · ${currentEmployee.department}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Basic Salary</div>
                    <div className="text-base font-bold text-slate-800">
                      {fmt(currentEmployee.basicSalary)}
                      <span className="text-xs text-slate-400 ml-1 font-normal">{currentEmployee.salaryType === 'perDay' ? '/day' : '/mo'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditEmp(currentEmployee)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setToggleId(currentEmployee.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        currentEmployee.isActive ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      }`}>
                      {currentEmployee.isActive ? <><ToggleRight size={12} /> Deactivate</> : <><ToggleLeft size={12} /> Activate</>}
                    </button>
                    <button onClick={() => setDeleteEmpId(currentEmployee.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info / Salary tab bar */}
            <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
              {[['salary','Salary'],['info','Info']].map(([key, lbl]) => (
                <button key={key} onClick={() => setRightTab(key)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
                    rightTab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* ── INFO TAB ── */}
            {rightTab === 'info' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-3 max-w-2xl">
                  {[
                    ['Phone',          currentEmployee.phone],
                    ['Email',          currentEmployee.email],
                    ['Employee Code',  currentEmployee.employeeCode],
                    ['Department',     currentEmployee.department],
                    ['Date of Joining',fmtDate(currentEmployee.dateOfJoining)],
                    ['Salary Type',    currentEmployee.salaryType === 'perDay' ? 'Per Day' : 'Per Month'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
                      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                      <div className="text-sm font-medium text-slate-700">{val || '—'}</div>
                    </div>
                  ))}
                  {(currentEmployee.address || currentEmployee.notes) && (
                    <div className="col-span-2 grid grid-cols-1 gap-3">
                      {currentEmployee.address && (
                        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
                          <div className="text-xs text-slate-400 mb-0.5">Address</div>
                          <div className="text-sm font-medium text-slate-700">{currentEmployee.address}</div>
                        </div>
                      )}
                      {currentEmployee.notes && (
                        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
                          <div className="text-xs text-slate-400 mb-0.5">Notes</div>
                          <div className="text-sm font-medium text-slate-700">{currentEmployee.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SALARY TAB ── */}
            {rightTab === 'salary' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* Month stats */}
                <div className="flex gap-3 px-6 pt-4 shrink-0">
                  {[
                    ['Increments',     monthRecords.filter(r=>r.type==='increment').length,              'text-emerald-600'],
                    ['Total Incentive',monthRecords.filter(r=>r.type==='incentive').reduce((s,r)=>s+Number(r.amount),0), 'text-amber-600', true],
                    ['Total Bonus',    monthRecords.filter(r=>r.type==='bonus').reduce((s,r)=>s+Number(r.amount),0),     'text-violet-600', true],
                    ['Salary Paid',    monthRecords.filter(r=>r.type==='salary').reduce((s,r)=>s+Number(r.amount),0),    'text-blue-600', true],
                  ].map(([label, val, cls, money]) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-2.5 flex-1 shadow-sm">
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className={`text-base font-bold ${cls}`}>{money ? fmt(val) : val}</div>
                    </div>
                  ))}
                </div>

                {/* Sub-tabs + month picker + add */}
                <div className="flex items-center justify-between px-6 pt-3 shrink-0 gap-2">
                  <div className="flex gap-1">
                    <button onClick={() => setActiveTab('all')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium border-b-2 transition ${
                        activeTab === 'all'
                          ? 'border-amber-500 bg-slate-100 text-slate-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}>
                      All
                      {monthRecords.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'all' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                          {monthRecords.length}
                        </span>
                      )}
                    </button>
                    {Object.entries(TYPE_META).map(([key, meta]) => {
                      const Icon  = meta.icon;
                      const color = COLOR[meta.color];
                      const count = monthRecords.filter(r => r.type === key).length;
                      return (
                        <button key={key} onClick={() => setActiveTab(key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium border-b-2 transition ${
                            activeTab === key
                              ? `border-amber-500 ${color.light} ${color.text}`
                              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          }`}>
                          <Icon size={13} /> {meta.label}
                          {count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? color.badge : 'bg-slate-100 text-slate-500'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button onClick={() => setActiveTab('attendance')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium border-b-2 transition ${
                        activeTab === 'attendance'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}>
                      <CalendarCheck size={13} /> Attendance
                    </button>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronLeft size={13} /></button>
                    <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
                    <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronRight size={13} /></button>
                    {selMonth !== new Date().toISOString().slice(0,7) && (
                      <button onClick={() => setSelMonth(new Date().toISOString().slice(0,7))}
                        className="text-xs text-amber-600 hover:underline px-1">This month</button>
                    )}
                  </div>
                  {activeTab !== 'attendance' && (
                    <button onClick={() => setAddType(activeTab === 'all' ? 'salary' : activeTab)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm shrink-0">
                      <Plus size={13} /> Add {activeTab === 'all' ? 'Record' : TYPE_META[activeTab].label}
                    </button>
                  )}
                </div>

                {/* Records table / Attendance view */}
                <div className="flex-1 mx-6 mb-4 mt-0 bg-white rounded-b-xl rounded-tr-xl border border-slate-200 shadow-sm overflow-auto min-h-0">
                  {activeTab === 'attendance'
                    ? <AttendanceTab employeeId={currentEmployee.id} month={selMonth} basicSalary={currentEmployee.basicSalary} salaryType={currentEmployee.salaryType} />
                    : <RecordsTable
                        records={tabRecords}
                        type={activeTab}
                        monthLabel={monthLabel(selMonth)}
                        onDelete={setDeleteRecId}
                        onStatusUpdate={(id, payStatus) => statusUpdateMut.mutate({ id, payStatus })}
                      />
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {(addOpen || editEmp) && (
        <EmployeeModal
          employee={editEmp ?? undefined}
          onClose={() => { setAddOpen(false); setEditEmp(null); }}
          onSaved={refetchEmps}
        />
      )}
      {addType && currentEmployee && (
        <AddSalaryModal
          type={addType}
          employee={currentEmployee}
          onClose={() => setAddType(null)}
          onSaved={handleSalaryAdded}
        />
      )}
      {bulkOpen && (
        <BulkSalaryModal
          defaultMonth={selMonth}
          employees={employees}
          onClose={() => setBulkOpen(false)}
        />
      )}

      <ConfirmDialog
        open={toggleId !== null}
        title={employees.find(e => e.id === toggleId)?.isActive ? 'Deactivate Employee' : 'Activate Employee'}
        message={employees.find(e => e.id === toggleId)?.isActive ? 'Mark this employee as inactive?' : 'Mark this employee as active?'}
        confirmLabel={employees.find(e => e.id === toggleId)?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={() => toggleMut.mutate(toggleId)}
        onClose={() => setToggleId(null)}
      />
      <ConfirmDialog
        open={deleteEmpId !== null}
        title="Delete Employee"
        message="Permanently delete this employee and all their records? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteEmpMut.mutate(deleteEmpId)}
        onClose={() => setDeleteEmpId(null)}
      />
      <ConfirmDialog
        open={deleteRecId !== null}
        title="Delete Record"
        message="Delete this salary record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteRecMut.mutate(deleteRecId); setDeleteRecId(null); }}
        onClose={() => setDeleteRecId(null)}
      />
    </div>
  );
}
