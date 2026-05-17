// src/pages/sales/sales-report.js
checkAuth();

function setDefaultDates() {
  document.getElementById('fromDate').value = Formatters.daysAgo(30);
  document.getElementById('toDate').value   = Formatters.today();
}

async function applyFilter() {
  const from = new Date(document.getElementById('fromDate').value || '2000-01-01');
  const to   = new Date(document.getElementById('toDate').value   || new Date());
  to.setHours(23,59,59);
  const filtered = await SalesAPI.getByDateRange(from, to);
  const total    = filtered.reduce((s,r) => s + (r.grandTotal||0), 0);
  document.getElementById('salesTotal').textContent = Formatters.currency(total);
  const tbody = document.getElementById('salesTable');
  tbody.innerHTML = filtered.length === 0
    ? `<tr><td colspan="5" class="px-4 py-10 text-center text-gray-400">No sales in this period.</td></tr>`
    : filtered.map(s => `<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm text-gray-600">${s.date}</td><td class="px-4 py-3 font-medium">${s.invoice}</td><td class="px-4 py-3 text-gray-600">${s.customerName}</td><td class="px-4 py-3 text-gray-500">${s.paymentMode||'Cash'}</td><td class="px-4 py-3 font-semibold text-green-600">${Formatters.currency(s.grandTotal)}</td></tr>`).join('');
}

function resetFilter() { setDefaultDates(); applyFilter(); }
setDefaultDates(); applyFilter();
