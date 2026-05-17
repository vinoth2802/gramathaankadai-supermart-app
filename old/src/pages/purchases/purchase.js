// src/pages/purchases/purchase.js
checkAuth();
logAudit('PURCHASE_PAGE_OPENED', {});

let currentItems = [];

async function init() {
  document.getElementById('purchaseDate').value  = Formatters.today();
  document.getElementById('invoiceNumber').value = 'PUR-' + Date.now().toString().slice(-8);

  const [parties, items, modes] = await Promise.all([
    PartiesAPI.getAll(), ItemsAPI.getAll(), PaymentsAPI.getModes()
  ]);

  parties.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name}${p.phone?' ('+p.phone+')':''} [${p.type.toUpperCase()}]`;
    document.getElementById('partySelect').appendChild(opt);
  });

  const dl = document.getElementById('itemList');
  items.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.shortName || p.name || 'Unnamed';
    opt.dataset.id  = p.id;
    opt.dataset.uom = p.uom || 'PCS';
    dl.appendChild(opt);
  });

  modes.forEach(m => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = m.name;
    document.getElementById('purchasePaymentMode').appendChild(opt);
  });

  renderItems(); renderHistory();
}

function addItem() {
  const input = document.getElementById('itemSelect');
  const text  = input.value.trim();
  if (!text) return alert('Please select an item');
  const option = Array.from(document.getElementById('itemList').options).find(o => o.value === text);
  if (!option) return alert('Invalid item — select from the list');
  const qty = parseFloat(document.getElementById('purchaseQty').value) || 0;
  const rate = parseFloat(document.getElementById('purchaseRate').value) || 0;
  const gstRate = parseFloat(document.getElementById('gstRate').value) || 5;
  if (qty <= 0 || rate <= 0) return alert('Quantity and Rate must be > 0');
  currentItems.push({ id: parseInt(option.dataset.id), name: text, uom: option.dataset.uom||'PCS', qty, rate, gstRate, amount: qty * rate });
  renderItems(); updateTotal();
  input.value = ''; document.getElementById('purchaseQty').value = ''; document.getElementById('purchaseRate').value = '';
}

function removeItem(i) { currentItems.splice(i,1); renderItems(); updateTotal(); }

function renderItems() {
  const tbody = document.getElementById('purchaseItemsBody');
  tbody.innerHTML = currentItems.length === 0
    ? `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No items added yet.</td></tr>`
    : currentItems.map((item,i) => `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3 font-medium">${item.name}</td><td class="px-4 py-3 text-gray-500">${item.uom}</td>
          <td class="px-4 py-3">${item.qty}</td><td class="px-4 py-3">${Formatters.currency(item.rate)}</td>
          <td class="px-4 py-3">${item.gstRate}%</td><td class="px-4 py-3 font-semibold">${Formatters.currency(item.amount)}</td>
          <td class="px-4 py-3"><button onclick="removeItem(${i})" class="text-red-500 text-xl">×</button></td>
        </tr>`).join('');
}

function updateTotal() {
  document.getElementById('grandTotal').textContent = Formatters.currency(currentItems.reduce((s,i)=>s+i.amount,0));
}

function clearPurchase() { if(!confirm('Clear all items?')) return; currentItems=[]; renderItems(); updateTotal(); }

async function savePurchase() {
  if (currentItems.length === 0) return alert('Please add at least one item');
  const partyId = document.getElementById('partySelect').value;
  if (!partyId) return alert('Please select a supplier');
  const grandTotal = currentItems.reduce((s,i)=>s+i.amount,0);

  await PartiesAPI.updateBalance(partyId, grandTotal, 'payable');
  await Promise.all(currentItems.map(item => ItemsAPI.adjustStock(item.id, item.qty)));

  const party = await PartiesAPI.getById(partyId);
  await PurchasesAPI.create({
    date: new Date().toLocaleString('en-IN'),
    invoice: document.getElementById('invoiceNumber').value,
    partyName: party ? party.name : '—',
    grandTotal,
    paymentMode: document.getElementById('purchasePaymentMode').value || 'Cash'
  });

  logAudit('PURCHASE_SAVED', { amount: grandTotal });
  alert(`✅ Purchase Saved! Total: ${Formatters.currency(grandTotal)}`);
  currentItems = []; renderItems(); updateTotal(); renderHistory();
  document.getElementById('invoiceNumber').value = 'PUR-' + Date.now().toString().slice(-8);
}

async function renderHistory() {
  const history = await PurchasesAPI.getAll();
  document.getElementById('purchaseHistoryList').innerHTML = history.length === 0
    ? `<p class="text-center text-gray-400 py-8">No purchase records yet.</p>`
    : history.map(r => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 flex justify-between items-center">
          <div><span class="font-bold text-gray-800">${r.invoice}</span><span class="text-gray-400 mx-2">—</span><span class="text-gray-500 text-sm">${r.date}</span><p class="text-gray-400 text-sm">${r.partyName}</p></div>
          <span class="text-amber-600 font-bold text-lg">${Formatters.currency(r.grandTotal)}</span>
        </div>`).join('');
}

init();
