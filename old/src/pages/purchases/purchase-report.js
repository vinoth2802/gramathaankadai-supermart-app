// ============================================================
// src/pages/purchases/purchase-report.js
// ============================================================

checkAuth();

let allPurchases = PurchasesAPI.getAll();

function getDefaultDates() {
  document.getElementById('fromDate').value = Formatters.daysAgo(30);
  document.getElementById('toDate').value   = Formatters.today();
}

function applyFilter() {
  const from = new Date(document.getElementById('fromDate').value);
  const to   = new Date(document.getElementById('toDate').value);

  const filtered = PurchasesAPI.getByDateRange(from, to);
  const total    = filtered.reduce((s, r) => s + (r.grandTotal || 0), 0);

  document.getElementById('purchaseTotal').textContent = Formatters.currency(total);

  document.getElementById('purchaseTable').innerHTML = filtered.map(p => `
    <tr class="hover:bg-gray-50 border-b border-gray-100">
      <td class="px-5 py-3.5 text-gray-500 text-sm">${p.date}</td>
      <td class="px-5 py-3.5 font-medium">${p.invoice}</td>
      <td class="px-5 py-3.5 text-gray-600">${p.partyName || '—'}</td>
      <td class="px-5 py-3.5 text-gray-500">${p.paymentMode || 'Cash'}</td>
      <td class="px-5 py-3.5 font-semibold text-amber-600">${Formatters.currency(p.grandTotal)}</td>
    </tr>`).join('');
}

function resetFilter() {
  getDefaultDates();
  applyFilter();
}

getDefaultDates();
applyFilter();
