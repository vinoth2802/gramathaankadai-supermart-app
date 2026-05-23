import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, MoreVertical, ArrowUpDown, ChevronDown, X, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { LoanAccountsAPI } from '../../api/loanAccounts.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const RS   = '₹';
const fmt  = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtA = (v) => `${RS} ${fmt(v)}`;
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().split('T')[0];

/* ── Floating-label helpers ─────────────────────────────────── */
function Fi({ label, type = 'text', value, onChange, required, ...rest }) {
  const raised = value !== '' && value !== null && value !== undefined;
  return (
    <div className="relative">
      <input
        type={type} value={value} onChange={onChange} placeholder=" "
        className="peer w-full border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-sm
                   focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
        {...rest}
      />
      <label className={`absolute left-3 pointer-events-none transition-all duration-150
        ${raised || type === 'date'
          ? 'top-1 text-[10px] text-blue-500'
          : 'top-3.5 text-sm text-gray-400 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-blue-500'}`}>
        {label}{required && ' *'}
      </label>
    </div>
  );
}

function Fs({ label, value, onChange, required, children }) {
  return (
    <div className="relative">
      <select
        value={value} onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-sm bg-white
                   focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 appearance-none">
        {children}
      </select>
      <label className="absolute left-3 top-1 text-[10px] text-blue-500 pointer-events-none">
        {label}{required && ' *'}
      </label>
    </div>
  );
}

function Ft({ label, value, onChange }) {
  const raised = value !== '';
  return (
    <div className="relative">
      <textarea
        value={value} onChange={onChange} placeholder=" " rows={3}
        className="peer w-full border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-sm resize-none
                   focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
      />
      <label className={`absolute left-3 pointer-events-none transition-all duration-150
        ${raised
          ? 'top-1 text-[10px] text-blue-500'
          : 'top-3.5 text-sm text-gray-400 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-blue-500'}`}>
        {label}
      </label>
    </div>
  );
}

/* ── Balance helper ─────────────────────────────────────────── */
function calcBalance(txns) {
  return txns.reduce((bal, t) => {
    if (t.type === 'opening_loan' || t.type === 'drawdown') return bal + Number(t.principal);
    if (t.type === 'payment') return bal - Number(t.principal);
    return bal;
  }, 0);
}

const TYPE_LABEL = {
  opening_loan: 'Opening Loan',
  payment:      'Payment',
  drawdown:     'Additional Loan',
  charge:       'Charge',
};

const BLANK_ADD = { name: '', principal: '', interestRate: '', startDate: todayISO(), durationMonths: '', lenderName: '', paymentMode: 'Cash', notes: '' };
const BLANK_PAY = { paymentDate: todayISO(), principal: '', interest: '', otherCharges: '', paymentMode: 'Cash', referenceNo: '', notes: '' };
const BLANK_DWN = { amount: '', date: todayISO(), interestRate: '', paymentMode: 'Cash', notes: '' };
const BLANK_CHG = { chargeType: 'Processing Fee', amount: '', date: todayISO(), notes: '' };

