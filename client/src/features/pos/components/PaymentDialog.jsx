import { Check, Printer, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { RS } from '../resources/constants';

export function PaymentDialog({
  open, grandTotal, subtotal, gst,
  modes, paymentLines, updatePayLine,
  receivedAmount, updateReceivedAmount, change,
  onComplete, onClose, isPending,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Complete Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-700 font-medium">{RS}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tax</span>
            <span className="text-slate-700 font-medium">{RS}{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-800">Grand Total</span>
            <span className="text-xl font-bold text-emerald-700">{RS}{grandTotal.toFixed(0)}</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Payment Type
            </label>
            <Select
              value={paymentLines[0]?.mode || 'Cash'}
              onValueChange={value => updatePayLine(0, 'mode', value)}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 text-sm focus:ring-emerald-400">
                <SelectValue placeholder="Cash" />
              </SelectTrigger>
              <SelectContent>
                {modes.map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Received Amount
            </label>
            <Input
              type="number"
              min="0"
              value={receivedAmount}
              onChange={e => updateReceivedAmount(e.target.value)}
              placeholder={grandTotal.toFixed(0)}
              autoFocus
              className="h-10 w-full rounded-lg border-slate-200 px-3 text-right text-sm focus-visible:ring-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-sm font-semibold text-slate-700">Change Given</span>
            <span className={`text-lg font-bold ${change > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {RS}{change.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <Button
            onClick={() => onComplete(false)}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold disabled:opacity-50"
          >
            <Check size={16} className="mr-1" />
            {isPending ? 'Saving…' : 'Complete'}
          </Button>
          <Button
            onClick={() => onComplete(true)}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold disabled:opacity-50"
          >
            <Printer size={16} className="mr-1" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
