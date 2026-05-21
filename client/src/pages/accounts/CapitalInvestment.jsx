import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, Users, PieChart, Plus, Settings, Search,
  FileSpreadsheet, Printer, MoreVertical, Pencil, Trash2, Eye,
  X, Phone, Mail, MapPin, Banknote, Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { CapitalInvestmentsAPI } from '../../api/capitalInvestments.js';

const RS = '₹';
const fmtAmt = (v) => `${RS}${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().slice(0, 10);

const BLANK = {
  name: '', type: 'Director', phone: '', email: '', address: '',
  amount: '', equity: '', date: todayISO(), paymentMode: 'Cash',
  reference: '', notes: '', status: 'Active',
};

const TYPE_COLORS = {
  Director: 'bg-blue-100 text-blue-700',
  Promoter: 'bg-purple-100 text-purple-700',
  Investor: 'bg-green-100 text-green-700',
};

const STATUS_COLORS = {
  Active: 'text-green-600',
  Inactive: 'text-slate-400',
  Pending: 'text-orange-500',
};

const TYPE_BG = {
  Director: 'bg-blue-500',
  Promoter: 'bg-purple-500',
  Investor: 'bg-green-500',
};

function FLabel({ label, id, type = 'text', value, onChange, required, as: Tag = 'input', ...rest }) {
  return (
    <div className="relative">
      <Tag
        id={id}
        type={Tag === 'input' ? type : undefined}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
        {...rest}
      />
      <label
        htmlFor={id}
        className="absolute left-3 -top-2.5 text-xs text-blue-600 bg-white px-1 pointer-events-none"
      >
        {label}{required && ' *'}
      </label>
    </div>
  );
}

function FSelect({ label, id, value, onChange, required, children }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition bg-white"
      >
        {children}
      </select>
      <label
        htmlFor={id}
        className="absolute left-3 -top-2.5 text-xs text-blue-600 bg-white px-1 pointer-events-none"
      >
        {label}{required && ' *'}
      </label>
    </div>
  );
}

const TABS = ['All', 'Directors', 'Promoters', 'Investors'];
const TAB_TYPE = { Directors: 'Director', Promoters: 'Promoter', Investors: 'Investor' };

const CAP_BLANK    = { amount: '', shares: '', faceValue: '', date: todayISO(), notes: '' };
const LS_AC_KEY    = 'cap_authorised';
const LS_PUC_KEY   = 'cap_paidup';
const loadLS  = (key) => { try { return JSON.parse(localStorage.getItem(key)) || CAP_BLANK; } catch { return CAP_BLANK; } };
const saveLS  = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export default function CapitalInvestment() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState('All');
  const [search, setSearch]         = useState('');
  const [addModal, setAddModal]     = useState(false);
  const [editData, setEditData]     = useState(null);
  const [form, setForm]             = useState(BLANK);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [rowMenu, setRowMenu]       = useState(null);
  const [detailId, setDetailId]     = useState(null);
  const [acData,   setAcData]       = useState(() => loadLS(LS_AC_KEY));
  const [pucData,  setPucData]      = useState(() => loadLS(LS_PUC_KEY));
  const [acModal,  setAcModal]      = useState(false);
  const [pucModal, setPucModal]     = useState(false);
  const [acForm,   setAcForm]       = useState(CAP_BLANK);
  const [pucForm,  setPucForm]      = useState(CAP_BLANK);
  const rowMenuRef = useRef(null);

  const { data: investments = [] } = useQuery({
    queryKey: ['capitalInvestments'],
    queryFn: () => CapitalInvestmentsAPI.getAll(),
  });

  const createMut = useMutation({
    mutationFn: CapitalInvestmentsAPI.create,
    onSuccess: () => {
      qc.invalidateQueries(['capitalInvestments']);
      setAddModal(false);
      setForm(BLANK);
      toast.success('Investment added');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to add investment'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => CapitalInvestmentsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['capitalInvestments']);
      setEditData(null);
      toast.success('Investment updated');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: CapitalInvestmentsAPI.remove,
    onSuccess: () => {
      qc.invalidateQueries(['capitalInvestments']);
      if (detailId === deleteConfirm.id) setDetailId(null);
      toast.success('Investment deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });

  useEffect(() => {
    const handler = (e) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) setRowMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = investments.filter(inv => {
    const matchTab = tab === 'All' || inv.type === TAB_TYPE[tab];
    const matchSearch = inv.name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalInvested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const activeCount   = investments.filter(i => i.status === 'Active').length;
  const totalEquity   = investments.reduce((s, i) => s + Number(i.equity || 0), 0);

  const byType = (type) => investments.filter(i => i.type === type);

  const openAdd  = () => { setForm(BLANK); setAddModal(true); };
  const openEdit = (inv) => { setForm({ ...inv, date: inv.date?.slice(0, 10) || todayISO() }); setEditData(inv); };
  const closeModal = () => { setAddModal(false); setEditData(null); setForm(BLANK); };

  const handleSave = () => {
    if (!form.name.trim())                         return toast.error('Investor name required');
    if (!form.amount || Number(form.amount) <= 0)  return toast.error('Investment amount required');
    if (!form.equity || Number(form.equity) < 0 || Number(form.equity) > 100)
      return toast.error('Equity % must be between 0 and 100');
    const prevEquity = investments
      .filter(i => !editData || i.id !== editData.id)
      .reduce((s, i) => s + Number(i.equity || 0), 0);
    if (prevEquity + Number(form.equity) > 100)
      return toast.error(`Total equity would be ${(prevEquity + Number(form.equity)).toFixed(2)}% — exceeds 100%`);

    if (editData) {
      updateMut.mutate({ id: editData.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const saveAC = () => {
    if (!acForm.amount || Number(acForm.amount) < 0) return toast.error('Amount required');
    saveLS(LS_AC_KEY, acForm);
    setAcData(acForm);
    setAcModal(false);
    toast.success('Authorised Capital updated');
  };

  const savePUC = () => {
    if (!pucForm.amount || Number(pucForm.amount) < 0) return toast.error('Amount required');
    const ac = Number(acData.amount || 0);
    if (ac > 0 && Number(pucForm.amount) > ac)
      return toast.error('Paid Up Capital cannot exceed Authorised Capital');
    saveLS(LS_PUC_KEY, pucForm);
    setPucData(pucForm);
    setPucModal(false);
    toast.success('Paid Up Capital updated');
  };

  const handleExport = () => {
    const headers = ['Name', 'Type', 'Amount', 'Equity %', 'Date', 'Payment Mode', 'Reference', 'Status'];
    const rows = filtered.map(i => [
      i.name, i.type, i.amount, i.equity,
      fmtDate(i.date), i.paymentMode, i.reference || '', i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'capital-investments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const detail = investments.find(i => i.id === detailId) || null;

  return (
    <div className="p-6 min-h-screen bg-slate-50">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Capital Investment</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus size={16} /> Add Investment
          </button>
          <button className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Capital Invested</p>
            <p className="text-2xl font-bold text-blue-700 mt-0.5">{fmtAmt(totalInvested)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Across all investors</p>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Investors</p>
            <p className="text-2xl font-bold text-green-700 mt-0.5">{activeCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Directors, Promoters, Investors</p>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl border border-purple-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <PieChart size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Equity Distributed</p>
            <p className="text-2xl font-bold text-purple-700 mt-0.5">{totalEquity.toFixed(2)}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Total ownership allocated</p>
          </div>
        </div>
      </div>

      {/* Equity Warning */}
      {totalEquity > 100 && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2 text-sm text-rose-700 font-medium">
          Warning: Total equity ({totalEquity.toFixed(2)}%) exceeds 100%
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {t}
            {t !== 'All' && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {byType(TAB_TYPE[t]).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-56 transition"
            />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={() => window.print()}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

        {/* Table or empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <Users size={36} className="text-slate-300" />
            </div>
            <p className="text-base font-medium text-slate-500">No investments added yet</p>
            <button onClick={openAdd} className="text-blue-600 text-sm hover:underline font-medium">
              + Add your first investment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Investment Amount</th>
                  <th className="text-right px-4 py-3 font-semibold">Equity %</th>
                  <th className="text-left px-4 py-3 font-semibold">Investment Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Payment Mode</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50 transition cursor-pointer ${detailId === inv.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setDetailId(inv.id === detailId ? null : inv.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{inv.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[inv.type] || 'bg-slate-100 text-slate-600'}`}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtAmt(inv.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-slate-700">{Number(inv.equity || 0).toFixed(2)}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, Number(inv.equity || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(inv.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.paymentMode}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${STATUS_COLORS[inv.status] || 'text-slate-500'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(inv)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: inv.id })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="relative" ref={rowMenu === inv.id ? rowMenuRef : null}>
                          <button
                            onClick={() => setRowMenu(rowMenu === inv.id ? null : inv.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {rowMenu === inv.id && (
                            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-36 py-1 text-sm">
                              <button
                                onClick={() => { setDetailId(inv.id); setRowMenu(null); }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Eye size={14} /> View Detail
                              </button>
                              <button
                                onClick={() => { openEdit(inv); setRowMenu(null); }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm({ open: true, id: inv.id }); setRowMenu(null); }}
                                className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white ${TYPE_BG[detail.type] || 'bg-slate-500'}`}>
                {detail.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{detail.name}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[detail.type] || ''}`}>
                  {detail.type}
                </span>
              </div>
            </div>
            <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-slate-600 transition">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              {detail.phone   && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" />{detail.phone}</div>}
              {detail.email   && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail  size={14} className="text-slate-400" />{detail.email}</div>}
              {detail.address && <div className="flex items-start gap-2 text-sm text-slate-600"><MapPin size={14} className="text-slate-400 mt-0.5" />{detail.address}</div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Investment Amount</p>
                <p className="text-lg font-bold text-slate-800">{fmtAmt(detail.amount)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Equity %</p>
                <p className="text-lg font-bold text-slate-800">{Number(detail.equity || 0).toFixed(2)}%</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Investment Date</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(detail.date)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Payment Mode</p>
                <p className="text-sm font-semibold text-slate-700">{detail.paymentMode}</p>
              </div>
              {detail.reference && (
                <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Reference No</p>
                  <p className="text-sm font-semibold text-slate-700">{detail.reference}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <p className={`text-sm font-bold ${STATUS_COLORS[detail.status] || 'text-slate-500'}`}>{detail.status}</p>
              </div>
            </div>
          </div>

          {detail.notes && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-amber-700">Notes: </span>{detail.notes}
            </div>
          )}
        </div>
      )}

      {/* Section Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { type: 'Director', border: 'border-blue-100',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
          { type: 'Promoter', border: 'border-purple-100', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
          { type: 'Investor', border: 'border-green-100',  bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
        ].map(({ type, border, bg, text, badge }) => {
          const list   = byType(type);
          const total  = list.reduce((s, i) => s + Number(i.amount || 0), 0);
          const equity = list.reduce((s, i) => s + Number(i.equity || 0), 0);
          return (
            <div key={type} className={`rounded-xl border ${border} ${bg} p-5`}>
              <h3 className={`font-bold text-sm uppercase tracking-wide ${text} mb-3`}>{type}s</h3>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-800">{list.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{type}s</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{fmtAmt(total)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Invested</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{equity.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 mt-0.5">Equity</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {list.map(i => (
                  <div key={i.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate pr-2">{i.name}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full ${badge}`}>
                      {Number(i.equity || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No {type.toLowerCase()}s added</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Authorised Capital & Paid Up Capital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

        {/* Authorised Capital */}
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Banknote size={20} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800">Authorised Capital</h3>
            </div>
            <button
              onClick={() => { setAcForm({ ...acData }); setAcModal(true); }}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition border border-indigo-200"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 col-span-2">
              <p className="text-xs text-slate-500 mb-1">Authorised Capital Amount</p>
              <p className="text-2xl font-bold text-indigo-700">{fmtAmt(acData.amount)}</p>
            </div>
            {acData.shares && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">No. of Shares</p>
                <p className="text-sm font-bold text-slate-800">{Number(acData.shares).toLocaleString('en-IN')}</p>
              </div>
            )}
            {acData.faceValue && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Face Value / Share</p>
                <p className="text-sm font-bold text-slate-800">{fmtAmt(acData.faceValue)}</p>
              </div>
            )}
            {acData.date && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Date Authorised</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(acData.date)}</p>
              </div>
            )}
            {acData.notes && (
              <div className="bg-amber-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-amber-700 font-semibold mb-0.5">Notes</p>
                <p className="text-xs text-slate-600">{acData.notes}</p>
              </div>
            )}
          </div>
          {!acData.amount && (
            <button onClick={() => { setAcForm({ ...CAP_BLANK }); setAcModal(true); }}
              className="mt-3 w-full text-center text-sm text-indigo-600 hover:underline font-medium">
              + Set Authorised Capital
            </button>
          )}
        </div>

        {/* Paid Up Capital */}
        <div className="bg-white rounded-xl border border-teal-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Coins size={20} className="text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-800">Paid Up Capital</h3>
            </div>
            <button
              onClick={() => { setPucForm({ ...pucData }); setPucModal(true); }}
              className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg transition border border-teal-200"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-teal-50 rounded-lg p-3 col-span-2">
              <p className="text-xs text-slate-500 mb-1">Paid Up Capital Amount</p>
              <p className="text-2xl font-bold text-teal-700">{fmtAmt(pucData.amount)}</p>
              {Number(acData.amount) > 0 && Number(pucData.amount) > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{((Number(pucData.amount) / Number(acData.amount)) * 100).toFixed(1)}% of Authorised Capital</span>
                  </div>
                  <div className="w-full h-1.5 bg-teal-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${Math.min(100, (Number(pucData.amount) / Number(acData.amount)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {pucData.shares && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Shares Issued</p>
                <p className="text-sm font-bold text-slate-800">{Number(pucData.shares).toLocaleString('en-IN')}</p>
              </div>
            )}
            {pucData.faceValue && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Face Value / Share</p>
                <p className="text-sm font-bold text-slate-800">{fmtAmt(pucData.faceValue)}</p>
              </div>
            )}
            {pucData.date && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Date</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(pucData.date)}</p>
              </div>
            )}
            {pucData.notes && (
              <div className="bg-amber-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-amber-700 font-semibold mb-0.5">Notes</p>
                <p className="text-xs text-slate-600">{pucData.notes}</p>
              </div>
            )}
          </div>
          {!pucData.amount && (
            <button onClick={() => { setPucForm({ ...CAP_BLANK }); setPucModal(true); }}
              className="mt-3 w-full text-center text-sm text-teal-600 hover:underline font-medium">
              + Set Paid Up Capital
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(addModal || editData) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editData ? 'Edit Capital Investment' : 'Add Capital Investment'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-5">
                  <FLabel label="Investor Name" id="inv-name"    value={form.name}    onChange={f('name')}    required />
                  <FSelect label="Type"          id="inv-type"    value={form.type}    onChange={f('type')}    required>
                    <option value="Director">Director</option>
                    <option value="Promoter">Promoter</option>
                    <option value="Investor">Investor</option>
                  </FSelect>
                  <FLabel label="Contact Number" id="inv-phone"   value={form.phone}   onChange={f('phone')} />
                  <FLabel label="Email ID"        id="inv-email"   value={form.email}   onChange={f('email')}  type="email" />
                  <FLabel label="Address"         id="inv-address" value={form.address} onChange={f('address')} as="textarea" rows={3} style={{ paddingTop: '20px' }} />
                  <FSelect label="Status"         id="inv-status"  value={form.status}  onChange={f('status')}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </FSelect>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <FLabel label="Investment Amount (₹)" id="inv-amount"  value={form.amount}  onChange={f('amount')}  type="number" required />
                  <FLabel label="Equity %"              id="inv-equity"  value={form.equity}  onChange={f('equity')}  type="number" min="0" max="100" required />
                  <FLabel label="Investment Date"        id="inv-date"    value={form.date}    onChange={f('date')}    type="date"   required />
                  <FSelect label="Payment Mode"          id="inv-payment" value={form.paymentMode} onChange={f('paymentMode')} required>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                  </FSelect>
                  <FLabel label="Bank / Reference No"   id="inv-ref"     value={form.reference} onChange={f('reference')} />
                  <FLabel label="Notes"                  id="inv-notes"   value={form.notes}   onChange={f('notes')}   as="textarea" rows={3} style={{ paddingTop: '20px' }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMut.isLoading || updateMut.isLoading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60"
              >
                {createMut.isLoading || updateMut.isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Investment"
        message="Are you sure you want to delete this investment? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />

      {/* Authorised Capital Modal */}
      {acModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Authorised Capital</h2>
              </div>
              <button onClick={() => setAcModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FLabel label="Authorised Capital Amount (₹)" id="ac-amount"    value={acForm.amount}    onChange={e => setAcForm(p => ({ ...p, amount: e.target.value }))}    type="number" required />
              <FLabel label="Number of Authorised Shares"   id="ac-shares"    value={acForm.shares}    onChange={e => setAcForm(p => ({ ...p, shares: e.target.value }))}    type="number" />
              <FLabel label="Face Value per Share (₹)"      id="ac-faceValue" value={acForm.faceValue} onChange={e => setAcForm(p => ({ ...p, faceValue: e.target.value }))} type="number" />
              <FLabel label="Date Authorised"               id="ac-date"      value={acForm.date}      onChange={e => setAcForm(p => ({ ...p, date: e.target.value }))}      type="date" />
              <FLabel label="Notes"                          id="ac-notes"     value={acForm.notes}     onChange={e => setAcForm(p => ({ ...p, notes: e.target.value }))}     as="textarea" rows={2} style={{ paddingTop: '20px' }} />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setAcModal(false)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={saveAC}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paid Up Capital Modal */}
      {pucModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-teal-600" />
                <h2 className="text-lg font-bold text-slate-800">Paid Up Capital</h2>
              </div>
              <button onClick={() => setPucModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FLabel label="Paid Up Capital Amount (₹)" id="puc-amount"    value={pucForm.amount}    onChange={e => setPucForm(p => ({ ...p, amount: e.target.value }))}    type="number" required />
              <FLabel label="Number of Shares Issued"    id="puc-shares"    value={pucForm.shares}    onChange={e => setPucForm(p => ({ ...p, shares: e.target.value }))}    type="number" />
              <FLabel label="Face Value per Share (₹)"   id="puc-faceValue" value={pucForm.faceValue} onChange={e => setPucForm(p => ({ ...p, faceValue: e.target.value }))} type="number" />
              <FLabel label="Date"                        id="puc-date"      value={pucForm.date}      onChange={e => setPucForm(p => ({ ...p, date: e.target.value }))}      type="date" />
              <FLabel label="Notes"                       id="puc-notes"     value={pucForm.notes}     onChange={e => setPucForm(p => ({ ...p, notes: e.target.value }))}     as="textarea" rows={2} style={{ paddingTop: '20px' }} />
              {Number(acData.amount) > 0 && (
                <p className="text-xs text-slate-500">Max allowed: {fmtAmt(acData.amount)} (Authorised Capital)</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setPucModal(false)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={savePUC}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
