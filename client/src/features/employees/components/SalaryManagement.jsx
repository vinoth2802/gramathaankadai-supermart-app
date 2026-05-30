import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Banknote, ChevronLeft, ChevronRight, Search, FileText, X,
  Eye, CheckCircle2, Plus, Printer, UserCheck, TrendingDown,
} from 'lucide-react';
import { EmployeesAPI }     from '@features/employees/resources/employees-service';
import { SalaryRecordsAPI } from '@features/employees/resources/employees-service';
import { AttendanceAPI }    from '@features/employees/resources/employees-service';
import { PAY_STATUS } from '@constants';
import { fmtINR, fmtDateShort, fmtYM } from '@utils/formatters';

const fmt     = fmtINR;
const fmtDate = fmtDateShort;
const mLabel  = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); };

/* ─── Salary calculator ─── */
function calcSalary(emp, attData, month) {
  if (emp.employeeType === 'regular') {
    const gross = Number(emp.basicSalary || 0);
    return { gross, deductions: 0, net: gross, payableDays: null };
  }
  const [y, m_] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m_, 0).getDate();
  const att = attData ?? { present: 0, halfday: 0 };
  const payableDays = att.present + att.halfday * 0.5;
  const net = emp.salaryType === 'perDay'
    ? Math.round(Number(emp.basicSalary) * payableDays)
    : Math.round(Number(emp.basicSalary) * (payableDays / daysInMonth));
  return { gross: net, deductions: 0, net, payableDays, daysInMonth };
}