/* ── Modal wrapper ──────────────────────────────────────────── */
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end shrink-0">{footer}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function LoanAccounts() {
  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['loanAccounts'],
    queryFn:  LoanAccountsAPI.getAll,
    select:   (r) => r.data,
  });

  const [selectedId,      setSelectedId]      = useState(null);
  const [search,          setSearch]          = useState('');
  const [sortAsc,         setSortAsc]         = useState(true);
  const [showAdd,         setShowAdd]         = useState(false);
  const [showPay,         setShowPay]         = useState(false);
  const [showDwn,         setShowDwn]         = useState(false);
  const [showChg,         setShowChg]         = useState(false);
  const [actDropdown,     setActDropdown]     = useState(false);
  const [rowMenu,         setRowMenu]         = useState(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState({ open: false, id: null });
  const [txnSearch,       setTxnSearch]       = useState('');
  const [showTxnSearch,   setShowTxnSearch]   = useState(false);

  const [addForm, setAddForm] = useState(BLANK_ADD);
  const [payForm, setPayForm] = useState(BLANK_PAY);
  const [dwnForm, setDwnForm] = useState(BLANK_DWN);
  const [chgForm, setChgForm] = useState(BLANK_CHG);

  const actDropRef = useRef(null);

  const selected = accounts.find(a => a.id === selectedId) || null;

  const { data: transactions = [] } = useQuery({
    queryKey: ['loanTxns', selectedId],
    queryFn:  () => LoanAccountsAPI.getTransactions(selectedId),
    select:   (r) => r.data,
    enabled:  !!selectedId,
  });

  const balance = calcBalance(transactions);

  useEffect(() => {
    const h = (e) => {
      if (actDropRef.current && !actDropRef.current.contains(e.target)) setActDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = () => setRowMenu(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: LoanAccountsAPI.create,
    onSuccess: ({ data: acc }) => {
      qc.invalidateQueries(['loanAccounts']);
      setSelectedId(acc.id);
      setShowAdd(false);
      setAddForm(BLANK_ADD);
      toast.success('Loan account created');
    },
    onError: (e) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: (data) => LoanAccountsAPI.payment(selectedId, data),
    onSuccess: () => {
      qc.invalidateQueries(['loanTxns', selectedId]);
      qc.invalidateQueries(['loanAccounts']);
      setShowPay(false);
      setPayForm(BLANK_PAY);
      toast.success('Payment recorded');
    },
    onError: (e) => toast.error(e.message),
  });

  const dwnMut = useMutation({
    mutationFn: (data) => LoanAccountsAPI.drawdown(selectedId, data),
    onSuccess: () => {
      qc.invalidateQueries(['loanTxns', selectedId]);
      qc.invalidateQueries(['loanAccounts']);
      setShowDwn(false);
      setDwnForm(BLANK_DWN);
      toast.success('Additional loan recorded');
    },
    onError: (e) => toast.error(e.message),
  });

  const chgMut = useMutation({
    mutationFn: (data) => LoanAccountsAPI.charge(selectedId, data),
    onSuccess: () => {
      qc.invalidateQueries(['loanTxns', selectedId]);
      setShowChg(false);
      setChgForm(BLANK_CHG);
      toast.success('Charge recorded');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: LoanAccountsAPI.remove,
    onSuccess: () => {
      qc.invalidateQueries(['loanAccounts']);
      if (selectedId === deleteConfirm.id) setSelectedId(null);
      setDeleteConfirm({ open: false, id: null });
      toast.success('Loan account deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  /* ── Derived lists ── */
  const filtered = [...(accounts)]
    .filter(a => {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) ||
             String(a.principal || '').includes(q);
    })
    .sort((a, b) => sortAsc
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name));

  const filteredTxns = transactions.filter(t => {
    if (!txnSearch) return true;
    const q = txnSearch.toLowerCase();
    return (TYPE_LABEL[t.type] || t.type).toLowerCase().includes(q)
        || fmtD(t.transactionDate).includes(q)
        || (t.paymentMode || '').toLowerCase().includes(q);
  });

  const payTotal = (Number(payForm.principal) || 0)
                 + (Number(payForm.interest)   || 0)
                 + (Number(payForm.otherCharges) || 0);

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-base font-bold text-gray-800">Loan Accounts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddForm(BLANK_ADD); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
            <Plus size={14} /> Add Loan Account
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left panel */}
        <div className="w-[270px] shrink-0 border-r border-gray-200 flex flex-col bg-white">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by Account/Amount"
                className="w-full border border-gray-200 rounded px-3 py-2 pl-8 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center px-3 py-2 border-b border-gray-200">
            <button
              onClick={() => setSortAsc(s => !s)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-800 flex-1 transition">
              Account Name <ArrowUpDown size={11} className="text-gray-400" />
            </button>
            <span className="text-xs font-semibold text-gray-600">Amount</span>
          </div>

          {/* Account list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No accounts found</p>
            ) : filtered.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 cursor-pointer transition
                  ${a.id === selectedId
                    ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                    : 'hover:bg-gray-50'}`}>
                <span className="text-xs font-bold text-gray-800 truncate flex-1 pr-2">{a.name}</span>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {RS} {fmt(a.balance ?? a.principal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a loan account from the left panel
            </div>
          ) : (
            <>
              {/* Account header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-800">{selected.name}</h2>

                  {/* Make Payment split button */}
                  <div className="relative flex" ref={actDropRef}>
                    <button
                      onClick={() => { setPayForm(BLANK_PAY); setShowPay(true); }}
                      className="text-xs font-semibold text-red-500 border border-red-500 rounded-l-full
                                 px-4 py-1.5 hover:bg-red-50 transition">
                      Make Payment
                    </button>
                    <button
                      onClick={() => setActDropdown(o => !o)}
                      className="text-red-500 border border-l-0 border-red-500 rounded-r-full
                                 px-2 py-1.5 hover:bg-red-50 transition">
                      <ChevronDown size={13} />
                    </button>
                    {actDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200
                                      rounded-xl shadow-lg z-50 w-44 py-1 overflow-hidden">
                        <button
                          onClick={() => { setActDropdown(false); setDwnForm(BLANK_DWN); setShowDwn(true); }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition">
                          Take more loan
                        </button>
                        <button
                          onClick={() => { setActDropdown(false); setChgForm(BLANK_CHG); setShowChg(true); }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition">
                          Charges on Loan
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Balance Amount</p>
                  <p className="text-xl font-bold text-gray-800">{fmtA(balance)}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200 shrink-0" />

              {/* Transactions */}
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">Transactions</h3>
                    <button
                      onClick={() => setShowTxnSearch(s => !s)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition">
                      <Search size={14} />
                    </button>
                  </div>

                  {showTxnSearch && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <input
                        value={txnSearch} onChange={e => setTxnSearch(e.target.value)}
                        placeholder="Search transactions…"
                        className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                          <th className="px-4 py-2.5 text-left font-semibold">
                            <span className="flex items-center gap-1">Type <ChevronDown size={10} /></span>
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold">
                            <span className="flex items-center gap-1">Date <ArrowUpDown size={10} /></span>
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            <span className="flex items-center gap-1 justify-end">Principal <ChevronDown size={10} /></span>
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            <span className="flex items-center gap-1 justify-end">
                              Interest &amp; Other Charges <ChevronDown size={10} />
                            </span>
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            <span className="flex items-center gap-1 justify-end">Total Amount <ChevronDown size={10} /></span>
                          </th>
                          <th className="px-4 py-2.5 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTxns.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-400">No transactions yet</td>
                          </tr>
                        ) : filteredTxns.map((t, i) => {
                          const ioc = Number(t.interest) + Number(t.otherCharges);
                          return (
                            <tr key={t.id}
                              className={`border-b border-gray-100 ${i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <td className="px-4 py-2.5 font-bold text-gray-800">
                                {TYPE_LABEL[t.type] || t.type}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">{fmtD(t.transactionDate)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">{RS} {fmt(t.principal)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">
                                {ioc > 0 ? `${RS} ${fmt(ioc)}` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                                {RS} {fmt(t.totalAmount)}
                              </td>
                              <td className="px-4 py-2.5 relative" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setRowMenu(rowMenu === t.id ? null : t.id)}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 transition">
                                  <MoreVertical size={13} />
                                </button>
                                {rowMenu === t.id && (
                                  <div className="absolute right-8 top-1 bg-white border border-gray-200
                                                  rounded-lg shadow-lg z-20 py-1 w-28">
                                    <button className="w-full px-3 py-1.5 text-left text-xs text-gray-700
                                                       hover:bg-gray-50 flex items-center gap-2 transition">
                                      <Pencil size={11} /> Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRowMenu(null);
                                        setDeleteConfirm({ open: true, id: selected.id });
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-xs text-red-500
                                                 hover:bg-red-50 flex items-center gap-2 transition">
                                      <Trash2 size={11} /> Delete
                                    </button>
                                  </div>
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

      {/* ════ ADD LOAN ACCOUNT MODAL ════ */}
      {showAdd && (
        <Modal
          title="Add Loan Account"
          onClose={() => setShowAdd(false)}
          footer={<>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition">
              Cancel
            </button>
            <button
              onClick={() => createMut.mutate(addForm)}
              disabled={!addForm.name || !addForm.principal || createMut.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                         disabled:opacity-40 transition">
              {createMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <Fi label="Account Name"          required value={addForm.name}           onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
          <Fi label="Loan Amount (₹)"       required type="number" value={addForm.principal}      onChange={e => setAddForm(f => ({ ...f, principal: e.target.value }))} />
          <Fi label="Interest Rate (%)"              type="number" value={addForm.interestRate}   onChange={e => setAddForm(f => ({ ...f, interestRate: e.target.value }))} />
          <Fi label="Loan Start Date"       required type="date"   value={addForm.startDate}      onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} />
          <Fi label="Loan Duration (Months)"         type="number" value={addForm.durationMonths} onChange={e => setAddForm(f => ({ ...f, durationMonths: e.target.value }))} />
          <Fi label="Lender Name"                               value={addForm.lenderName}     onChange={e => setAddForm(f => ({ ...f, lenderName: e.target.value }))} />
          <Fs label="Payment Mode" required value={addForm.paymentMode} onChange={e => setAddForm(f => ({ ...f, paymentMode: e.target.value }))}>
            <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>UPI</option>
          </Fs>
          <Ft label="Notes" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ════ MAKE PAYMENT MODAL ════ */}
      {showPay && (
        <Modal
          title="Make Payment"
          onClose={() => setShowPay(false)}
          footer={<>
            <button onClick={() => setShowPay(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition">
              Cancel
            </button>
            <button onClick={() => payMut.mutate(payForm)} disabled={payMut.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                         disabled:opacity-40 transition">
              {payMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <InfoRow label="Account" value={selected?.name} />
          <Fi label="Payment Date"          required type="date"   value={payForm.paymentDate}  onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} />
          <Fi label="Principal Amount (₹)"           type="number" value={payForm.principal}    onChange={e => setPayForm(f => ({ ...f, principal: e.target.value }))} />
          <Fi label="Interest Amount (₹)"            type="number" value={payForm.interest}     onChange={e => setPayForm(f => ({ ...f, interest: e.target.value }))} />
          <Fi label="Other Charges (₹)"              type="number" value={payForm.otherCharges} onChange={e => setPayForm(f => ({ ...f, otherCharges: e.target.value }))} />
          <InfoRow label="Total Amount" value={fmtA(payTotal)} />
          <Fs label="Payment Mode" required value={payForm.paymentMode} onChange={e => setPayForm(f => ({ ...f, paymentMode: e.target.value }))}>
            <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>UPI</option>
          </Fs>
          <Fi label="Reference No" value={payForm.referenceNo} onChange={e => setPayForm(f => ({ ...f, referenceNo: e.target.value }))} />
          <Ft label="Notes" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ════ TAKE MORE LOAN MODAL ════ */}
      {showDwn && (
        <Modal
          title="Take More Loan"
          onClose={() => setShowDwn(false)}
          footer={<>
            <button onClick={() => setShowDwn(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition">
              Cancel
            </button>
            <button onClick={() => dwnMut.mutate(dwnForm)} disabled={!dwnForm.amount || dwnMut.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                         disabled:opacity-40 transition">
              {dwnMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <Fi label="Additional Loan Amount (₹)" required type="number" value={dwnForm.amount}       onChange={e => setDwnForm(f => ({ ...f, amount: e.target.value }))} />
          <Fi label="Date"                        required type="date"   value={dwnForm.date}         onChange={e => setDwnForm(f => ({ ...f, date: e.target.value }))} />
          <Fi label="Interest Rate (%)"                    type="number" value={dwnForm.interestRate} onChange={e => setDwnForm(f => ({ ...f, interestRate: e.target.value }))} />
          <Fs label="Payment Mode" required value={dwnForm.paymentMode} onChange={e => setDwnForm(f => ({ ...f, paymentMode: e.target.value }))}>
            <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>UPI</option>
          </Fs>
          <Ft label="Notes" value={dwnForm.notes} onChange={e => setDwnForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ════ CHARGES ON LOAN MODAL ════ */}
      {showChg && (
        <Modal
          title="Charges on Loan"
          onClose={() => setShowChg(false)}
          footer={<>
            <button onClick={() => setShowChg(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition">
              Cancel
            </button>
            <button onClick={() => chgMut.mutate(chgForm)} disabled={!chgForm.amount || chgMut.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                         disabled:opacity-40 transition">
              {chgMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <Fs label="Charge Type" value={chgForm.chargeType} onChange={e => setChgForm(f => ({ ...f, chargeType: e.target.value }))}>
            <option>Processing Fee</option><option>Late Fee</option><option>Insurance</option><option>Other</option>
          </Fs>
          <Fi label="Amount (₹)" required type="number" value={chgForm.amount} onChange={e => setChgForm(f => ({ ...f, amount: e.target.value }))} />
          <Fi label="Date"        required type="date"   value={chgForm.date}   onChange={e => setChgForm(f => ({ ...f, date: e.target.value }))} />
          <Ft label="Notes" value={chgForm.notes} onChange={e => setChgForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Loan Account"
        message="Delete this loan account? All transaction history will be lost."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}
