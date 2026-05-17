// src/pages/sales/sales-history.js
checkAuth();

async function renderSales(list) {
  if (!list) list = await SalesAPI.getAll();
  const container = document.getElementById('salesHistoryList');
  if (list.length === 0) {
    container.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-receipt text-4xl mb-3 block"></i>No sales records found.</div>`;
    return;
  }
  container.innerHTML = list.map(r => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50" onclick="toggleDetails('d-${r.id}')">
        <div>
          <span class="font-bold text-gray-800">${r.invoice}</span><span class="text-gray-400 mx-2">—</span><span class="text-gray-500 text-sm">${r.date}</span>
          <p class="text-gray-400 text-sm mt-0.5">Customer: ${r.customerName}</p>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-green-600 font-bold text-lg">${Formatters.currency(r.grandTotal)}</span>
          <button onclick="event.stopPropagation(); printSale(${r.id})" class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">
            <i class="fas fa-print mr-1"></i>Print
          </button>
        </div>
      </div>
      <div id="d-${r.id}" class="hidden border-t border-gray-100 px-6 py-4">
        <table class="w-full text-sm"><thead><tr class="text-gray-500 border-b"><th class="text-left pb-2">Item</th><th class="text-left pb-2">Qty</th><th class="text-left pb-2">Rate</th><th class="text-left pb-2">Amount</th></tr></thead>
        <tbody>${(r.items||[]).map(i=>`<tr class="border-b border-gray-50"><td class="py-2">${i.name}</td><td>${i.qty}</td><td>${Formatters.currency(i.rate)}</td><td>${Formatters.currency(i.amount)}</td></tr>`).join('')}</tbody></table>
        <div class="text-right mt-3 text-sm text-gray-600">
          <p>Subtotal: ${Formatters.currency(r.subtotal)}</p><p>GST: ${Formatters.currency(r.gst)}</p>
          <p class="text-base font-bold text-gray-800">Total: ${Formatters.currency(r.grandTotal)}</p>
        </div>
      </div>
    </div>`).join('');
}

function toggleDetails(id) { document.getElementById(id)?.classList.toggle('hidden'); }

async function filterSales() {
  const term = document.getElementById('salesSearch').value.toLowerCase().trim();
  const all  = await SalesAPI.getAll();
  renderSales(term ? all.filter(r => r.invoice.toLowerCase().includes(term) || r.customerName.toLowerCase().includes(term)) : all);
}

async function printSale(id) {
  const r = await SalesAPI.getById(id);
  if (!r) return alert('Record not found');
  const win = window.open('','_blank');
  win.document.write(`<html><head><title>${r.invoice}</title><style>body{font-family:Arial;padding:40px;}h2{color:#f59e0b;text-align:center;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{border:1px solid #aaa;padding:10px;}</style></head><body>
    <h2>SuperMart - Sales Invoice</h2><p><strong>Invoice:</strong> ${r.invoice}</p><p><strong>Date:</strong> ${r.date}</p><p><strong>Customer:</strong> ${r.customerName}</p><hr>
    <table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
    ${(r.items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.rate.toFixed(2)}</td><td>₹${i.amount.toFixed(2)}</td></tr>`).join('')}
    </table><div style="text-align:right">Subtotal: ₹${r.subtotal.toFixed(2)}<br>GST: ₹${r.gst.toFixed(2)}<br><strong>Total: ₹${r.grandTotal.toFixed(2)}</strong></div>
    <p style="text-align:center;margin-top:40px">Thank You!</p></body></html>`);
  win.document.close(); setTimeout(()=>win.print(),500);
}

renderSales();
