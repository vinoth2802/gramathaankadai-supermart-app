import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, BookOpen, Banknote, TrendingUp, Star, Gift,
  ChevronDown, Trash2, ChevronLeft, ChevronRight, CheckCircle2, X,
} from 'lucide-react';
import { EmployeesAPI }     from '@features/employees/resources/employees-service';
import { SalaryRecordsAPI } from '@features/employees/resources/employees-service';
import ConfirmDialog        from '@components/ConfirmDialog';
import { PAY_STATUS } from '@constants';
import { fmtINR, fmtDateShort } from '@utils/formatters';

const fmt     = fmtINR;
const fmtDate = fmtDateShort;

const TYPE_META = {
  salary:    { label: 'Salary',    icon: Banknote,   color: 'blue'    },
  increment: { label: 'Increment', icon: TrendingUp, color: 'emerald' },
  incentive: { label: 'Incentive', icon: Star,        color: 'amber'   },
  bonus:     { label: 'Bonus',     icon: Gift,        color: 'violet'  },
};

const TYPE_COLOR = {
  blue:    { text: 'text-blue-600',    light: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700'       },
  emerald: { text: 'text-emerald-600', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { text: 'text-amber-600',   light: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700'     },
  violet:  { text: 'text-violet-600',  light: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700'   },
};

const nextStatus = s => s === 'unpaid' ? 'paid' : s === 'paid' ? 'partial' : 'unpaid';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── Bulk Pay Modal ─── */
function BulkPayModal({ pendingRecords, employees, onClose, onDone }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [paidDate,     setPaidDate]     = useState(todayStr);
  const [selectedIds,  setSelectedIds]  = useState(() => new Set(pendingRecords.map(r => r.id)));
  const [expanded,     setExpanded]     = useState(new Set());
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(pendingRecords.map(r => r.id)));
  }, [pendingRecords]);

  /* group records by employee */
  const byEmployee = useMemo(() => {
    const map = {};
    pendingRecords.forEach(r => {
      if (!map[r.employeeId]) map[r.employeeId] = [];
      map[r.employeeId].push(r);
    });
    return map;
  }, [pendingRecords]);

  const empList = useMemo(() =>
    employees.filter(e => byEmployee[e.id]?.length > 0),
    [employees, byEmployee]
  );

  const toggleEmployee = (empId) => {
    const ids    = (byEmployee[empId] ?? []).map(r => r.id);
    const allOn  = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOn) ids.forEach(id => next.delete(id));
      else       ids.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleRecord = (recId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(recId) ? next.delete(recId) : next.add(recId);
      return next;
    });
  };

  const toggleExpand = (empId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(empId) ? next.delete(empId) : next.add(empId);
      return next;
    });
  };

  const empCheckState = (empId) => {
    const ids     = (byEmployee[empId] ?? []).map(r => r.id);
    const checked = ids.filter(id => selectedIds.has(id)).length;
    if (checked === 0)        return 'none';
    if (checked === ids.length) return 'all';
    return 'some';
  };

  const totalSelected = selectedIds.size;
  const totalAmount   = pendingRecords
    .filter(r => selectedIds.has(r.id))
    .reduce((s, r) => s + Number(r.amount), 0);

  const handlePay = async () => {
    if (totalSelected === 0) { toast.error('Select at least one record'); return; }
    setSaving(true);
    try {
      await SalaryRecordsAPI.bulkUpdate({ ids: [...selectedIds], payStatus: 'paid', paidDate });
      toast.success(`${totalSelected} record(s) marked as paid`);
      onDone();
      onClose();
    } catch { toast.error('Failed to update records'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Banknote size={15} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bulk Salary Payment</h2>
              <p className="text-xs text-slate-400">{empList.length} employee{empList.length !== 1 ? 's' : ''} with pending dues</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 shrink-0">Paid Date</label>
            <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs font-medium">
            <button onClick={() => setSelectedIds(new Set(pendingRecords.map(r => r.id)))}
              className="text-indigo-600 hover:underline">Select All</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-slate-500 hover:underline">Deselect All</button>
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-50">
          {empList.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              No pending salary dues
            </div>
          ) : empList.map(emp => {
            const recs       = byEmployee[emp.id] ?? [];
            const chkState   = empCheckState(emp.id);
            const isExpanded = expanded.has(emp.id);
            const empTotal   = recs.reduce((s, r) => s + Number(r.amount), 0);

            return (
              <div key={emp.id}>
                {/* Employee row */}
                <div className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={chkState === 'all'}
                    ref={el => { if (el) el.indeterminate = chkState === 'some'; }}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                  />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    emp.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-400">
                      {emp.designation || '—'} · {recs.length} record{recs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-rose-600 shrink-0">{fmt(empTotal)}</span>
                  <button onClick={() => toggleExpand(emp.id)}
                    className="p-1 rounded hover:bg-slate-200 transition shrink-0">
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded individual records */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100">
                    {recs.map(r => {
                      const typeMeta  = TYPE_META[r.type]  ?? TYPE_META.salary;
                      const typeColor = TYPE_COLOR[typeMeta.color];
                      const TypeIcon  = typeMeta.icon;
                      return (
                        <div key={r.id} className="flex items-center gap-3 px-6 py-2.5 pl-14 hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleRecord(r.id)}
                            className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer shrink-0"
                          />
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeColor.light} ${typeColor.text}`}>
                            <TypeIcon size={10} /> {typeMeta.label}
                          </span>
                          <span className="text-xs text-slate-500">{fmtDate(r.effectiveDate)}</span>
                          {r.description && (
                            <span className="text-xs text-slate-400 truncate max-w-[140px]">{r.description}</span>
                          )}
                          <span className={`text-sm font-semibold ml-auto shrink-0 ${typeColor.text}`}>{fmt(r.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center gap-4 bg-slate-50 rounded-b-2xl">
          <div className="flex-1 text-sm">
            <span className="text-slate-400 text-xs">{totalSelected} record{totalSelected !== 1 ? 's' : ''} selected · </span>
            <span className="font-bold text-rose-600">{fmt(totalAmount)}</span>
          </div>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition">
            Cancel
          </button>
          <button onClick={handlePay} disabled={saving || totalSelected === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-50">
            <CheckCircle2 size={15} />
            {saving ? 'Processing…' : `Mark ${totalSelected} as Paid`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalaryLedgerPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [empFilter, setEmpFilter] = useState('active');
  const [selEmpId, setSelEmpId]   = useState(null);
  const [selYear, setSelYear]     = useState(new Date().getFullYear());
  const [deleteId, setDeleteId]   = useState(null);
  const [bulkOpen, setBulkOpen]   = useState(false);

  /* ── Employees ── */
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-all'],
    queryFn:  () => EmployeesAPI.getAll(),
  });

  /* ── All pending (unpaid + partial) records for left-panel amounts & bulk modal ── */
  const { data: unpaidRecords = [], refetch: refetchPending } = useQuery({
    queryKey: ['salary-records-pending'],
    queryFn:  () => SalaryRecordsAPI.getAll({ payStatus: 'pending' }),
  });
  const unpaidByEmp = useMemo(() => {
    const map = {};
    unpaidRecords.forEach(r => { map[r.employeeId] = (map[r.employeeId] || 0) + Number(r.amount); });
    return map;
  }, [unpaidRecords]);

  /* ── Filtered employee list ── */
  const filteredEmps = useMemo(() => {
    const q = search.toLowerCase();
    return employees
      .filter(e => empFilter === 'all' ? true : empFilter === 'active' ? e.isActive : !e.isActive)
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q));
  }, [employees, empFilter, search]);

  const currentEmployee = employees.find(e => e.id === selEmpId) ?? null;

  /* ── Salary records for selected employee ── */
  const { data: allRecords = [], refetch: refetchRecords } = useQuery({
    queryKey: ['salary-records-emp', selEmpId],
    queryFn:  () => SalaryRecordsAPI.getByEmployee(selEmpId),
    enabled:  !!selEmpId,
  });

  /* ── Filter by year ── */
  const yearRecords = useMemo(() =>
    allRecords.filter(r => r.effectiveDate?.slice(0,4) === String(selYear)),
    [allRecords, selYear]);

  /* ── Group by month ── */
  const grouped = useMemo(() => {
    const map = {};
    yearRecords.forEach(r => {
      const ym = r.effectiveDate?.slice(0, 7);
      if (!map[ym]) map[ym] = [];
      map[ym].push(r);
    });
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
  }, [yearRecords]);

  /* ── Year summary ── */
  const summary = useMemo(() => {
    const paid    = yearRecords.filter(r => r.payStatus === 'paid').reduce((s,r) => s + Number(r.amount), 0);
    const unpaid  = yearRecords.filter(r => r.payStatus === 'unpaid').reduce((s,r) => s + Number(r.amount), 0);
    const partial = yearRecords.filter(r => r.payStatus === 'partial').reduce((s,r) => s + Number(r.amount), 0);
    const total   = yearRecords.reduce((s,r) => s + Number(r.amount), 0);
    return { total, paid, unpaid, partial };
  }, [yearRecords]);

  /* ── Available years ── */
  const availableYears = useMemo(() => {
    const years = new Set(allRecords.map(r => Number(r.effectiveDate?.slice(0,4))).filter(Boolean));
    years.add(new Date().getFullYear());
    return [...years].sort((a,b) => b - a);
  }, [allRecords]);

  /* ── Mutations ── */
  const statusMut = useMutation({
    mutationFn: ({ id, payStatus }) => SalaryRecordsAPI.update(id, { payStatus }),
    onSuccess:  () => { refetchRecords(); qc.invalidateQueries({ queryKey: ['salary-records-pending'] }); },
    onError:    () => toast.error('Failed to update status'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => SalaryRecordsAPI.delete(id),
    onSuccess:  () => { refetchRecords(); qc.invalidateQueries({ queryKey: ['salary-records-pending'] }); toast.success('Record deleted'); },
    onError:    () => toast.error('Failed to delete'),
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BookOpen size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Salary Ledger</h1>
          <p className="text-xs text-slate-500">Complete salary history per employee</p>
        </div>
        {unpaidRecords.length > 0 && (
          <button onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition shadow-sm">
            <Banknote size={15} />
            Bulk Payment
            <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
              {unpaidRecords.length}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left panel ── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-white">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {/* Filter toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              {[['active','Active'],['inactive','Inactive'],['all','All']].map(([val,lbl]) => (
                <button key={val} onClick={() => setEmpFilter(val)}
                  className={`flex-1 py-1.5 transition ${empFilter === val ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Employee list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filteredEmps.map(emp => {
              const unpaid = unpaidByEmp[emp.id] ?? 0;
              const isSelected = selEmpId === emp.id;
              return (
                <button key={emp.id} onClick={() => setSelEmpId(emp.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition ${
                    isSelected ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-700'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : emp.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{emp.name}</div>
                    <div className={`text-xs truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{emp.designation || '—'}</div>
                  </div>
                  {unpaid > 0 && (
                    <div className={`text-xs font-bold shrink-0 ${isSelected ? 'text-rose-200' : 'text-rose-500'}`}>
                      {fmt(unpaid)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        {!currentEmployee ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <BookOpen size={48} className="opacity-20" />
            <p className="text-sm">Select an employee to view their salary ledger</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Employee header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    currentEmployee.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentEmployee.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{currentEmployee.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentEmployee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                      }`}>{currentEmployee.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="text-xs text-slate-500">{currentEmployee.designation || 'No designation'}{currentEmployee.department && ` · ${currentEmployee.department}`}</div>
                  </div>
                </div>
                {/* Year picker */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelYear(y => y - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronLeft size={14} /></button>
                  <span className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 min-w-[64px] text-center">{selYear}</span>
                  <button onClick={() => setSelYear(y => y + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronRight size={14} /></button>
                  {availableYears.length > 1 && (
                    <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                      className="ml-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="flex gap-3 px-6 pt-4 pb-2 shrink-0">
              {[
                { label: 'Total',       val: summary.total,   cls: 'text-slate-700'   },
                { label: 'Paid',        val: summary.paid,    cls: 'text-emerald-600' },
                { label: 'Unpaid',      val: summary.unpaid,  cls: 'text-rose-600'    },
                { label: 'Partial',     val: summary.partial, cls: 'text-amber-600'   },
              ].map(({ label, val, cls }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex-1 shadow-sm">
                  <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                  <div className={`text-base font-bold ${cls}`}>{fmt(val)}</div>
                </div>
              ))}
            </div>

            {/* Ledger table */}
            <div className="flex-1 mx-6 mb-4 mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto min-h-0">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <BookOpen size={36} className="opacity-20" />
                  <p className="text-sm">No salary records for {selYear}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Paid Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Description</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([ym, recs]) => {
                      const [y, m] = ym.split('-').map(Number);
                      const monthTotal   = recs.reduce((s,r) => s + Number(r.amount), 0);
                      const monthPaid    = recs.filter(r => r.payStatus === 'paid').reduce((s,r) => s + Number(r.amount), 0);
                      const monthUnpaid  = recs.filter(r => r.payStatus !== 'paid').reduce((s,r) => s + Number(r.amount), 0);
                      const allPaid      = recs.every(r => r.payStatus === 'paid');
                      return [
                        /* Month header row */
                        <tr key={ym + '-header'} className="bg-slate-50 border-y border-slate-100">
                          <td colSpan={4} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700">{MONTH_NAMES[m-1]} {y}</span>
                              <span className="text-xs text-slate-400">· {recs.length} record{recs.length > 1 ? 's' : ''}</span>
                              {allPaid && <CheckCircle2 size={13} className="text-emerald-500" />}
                            </div>
                          </td>
                          <td colSpan={3} className="px-4 py-2 text-right">
                            <span className="text-xs text-slate-400 mr-2">Total {fmt(monthTotal)}</span>
                            {monthPaid > 0 && <span className="text-xs text-emerald-600 font-semibold mr-2">Paid {fmt(monthPaid)}</span>}
                            {monthUnpaid > 0 && <span className="text-xs text-rose-500 font-semibold">Due {fmt(monthUnpaid)}</span>}
                          </td>
                        </tr>,
                        /* Detail rows */
                        ...recs.map(r => {
                          const typeMeta  = TYPE_META[r.type] ?? TYPE_META.salary;
                          const typeColor = TYPE_COLOR[typeMeta.color];
                          const TypeIcon  = typeMeta.icon;
                          const ps        = PAY_STATUS[r.payStatus] ?? PAY_STATUS.unpaid;
                          return (
                            <tr key={r.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.effectiveDate)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeColor.light} ${typeColor.text}`}>
                                  <TypeIcon size={11} /> {typeMeta.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold text-sm ${typeColor.text}`}>{fmt(r.amount)}</span>
                                {r.type === 'increment' && r.previousSalary != null && (
                                  <span className="text-xs text-slate-400 ml-1">from {fmt(r.previousSalary)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.paidDate)}</td>
                              <td className="px-4 py-3">
                                <button title="Click to change status"
                                  onClick={() => statusMut.mutate({ id: r.id, payStatus: nextStatus(r.payStatus ?? 'unpaid') })}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition hover:opacity-75 ${ps.cls}`}>
                                  {ps.label}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.description || '—'}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setDeleteId(r.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {bulkOpen && (
        <BulkPayModal
          pendingRecords={unpaidRecords}
          employees={employees}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            refetchPending();
            refetchRecords();
            qc.invalidateQueries({ queryKey: ['salary-records-pending'] });
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Record"
        message="Are you sure you want to delete this salary record?"
        confirmLabel="Delete"
        onConfirm={() => { deleteMut.mutate(deleteId); setDeleteId(null); }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
