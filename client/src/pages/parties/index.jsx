import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, MoreVertical, Pencil, Settings,
  Filter, MessageSquare, MessageCircle, Bell,
  Printer, FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import AddPartyModal from './AddPartyModal.jsx';
import { PartiesAPI } from '../../api/parties.js';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { fmt } from '../../utils/formatters.js';

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = {
    Paid:    'bg-emerald-100 text-emerald-700',
    Partial: 'bg-amber-100 text-amber-700',
    Unpaid:  'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

/* ── Sortable column header ── */
function SortTh({ label, colKey, sortCol, sortDir, onSort, className = '' }) {
  const active = sortCol === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-700 cursor-pointer select-none hover:bg-slate-700 transition ${className}`}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-slate-400 text-[10px]">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : <Filter size={9} />}
        </span>
      </div>
    </th>
  );
}

/* ── Transaction row 3-dot menu ── */
function TxnMenu({ txn }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[150px] z-50 overflow-hidden" style={{ top: pos.top, right: pos.right }}>
            {['View', 'Edit', 'Print', 'Delete'].map(label => (
              <button key={label} onClick={() => { setOpen(false); toast.info(`${label}: ${txn.invoiceNo || txn.type}`); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${label === 'Delete' ? 'text-rose-600' : 'text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function Parties() {
  const qc = useQueryClient();
  const { data: allParties = [], isLoading } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });
  const { data: sales = [] }     = useQuery({ queryKey: ['sales'],     queryFn: SalesAPI.getAll });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });

  const [selectedId, setSelectedId]   = useState(null);
  const [search, setSearch]           = useState('');
  const [txnSearch, setTxnSearch]     = useState('');
  const [sortCol, setSortCol]         = useState(null);
  const [sortDir, setSortDir]         = useState('asc');
  const [listSortCol, setListSortCol] = useState('name');
  const [listSortDir, setListSortDir] = useState('asc');
  const [modal, setModal]             = useState(false);
  const [editParty, setEditParty]     = useState(null);
  const [modalKey, setModalKey]       = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [selectedTxnKey, setSelectedTxnKey] = useState(null);

  const closeModal = () => { setModal(false); setEditParty(null); };

  const saveMut = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, type: (data.partyGroup || 'customer').toLowerCase() };
      return editParty ? PartiesAPI.update(editParty.id, payload) : PartiesAPI.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parties'] }); closeModal(); toast.success(editParty ? 'Party updated' : 'Party added'); },
    onError: () => toast.error('Failed to save party'),
  });

  const handleSaveAndNew = (data) => {
    const payload = { ...data, type: (data.partyGroup || 'customer').toLowerCase() };
    saveMut.mutate(payload, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['parties'] }); setModalKey(k => k + 1); toast.success('Party added'); },
    });
  };
  const deleteMut = useMutation({
    mutationFn: PartiesAPI.delete,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['parties'] });
      if (String(selectedId) === String(id)) setSelectedId(null);
      setDeleteConfirm({ open: false, id: null });
      toast.success('Party deleted');
    },
    onError: () => toast.error('Failed to delete party'),
  });

  const handleListSort = (col) => {
    if (listSortCol === col) setListSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setListSortCol(col); setListSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const list = allParties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || '').includes(search));
    return [...list].sort((a, b) => {
      const av = listSortCol === 'balance' ? Number(a.balance || 0) : (a.name || '').toLowerCase();
      const bv = listSortCol === 'balance' ? Number(b.balance || 0) : (b.name || '').toLowerCase();
      return listSortDir === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  }, [allParties, search, listSortCol, listSortDir]);

  const selectedParty = useMemo(() =>
    filtered.find(p => String(p.id) === String(selectedId)) || null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (!filtered.length) { setSelectedId(null); return; }
    setSelectedId(cur => filtered.some(p => String(p.id) === String(cur)) ? cur : filtered[0].id);
  }, [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const partyTransactions = useMemo(() => {
    if (!selectedParty) return [];
    const txns = [];

    sales.forEach(s => {
      const byId   = s.partyId && String(s.partyId) === String(selectedParty.id);
      const byName = (s.customerName || '').toLowerCase() === selectedParty.name.toLowerCase();
      if (!byId && !byName) return;
      const total   = Number(s.grandTotal || 0);
      const paid    = Number(s.totalReceived || 0);
      const balance = Math.max(total - paid, 0);
      const status  = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
      txns.push({ id: s.id, type: 'Sale', invoiceNo: s.invoice, date: s.date, total, balance, dueDate: null, status });
    });

    purchases.forEach(p => {
      const byId   = p.partyId && String(p.partyId) === String(selectedParty.id);
      const byName = (p.partyName || '').toLowerCase() === selectedParty.name.toLowerCase();
      if (!byId && !byName) return;
      txns.push({ id: p.id, type: 'Purchase', invoiceNo: p.invoice, date: p.date, total: Number(p.grandTotal || 0), balance: 0, dueDate: null, status: 'Paid' });
    });

    let result = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortCol) {
      result.sort((a, b) => {
        let av = a[sortCol], bv = b[sortCol];
        if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
        return sortDir === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
      });
    }

    if (txnSearch) {
      const q = txnSearch.toLowerCase();
      result = result.filter(t => (t.invoiceNo || '').toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q));
    }

    return result;
  }, [selectedParty, sales, purchases, sortCol, sortDir, txnSearch]);

  const exportCSV = () => {
    if (!selectedParty) return;
    let csv = 'Type,Invoice No,Date,Total,Balance,Status\n';
    partyTransactions.forEach(t => {
      csv += `${t.type},"${t.invoiceNo || ''}","${fmt.date(t.date)}",${t.total},${t.balance},${t.status}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${selectedParty.name}_transactions.csv`;
    a.click();
  };

  return (
    <div className="h-screen flex overflow-hidden bg-white">

      {/* ══ LEFT PANEL ══ */}
      <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-white">

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Parties</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { setEditParty(null); setModal(true); }}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition">
                <Plus size={12} /> Add Party
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"><Settings size={14} /></button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"><MoreVertical size={14} /></button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Party Name"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
          <button onClick={() => handleListSort('name')} className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-700 transition select-none">
            Party Name
            <span className="text-[10px] text-slate-400">{listSortCol === 'name' ? (listSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
          </button>
          <button onClick={() => handleListSort('balance')} className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-700 transition select-none">
            Amount
            <span className="text-[10px] text-slate-400">{listSortCol === 'balance' ? (listSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
          </button>
        </div>

        {/* Party rows */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-xs text-slate-400 py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No parties found</p>
          ) : filtered.map(p => {
            const bal = Number(p.balance || 0);
            const isSelected = String(selectedId) === String(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-slate-100 transition ${isSelected ? 'bg-green-100 border-l-2 border-l-green-700' : 'hover:bg-slate-50'}`}
              >
                <span className="text-xs font-bold text-slate-800 uppercase truncate pr-2">{p.name}</span>
                <span className={`text-xs font-semibold shrink-0 ${bal === 0 ? 'text-teal-600' : 'text-red-500'}`}>
                  {bal === 0 ? '0' : bal.toLocaleString('en-IN')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedParty ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <p className="text-sm">Select a party to view details</p>
          </div>
        ) : (
          <>
            {/* Party header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 uppercase">{selectedParty.name}</h2>
                    <button onClick={() => { setEditParty(selectedParty); setModal(true); }}
                      className="text-blue-500 hover:text-blue-700 transition">
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Phone Number</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedParty.phone || '—'}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">GST No</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedParty.gstin || '—'}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Billing Address</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedParty.billingAddress || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Action circles */}
                <div className="flex items-center gap-2">
                  <button onClick={() => toast.info('Message')} title="Message"
                    className="w-9 h-9 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition">
                    <MessageSquare size={15} className="text-orange-600" />
                  </button>
                  <button onClick={() => toast.info('WhatsApp')} title="WhatsApp"
                    className="w-9 h-9 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition">
                    <MessageCircle size={15} className="text-emerald-600" />
                  </button>
                  <button onClick={() => toast.info('Reminder')} title="Reminder"
                    className="w-9 h-9 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition">
                    <Bell size={15} className="text-red-600" />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <button onClick={() => { setEditParty(selectedParty); setModal(true); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions section */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">Transactions</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={txnSearch} onChange={e => setTxnSearch(e.target.value)}
                    placeholder="Search…"
                    className="pl-7 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-40 focus:outline-none focus:border-blue-400" />
                </div>
                <button onClick={() => window.print()} title="Print"
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                  <Printer size={15} />
                </button>
                <button onClick={exportCSV} title="Export Excel"
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                  <FileSpreadsheet size={15} />
                </button>
              </div>
            </div>

            {/* Transactions table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white sticky top-0 z-10">
                    <tr>
                      <SortTh label="Type"           colKey="type"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Invoice/GRN No" colKey="invoiceNo" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Date"           colKey="date"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Total"          colKey="total"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Balance/Unused" colKey="balance"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Due Date"       colKey="dueDate"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Status"         colKey="status"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partyTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                          No transactions found for this party
                        </td>
                      </tr>
                    ) : partyTransactions.map((txn, idx) => {
                      const txnKey = `${txn.type}-${txn.id}-${idx}`;
                      return (
                      <tr key={txnKey} onClick={() => setSelectedTxnKey(txnKey)}
                        className={`cursor-pointer transition ${selectedTxnKey === txnKey ? 'bg-green-100' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${txn.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {txn.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-700 border-r border-slate-100">
                          {txn.invoiceNo || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs border-r border-slate-100">
                          {txn.date ? fmt.datetime(txn.date) : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800 border-r border-slate-100">
                          ₹{Number(txn.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <span className={txn.balance > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}>
                            ₹{Number(txn.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs border-r border-slate-100">
                          {txn.dueDate ? fmt.date(txn.dueDate) : '—'}
                        </td>
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <StatusBadge status={txn.status} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <TxnMenu txn={txn} />
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══ Add/Edit Modal ══ */}
      {modal && (
        <AddPartyModal
          key={modalKey}
          editData={editParty}
          isSaving={saveMut.isPending}
          onClose={closeModal}
          onSave={(data) => saveMut.mutate(data)}
          onSaveAndNew={handleSaveAndNew}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Party"
        message="This party will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}
