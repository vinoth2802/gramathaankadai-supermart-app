import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, Search, Pencil, Trash2, X, ChevronLeft, ChevronRight, Receipt, Settings,
} from 'lucide-react';
import { ExpensesAPI }          from '../../api/expenses.js';
import { ExpenseCategoriesAPI } from '../../api/expenseCategories.js';
import { PartiesAPI }           from '../../api/parties.js';
import ConfirmDialog            from '../../components/ConfirmDialog.jsx';

const fmt      = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const toInput  = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const todayStr = ()  => new Date().toISOString().slice(0, 10);
const fmtYM    = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];

const COLOR_PRESETS = [
  { label: 'Blue',    cls: 'bg-blue-100 text-blue-700'       },
  { label: 'Amber',   cls: 'bg-amber-100 text-amber-700'     },
  { label: 'Cyan',    cls: 'bg-cyan-100 text-cyan-700'       },
  { label: 'Indigo',  cls: 'bg-indigo-100 text-indigo-700'   },
  { label: 'Violet',  cls: 'bg-violet-100 text-violet-700'   },
  { label: 'Emerald', cls: 'bg-emerald-100 text-emerald-700' },
  { label: 'Orange',  cls: 'bg-orange-100 text-orange-700'   },
  { label: 'Pink',    cls: 'bg-pink-100 text-pink-700'       },
  { label: 'Yellow',  cls: 'bg-yellow-100 text-yellow-700'   },
  { label: 'Teal',    cls: 'bg-teal-100 text-teal-700'       },
  { label: 'Lime',    cls: 'bg-lime-100 text-lime-700'       },
  { label: 'Purple',  cls: 'bg-purple-100 text-purple-700'   },
  { label: 'Rose',    cls: 'bg-rose-100 text-rose-700'       },
  { label: 'Slate',   cls: 'bg-slate-100 text-slate-600'     },
];

const getCatCls  = (name, cats) => cats.find(c => c.name === name)?.color ?? 'bg-slate-100 text-slate-600';
const getCatType = (name, cats) => cats.find(c => c.name === name)?.type  ?? 'Indirect';