/* ─── Payslip Modal ─── */
function PayslipModal({ employee, month, attData, salaryRecord, onClose, onProcess }) {
  const isRegular   = employee.employeeType === 'regular';
  const [y, m_]     = month.split('-').map(Number);
  const daysInMonth = new Date(y, m_, 0).getDate();
  const att         = attData ?? { present: 0, halfday: 0, absent: 0, leave: 0 };
  const payableDays = att.present + att.halfday * 0.5;

  const earnings = isRegular
    ? [{ label: 'Basic Pay', value: Number(employee.basicSalary || 0) }].filter(e => e.value > 0)
    : [];

  const deductions = isRegular ? [] : [];

  const { gross, net } = calcSalary(employee, attData, month);
  const totalDed = deductions.reduce((s, d) => s + d.value, 0);
  const hasRecord = Boolean(salaryRecord);

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head><title>Salary Slip – ${employee.name} – ${mLabel(month)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;font-size:12px;color:#1e293b}
h1{font-size:20px;text-align:center;margin-bottom:3px}
.sub{text-align:center;color:#64748b;margin-bottom:18px;font-size:13px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px}
.lbl{font-size:10px;color:#94a3b8;margin-bottom:2px}
.val{font-weight:600}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.section{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px}
.sh{padding:8px 14px;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase}
.sh.g{background:#d1fae5;color:#065f46}
.sh.r{background:#fee2e2;color:#7f1d1d}
.sh.b{background:#dbeafe;color:#1e3a8a}
.sh.s{background:#f1f5f9;color:#334155}
table{width:100%;border-collapse:collapse}
td{padding:7px 14px;border-top:1px solid #f1f5f9}
td:last-child{text-align:right;font-weight:500}
.tr2 td{border-top:2px solid #e2e8f0;font-weight:700;background:#f8fafc}
.att{display:grid;grid-template-columns:repeat(5,1fr);text-align:center;padding:14px;gap:8px}
.an{font-size:20px;font-weight:700}
.al{font-size:10px;color:#94a3b8;margin-top:2px}
.net{background:#0f172a;color:#fff;border-radius:8px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:4px}
.nl{font-size:13px;letter-spacing:.05em}
.nv{font-size:22px;font-weight:700}
@media print{body{padding:16px}}
</style></head><body>
<h1>SALARY SLIP</h1><p class="sub">${mLabel(month)}</p>
<div class="info">
  <div><div class="lbl">Employee Name</div><div class="val">${employee.name}</div></div>
  <div><div class="lbl">Employee Code</div><div class="val">${employee.employeeCode || '—'}</div></div>
  <div><div class="lbl">Designation</div><div class="val">${employee.designation || '—'}</div></div>
  <div><div class="lbl">Department</div><div class="val">${employee.department || '—'}</div></div>
  <div><div class="lbl">Employee Type</div><div class="val">${isRegular ? 'Regular (Monthly)' : 'Daily Wages'}</div></div>
  ${hasRecord ? `<div><div class="lbl">Pay Status</div><div class="val">${PAY_STATUS[salaryRecord.payStatus]?.label || ''}</div></div>` : ''}
</div>
${!isRegular ? `
<div class="section">
  <div class="sh b">Attendance Summary</div>
  <div class="att">
    <div><div class="an">${daysInMonth}</div><div class="al">Total Days</div></div>
    <div><div class="an" style="color:#059669">${att.present}</div><div class="al">Present</div></div>
    <div><div class="an" style="color:#d97706">${att.halfday}</div><div class="al">Half Day</div></div>
    <div><div class="an" style="color:#dc2626">${att.absent}</div><div class="al">Absent</div></div>
    <div><div class="an" style="color:#2563eb">${payableDays}</div><div class="al">Payable</div></div>
  </div>
</div>` : ''}
${isRegular ? `
<div class="two">
  <div class="section">
    <div class="sh g">Earnings</div>
    <table>
      ${earnings.map(e => `<tr><td>${e.label}</td><td>₹${e.value.toLocaleString('en-IN')}</td></tr>`).join('')}
      <tr class="tr2"><td>Gross Salary</td><td>₹${gross.toLocaleString('en-IN')}</td></tr>
    </table>
  </div>
  <div class="section">
    <div class="sh r">Deductions</div>
    <table>
      ${deductions.length === 0
        ? '<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:14px">No deductions</td></tr>'
        : deductions.map(d => `<tr><td>${d.label}</td><td style="color:#dc2626">₹${d.value.toLocaleString('en-IN')}</td></tr>`).join('')}
      <tr class="tr2"><td>Total Deductions</td><td>₹${totalDed.toLocaleString('en-IN')}</td></tr>
    </table>
  </div>
</div>` : `
<div class="section">
  <div class="sh s">Salary Calculation</div>
  <table>
    <tr><td>Daily Rate</td><td>₹${Number(employee.basicSalary).toLocaleString('en-IN')} / ${employee.salaryType === 'perDay' ? 'day' : 'month'}</td></tr>
    <tr><td>Payable Days</td><td>${payableDays} days</td></tr>
    <tr class="tr2"><td>Earned Amount</td><td>₹${gross.toLocaleString('en-IN')}</td></tr>
  </table>
</div>`}
<div class="net"><span class="nl">NET SALARY</span><span class="nv">₹${net.toLocaleString('en-IN')}</span></div>
</body></html>`;

    /* inject a hidden iframe — no popup, no CSP inline-script issues */
    const old = document.getElementById('__payslip_iframe__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__payslip_iframe__';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 1000);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Salary Slip</h2>
              <p className="text-xs text-slate-400">{employee.name} · {mLabel(month)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition">
              <Printer size={12} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

          {/* employee info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-slate-200 rounded-xl p-4 text-sm">
            {[
              ['Employee Name',  employee.name],
              ['Employee Code',  employee.employeeCode || '—'],
              ['Designation',    employee.designation  || '—'],
              ['Department',     employee.department   || '—'],
              ['Type',           isRegular ? 'Regular (Monthly)' : 'Daily Wages'],
              hasRecord ? ['Pay Status', PAY_STATUS[salaryRecord.payStatus]?.label] : null,
            ].filter(Boolean).map(([lbl, val]) => (
              <div key={lbl}>
                <div className="text-xs text-slate-400">{lbl}</div>
                <div className="font-semibold text-slate-800">{val}</div>
              </div>
            ))}
          </div>

          {/* Attendance summary (daily wages) */}
          {!isRegular && (
            <div className="rounded-xl border border-blue-200 overflow-hidden">
              <div className="bg-blue-100 px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wide">Attendance Summary</div>
              <div className="grid grid-cols-5 gap-2 p-4 text-center">
                {[
                  ['Total Days', daysInMonth,          'text-slate-700'],
                  ['Present',    att.present,           'text-emerald-700'],
                  ['Half Day',   att.halfday,           'text-amber-600'],
                  ['Absent',     att.absent,            'text-rose-600'],
                  ['Payable',    payableDays,           'text-blue-700'],
                ].map(([lbl, val, cls]) => (
                  <div key={lbl}>
                    <div className={`text-2xl font-bold ${cls}`}>{val}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isRegular ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="rounded-xl border border-emerald-200 overflow-hidden">
                <div className="bg-emerald-100 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Earnings</span>
                  <span className="text-xs font-semibold text-emerald-700">{fmt(gross)}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {earnings.map(e => (
                      <tr key={e.label} className="border-t border-slate-50">
                        <td className="px-4 py-2 text-slate-600">{e.label}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">{fmt(e.value)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-emerald-200 bg-emerald-50">
                      <td className="px-4 py-2 font-bold text-emerald-800">Gross Salary</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-800">{fmt(gross)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Deductions */}
              <div className="rounded-xl border border-rose-200 overflow-hidden">
                <div className="bg-rose-100 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Deductions</span>
                  <span className="text-xs font-semibold text-rose-700">{fmt(totalDed)}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {deductions.length === 0
                      ? <tr><td colSpan={2} className="px-4 py-4 text-center text-xs text-slate-400">No deductions</td></tr>
                      : deductions.map(d => (
                        <tr key={d.label} className="border-t border-slate-50">
                          <td className="px-4 py-2 text-slate-600">{d.label}</td>
                          <td className="px-4 py-2 text-right font-medium text-rose-600">{fmt(d.value)}</td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-rose-200 bg-rose-50">
                      <td className="px-4 py-2 font-bold text-rose-800">Total Deductions</td>
                      <td className="px-4 py-2 text-right font-bold text-rose-800">{fmt(totalDed)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 uppercase tracking-wide">Salary Calculation</div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">Daily Rate</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">{fmt(employee.basicSalary)} / {employee.salaryType === 'perDay' ? 'day' : 'month'}</td>
                  </tr>
                  <tr className="border-t border-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">Payable Days</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">{payableDays} days</td>
                  </tr>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-800">Earned Amount</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmt(gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Net Pay — fixed strip between scroll body and footer */}
        <div className="shrink-0 px-6 py-3 bg-slate-900 flex items-center justify-between">
          <span className="text-slate-300 text-sm font-semibold tracking-wide">NET SALARY</span>
          <span className="text-white text-2xl font-bold">{fmt(net)}</span>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 shrink-0 bg-white">
          {!hasRecord ? (
            <button onClick={() => onProcess({ emp: employee, amount: net })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition">
              <Plus size={14} /> Process Salary
            </button>
          ) : (
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-xl ${PAY_STATUS[salaryRecord.payStatus]?.cls}`}>
              <span>{PAY_STATUS[salaryRecord.payStatus]?.label}</span>
              {salaryRecord.paidDate && <span className="text-xs opacity-70">· {fmtDate(salaryRecord.paidDate)}</span>}
            </div>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Process Salary Modal ─── */
function ProcessSalaryModal({ emp, amount, month, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount:        String(Math.max(0, amount)),
    effectiveDate: month + '-01',
    paidDate:      '',
    payStatus:     'unpaid',
    description:   `Monthly Salary — ${mLabel(month)}`,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await SalaryRecordsAPI.create({
        employeeId:    emp.id,
        type:          'salary',
        amount:        Number(form.amount),
        effectiveDate: form.effectiveDate,
        paidDate:      form.paidDate || null,
        payStatus:     form.payStatus,
        description:   form.description,
      });
      toast.success('Salary processed');
      onSaved();
      onClose();
    } catch { toast.error('Failed to process salary'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <Banknote size={15} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Process Salary</h3>
              <p className="text-xs text-slate-400">{emp.name} · {mLabel(month)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Amount (₹) *</label>
            <input type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Effective Date *</label>
            <input type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Payment Status</label>
            <div className="flex gap-2">
              {[['unpaid','Unpaid'], ['paid','Paid'], ['partial','Partial']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => set('payStatus', val)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition ${
                    form.payStatus === val ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {form.payStatus !== 'unpaid' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Paid Date</label>
              <input type="date" value={form.paidDate} onChange={e => set('paidDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition">
            {saving ? 'Processing…' : 'Process Salary'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SalaryManagementPage() {
  const qc = useQueryClient();
  const [month, setMonth]           = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [payslipEmp, setPayslipEmp] = useState(null);
  const [processData, setProcessData] = useState(null);

  const prevMonth = () => { const [y, m] = month.split('-').map(Number); setMonth(fmtYM(new Date(y, m - 2, 1))); };
  const nextMonth = () => { const [y, m] = month.split('-').map(Number); setMonth(fmtYM(new Date(y, m, 1))); };

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  EmployeesAPI.getAll,
  });

  const { data: monthRecords = [] } = useQuery({
    queryKey: ['salary-records', 'mgmt', month],
    queryFn:  () => SalaryRecordsAPI.getAll({ month, type: 'salary' }),
  });

  const { data: attSummary = [] } = useQuery({
    queryKey: ['attendance-summary', month],
    queryFn:  () => AttendanceAPI.getSummary(month),
  });

  const recordsByEmp = useMemo(() => {
    const map = {};
    monthRecords.forEach(r => { map[r.employeeId] = r; });
    return map;
  }, [monthRecords]);

  const attByEmp = useMemo(() => {
    const map = {};
    attSummary.forEach(s => { map[s.id] = s; });
    return map;
  }, [attSummary]);

  const activeEmps = useMemo(() => employees.filter(e => e.isActive), [employees]);

  const filteredEmps = useMemo(() => {
    let list = activeEmps;
    if (typeFilter === 'regular')    list = list.filter(e => e.employeeType === 'regular');
    if (typeFilter === 'dailyWages') list = list.filter(e => e.employeeType !== 'regular');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q));
    }
    return list;
  }, [activeEmps, typeFilter, search]);

  const stats = useMemo(() => {
    let totalPayroll = 0, paid = 0, pending = 0;
    activeEmps.forEach(emp => {
      const { net } = calcSalary(emp, attByEmp[emp.id], month);
      const rec     = recordsByEmp[emp.id];
      totalPayroll += net;
      if (rec?.payStatus === 'paid')   paid    += Number(rec.amount);
      else if (rec)                    pending += Number(rec.amount);
    });
    return { total: activeEmps.length, totalPayroll, paid, pending };
  }, [activeEmps, recordsByEmp, attByEmp, month]);

  const markPaidMut = useMutation({
    mutationFn: id => SalaryRecordsAPI.update(id, { payStatus: 'paid', paidDate: new Date().toISOString().slice(0, 10) }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['salary-records', 'mgmt', month] }); toast.success('Marked as paid'); },
    onError:    () => toast.error('Failed to update'),
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['salary-records', 'mgmt', month] });
    setPayslipEmp(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Banknote size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Salary Management</h1>
            <p className="text-xs text-slate-500">Payroll · Payslips · Salary Processing</p>
          </div>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronLeft size={14} /></button>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
          <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronRight size={14} /></button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 text-xs shrink-0">
          {[
            ['Total',          stats.total,        'text-slate-700'],
            ['Monthly Payroll',fmt(stats.totalPayroll), 'text-blue-700'],
            ['Paid',           fmt(stats.paid),    'text-emerald-600'],
            ['Pending',        fmt(stats.pending), 'text-rose-500'],
          ].map(([lbl, val, cls]) => (
            <div key={lbl} className="text-right">
              <div className="text-slate-400">{lbl}</div>
              <div className={`font-bold ${cls}`}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          {[['all','All'],['regular','Regular'],['dailyWages','Daily Wages']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              className={`px-3 py-1.5 font-medium transition ${typeFilter === val ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
        ) : filteredEmps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <UserCheck size={36} className="opacity-20" />
            <p className="text-sm">No active employees found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Gross</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">
                    <TrendingDown size={11} className="inline mr-1 text-rose-400" />Deductions
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Net Salary</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmps.map((emp, i) => {
                  const sal    = calcSalary(emp, attByEmp[emp.id], month);
                  const record = recordsByEmp[emp.id];
                  const status = record?.payStatus ?? null;
                  const isReg  = emp.employeeType === 'regular';
                  const att    = attByEmp[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isReg ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                            {emp.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{emp.name}</div>
                            <div className="text-xs text-slate-400">{emp.designation || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isReg ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isReg ? 'Regular' : 'Daily Wages'}
                        </span>
                        {!isReg && att && (
                          <div className="text-xs text-slate-400 mt-0.5">{att.present + att.halfday * 0.5} payable days</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmt(sal.gross)}</td>
                      <td className="px-4 py-3 text-right">
                        {sal.deductions > 0
                          ? <span className="text-rose-600 font-medium">{fmt(sal.deductions)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(sal.net)}</td>
                      <td className="px-4 py-3 text-center">
                        {status
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_STATUS[status]?.cls}`}>{PAY_STATUS[status]?.label}</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-400">Not Processed</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setPayslipEmp(emp)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                            <Eye size={11} /> Payslip
                          </button>
                          {!record && (
                            <button onClick={() => setProcessData({ emp, amount: sal.net })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                              <Plus size={11} /> Process
                            </button>
                          )}
                          {record && record.payStatus !== 'paid' && (
                            <button onClick={() => markPaidMut.mutate(record.id)}
                              disabled={markPaidMut.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                              <CheckCircle2 size={11} /> Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payslipEmp && (
        <PayslipModal
          employee={payslipEmp}
          month={month}
          attData={attByEmp[payslipEmp.id]}
          salaryRecord={recordsByEmp[payslipEmp.id]}
          onClose={() => setPayslipEmp(null)}
          onProcess={data => setProcessData(data)}
        />
      )}
      {processData && (
        <ProcessSalaryModal
          emp={processData.emp}
          amount={processData.amount}
          month={month}
          onClose={() => setProcessData(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
