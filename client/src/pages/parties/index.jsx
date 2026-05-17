import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PartiesAPI } from '../../api/parties.js';
import { fmt } from '../../utils/formatters.js';

const EMPTY = { name: '', type: 'customer', partyType: 'B2C', phone: '', email: '', address: '', gstin: '', balance: 0, payable: 0, notes: '' };
const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800 bg-white';

function TypeBadge({ type }) {
  const map = { customer: 'bg-blue-100 text-blue-700', supplier: 'bg-purple-100 text-purple-700', both: 'bg-emerald-100 text-emerald-700' };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${map[type] || 'bg-slate-100 text-slate-600'}`}>{type}</span>;
}

function PartyTypeBadge({ partyType }) {
  const isB2B = partyType === 'B2B';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isB2B ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
      {isB2B ? 'B2B' : 'B2C'}
    </span>
  );
}

function RowMenu({ party, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bg-white border border-slate-200 rounded-xl shadow-xl min-w-[150px] z-50 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            <button onClick={() => { setOpen(false); onEdit(party); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Pencil size={13} className="text-slate-400" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onDelete(party.id); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Parties() {
  const qc = useQueryClient();
  const { data: allParties = [], isLoading } = useQuery({ queryKey: ['parties'], queryFn: PartiesAPI.getAll });

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const saveMut = useMutation({
    mutationFn: (data) => editId ? PartiesAPI.update(editId, data) : PartiesAPI.create(data),
    onSuccess: () => { qc.invalidateQueries(['parties']); closeModal(); toast.success(editId ? 'Party updated' : 'Party added'); },
    onError: () => toast.error('Failed to save party'),
  });
  const deleteMut = useMutation({
    mutationFn: PartiesAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['parties']); toast.success('Party deleted'); },
    onError: () => toast.error('Failed to delete party'),
  });

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, type: p.type, partyType: p.partyType || 'B2C',
      phone: p.phone || '', email: p.email || '',
      address: p.address || '', gstin: p.gstin || '', balance: p.balance || 0,
      payable: p.payable || 0, notes: p.notes || '' });
    setEditId(p.id); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditId(null); };

  const filtered = allParties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parties</h1>
          <p className="text-slate-500 text-sm mt-0.5">Customers and suppliers</p>
        </div>
        <button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm">
          <Plus size={15} /> Add Party
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              {['Name','Phone','Receivable (Dr)','Payable','Type','Party Type','Last Sale','Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">No parties found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.phone || '—'}</td>
                <td className={`px-4 py-3 font-semibold ${Number(p.balance) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {Number(p.balance) > 0 ? `₹${Number(p.balance).toFixed(2)} Dr` : '—'}
                </td>
                <td className={`px-4 py-3 font-semibold ${Number(p.payable) > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {Number(p.payable) > 0 ? `₹${Number(p.payable).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                <td className="px-4 py-3"><PartyTypeBadge partyType={p.partyType} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{p.lastSale ? fmt.date(p.lastSale) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  <RowMenu party={p} onEdit={openEdit} onDelete={(id) => setDeleteConfirm({ open: true, id })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editId ? 'Edit Party' : 'Add Party'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
                  <input required value={form.name} onChange={f('name')} placeholder="Party name" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                  <select value={form.type} onChange={f('type')} className={inp}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Party Type</label>
                  <select value={form.partyType} onChange={(e) => setForm(prev => ({ ...prev, partyType: e.target.value, gstin: e.target.value === 'B2C' ? '' : prev.gstin }))} className={inp}>
                    <option value="B2C">B2C — Consumer</option>
                    <option value="B2B">B2B — Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
                  <input value={form.phone} onChange={f('phone')} placeholder="9876543210" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={f('email')} className={inp} />
                </div>
                {form.partyType === 'B2B' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">GSTIN</label>
                    <input value={form.gstin} onChange={f('gstin')} placeholder="33ABCDE1234F1Z5" className={inp} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
                  <textarea value={form.address} onChange={f('address')} rows={2} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <input value={form.notes} onChange={f('notes')} className={inp} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saveMut.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition">
                  {saveMut.isPending ? 'Saving...' : 'Save Party'}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
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
