import { Printer, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { printInvoice } from '../resources/printInvoice';

export function InvoicePreviewModal({ sale, settings, onClose }) {
  const cfg = settings || {};
  const shopName = cfg.tenantName || cfg.shopName || 'Gramathaankadai SuperMart';
  const address = cfg.address || '';
  const phone = cfg.phone || '';
  const gstin = cfg.gstin || '';
  const dateStr = new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">Invoice Preview</span>
            <span className="text-xs font-mono text-amber-600 font-bold">#{sale.invoice}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-4 font-mono text-[11px] text-slate-800 shadow-inner" style={{ fontFamily: "'Courier New', monospace" }}>
            <div className="text-center font-bold text-sm mb-0.5">{shopName}</div>
            {address && <div className="text-center text-[10px] text-slate-500">{address}</div>}
            {phone && <div className="text-center text-[10px] text-slate-500">Ph: {phone}</div>}
            {gstin && <div className="text-center text-[10px] text-slate-500">GSTIN: {gstin}</div>}
            <div className="border-t border-slate-400 my-2" />
            <div className="text-center font-bold text-xs tracking-wider mb-2">TAX INVOICE</div>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Invoice</span><span className="font-bold">{sale.invoice}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{dateStr} {timeStr}</span></div>
              <div className="flex justify-between"><span>Customer</span><span className="font-medium">{sale.customerName}</span></div>
              {sale.party?.phone && <div className="flex justify-between"><span>Phone</span><span>{sale.party.phone}</span></div>}
            </div>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-400">
                  <th className="text-left pb-1 w-5">#</th>
                  <th className="text-left pb-1">Item</th>
                  <th className="text-center pb-1 w-8">Qty</th>
                  <th className="text-right pb-1 w-14">Rate</th>
                  <th className="text-right pb-1 w-16">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="py-0.5">{i + 1}</td>
                    <td className="py-0.5 pr-1">{it.name}</td>
                    <td className="py-0.5 text-center">{it.qty}</td>
                    <td className="py-0.5 text-right">₹{Number(it.rate).toFixed(2)}</td>
                    <td className="py-0.5 text-right font-medium">₹{Number(it.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(sale.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax (GST)</span><span>₹{Number(sale.gst).toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-b border-slate-400 py-1.5 my-1.5">
              <span>Grand Total</span><span>₹{Number(sale.grandTotal).toFixed(0)}</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Received</span><span>₹{Number(sale.totalReceived || sale.grandTotal).toFixed(2)}</span></div>
              {Number(sale.changeGiven) > 0 && <div className="flex justify-between"><span>Change</span><span>₹{Number(sale.changeGiven).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Payment</span><span className="font-medium">{sale.paymentMode}</span></div>
            </div>
            <div className="border-t border-slate-400 my-2" />
            <div className="text-center font-bold text-[10px]">Thank you for your purchase!</div>
            <div className="text-center text-[10px] text-slate-400">Please visit us again</div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 h-auto rounded-xl py-2.5 text-slate-600">Close</Button>
          <Button onClick={() => printInvoice(sale, cfg)} className="flex-1 h-auto rounded-xl bg-blue-600 py-2.5 hover:bg-blue-700">
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>
    </div>
  );
}
