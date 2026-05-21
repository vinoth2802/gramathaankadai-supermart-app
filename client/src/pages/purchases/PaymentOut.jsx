import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, Settings, Plus, Search, Filter,
  Printer, FileSpreadsheet, MoreVertical, Share2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import PaymentOutModal from './PaymentOutModal.jsx';
import DateFilterDropdown from '../../components/DateFilterDropdown.jsx';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';

const _pad = (n) => String(n).padStart(2, '0');

function normalizeRow(r) {
  const paid      = Number(r.amount   ?? 0);
  const discount  = Number(r.discount ?? 0);
  const createdAt = new Date(r.createdAt);
  const payDate   = r.date ? new Date(r.date) : createdAt;

  const payOutDate = `${_pad(payDate.getDate())}/${_pad(payDate.getMonth() + 1)}/${payDate.getFullYear()}`;

  return {
    id:            r.id,
    ref:           r.id,
    payOutDate,
    payOutDateIso: payDate.toISOString(),
    entryDate:     r.createdAt,
    displayDate:   payOutDate,
    party:         r.party?.name ?? r.partyName ?? '—',
    partyId:       r.partyId,
    paymentType:   r.paymentMode ?? 'Cash',
    paid,
    discount,
    total:         Math.max(0, paid - discount),
    status:        r.status ?? 'Unused',
    history:       [{ action: 'Created', timestamp: createdAt.toLocaleString('en-IN') }],
  };
}

function doPrint(row) {
  const html = `<!DOCTYPE html><html><head><title>Receipt #${row.ref}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:360px;margin:30px auto;font-size:13px}
    h2{text-align:center;margin:0 0 4px}
    p{margin:3px 0}.hr{border-top:2px dashed #e2e8f0;margin:10px 0}
    .row{display:flex;justify-content:space-between}
    .total{font-size:15px;font-weight:bold}
  </style></head><body>
  <h2>Gramathaankadai SuperMart</h2>
  <p style="text-align:center;color:#666">Payment Out Receipt</p>
  <div class="hr"></div>
  <div class="row"><span>Receipt No</span><b>#${row.ref}</b></div>
  <div class="row"><span>Pay Out Date</span><span>${row.payOutDate}</span></div>
  <div class="row"><span>Entry Date</span><span>${new Date(row.entryDate).toLocaleString('en-IN')}</span></div>
  <div class="row"><span>Party</span><b>${row.party}</b></div>
  <div class="row"><span>Payment Type</span><span>${row.paymentType}</span></div>
  <div class="hr"></div>
  <div class="row"><span>Paid</span><span>₹${Number(row.paid).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
  <div class="row"><span>Discount</span><span>₹${Number(row.discount??0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
  <div class="hr"></div>
  <div class="row total"><span>Total</span><span>₹${Number(row.total).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
  <div class="hr"></div>
  <p style="text-align:center;color:#888">Thank you!</p>
  </body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url);
  if (w) w.addEventListener('load', () => { w.print(); URL.revokeObjectURL(url); });
}

function HistoryModal({ payment, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">History — Receipt #{payment.ref}</h3>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <X size={13} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {payment.history.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{h.action}</p>
                <p className="text-xs text-slate-400">{h.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RowMenu({ onEdit, onPrint, onDelete, onDuplicate, onHistory }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  const act = (fn) => { setOpen(false); fn?.(); };

  const items = [
    { label: 'View/Edit',    fn: onEdit,      danger: false },
    { label: 'Print',        fn: onPrint,     danger: false },
    { label: 'Duplicate',    fn: onDuplicate, danger: false },
    { label: 'View History', fn: onHistory,   danger: false },
    { label: 'Delete',       fn: onDelete,    danger: true  },
  ];

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle}
        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[160px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            {items.map(({ label, fn, danger }) => (
              <button key={label} onClick={() => act(fn)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition
                  ${danger ? 'text-rose-600' : 'text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Used:    'text-emerald-700 bg-emerald-50',
    Partial: 'text-amber-700 bg-amber-50',
    Unused:  'text-rose-600 bg-rose-50',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${map[status] || 'text-slate-500 bg-slate-100'}`}>
      {status}
    </span>
  );
}

function FilterPill({ children }) {
  return (
    <button className="flex items-center gap-1.5 border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition whitespace-nowrap">
      <span className="text-gray-400"><ChevronDown size={12} /></span>
      {children}
      <ChevronDown size={12} className="text-gray-400 shrink-0" />
    </button>
  );
}

