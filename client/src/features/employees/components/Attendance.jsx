import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarCheck, ChevronLeft, ChevronRight, Save,
  BarChart2, UserCheck, AlertCircle,
} from 'lucide-react';
import { EmployeesAPI } from '@features/employees/resources/employees-service';
import { AttendanceAPI } from '@features/employees/resources/employees-service';

/* ─── Constants ─── */
const STATUSES = [
  { key: 'present', label: 'P',  full: 'Present',  color: 'emerald' },
  { key: 'absent',  label: 'A',  full: 'Absent',   color: 'rose'    },
  { key: 'halfday', label: 'H',  full: 'Half Day', color: 'amber'   },
  { key: 'leave',   label: 'L',  full: 'Leave',    color: 'blue'    },
  { key: 'holiday', label: 'HO', full: 'Holiday',  color: 'violet'  },
];

const ST = {
  present: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
  absent:  { bg: 'bg-rose-500',    light: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-400',    badge: 'bg-rose-100 text-rose-700'       },
  halfday: { bg: 'bg-amber-500',   light: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-400',   badge: 'bg-amber-100 text-amber-700'     },
  leave:   { bg: 'bg-blue-500',    light: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-400',    badge: 'bg-blue-100 text-blue-700'       },
  holiday: { bg: 'bg-violet-500',  light: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-400',  badge: 'bg-violet-100 text-violet-700'   },
};

const today       = () => new Date().toISOString().slice(0, 10);
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const dayName     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Status Button ─── */
function StatusBtn({ status, active, onClick }) {
  const s = STATUSES.find(x => x.key === status);
  const c = ST[status];
  return (
    <button
      onClick={onClick}
      title={s.full}
      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition select-none border ${
        active
          ? `${c.bg} text-white border-transparent shadow-sm`
          : `border-slate-200 text-slate-400 hover:${c.light} hover:${c.text}`
      }`}
    >
      {s.label}
    </button>
  );
}

/* ─── Tab 1: Mark Attendance ─── */
function MarkTab({ employees }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());

  const { data: dayRecords = [], refetch } = useQuery({
    queryKey: ['attendance-day', date],
    queryFn:  () => AttendanceAPI.getByDate(date),
  });

  const [overrides, setOverrides] = useState({});

  const statusFor = (empId) => {
    if (overrides[empId] !== undefined) return overrides[empId];
    const rec = dayRecords.find(r => r.employeeId === empId || r.employee?.id === empId);
    return rec?.status ?? null;
  };

  const noteFor = (empId) => {
    const rec = dayRecords.find(r => r.employeeId === empId || r.employee?.id === empId);
    return overrides[`note_${empId}`] ?? rec?.note ?? '';
  };

  const setStatus = (empId, status) =>
    setOverrides(p => ({ ...p, [empId]: status }));

  const setNote = (empId, note) =>
    setOverrides(p => ({ ...p, [`note_${empId}`]: note }));

  const markAll = (status) => {
    const next = {};
    employees.forEach(e => { next[e.id] = status; });
    setOverrides(next);
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const entries = employees
      .map(e => ({ employeeId: e.id, status: statusFor(e.id), note: noteFor(e.id) }))
      .filter(e => e.status);

    if (!entries.length) { toast.error('No attendance marked'); return; }
    setSaving(true);
    try {
      await AttendanceAPI.saveBulk(date, entries);
      toast.success(`Attendance saved for ${entries.length} employee${entries.length > 1 ? 's' : ''}`);
      setOverrides({});
      refetch();
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)); setOverrides({}); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)); setOverrides({}); };

  const markedCount = employees.filter(e => statusFor(e.id)).length;
  const hasChanges  = Object.keys(overrides).some(k => !k.startsWith('note_'));

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
            <ChevronLeft size={15} />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setOverrides({}); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button onClick={nextDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
            <ChevronRight size={15} />
          </button>
          {date === today() && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Today</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{markedCount}/{employees.length} marked</span>
          <div className="flex gap-1 border border-slate-200 rounded-xl overflow-hidden">
            {STATUSES.slice(0, 4).map(s => (
              <button
                key={s.key}
                onClick={() => markAll(s.key)}
                title={`Mark all ${s.full}`}
                className={`px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 ${ST[s.key].bg} text-white`}
              >
                All {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition shadow-sm"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp, idx) => {
                const st = statusFor(emp.id);
                return (
                  <tr key={emp.id} className={`transition-colors ${st ? ST[st]?.light + '/40' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.designation || emp.department || '—'}</div>
                        </div>
                        {st && (
                          <span className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full ${ST[st].badge}`}>
                            {STATUSES.find(s => s.key === st)?.full}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {STATUSES.map(s => (
                          <StatusBtn
                            key={s.key}
                            status={s.key}
                            active={st === s.key}
                            onClick={() => setStatus(emp.id, st === s.key ? null : s.key)}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        value={noteFor(emp.id)}
                        onChange={e => setNote(emp.id, e.target.value)}
                        placeholder="Optional note…"
                        className="w-full max-w-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs
                          focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 2: Monthly Calendar ─── */
function CalendarTab({ employees }) {
  const [selEmpId, setSelEmpId] = useState(employees[0]?.id ?? null);
  const [ym, setYm] = useState(today().slice(0, 7));

  const [year, mon] = ym.split('-').map(Number);
  const days = daysInMonth(year, mon);
  const firstDow = new Date(year, mon - 1, 1).getDay();

  const { data: records = [] } = useQuery({
    queryKey: ['attendance-calendar', selEmpId, ym],
    queryFn:  () => selEmpId ? AttendanceAPI.getByEmployee(selEmpId, ym) : Promise.resolve([]),
    enabled:  !!selEmpId,
  });

  const recMap = useMemo(() => {
    const m = {};
    records.forEach(r => {
      const d = new Date(r.date).getDate();
      m[d] = r;
    });
    return m;
  }, [records]);

  const summary = useMemo(() => {
    const s = { present: 0, absent: 0, halfday: 0, leave: 0, holiday: 0 };
    records.forEach(r => { if (s[r.status] !== undefined) s[r.status]++; });
    return s;
  }, [records]);

  const fmtYM     = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevMonth = () => setYm(fmtYM(new Date(year, mon - 2, 1)));
  const nextMonth = () => setYm(fmtYM(new Date(year, mon, 1)));

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
      {/* Controls */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <select
          value={selEmpId ?? ''}
          onChange={e => setSelEmpId(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
            <ChevronLeft size={15} />
          </button>
          <input
            type="month"
            value={ym}
            onChange={e => setYm(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button onClick={nextMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap shrink-0">
        {STATUSES.map(s => (
          <div key={s.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${ST[s.key].light}`}>
            <span className={`w-2 h-2 rounded-full ${ST[s.key].bg}`} />
            <span className={`text-xs font-semibold ${ST[s.key].text}`}>{s.full}</span>
            <span className={`text-sm font-bold ${ST[s.key].text}`}>{summary[s.key]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100">
          <span className="text-xs font-semibold text-slate-600">Not Marked</span>
          <span className="text-sm font-bold text-slate-600">{days - records.length}</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {dayName.map(d => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${d === 'Sun' ? 'text-rose-500' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-slate-50" />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day  = i + 1;
            const dow  = (firstDow + i) % 7;
            const rec  = recMap[day];
            const isToday = today() === `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            return (
              <div
                key={day}
                className={`h-16 p-1.5 border-b border-r border-slate-50 flex flex-col gap-1 ${
                  rec ? ST[rec.status]?.light + '/60' : ''
                }`}
              >
                <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-amber-500 text-white' : dow === 0 ? 'text-rose-500' : 'text-slate-600'
                }`}>
                  {day}
                </div>
                {rec ? (
                  <div className={`text-xs font-bold px-1.5 py-0.5 rounded-md self-start ${ST[rec.status]?.badge}`}>
                    {STATUSES.find(s => s.key === rec.status)?.label}
                  </div>
                ) : (
                  <div className="text-xs text-slate-300">—</div>
                )}
                {rec?.note && (
                  <div className="text-xs text-slate-400 truncate leading-tight">{rec.note}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 3: Monthly Summary Table ─── */
function SummaryTab() {
  const [ym, setYm]           = useState(today().slice(0, 7));
  const [showActive, setShowActive] = useState(true);
  const [year, mon] = ym.split('-').map(Number);
  const days = daysInMonth(year, mon);

  const { data: rawSummary = [], isLoading } = useQuery({
    queryKey: ['attendance-summary', ym],
    queryFn:  () => AttendanceAPI.getSummary(ym),
  });

  const summary = rawSummary.filter(e => e.isActive === showActive);

  const fmtYM    = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevMonth = () => { const d = new Date(year, mon - 2, 1); setYm(fmtYM(d)); };
  const nextMonth = () => { const d = new Date(year, mon, 1);     setYm(fmtYM(d)); };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button onClick={prevMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition"><ChevronLeft size={15} /></button>
        <input
          type="month" value={ym} onChange={e => setYm(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button onClick={nextMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition"><ChevronRight size={15} /></button>
        <span className="text-xs text-slate-500 ml-1">{days} days in month</span>
        <div className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          <button onClick={() => setShowActive(true)}
            className={`px-3 py-1.5 transition ${showActive ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            Active
          </button>
          <button onClick={() => setShowActive(false)}
            className={`px-3 py-1.5 transition border-l border-slate-200 ${!showActive ? 'bg-slate-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            Inactive
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600">Present</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-rose-600">Absent</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-amber-600">Half Day</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-blue-600">Leave</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-violet-600">Holiday</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Not Marked</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
              ) : summary.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No data for this month</td></tr>
              ) : summary.map((emp, idx) => {
                const effectiveDays = emp.present + emp.halfday * 0.5;
                const pct = emp.total > 0 ? ((effectiveDays / emp.total) * 100).toFixed(0) : '—';
                const pctNum = emp.total > 0 ? (effectiveDays / emp.total) * 100 : null;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.designation || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-emerald-600">{emp.present}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-rose-600">{emp.absent}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-amber-600">{emp.halfday}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-blue-600">{emp.leave}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-violet-600">{emp.holiday}</span></td>
                    <td className="px-3 py-3 text-center"><span className="text-slate-500">{days - emp.total}</span></td>
                    <td className="px-3 py-3 text-center">
                      {pctNum !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${pctNum >= 90 ? 'text-emerald-600' : pctNum >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {pct}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctNum >= 90 ? 'bg-emerald-500' : pctNum >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(pctNum, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
const TABS = [
  { key: 'mark',     label: 'Mark Attendance', icon: CalendarCheck },
  { key: 'calendar', label: 'Calendar View',   icon: UserCheck     },
  { key: 'summary',  label: 'Monthly Summary', icon: BarChart2     },
];

export default function AttendancePage() {
  const [tab, setTab] = useState('mark');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-active'],
    queryFn:  () => EmployeesAPI.getAll().then(list => list.filter(e => e.isActive)),
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <CalendarCheck size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Attendance</h1>
            <p className="text-xs text-slate-500">{employees.length} active employees</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2">
          {STATUSES.map(s => (
            <span key={s.key} className={`text-xs font-semibold px-2 py-1 rounded-lg ${ST[s.key].badge}`}>
              {s.label} = {s.full}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-slate-200 bg-white shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition rounded-t-lg ${
              tab === key
                ? 'border-amber-500 text-amber-600 bg-amber-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-6 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading employees…</div>
        ) : employees.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
            <AlertCircle size={40} className="opacity-25" />
            <p className="text-sm">No active employees found</p>
          </div>
        ) : (
          <>
            {tab === 'mark'     && <MarkTab     employees={employees} />}
            {tab === 'calendar' && <CalendarTab employees={employees} />}
            {tab === 'summary'  && <SummaryTab />}
          </>
        )}
      </div>
    </div>
  );
}
