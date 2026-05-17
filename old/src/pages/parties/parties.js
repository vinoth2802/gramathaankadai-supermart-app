// ============================================================
// src/pages/parties/parties.js
// ============================================================

checkAuth();

async function renderParties(list) {
  if (!list) list = await PartiesAPI.getAll();
  const tbody = document.getElementById('partiesBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-12 text-center text-gray-400">No parties found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(party => {
    const balance = party.balance || 0;
    const payable = party.payable || 0;
    const balanceLabel = balance > 0
      ? `<span class="text-red-500 font-semibold">${Formatters.currency(balance)} Dr</span>`
      : balance < 0 ? `<span class="text-green-600 font-semibold">${Formatters.currency(Math.abs(balance))} Cr</span>`
      : `<span class="text-gray-400">—</span>`;
    const typeBadge = { customer:'bg-blue-100 text-blue-700', supplier:'bg-amber-100 text-amber-700', both:'bg-purple-100 text-purple-700' }[party.type] || 'bg-gray-100 text-gray-600';
    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-5 py-3.5 font-medium text-gray-800">${party.name}</td>
        <td class="px-5 py-3.5 text-gray-500">${party.phone || '—'}</td>
        <td class="px-5 py-3.5">${balanceLabel}</td>
        <td class="px-5 py-3.5">${payable > 0 ? `<span class="text-red-500 font-semibold">${Formatters.currency(payable)}</span>` : '<span class="text-gray-400">—</span>'}</td>
        <td class="px-5 py-3.5"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge}">${party.type.toUpperCase()}</span></td>
        <td class="px-5 py-3.5 text-gray-500 text-sm">${party.lastSale || '—'}</td>
        <td class="px-5 py-3.5">
          <button onclick="editParty(${party.id})" class="text-sm text-blue-600 hover:underline mr-3">Edit</button>
          <button onclick="deleteParty(${party.id})" class="text-sm text-red-500 hover:underline">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

function showAddModal() {
  document.getElementById('modalTitle').textContent = 'Add New Party';
  document.getElementById('partyForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('custBalance').value = '0';
  document.getElementById('custPayable').value  = '0';
  document.getElementById('partyModal').classList.remove('hidden');
}

function hideModal() { document.getElementById('partyModal').classList.add('hidden'); }

async function editParty(id) {
  const party = await PartiesAPI.getById(id);
  if (!party) return;
  document.getElementById('modalTitle').textContent = 'Edit Party';
  document.getElementById('editId').value    = party.id;
  document.getElementById('custName').value  = party.name;
  document.getElementById('custPhone').value = party.phone  || '';
  document.getElementById('custBalance').value = party.balance || 0;
  document.getElementById('custPayable').value  = party.payable || 0;
  document.getElementById('custType').value  = party.type   || 'customer';
  document.getElementById('custNotes').value = party.notes  || '';
  document.getElementById('partyModal').classList.remove('hidden');
}

async function deleteParty(id) {
  if (!confirm('Delete this party?')) return;
  await PartiesAPI.delete(id);
  logAudit('PARTY_DELETED', { id });
  renderParties();
}

document.getElementById('partyForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const editId  = document.getElementById('editId').value;
  const name    = document.getElementById('custName').value.trim();
  if (!name) return alert('Party name is required');

  const party = {
    name, phone:   document.getElementById('custPhone').value.trim(),
    balance: Number(document.getElementById('custBalance').value) || 0,
    payable:  Number(document.getElementById('custPayable').value)  || 0,
    type:    document.getElementById('custType').value,
    notes:   document.getElementById('custNotes').value.trim(),
    lastSale: ''
  };
  if (editId) party.id = parseInt(editId);

  await PartiesAPI.save(party);
  logAudit(editId ? 'PARTY_UPDATED' : 'PARTY_CREATED', { name });
  renderParties();
  hideModal();
});

async function filterParties() {
  const term = document.getElementById('searchParty').value.toLowerCase().trim();
  const all  = await PartiesAPI.getAll();
  renderParties(term ? all.filter(p => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term))) : all);
}

renderParties();