/* ─── Categories Modal ─── */
function CategoriesModal({ onClose }) {
  const qc = useQueryClient();
  const [name,   setName]   = useState('');
  const [type,   setType]   = useState('Indirect');
  const [color,  setColor]  = useState(COLOR_PRESETS[0].cls);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: cats = [], refetch } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  () => ExpenseCategoriesAPI.getAll(),
  });

  const direct   = cats.filter(c => c.type === 'Direct');
  const indirect = cats.filter(c => c.type === 'Indirect');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['expense-categories'] });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      await ExpenseCategoriesAPI.create({ name: name.trim(), type, color });
      toast.success('Category added');
      setName('');
      refetch();
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add category');
    } finally { setSaving(false); }
  };

  const deleteMut = useMutation({
    mutationFn: (id) => ExpenseCategoriesAPI.delete(id),
    onSuccess:  () => { refetch(); invalidate(); toast.success('Category deleted'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });

  const CatGroup = ({ label, items, typeColor }) => (
    <div>
      <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${typeColor}`}>{label}</div>
      {items.length === 0
        ? <p className="text-xs text-slate-400 italic">No categories yet</p>
        : (
          <div className="flex flex-wrap gap-2">
            {items.map(c => (
              <div key={c.id}
                className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium ${c.color}`}>
                <span>{c.name}</span>
                <button onClick={() => setDeleteId(c.id)}
                  className="rounded-full p-0.5 hover:bg-black/10 transition">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <Settings size={15} className="text-rose-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Manage Categories</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">
          <CatGroup label="Direct Expenses"   items={direct}   typeColor="text-orange-500" />
          <CatGroup label="Indirect Expenses" items={indirect} typeColor="text-indigo-500" />
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="px-6 py-4 border-t border-slate-100 shrink-0 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Add New Category</p>

          <div className="flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold shrink-0">
              {['Direct', 'Indirect'].map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`px-3 py-2 transition ${
                    type === t
                      ? t === 'Direct' ? 'bg-orange-500 text-white' : 'bg-indigo-500 text-white'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Badge colour</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map(p => (
                <button key={p.cls} type="button" onClick={() => setColor(p.cls)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition ${p.cls} ${
                    color === p.cls ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-60 hover:opacity-100'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-50">
            <Plus size={14} /> {saving ? 'Adding…' : 'Add Category'}
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Delete this category? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMut.mutate(deleteId); setDeleteId(null); }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ─── Expense Modal ─── */
function ExpenseModal({ expense, categories, parties, onClose, onSaved }) {
  const [form, setForm] = useState({
    date:        expense ? toInput(expense.date) : todayStr(),
    category:    expense?.category    ?? '',
    description: expense?.description ?? '',
    amount:      expense?.amount      ?? '',
    paidAmount:  expense?.paidAmount  ?? '',
    paymentMode: expense?.paymentMode ?? 'Cash',
    reference:   expense?.reference   ?? '',
    notes:       expense?.notes       ?? '',
    partyId:     expense?.partyId     ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const balanceDue = useMemo(() => {
    const amt  = Number(form.amount)     || 0;
    const paid = Number(form.paidAmount) || 0;
    return amt - paid;
  }, [form.amount, form.paidAmount]);

  const direct   = categories.filter(c => c.type === 'Direct');
  const indirect = categories.filter(c => c.type === 'Indirect');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { toast.error('Category is required'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Valid amount is required'); return; }
    setSaving(true);
    try {
      if (expense) {
        await ExpensesAPI.update(expense.id, form);
        toast.success('Expense updated');
      } else {
        await ExpensesAPI.create(form);
        toast.success('Expense added');
      }
      onSaved();
      onClose();
    } catch { toast.error('Failed to save expense'); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <Receipt size={16} className="text-rose-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Category <span className="text-rose-500">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)} required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                <option value="">Select category…</option>
                {direct.length > 0 && (
                  <optgroup label="── Direct Expense">
                    {direct.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </optgroup>
                )}
                {indirect.length > 0 && (
                  <optgroup label="── Indirect Expense">
                    {indirect.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Party */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Party <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select value={form.partyId} onChange={e => set('partyId', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
              <option value="">— No party —</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Total Amount <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                  placeholder="0.00" required
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            </div>
            {/* Paid Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Paid Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input type="number" min="0" step="0.01" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            </div>
          </div>

          {/* Balance indicator */}
          {(Number(form.amount) > 0 || Number(form.paidAmount) > 0) && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium ${
              balanceDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <span>{balanceDue > 0 ? 'Balance Due' : 'Fully Paid'}</span>
              <span className="font-bold">{balanceDue > 0 ? fmt(balanceDue) : '✓'}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Mode */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Reference */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Reference No.</label>
              <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)}
                placeholder="Bill / receipt no."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Additional notes…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {saving ? 'Saving…' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ExpensesPage() {
  const [selMonth, setSelMonth]     = useState(fmtYM(new Date()));
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [addOpen, setAddOpen]       = useState(false);
  const [editExp, setEditExp]       = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [catsMgmt, setCatsMgmt]     = useState(false);

  const prevMonth = () => { const [y,m] = selMonth.split('-').map(Number); setSelMonth(fmtYM(new Date(y,m-2,1))); };
  const nextMonth = () => { const [y,m] = selMonth.split('-').map(Number); setSelMonth(fmtYM(new Date(y,m,1))); };

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ['expenses', selMonth],
    queryFn:  () => ExpensesAPI.getAll({ month: selMonth }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  () => ExpenseCategoriesAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties-list'],
    queryFn:  () => PartiesAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const directCats   = categories.filter(c => c.type === 'Direct');
  const indirectCats = categories.filter(c => c.type === 'Indirect');

  const deleteMut = useMutation({
    mutationFn: (id) => ExpensesAPI.delete(id),
    onSuccess:  () => { refetch(); toast.success('Expense deleted'); },
    onError:    () => toast.error('Failed to delete'),
  });

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses
      .filter(e => !typeFilter || getCatType(e.category, categories) === typeFilter)
      .filter(e => !catFilter  || e.category === catFilter)
      .filter(e => !q ||
        e.description?.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        e.party?.name?.toLowerCase().includes(q)
      );
  }, [expenses, typeFilter, catFilter, categories, search]);

  /* ── Summary ── */
  const summary = useMemo(() => {
    const total     = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalPaid = expenses.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const totalDue  = total - totalPaid;
    const direct    = expenses.filter(e => getCatType(e.category, categories) === 'Direct').reduce((s, e) => s + Number(e.amount), 0);
    const indirect  = total - direct;
    return { total, totalPaid, totalDue, direct, indirect, count: expenses.length };
  }, [expenses, categories]);

  const monthLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m-1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <Receipt size={18} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Expenses</h1>
            <p className="text-xs text-slate-500">{summary.count} records · {monthLabel(selMonth)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCatsMgmt(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition">
            <Settings size={14} /> Categories
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition shadow-sm">
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Month nav + filters */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 shrink-0 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronLeft size={14} /></button>
            <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-700" />
            <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"><ChevronRight size={14} /></button>
            {selMonth !== fmtYM(new Date()) && (
              <button onClick={() => setSelMonth(fmtYM(new Date()))} className="text-xs text-rose-600 hover:underline px-1">This month</button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            {['', 'Direct', 'Indirect'].map(t => (
              <button key={t} onClick={() => { setTypeFilter(t); setCatFilter(''); }}
                className={`px-3 py-1.5 transition ${typeFilter === t ? 'bg-rose-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {t || 'All'}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-slate-600">
            <option value="">All Categories</option>
            {directCats.length > 0 && (
              <optgroup label="── Direct">
                {directCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </optgroup>
            )}
            {indirectCats.length > 0 && (
              <optgroup label="── Indirect">
                {indirectCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </optgroup>
            )}
          </select>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 w-44" />
          </div>
        </div>

        {/* Summary cards */}
        <div className="flex gap-3 px-6 pt-4 pb-2 shrink-0 overflow-x-auto">
          <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm shrink-0 min-w-[120px]">
            <div className="text-xs text-slate-400 mb-0.5">Total</div>
            <div className="text-xl font-bold text-rose-600">{fmt(summary.total)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm shrink-0 min-w-[120px]">
            <div className="text-xs text-slate-400 mb-0.5">Paid</div>
            <div className="text-xl font-bold text-emerald-600">{fmt(summary.totalPaid)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm shrink-0 min-w-[120px]">
            <div className="text-xs text-slate-400 mb-0.5">Balance Due</div>
            <div className={`text-xl font-bold ${summary.totalDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{fmt(summary.totalDue)}</div>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-100 px-4 py-3 shadow-sm shrink-0 min-w-[130px]">
            <div className="text-xs text-orange-500 font-semibold mb-0.5">Direct</div>
            <div className="text-xl font-bold text-orange-600">{fmt(summary.direct)}</div>
          </div>
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-3 shadow-sm shrink-0 min-w-[130px]">
            <div className="text-xs text-indigo-500 font-semibold mb-0.5">Indirect</div>
            <div className="text-xl font-bold text-indigo-600">{fmt(summary.indirect)}</div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 mx-6 mb-4 mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Receipt size={40} className="opacity-20" />
              <p className="text-sm">No expenses for {monthLabel(selMonth)}</p>
              <button onClick={() => setAddOpen(true)}
                className="mt-1 text-xs text-rose-500 hover:underline font-medium">+ Add first expense</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Party</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Payment Mode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-rose-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-amber-600">Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((exp, idx) => {
                  const due      = Number(exp.amount) - Number(exp.paidAmount || 0);
                  const catCls   = getCatCls(exp.category, categories);
                  const catTp    = getCatType(exp.category, categories);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${catCls}`}>
                            {exp.category}
                          </span>
                          <span className={`text-[10px] px-1 font-semibold w-fit ${catTp === 'Direct' ? 'text-orange-500' : 'text-indigo-400'}`}>
                            {catTp}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px] truncate">{exp.description || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{exp.party?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{exp.paymentMode || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-rose-600 text-sm">{fmt(exp.amount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exp.paidAmount != null
                          ? <span className="font-medium text-emerald-600 text-sm">{fmt(exp.paidAmount)}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {due > 0
                          ? <span className="font-medium text-amber-600 text-sm">{fmt(due)}</span>
                          : <span className="text-emerald-500 text-xs font-medium">✓</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditExp(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteId(exp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-2.5 text-xs font-semibold text-slate-500">
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-rose-600">
                    {fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                    {fmt(filtered.reduce((s, e) => s + Number(e.paidAmount || 0), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-amber-600">
                    {fmt(filtered.reduce((s, e) => s + Math.max(0, Number(e.amount) - Number(e.paidAmount || 0)), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {catsMgmt && <CategoriesModal onClose={() => setCatsMgmt(false)} />}

      {(addOpen || editExp) && (
        <ExpenseModal
          expense={editExp ?? undefined}
          categories={categories}
          parties={parties}
          onClose={() => { setAddOpen(false); setEditExp(null); }}
          onSaved={refetch}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record?"
        confirmLabel="Delete"
        onConfirm={() => { deleteMut.mutate(deleteId); setDeleteId(null); }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
