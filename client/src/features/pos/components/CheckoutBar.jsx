import { Check, Printer, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { RS } from '../resources/constants';

export function CheckoutBar({
  subtotal, gst, grandTotal, receivedAmount, updateReceivedAmount, change,
  paymentLines, modes, updatePayLine, selectedParty, prevPoints, eligiblePoints, totalPoints,
  createSale, cart, completeSale, openClearConfirm,
}) {
  return (
    <div className="bg-white border-t border-slate-200 px-5 py-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="border border-slate-200 rounded-xl overflow-hidden w-64 shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">Sub Total</span>
            <span className="text-sm font-semibold text-slate-700">{RS}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">Tax Amount</span>
            <span className="text-sm font-semibold text-slate-700">{RS}{gst.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
            <span className="text-sm font-bold text-slate-800">Grand Total</span>
            <span className="text-lg font-bold text-emerald-700">{RS}{grandTotal.toFixed(0)}</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden w-72 shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">Received Amount</span>
            <Input
              type="number"
              min="0"
              value={receivedAmount}
              onChange={e => updateReceivedAmount(e.target.value)}
              placeholder="0.00"
              className="h-8 w-28 rounded-lg border-slate-200 px-2 py-1 text-right text-sm focus-visible:ring-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">Change Given</span>
            <span className="text-sm font-semibold text-amber-600">{RS}{change.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-slate-500">Payment Type</span>
            <Select value={paymentLines[0]?.mode || 'Cash'} onValueChange={value => updatePayLine(0, 'mode', value)}>
              <SelectTrigger className="h-8 w-32 rounded-lg border-slate-200 px-2 py-1 text-sm focus:ring-emerald-400">
                <SelectValue placeholder="Cash" />
              </SelectTrigger>
              <SelectContent>
                {modes.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedParty && (
          <div className="border border-slate-200 rounded-xl overflow-hidden w-64 shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Previous Loyalty Points</span>
              <span className="text-sm font-semibold text-slate-700">{prevPoints}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Eligible Loyalty Points</span>
              <span className="text-sm font-semibold text-emerald-600">+{eligiblePoints}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-violet-50">
              <span className="text-sm font-bold text-slate-800">Total Loyalty Points</span>
              <span className="text-lg font-bold text-violet-700">{totalPoints}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center ml-auto">
          <Button onClick={() => completeSale(false)} disabled={createSale.isPending || !cart.length} className="h-auto rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold hover:bg-emerald-700">
            <Check size={15} /> {createSale.isPending ? 'Saving...' : 'Complete'}
          </Button>
          <Button onClick={() => completeSale(true)} disabled={createSale.isPending || !cart.length} className="h-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-700">
            <Printer size={15} /> Print
          </Button>
          <Button onClick={openClearConfirm} variant="outline" className="h-auto rounded-lg border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-600 hover:bg-rose-100 hover:text-rose-600">
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
