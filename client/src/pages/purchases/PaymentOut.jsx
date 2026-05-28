import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, Settings, Plus, Search, Filter,
  Printer, FileSpreadsheet, MoreVertical, Share2, X,
  Calculator, Clock, FileText, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import DateFilterDropdown from '../../components/DateFilterDropdown.jsx';
import { PartiesAPI } from '../../api/parties.js';
import { PaymentsAPI } from '../../api/payments.js';
import { PurchasesAPI } from '../../api/purchases.js';

const pad  = (n) => String(n).padStart(2, '0');
const _pad = pad;

function fmtTime(d) {
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dmyToYmd(s) {
  if (!s) return '';
  const [d, m, y] = s.split('/');
  return `${y}-${pad(m)}-${pad(d)}`;
}

const PAYMENT_TYPES_FALLBACK = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];

function FloatSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 text-sm text-slate-800 bg-white
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition"
      >
        <option value="" disabled hidden />
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <label className={`absolute left-3 pointer-events-none transition-all duration-150
        ${value
          ? 'top-2 text-xs text-slate-500'
          : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'}
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-blue-600`}>
        {label}
      </label>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function PartySearch({ value, query, onQueryChange, onSelect, parties }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = query.toLowerCase();
  const filtered = q.length === 0
    ? parties
    : parties.filter(p => p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q));

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { onQueryChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search party by name or phone *"
          className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-3 text-sm text-slate-800
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition
            placeholder:text-slate-400"
        />
        {query && (
          <button type="button"
            onClick={() => { onQueryChange(''); onSelect(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button"
              onMouseDown={() => { onSelect(p); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 transition
                ${String(p.id) === value ? 'bg-blue-50' : ''}`}>
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
              {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3">
          <span className="text-sm text-slate-400">No parties found</span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, children, border = true }) {
  return (
    <div className={`flex items-center justify-between py-2 ${border ? 'border-b border-slate-100' : ''}`}>
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function PaymentOutModal({ receiptNo, editData, onClose, onSave, isSaving }) {
  const now    = new Date();
  const isEdit = Boolean(editData);

  const [form, setForm] = useState(() => ({
    party:       editData ? String(editData.partyId ?? '') : '',
    paymentType: editData?.paymentType ?? 'Cash',
    paid:        editData ? String(editData.paid) : '',
    discount:    editData ? String(editData.discount ?? 0) : '',
    date:        editData?.displayDate ? dmyToYmd(editData.displayDate) : ymd(now),
    notes:       editData?.notes ?? '',
  }));

  const [partyQuery,     setPartyQuery]     = useState(editData?.party ?? '');
  const [showDesc,       setShowDesc]       = useState(Boolean(editData?.notes));
  const [linkedInvoices, setLinkedInvoices] = useState([]);

  const entryDateDisplay = (() => {
    const d = isEdit && editData.entryDate ? new Date(editData.entryDate) : now;
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${h}:${m} ${ampm}`;
  })();

  const { data: parties = [] }    = useQuery({ queryKey: ['parties'],        queryFn: PartiesAPI.getAll });
  const { data: payOptions = [] } = useQuery({ queryKey: ['paymentOptions'], queryFn: PaymentsAPI.getOptions });
  const { data: partyInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['partyPurchases', form.party],
    queryFn:  () => PurchasesAPI.getByParty(form.party),
    enabled:  Boolean(form.party),
  });
  const unpaidInvoices = partyInvoices.filter(
    inv => Number(inv.grandTotal) - Number(inv.totalPaid) > 0
  );

  useEffect(() => { setLinkedInvoices([]); }, [form.party]);
  const PAYMENT_TYPES = payOptions.length ? payOptions.map(o => o.name) : PAYMENT_TYPES_FALLBACK;

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handlePartySelect = (p) => {
    if (!p) {
      setPartyQuery('');
      setForm(prev => ({ ...prev, party: '' }));
    } else {
      setPartyQuery(p.name);
      setForm(prev => ({ ...prev, party: String(p.id) }));
    }
  };

  const total  = Math.max(0, Number(form.paid || 0) - Number(form.discount || 0));
  const fmtNum = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const handleSave = () => onSave?.({ ...form });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'Edit Payment-Out' : 'Payment-Out'}
          </h2>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Calculator size={16} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Settings size={16} />
            </button>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <div className="flex gap-6">

            {/* LEFT */}
            <div className="flex-1 space-y-3">
              <PartySearch
                value={form.party}
                query={partyQuery}
                onQueryChange={setPartyQuery}
                onSelect={handlePartySelect}
                parties={parties}
              />
              <FloatSelect
                label="Payment Type"
                value={form.paymentType}
                onChange={setF('paymentType')}
                options={PAYMENT_TYPES}
              />

              {/* Link to Invoice */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Link to Invoice</span>
                  {linkedInvoices.length > 0 && (
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {linkedInvoices.length} selected
                    </span>
                  )}
                </div>
                {!form.party ? (
                  <div className="px-3 py-3 text-xs text-slate-400">Select a party to see unpaid invoices</div>
                ) : invoicesLoading ? (
                  <div className="px-3 py-3 text-xs text-slate-400">Loading invoices…</div>
                ) : unpaidInvoices.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400">No unpaid invoices for this party</div>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {unpaidInvoices.map(inv => {
                      const due     = Number(inv.grandTotal) - Number(inv.totalPaid);
                      const checked = linkedInvoices.includes(inv.id);
                      return (
                        <label key={inv.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setLinkedInvoices(prev =>
                                checked ? prev.filter(id => id !== inv.id) : [...prev, inv.id]
                              )
                            }
                            className="accent-blue-600 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700 truncate">{inv.invoice}</span>
                              <span className="text-xs font-bold text-rose-600 shrink-0">
                                ₹{Number(due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 gap-2">
                              <span className="text-[10px] text-slate-400">
                                {new Date(inv.date).toLocaleDateString('en-IN')}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                inv.paymentStatus === 'Unpaid'
                                  ? 'bg-rose-50 text-rose-600'
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                {inv.paymentStatus}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {showDesc ? (
                <div className="relative">
                  <textarea
                    autoFocus
                    value={form.notes}
                    onChange={setF('notes')}
                    rows={3}
                    placeholder="Add a description…"
                    className="w-full border border-blue-400 rounded-lg px-3 py-2.5 text-sm text-slate-800
                      focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none transition placeholder:text-slate-400"
                  />
                  <button type="button"
                    onClick={() => { setShowDesc(false); setForm(p => ({ ...p, notes: '' })); }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDesc(true)}
                  className="flex items-center gap-2 w-full border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition">
                  <FileText size={15} /> ADD DESCRIPTION
                </button>
              )}
              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition">
                <Camera size={16} />
              </button>
            </div>

            {/* RIGHT */}
            <div className="w-64 shrink-0">
              <InfoRow label="Receipt No">
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {receiptNo != null ? `#${receiptNo}` : 'Auto'}
                </span>
              </InfoRow>
              <InfoRow label="Pay Out Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={setF('date')}
                  className="text-xs font-bold text-slate-800 border border-slate-200 rounded-md
                    px-2 py-0.5 focus:outline-none focus:border-blue-400 bg-white cursor-pointer"
                />
              </InfoRow>
              <InfoRow label="Pay Out Entry Date">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">{entryDateDisplay}</span>
                  <Clock size={12} className="text-slate-400 shrink-0" />
                </div>
              </InfoRow>
              <div className="h-4" />
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 shrink-0">Paid</span>
                <input
                  type="number" min="0"
                  value={form.paid}
                  onChange={setF('paid')}
                  placeholder="0"
                  className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right text-slate-800
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition"
                />
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 shrink-0">Discount</span>
                <input
                  type="number" min="0"
                  value={form.discount}
                  onChange={setF('discount')}
                  placeholder="0"
                  className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right text-slate-800
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition"
                />
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-bold text-slate-700">Total</span>
                <span className="text-xl font-bold text-rose-600">{fmtNum(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Print
            </button>
            <div className="w-px bg-slate-300" />
            <button className="px-2.5 py-2 text-slate-500 hover:bg-slate-50 transition">
              <ChevronDown size={14} />
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !form.party}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['paymentOut'] }); setModal(false); toast.success('Payment saved'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to save payment'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => PaymentsAPI.updatePaymentOut(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['paymentOut'] }); setModal(false); setEditPayment(null); toast.success('Payment updated'); },
    onError:    (err) => toast.error(err?.response?.data?.error || 'Failed to update payment'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => PaymentsAPI.deletePaymentOut(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['paymentOut'] }); toast.success('Payment deleted'); },
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
