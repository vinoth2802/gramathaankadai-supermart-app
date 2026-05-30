import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { RS } from '../resources/constants';

export function PartySelectorModal({ open, onClose, onAddParty, partySearch, setPartySearch, filteredParties, setSelectedParty }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-800">Select Party</h2>
          <div className="flex items-center gap-2">
            <Button onClick={onAddParty} className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold hover:bg-blue-700">
              Add Party
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"><X size={20} /></button>
          </div>
        </div>
        <Input value={partySearch} onChange={e => setPartySearch(e.target.value)} placeholder="Search by name or phone..." className="mb-4 h-auto w-full rounded-xl border-slate-300 px-4 py-2.5 text-sm focus-visible:ring-amber-500" />
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white sticky top-0">
              <tr>
                <th className="p-3 text-left font-semibold">Name</th>
                <th className="p-3 text-left font-semibold">Phone</th>
                <th className="p-3 text-right font-semibold">Balance</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParties.map(p => (
                <tr key={p.id} onClick={() => { setSelectedParty(p); onClose(); }} className="cursor-pointer hover:bg-amber-50 transition">
                  <td className="p-3 font-medium text-slate-800">{p.name}</td>
                  <td className="p-3 text-slate-500">{p.phone || '—'}</td>
                  <td className={`p-3 text-right font-semibold ${Number(p.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {RS}{Math.abs(Number(p.balance || 0)).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <button className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">Select</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <Button variant="secondary" onClick={onClose} className="h-auto rounded-xl px-5 py-2.5 text-sm font-semibold">Cancel</Button>
          <Button onClick={() => { setSelectedParty(null); onClose(); }} className="h-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold hover:bg-amber-600">
            Cash Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