function Th({ label, filterable = true, className = '' }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 ${className}`}>
      <div className="flex items-center gap-1.5">
        {label}
        {filterable && <Filter size={10} className="text-slate-400 shrink-0" />}
      </div>
    </th>
  );
}

const fmtAmt = (n) => `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDt  = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN')}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function PaymentOut({ openModal = false }) {
  const [modal,       setModal]       = useState(openModal);
  const [editPayment, setEditPayment] = useState(null);
  const [historyRow,  setHistoryRow]  = useState(null);
  const [search,      setSearch]      = useState('');
  const [dateFilter,  setDateFilter]  = useState({ label: 'This Month', from: null, to: null });

  const qc = useQueryClient();

  const { data: rawPayments = [], isLoading } = useQuery({
    queryKey: ['paymentOut'],
    queryFn:  PaymentsAPI.getPaymentsOut,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn:  PartiesAPI.getAll,
  });

  const createMut = useMutation({
    mutationFn: (data) => PaymentsAPI.savePaymentOut(data),
    onSuccess:  () => { qc.invalidateQueries(['paymentOut']); setModal(false); toast.success('Payment saved'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to save payment'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => PaymentsAPI.updatePaymentOut(id, data),
    onSuccess:  () => { qc.invalidateQueries(['paymentOut']); setModal(false); setEditPayment(null); toast.success('Payment updated'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to update payment'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => PaymentsAPI.deletePaymentOut(id),
    onSuccess:  () => { qc.invalidateQueries(['paymentOut']); toast.success('Payment deleted'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to delete payment'),
  });

  const handleSave = (form) => {
    const party   = parties.find(p => String(p.id) === String(form.party));
    const payload = {
      partyId:     form.party ? Number(form.party) : null,
      partyName:   party?.name ?? null,
      amount:      Number(form.paid || 0),
      discount:    Number(form.discount || 0),
      paymentMode: form.paymentType,
      status:      editPayment?.status ?? 'Unused',
      date:        form.date || undefined,
    };
    if (editPayment) {
      updateMut.mutate({ id: editPayment.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this payment?')) return;
    deleteMut.mutate(id);
  };

  const handleDuplicate = (row) => {
    createMut.mutate({
      partyId:     row.partyId,
      partyName:   row.party,
      amount:      row.paid,
      discount:    row.discount,
      paymentMode: row.paymentType,
      status:      'Unused',
    });
  };

  const handleEdit = (row) => {
    setEditPayment(row);
    setModal(true);
  };

  const payments = rawPayments.map(normalizeRow);

  const rows = payments.filter((r) => {
    const matchesSearch =
      r.party.toLowerCase().includes(search.toLowerCase()) ||
      String(r.ref).includes(search);
    if (!matchesSearch) return false;
    if (dateFilter.from && dateFilter.to) {
      const d   = new Date(r.payOutDateIso);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return day >= dateFilter.from && day <= dateFilter.to;
    }
    return true;
  });

  const totalAmount = rows.reduce((s, r) => s + r.total, 0);
  const totalPaid   = rows.reduce((s, r) => s + r.paid,  0);
  const isSaving    = createMut.isPending || updateMut.isPending;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Payment-Out</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditPayment(null); setModal(true); }}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
              <Plus size={14} /> Add Payment-Out
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white border border-slate-200 rounded-xl transition">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-500 font-medium mr-1 shrink-0">Filter by:</span>
          <DateFilterDropdown allLabel="All Payment-Out" onChange={setDateFilter} />
          <FilterPill>All Firms</FilterPill>
          <FilterPill>All Users</FilterPill>
        </div>

        {/* Summary card */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-slate-800">{fmtAmt(totalAmount)}</p>
            <p className="text-xs text-slate-500 mt-1.5">Paid: {fmtAmt(totalPaid)}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
              {rows.length} record{rows.length !== 1 ? 's' : ''}
            </span>
            <p className="text-xs text-slate-400 mt-1">total transactions</p>
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Transactions</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-44
                    focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <Printer size={15} />
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th label="Pay Out Date" />
                <Th label="Entry Date" />
                <Th label="Ref. No." />
                <Th label="Party Name" />
                <Th label="Total Amount" className="text-right" />
                <Th label="Paid" className="text-right" />
                <Th label="Payment Type" />
                <Th label="Status" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100 w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                    No transactions found. Click "+ Add Payment-Out" to create one.
                  </td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-rose-50/40 transition">
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{row.payOutDate}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDt(row.entryDate)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700 text-xs">#{row.ref}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 text-xs uppercase tracking-wide">{row.party}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtAmt(row.total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtAmt(row.paid)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{row.paymentType}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => doPrint(row)} title="Print"
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        <Printer size={13} />
                      </button>
                      <button onClick={() => handleDuplicate(row)} title="Duplicate"
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        <Share2 size={13} />
                      </button>
                      <RowMenu
                        onEdit={()      => handleEdit(row)}
                        onPrint={()     => doPrint(row)}
                        onDelete={()    => handleDelete(row.id)}
                        onDuplicate={() => handleDuplicate(row)}
                        onHistory={()   => setHistoryRow(row)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <PaymentOutModal
          receiptNo={editPayment?.id ?? null}
          editData={editPayment}
          onClose={() => { setModal(false); setEditPayment(null); }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {historyRow && (
        <HistoryModal
          payment={historyRow}
          onClose={() => setHistoryRow(null)}
        />
      )}
    </div>
  );
}
