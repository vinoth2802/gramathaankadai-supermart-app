import { Check, User } from 'lucide-react';
import { Button } from '@components/ui/button';

export function SaleInfoBar({ invoice, saleType, setSaleType, selectedParty, openPartyModal }) {
  return (
    <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
      <div className="text-sm text-slate-600 flex items-center gap-2">
        <span className="font-semibold">Invoice:</span>
        <span className="font-mono text-amber-600 font-bold">{invoice}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 text-xs">{new Date().toLocaleString('en-IN')}</span>
      </div>

      <div className="text-sm flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Party:</span>
          {selectedParty ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check size={12} /> {selectedParty.name}
              </span>
              <div className="text-xs text-slate-500 space-y-0.5">
                {selectedParty.phone && <div>Mobile: {selectedParty.phone}</div>}
                {selectedParty.gst && <div>GST: {selectedParty.gst}</div>}
                {selectedParty.address && <div>Address: {selectedParty.address}</div>}
              </div>
            </div>
          ) : (
            <span className="text-slate-400">{saleType === 'credit' ? 'Select party' : 'Cash Sale'}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-200 rounded-lg p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSaleType('cash')}
            className={`h-7 px-3 rounded-md text-xs font-bold ${saleType === 'cash' ? 'bg-green-800 text-white shadow-sm hover:bg-green-800 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cash Sale
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSaleType('credit')}
            className={`h-7 px-3 rounded-md text-xs font-bold ${saleType === 'credit' ? 'bg-green-800 text-white shadow-sm hover:bg-green-800 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Credit Sale
          </Button>
        </div>
        <Button onClick={openPartyModal} size="sm" className="h-9 bg-blue-600 px-3.5 text-xs font-semibold hover:bg-blue-700">
          <User size={13} /> Select Party
        </Button>
      </div>
    </div>
  );
}
