// src/pages/parties/party-report.js
checkAuth();

async function renderReport() {
  const parties = await PartiesAPI.getAll();
  let totalReceivable = 0, totalPayable = 0;

  document.getElementById('partyReportBody').innerHTML = parties.map(p => {
    const recv = Math.max(p.balance || 0, 0);
    const pay  = Math.max(p.payable || 0, 0);
    const net  = recv - pay;
    totalReceivable += recv; totalPayable += pay;
    const typeBadge = { customer:'bg-blue-100 text-blue-700', supplier:'bg-amber-100 text-amber-700', both:'bg-purple-100 text-purple-700' }[p.type] || '';
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-5 py-3.5 font-medium text-gray-800">${p.name}</td>
        <td class="px-5 py-3.5 text-gray-500">${p.phone || '—'}</td>
        <td class="px-5 py-3.5"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge}">${p.type.toUpperCase()}</span></td>
        <td class="px-5 py-3.5 text-green-600 font-semibold">${Formatters.currency(recv)}</td>
        <td class="px-5 py-3.5 text-red-500 font-semibold">${Formatters.currency(pay)}</td>
        <td class="px-5 py-3.5 font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}">${Formatters.currency(Math.abs(net))} ${net >= 0 ? 'Dr' : 'Cr'}</td>
      </tr>`;
  }).join('');

  const net = totalReceivable - totalPayable;
  document.getElementById('totalParties').textContent    = parties.length;
  document.getElementById('totalReceivable').textContent = Formatters.currency(totalReceivable);
  document.getElementById('totalPayable').textContent    = Formatters.currency(totalPayable);
  document.getElementById('netPosition').textContent     = Formatters.currency(Math.abs(net));
  document.getElementById('netPosition').className       = `text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`;
}

renderReport();
