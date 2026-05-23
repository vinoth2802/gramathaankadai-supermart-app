import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlignJustify, Filter, MoreVertical, Search, SlidersHorizontal, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AccountsAPI } from '../../api/accounts.js';

const RS = '₹';
const fmtAmt   = (v) => `${RS}${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate  = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';
const todayISO = () => new Date().toISOString().split('T')[0];

export default function CashInHand() {
  const qc = useQueryClient();

  const { data: overview = { balance: 0, transactions: [] }, isLoading } = useQuery({
    queryKey: ['cashOverview'],
    queryFn:  AccountsAPI.getCashOverview,
  });

  const { balance, transactions } = overview;

  // ── Modal state ────────────────────────────────────────────────
  const [modal,       setModal]       = useState(false);
  const [cashType,    setCashType]    = useState('Add Cash');
  const [amount,      setAmount]      = useState('');
  const [adjDate,     setAdjDate]     = useState(todayISO);
  const [description, setDescription] = useState('');

  // ── Table state ────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [showSearch,  setShowSearch]  = useState(false);
  const [rowMenu,     setRowMenu]     = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [confirmId,   setConfirmId]   = useState(null);

  // ── Mutations ──────────────────────────────────────────────────
  const delMut = useMutation({
    mutationFn: (id) => AccountsAPI.deleteCash(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashOverview'] });
      setConfirmId(null);
      toast.success('Transaction deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });

  const saveMut = useMutation({
    mutationFn: AccountsAPI.saveCash,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashOverview'] });
      closeModal();
      toast.success('Cash adjusted');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save'),
  });

  // ── Helpers ────────────────────────────────────────────────────
  const closeModal = () => {
    setModal(false);
    setCashType('Add Cash');
    setAmount('');
    setAdjDate(todayISO());
    setDescription('');
  };

  const updatedCash = (() => {
    const entered = Number(amount) || 0;
    return cashType === 'Add Cash' ? balance + entered : balance - entered;
  })();

  const doSave = () => {
    const entered = Number(amount);
    if (!entered || entered <= 0) { toast.error('Enter a valid amount'); return; }
    saveMut.mutate({ type: cashType, amount: entered, date: adjDate, description });
  };

  const filtered = transactions.filter(t =>
    !search ||
    (t.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.type  || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.refNo || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">

      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800">Cash In Hand</h1>
          <span className="text-xl font-bold text-teal-600">{fmtAmt(balance)}</span>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <AlignJustify size={15} /> Adjust Cash
        </button>
      </div>

      {/* Transactions Section */}
      <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-700">Transactions</h2>
          <div className="flex items-center gap-2">
            {showSearch && (
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 w-44" />
            )}
            <button
              onClick={() => setShowSearch(s => !s)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <Search size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
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
                  <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-700 w-44">
                    <div className="flex items-center gap-1">Date <SlidersHorizontal size={10} /> <Filter size={10} /></div>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold border-r border-slate-700 w-32">
                    <div className="flex items-center justify-end gap-1">Amount <Filter size={10} /></div>
                  </th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No transactions found</td></tr>
                ) : filtered.map((txn, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`cursor-pointer transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className={`px-3 py-2 border-r border-slate-100 ${isSelected ? 'font-bold' : ''}`}>
                        <span className="text-slate-700">{txn.type}</span>
                      </td>
                      <td className={`px-3 py-2 uppercase border-r border-slate-100 ${isSelected ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>
                        {txn.name || '—'}
                      </td>
                      <td className={`px-3 py-2 border-r border-slate-100 ${isSelected ? 'font-bold text-slate-700' : 'text-slate-600'}`}>
                        {fmtDate(txn.date)}
                      </td>
                      <td className={`px-3 py-2 text-right border-r border-slate-100 font-bold ${txn.flow === 'in' ? 'text-teal-600' : 'text-rose-500'}`}>
                        {fmtAmt(txn.amount)}
                      </td>
                      <td className="px-2 py-2 text-center relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setRowMenu(rowMenu === idx ? null : idx)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                          <MoreVertical size={13} />
                        </button>
                        {rowMenu === idx && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
                            <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-36 py-1 text-left">
                              {txn.source === 'adjustment' && (
                                <button
                                  onClick={() => { setRowMenu(null); setConfirmId(txn.id.replace('adj-', '')); }}
                                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 text-left flex items-center gap-1.5">
                                  <Trash2 size={11} /> Delete
                                </button>
                              )}
                              {txn.source !== 'adjustment' && (
                                <button
                                  onClick={() => setRowMenu(null)}
                                  className="w-full px-3 py-1.5 text-xs text-slate-400 text-left cursor-default">
                                  No actions
                                </button>
                              )}
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

      {/* ── Confirm Delete Dialog ── */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]">
          <div className="bg-white rounded-xl shadow-xl w-80 mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800">Delete Transaction?</h3>
            <p className="text-xs text-slate-500">This adjustment will be permanently removed and the cash balance will update accordingly.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-1.5 rounded-full border border-gray-300 text-slate-600 text-xs font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => delMut.mutate(Number(confirmId))}
                disabled={delMut.isPending}
                className="px-4 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold disabled:opacity-40 transition">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Cash Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
          onClick={closeModal}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-slate-800">Adjust Cash</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-slate-100 text-slate-400 transition">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-5 flex flex-col gap-4">

              {/* Radio: Add / Reduce */}
              <div className="flex items-center gap-6">
                {['Add Cash', 'Reduce Cash'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <span
                      onClick={() => setCashType(opt)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                        cashType === opt ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                      {cashType === opt && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                    </span>
                    <span className="text-sm text-slate-700 font-medium">{opt}</span>
                  </label>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Enter Amount <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center border border-gray-300 rounded px-3 py-2 focus-within:border-blue-400 bg-white">
                  <span className="text-slate-500 text-sm font-semibold mr-2">{RS}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 focus:outline-none text-sm text-slate-800 bg-transparent" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Updated Cash: <span className={`font-semibold ${updatedCash >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>{fmtAmt(updatedCash)}</span>
                </p>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Adjustment Date</label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={e => setAdjDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter Description"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400" />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 rounded-full border border-gray-300 text-slate-600 text-sm font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={doSave}
                disabled={saveMut.isPending}
                className="px-6 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-40 transition">
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
