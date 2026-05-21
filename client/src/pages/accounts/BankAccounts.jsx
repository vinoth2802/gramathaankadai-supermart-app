import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Filter, History, MoreVertical, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AccountsAPI } from '../../api/accounts.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const RS = '₹';
const fmtAmt = (v) => `${RS}${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const BLANK_FORM = { bankName: '', accountNo: '', ifsc: '', balance: '', type: 'Current' };

const TRANSFER_OPTIONS = [
  { key: 'bankToCash', label: 'Bank to Cash Transfer' },
  { key: 'cashToBank', label: 'Cash to Bank Transfer' },
  { key: 'bankToBank', label: 'Bank to Bank Transfer' },
  { key: 'adjust',     label: 'Adjust Bank Balance' },
];

export default function BankAccounts() {
  const qc = useQueryClient();
  const { data: banks = [], isLoading } = useQuery({ queryKey: ['bankAccounts'], queryFn: AccountsAPI.getBankAccounts });

  const [selectedId,    setSelectedId]    = useState(null);
  const [search,        setSearch]        = useState('');
  const [sortDir,       setSortDir]       = useState('asc');
  const [addModal,      setAddModal]      = useState(false);
  const [editModal,     setEditModal]     = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [transferType,  setTransferType]  = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [txnSearch,     setTxnSearch]     = useState('');
  const [showTxnSearch, setShowTxnSearch] = useState(false);
  const [rowMenu,       setRowMenu]       = useState(null);

  const [form,          setForm]          = useState(BLANK_FORM);
  const [transferAmt,   setTransferAmt]   = useState('');
  const [transferTarget,setTransferTarget]= useState('');
  const [adjustValue,   setAdjustValue]   = useState('');

  const dropdownRef = useRef(null);
  const selectedBank = banks.find(b => b.id === selectedId) || null;

  const { data: transactions = [] } = useQuery({
    queryKey: ['bankTransactions', selectedId],
    queryFn:  () => AccountsAPI.getBankTransactions(selectedId),
    enabled:  !!selectedId,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: AccountsAPI.saveBankAccount,
    onSuccess: (bank) => {
      qc.invalidateQueries(['bankAccounts']);
      qc.invalidateQueries(['paymentModes']);
      setSelectedId(bank.id);
      setAddModal(false);
      setForm(BLANK_FORM);
      toast.success('Bank account added');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to add bank'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => AccountsAPI.updateBankAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['bankAccounts']);
      setEditModal(false);
      toast.success('Bank updated');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: AccountsAPI.deleteBankAccount,
    onSuccess: (_, id) => {
      qc.invalidateQueries(['bankAccounts']);
      qc.invalidateQueries(['paymentModes']);
      if (selectedId === id) setSelectedId(null);
      setDeleteConfirm({ open: false, id: null });
      toast.success('Bank deleted');
    },
    onError: () => toast.error('Failed to delete bank'),
  });

  const transferMut = useMutation({
    mutationFn: AccountsAPI.bankTransfer,
    onSuccess: () => {
      qc.invalidateQueries(['bankAccounts']);
      qc.invalidateQueries(['bankTransactions', selectedId]);
      setTransferType(null);
      setTransferAmt('');
      setTransferTarget('');
      setAdjustValue('');
      toast.success('Done');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Transfer failed'),
  });

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (banks.length && !selectedId) setSelectedId(banks[0].id);
  }, [banks]);

  useEffect(() => {
    const close = (e) => { if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ── Derived ────────────────────────────────────────────────────
  const filtered = [...banks]
    .filter(b => !search ||
      b.bankName.toLowerCase().includes(search.toLowerCase()) ||
      (b.accountNo || '').includes(search))
    .sort((a, b) => sortDir === 'asc'
      ? a.bankName.localeCompare(b.bankName)
      : b.bankName.localeCompare(a.bankName));

  const filteredTxns = transactions.filter(t =>
    !txnSearch ||
    (t.name  || '').toLowerCase().includes(txnSearch.toLowerCase()) ||
    (t.refNo || '').toLowerCase().includes(txnSearch.toLowerCase())
  );

  const transferTitle = TRANSFER_OPTIONS.find(o => o.key === transferType)?.label || '';

  // ── Handlers ───────────────────────────────────────────────────
  const doSave = () => {
    if (!form.bankName.trim()) { toast.error('Bank Name is required'); return; }
    createMut.mutate({ bankName: form.bankName.trim(), accountNo: form.accountNo, ifsc: form.ifsc, balance: Number(form.balance) || 0, type: form.type });
  };

  const doUpdate = () => {
    if (!form.bankName.trim()) { toast.error('Bank Name is required'); return; }
    updateMut.mutate({ id: selectedBank.id, data: { bankName: form.bankName.trim(), accountNo: form.accountNo, ifsc: form.ifsc, type: form.type } });
  };

  const doTransfer = () => {
    if (transferType === 'adjust') {
      if (adjustValue === '') { toast.error('Enter new balance'); return; }
      transferMut.mutate({ type: 'adjust', fromBankId: selectedId, amount: Number(adjustValue) });
    } else {
      const amt = Number(transferAmt);
      if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
      if (transferType === 'bankToBank' && !transferTarget) { toast.error('Select target bank'); return; }
      transferMut.mutate({ type: transferType, fromBankId: selectedId, toBankId: Number(transferTarget) || null, amount: amt });
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-white">
        <h1 className="text-xl font-bold text-slate-800">Banks</h1>
        <button
          onClick={() => { setForm(BLANK_FORM); setAddModal(true); }}
          className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Add Bank
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex min-h-0">

        {/* ── Left Panel ── */}
        <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">

          {/* Search */}
          <div className="px-3 py-2.5 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Account/Amount"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 flex-1">
              Account Name
              {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <span className="text-xs font-semibold text-slate-600 text-right w-24">Amount</span>
          </div>

          {/* Bank list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-xs text-slate-400 py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No banks found</p>
            ) : filtered.map(b => {
              const bal = Number(b.balance || 0);
              const isSelected = b.id === selectedId;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-50 cursor-pointer transition
                    ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'}`}>
                  <span className="text-xs font-bold text-slate-800 truncate flex-1 pr-2">{b.bankName}</span>
                  <span className={`text-xs font-semibold whitespace-nowrap ${bal >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                    {fmtAmt(Math.abs(bal))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          {!selectedBank ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a bank from the left panel
            </div>
          ) : (
            <>
              {/* Bank detail header */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between mb-4">

                  {/* Name + edit */}
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800">{selectedBank.bankName}</h2>
                    <button
                      onClick={() => {
                        setForm({ bankName: selectedBank.bankName, accountNo: selectedBank.accountNo || '', ifsc: selectedBank.ifsc || '', balance: String(selectedBank.balance || ''), type: selectedBank.type || 'Current' });
                        setEditModal(true);
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                      <Pencil size={14} />
                    </button>
                  </div>

                  {/* Deposit / Withdraw dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      className="flex items-center gap-1.5 border border-rose-400 text-rose-600 hover:bg-rose-50 text-xs font-semibold px-3 py-2 rounded-lg transition">
                      Deposit / Withdraw
                      <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 w-52 py-1">
                        {TRANSFER_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => { setDropdownOpen(false); setTransferType(opt.key); }}
                            className="w-full px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 transition">
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank info row */}
                <div className="flex items-start gap-10">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Bank Name</p>
                    <p className="text-sm font-bold text-slate-800">{selectedBank.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Account Number</p>
                    <p className="text-sm font-bold text-slate-800">{selectedBank.accountNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">IFSC Code</p>
                    <p className="text-sm font-bold text-slate-800">{selectedBank.ifsc || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Balance</p>
                    <p className={`text-sm font-bold ${Number(selectedBank.balance) >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                      {fmtAmt(selectedBank.balance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-200 shrink-0" />

              {/* Transactions */}
              <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-slate-700">Transactions</h3>
                  <div className="flex items-center gap-2">
                    {showTxnSearch && (
                      <input
                        autoFocus
                        value={txnSearch}
                        onChange={e => setTxnSearch(e.target.value)}
                        placeholder="Search..."
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 w-40" />
                    )}
                    <button
                      onClick={() => setShowTxnSearch(s => !s)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition">
                      <Search size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white min-h-0">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-800 text-white z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-700 w-32">
                            <div className="flex items-center gap-1">Type <Filter size={10} /></div>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-700">
                            <div className="flex items-center gap-1">Name <Filter size={10} /></div>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-700 w-32">
                            <div className="flex items-center gap-1">
                              Date <SlidersHorizontal size={10} /> <Filter size={10} />
                            </div>
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold border-r border-slate-700 w-32">
                            <div className="flex items-center justify-end gap-1">Amount <Filter size={10} /></div>
                          </th>
                          <th className="px-3 py-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTxns.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-400">
                              No transactions for this bank
                            </td>
                          </tr>
                        ) : filteredTxns.map((txn, idx) => {
                          const isSale = txn.type === 'Sale';
                          return (
                            <tr key={`${txn.type}-${txn.id}`} className="hover:bg-gray-50 transition">
                              <td className="px-3 py-2 border-r border-slate-100">
                                <span className={`font-semibold ${isSale ? 'text-teal-600' : 'text-rose-500'}`}>
                                  {isSale ? 'Payment-Out' : 'Purchase'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-800 uppercase border-r border-slate-100">
                                {txn.name || '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-600 border-r border-slate-100">
                                {fmtDate(txn.date)}
                              </td>
                              <td className={`px-3 py-2 text-right font-bold border-r border-slate-100 ${isSale ? 'text-teal-600' : 'text-red-400'}`}>
                                {fmtAmt(txn.amount)}
                              </td>
                              <td className="px-2 py-2 text-center relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === idx ? null : idx); }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                                  <MoreVertical size={13} />
                                </button>
                                {rowMenu === idx && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
                                    <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-36 py-1 text-left">
                                      <button
                                        onClick={() => setRowMenu(null)}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                        <Pencil size={11} /> View / Edit
                                      </button>
                                      <button
                                        onClick={() => setRowMenu(null)}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
                                        <Trash2 size={11} /> Delete
                                      </button>
                                      <button
                                        onClick={() => setRowMenu(null)}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                        <History size={11} /> View History
                                      </button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Bank Modal ── */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Add Bank Account</h2>
              <button onClick={() => setAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Bank Name *</label>
                <input autoFocus value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && doSave()}
                  placeholder="e.g. SBI, HDFC"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Account Number</label>
                <input value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))}
                  placeholder="e.g. 00112233445566"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">IFSC Code</label>
                <input value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Opening Balance</label>
                  <input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div className="w-36">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Account Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Cancel</button>
              <button onClick={doSave} disabled={createMut.isPending}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-40">
                {createMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Bank Modal ── */}
      {editModal && selectedBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Edit Bank Account</h2>
              <button onClick={() => setEditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Bank Name *</label>
                <input autoFocus value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Account Number</label>
                <input value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">IFSC Code</label>
                <input value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Account Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => { setEditModal(false); setDeleteConfirm({ open: true, id: selectedBank.id }); }}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold">
                <Trash2 size={13} /> Delete Bank
              </button>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Cancel</button>
                <button onClick={doUpdate} disabled={updateMut.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
                  {updateMut.isPending ? 'Saving…' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer / Adjust Modal ── */}
      {transferType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">{transferTitle}</h2>
              <button onClick={() => setTransferType(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {transferType === 'adjust' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">New Balance</label>
                  <input type="number" autoFocus value={adjustValue} onChange={e => setAdjustValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              ) : (
                <>
                  {transferType === 'bankToBank' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Target Bank</label>
                      <select value={transferTarget} onChange={e => setTransferTarget(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                        <option value="">Select bank…</option>
                        {banks.filter(b => b.id !== selectedId).map(b => (
                          <option key={b.id} value={b.id}>{b.bankName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Amount</label>
                    <input type="number" autoFocus={transferType !== 'bankToBank'} value={transferAmt}
                      onChange={e => setTransferAmt(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setTransferType(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Cancel</button>
              <button onClick={doTransfer} disabled={transferMut.isPending}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
                {transferMut.isPending ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Bank"
        message="This bank account will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}
