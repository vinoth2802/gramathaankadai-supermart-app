import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Settings, Search, Filter, BarChart2, ExternalLink,
  Wallet, BadgePercent, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { PartiesAPI } from '../../api/parties.js';
import AddPartyModal from './AddPartyModal.jsx';

/* ── Column header ── */
function Th({ label, filterable = false, className = '' }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50 ${className}`}>
      <div className="flex items-center gap-1.5">
        {label}
        {filterable && <Filter size={10} className="text-slate-400 shrink-0" />}
      </div>
    </th>
  );
}

/* ── Decorative patterns ── */
function CirclePattern() {
  return (
    <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none">
      <div className="absolute top-2 right-2 w-14 h-14 rounded-full border-[3px] border-blue-300 opacity-30" />
      <div className="absolute top-6 right-7 w-8 h-8 rounded-full border-[3px] border-blue-300 opacity-25" />
      <div className="absolute -top-1 right-9 w-5 h-5 rounded-full bg-blue-200 opacity-25" />
    </div>
  );
}

function DiagonalPattern() {
  return (
    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
      <svg width="96" height="96" className="opacity-[0.12]">
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1={-8 + i * 11} y1="0" x2={12 + i * 11} y2="96"
            stroke="#f87171" strokeWidth="2.5" />
        ))}
      </svg>
    </div>
  );
}

function PlusPattern() {
  const positions = [
    { top: 6, right: 10 }, { top: 14, right: 24 }, { top: 4, right: 36 },
    { top: 20, right: 8 }, { top: 26, right: 20 }, { top: 8, right: 48 },
  ];
  return (
    <div className="absolute top-0 right-0 w-28 h-24 pointer-events-none">
      {positions.map((p, i) => (
        <span key={i} style={{ top: p.top, right: p.right }}
          className="absolute text-green-300 opacity-50 font-bold text-lg leading-none select-none">
          +
        </span>
      ))}
    </div>
  );
}

/* ── Main page ── */
export default function LoyaltyPoints() {
  const [search, setSearch] = useState('');
  const [modal, setModal]   = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const qc = useQueryClient();
  const saveMut = useMutation({
    mutationFn: (data) => PartiesAPI.create({ ...data, type: (data.partyGroup || 'customer').toLowerCase() }),
    onSuccess: () => { qc.invalidateQueries(['parties']); setModal(false); toast.success('Party added'); },
    onError:   () => toast.error('Failed to save party'),
  });

  const handleSaveAndNew = (data) => {
    saveMut.mutate(data, {
      onSuccess: () => { qc.invalidateQueries(['parties']); setModalKey(k => k + 1); toast.success('Party added'); },
    });
  };

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['parties'],
    queryFn: PartiesAPI.getAll,
  });

  /* Map each party to a loyalty row — loyalty fields default to 0
     until a dedicated loyalty API/schema is wired up               */
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return parties
      .map(p => ({
        id:        p.id,
        name:      p.name,
        phone:     p.phone || '',
        earned:    Number(p.loyaltyEarned    ?? 0),
        claimed:   Number(p.loyaltyClaimed   ?? 0),
        discount:  Number(p.loyaltyDiscount  ?? 0),
        available: Number(p.loyaltyAvailable ?? 0),
        balance:   Number(p.balance          ?? 0),
      }))
      .filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q),
      );
  }, [parties, search]);

  const totalPoints   = useMemo(() => rows.reduce((s, r) => s + r.earned,    0), [rows]);
  const totalDiscount = useMemo(() => rows.reduce((s, r) => s + r.discount,  0), [rows]);
  const activeCount   = useMemo(() => rows.filter(r => r.available > 0).length,  [rows]);

  const fmt = (n, decimals = 2) =>
    Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals });

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <div className="px-6 py-5 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Loyalty Points</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
              <Plus size={14} /> Add Party
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white border border-slate-200 rounded-xl transition">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Card 1 — Total Points */}
          <div className="relative bg-blue-50 rounded-2xl p-5 overflow-hidden">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <Wallet size={18} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-0.5">
              {fmt(totalPoints)}
            </div>
            <div className="text-xs text-slate-500">Total reward points awarded</div>
            <CirclePattern />
          </div>

          {/* Card 2 — Total Discount */}
          <div className="relative bg-red-50 rounded-2xl p-5 overflow-hidden">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center mb-3">
              <BadgePercent size={18} className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-0.5">
              ₹ {fmt(totalDiscount)}
            </div>
            <div className="text-xs text-slate-500">Total amount given as discount</div>
            <DiagonalPattern />
          </div>

          {/* Card 3 — Active Parties */}
          <div className="relative bg-green-50 rounded-2xl p-5 overflow-hidden">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center mb-3">
              <Users size={18} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-0.5">
              {activeCount}
            </div>
            <div className="text-xs text-slate-500">Total parties with active points</div>
            <PlusPattern />
          </div>
        </div>

        {/* ── Party Details Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Party Details</h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name/phone"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-52
                  focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th label="Party Name" />
                <Th label="Points Earned"          filterable />
                <Th label="Points Claimed"          filterable />
                <Th label="Total Discount Claimed"  filterable />
                <Th label="Available Points"        filterable />
                <Th label="Party Balance"           filterable />
                <Th label="Action" className="text-center w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    No parties found
                  </td>
                </tr>
              ) : rows.map((row, idx) => (
                <tr key={row.id}
                  className={`transition hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>

                  <td className="px-4 py-3 font-semibold text-slate-800 text-xs uppercase tracking-wide">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(row.earned)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(row.claimed)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(row.discount)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {fmt(row.available)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 font-semibold text-xs
                      ${row.balance > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                      {row.balance > 0 && <ExternalLink size={11} />}
                      {fmt(row.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View chart">
                        <BarChart2 size={14} />
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        title="Open party">
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {modal && (
        <AddPartyModal
          key={modalKey}
          isSaving={saveMut.isPending}
          onClose={() => setModal(false)}
          onSave={(data) => saveMut.mutate(data)}
          onSaveAndNew={handleSaveAndNew}
        />
      )}
    </div>
  );
}
