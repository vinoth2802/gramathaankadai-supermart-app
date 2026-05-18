import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, Printer } from 'lucide-react';
import { SalesAPI } from '../../api/sales.js';
import { fmt } from '../../utils/formatters.js';

const RS = '₹';
const saleCustomer = (sale) => sale.customerName ?? sale.customer_name ?? 'Cash Sale';
const saleGrandTotal = (sale) => sale.grandTotal ?? sale.grand_total ?? 0;
const salePaymentMode = (sale) => sale.paymentMode ?? sale.payment_mode ?? 'Cash';

function printInvoice(sale) {
  const items = (sale.items || []).map(i =>
    `<tr><td style="padding:6px 8px">${i.name}</td><td style="padding:6px 8px;text-align:center">${i.qty}</td><td style="padding:6px 8px;text-align:right">${RS}${Number(i.rate).toFixed(2)}</td><td style="padding:6px 8px;text-align:right">${RS}${Number(i.amount).toFixed(2)}</td></tr>`
  ).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${sale.invoice}</title>
  <style>body{font-family:Arial,sans-serif;max-width:400px;margin:20px auto;font-size:13px}
  h2{text-align:center;margin:0}p{margin:2px 0}table{width:100%;border-collapse:collapse}
  th{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left}
  td{border-bottom:1px solid #f1f5f9}.total{font-weight:bold;font-size:14px}.hr{border-top:2px dashed #e2e8f0;margin:10px 0}</style>
  </head><body>
  <h2>Gramathaankadai SuperMart</h2><p style="text-align:center">Main Road, Tamil Nadu | 9876543210</p>
  <div class="hr"></div>
  <p><b>Invoice:</b> ${sale.invoice}</p><p><b>Date:</b> ${fmt.datetime(sale.date)}</p>
  <p><b>Customer:</b> ${saleCustomer(sale)}</p><p><b>Payment:</b> ${salePaymentMode(sale)}</p>
  <div class="hr"></div>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${items}</tbody></table>
  <div class="hr"></div>
  <p>Subtotal: ${RS}${Number(sale.subtotal).toFixed(2)}</p>
  <p>GST: ${RS}${Number(sale.gst).toFixed(2)}</p>
  <p class="total">Grand Total: ${RS}${Number(saleGrandTotal(sale)).toFixed(2)}</p>
  <div class="hr"></div><p style="text-align:center">Thank you for shopping!</p>
  </body></html>`);
  w.document.close(); w.print();
}

export default function SalesHistory() {
  const { data: sales = [], isLoading } = useQuery({ queryKey: ['sales'], queryFn: SalesAPI.getAll });
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = sales.filter(s =>
    (s.invoice || '').toLowerCase().includes(search.toLowerCase()) ||
    saleCustomer(s).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500 text-sm mt-0.5">{sales.length} invoices total</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice or customer..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">No sales found</div>
        ) : filtered.map(sale => {
          const isOpen = expanded === sale.id;
          return (
            <div key={sale.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : sale.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition text-left"
              >
                {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <span className="font-mono font-bold text-amber-600">{sale.invoice}</span>
                  <span className="text-slate-500">{fmt.datetime(sale.date)}</span>
                  <span className="font-medium text-slate-700">{saleCustomer(sale)}</span>
                  <span className="font-bold text-emerald-600 text-right">{RS}{Number(saleGrandTotal(sale)).toFixed(2)}</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium shrink-0">{salePaymentMode(sale)}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="text-left pb-2">Item</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Rate</th>
                        <th className="text-right pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(sale.items || []).map((item, i) => (
                        <tr key={i}>
                          <td className="py-1.5 text-slate-800">{item.name}</td>
                          <td className="py-1.5 text-center text-slate-600">{item.qty}</td>
                          <td className="py-1.5 text-right text-slate-600">{RS}{Number(item.rate).toFixed(2)}</td>
                          <td className="py-1.5 text-right font-semibold text-slate-800">{RS}{Number(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-end">
                    <div className="text-sm space-y-0.5 text-slate-600">
                      <div>Subtotal: <span className="font-medium">{RS}{Number(sale.subtotal).toFixed(2)}</span></div>
                      <div>GST: <span className="font-medium">{RS}{Number(sale.gst).toFixed(2)}</span></div>
                      <div className="text-base font-bold text-slate-800">Grand Total: {RS}{Number(saleGrandTotal(sale)).toFixed(2)}</div>
                    </div>
                    <button onClick={() => printInvoice(sale)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
