import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Settings, Search, Filter, BarChart2, ExternalLink,
  Wallet, BadgePercent, Users, X, Info, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PartiesAPI } from '../../api/parties.js';
import AddPartyModal from './AddPartyModal.jsx';

const API = 'http://localhost:3001';

/* ── Toggle Switch ── */
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none
        ${value ? 'bg-blue-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
        ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

/* ── Edit Loyalty Setup Modal ── */
const DEFAULT_SETUP = {
  loyaltyPointsPerRupee: 1,
  loyaltyMinPoints:      100,
  loyaltyPointsValue:    0.10,
  loyaltyExpiryDays:     365,
  loyaltyMaxDiscount:    10,
  loyaltyAllowPartial:   true,
  loyaltyShowOnInvoice:  true,
};

function EditSetupModal({ onClose }) {
  const [form, setForm] = useState(DEFAULT_SETUP);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/loyalty`)
      .then(r => r.json())
      .then(d => setForm(prev => ({ ...prev, ...d })))
      .catch(() => {});
  }, []);

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const t = (k) => (v)  => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings/loyalty`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Loyalty settings saved');
      onClose();
    } catch {
      toast.error('Failed to save loyalty settings');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const row = 'flex items-center justify-between py-3 border-b border-slate-100 last:border-0';

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">Edit Loyalty Setup</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Number fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Points per ₹ Spent</label>
              <input type="number" min="0" step="0.01" value={form.loyaltyPointsPerRupee} onChange={f('loyaltyPointsPerRupee')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Min Points to Redeem</label>
              <input type="number" min="0" value={form.loyaltyMinPoints} onChange={f('loyaltyMinPoints')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Points Value ₹</label>
              <input type="number" min="0" step="0.01" value={form.loyaltyPointsValue} onChange={f('loyaltyPointsValue')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Points Expiry (Days)</label>
              <input type="number" min="0" value={form.loyaltyExpiryDays} onChange={f('loyaltyExpiryDays')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Maximum Discount %</label>
              <input type="number" min="0" max="100" step="0.1" value={form.loyaltyMaxDiscount} onChange={f('loyaltyMaxDiscount')} className={inp} />
            </div>
          </div>

          {/* Toggle fields */}
          <div className="bg-slate-50 rounded-xl px-4 divide-y divide-slate-100">
            <div className={row}>
              <span className="text-sm text-slate-700">Allow Partial Redemption</span>
              <Toggle value={!!form.loyaltyAllowPartial} onChange={t('loyaltyAllowPartial')} />
            </div>
            <div className={row}>
              <span className="text-sm text-slate-700">Show Points on Invoice</span>
              <Toggle value={!!form.loyaltyShowOnInvoice} onChange={t('loyaltyShowOnInvoice')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Drawer ── */
function SettingsDrawer({ open, onClose, loyaltyEnabled, onToggleLoyalty, onEditSetup }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col
        transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">Loyalty Points Settings</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* Rows */}
        <div className="flex-1 px-4 py-3 divide-y divide-slate-100">

          {/* Row 1 — Enable Loyalty Points */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Enable Loyalty Points</span>
              <Info size={13} className="text-slate-400" title="Turn loyalty points on or off for all customers" />
            </div>
            <Toggle value={loyaltyEnabled} onChange={onToggleLoyalty} />
          </div>

          {/* Row 2 — Edit Loyalty Setup */}
          <button
            onClick={onEditSetup}
            className="w-full flex items-center justify-between py-4 text-left hover:bg-slate-50 rounded-xl px-1 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Edit Loyalty Setup</span>
              <Info size={13} className="text-slate-400" title="Configure points rate, redemption rules and more" />
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

        </div>
      </div>
    </>
  );
}

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
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(false);
  const [modalKey, setModalKey]       = useState(0);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [editSetupOpen, setEditSetupOpen]   = useState(false);

  // Load current loyalty enabled state
  useEffect(() => {
    fetch(`${API}/api/settings/loyalty`)
      .then(r => r.json())
      .then(d => { if (typeof d.loyaltyEnabled === 'boolean') setLoyaltyEnabled(d.loyaltyEnabled); })
      .catch(() => {});
  }, []);

  const handleToggleLoyalty = async (val) => {
    setLoyaltyEnabled(val);
    try {
      await fetch(`${API}/api/settings/loyalty`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ loyaltyEnabled: val }),
      });
      toast.success(`Loyalty points ${val ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update');
      setLoyaltyEnabled(!val);
    }
  };

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
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white border border-slate-200 rounded-xl transition">
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

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        loyaltyEnabled={loyaltyEnabled}
        onToggleLoyalty={handleToggleLoyalty}
        onEditSetup={() => { setSettingsOpen(false); setEditSetupOpen(true); }}
      />

      {editSetupOpen && (
        <EditSetupModal onClose={() => setEditSetupOpen(false)} />
      )}
    </div>
  );
}
