// ============================================================
// src/pages/dashboard/dashboard.js
// ============================================================

checkAuth();

const _user = Auth.getUser();
if (!_user.loginAt) {
  _user.loginAt = new Date().toISOString();
  Auth.setUser(_user);
}
const loginTime = new Date(_user.loginAt);
document.getElementById('loginTimeDisplay').textContent = Formatters.datetime(loginTime);

setInterval(() => {
  const diff = Date.now() - loginTime;
  const h = String(Math.floor(diff / 3600000)).padStart(2,'0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
  document.getElementById('runningTime').textContent = `${h}:${m}:${s}`;
}, 1000);

async function loadDashboard() {
  // APIs are globals loaded via <script> tags in dashboard.html
  const [parties, allSales, allPurchases, todaySales, lowStock, reorderItems] =
    await Promise.all([
      PartiesAPI.getAll(),
      SalesAPI.getAll(),
      PurchasesAPI.getAll(),
      SalesAPI.getTodayTotal(),
      ItemsAPI.getLowStock(5),
      ItemsAPI.getReorderAlerts()
    ]);

  const totalSales    = allSales.reduce((s, r) => s + (r.grandTotal || 0), 0);
  const totalPurchase = allPurchases.reduce((s, r) => s + (r.grandTotal || 0), 0);
  const receivable    = parties.reduce((s, p) => s + Math.max(p.balance || 0, 0), 0);
  const payable       = parties.reduce((s, p) => s + Math.max(p.payable || 0, 0), 0);

  document.getElementById('today-sales').textContent    = Formatters.currency(todaySales);
  document.getElementById('total-sales').textContent    = Formatters.currency(totalSales);
  document.getElementById('total-purchase').textContent = Formatters.currency(totalPurchase);
  document.getElementById('receivable').textContent     = Formatters.currency(receivable);
  document.getElementById('payable').textContent        = Formatters.currency(payable);
  document.getElementById('low-stock').textContent      = `${lowStock.length} items`;
  document.getElementById('reorder-alerts').textContent = `${reorderItems.length} items`;

  const u = Auth.getUser();
  const el = document.getElementById('welcomeUser');
  if (el) el.textContent = u.username || 'Admin';

  // Build last 6 months labels and monthly totals
  const monthLabels = [];
  const monthlySales = [];
  const monthlyPurchases = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthLabels.push(d.toLocaleString('default', { month: 'short' }));
    monthlySales.push(
      allSales.filter(s => s.date && s.date.startsWith(key))
              .reduce((sum, s) => sum + (s.grandTotal || 0), 0)
    );
    monthlyPurchases.push(
      allPurchases.filter(p => p.date && p.date.startsWith(key))
                  .reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    );
  }

  new Chart(document.getElementById('salesTrendChart'), {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Sales ₹',
        data: monthlySales,
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
        tension: 0.4, fill: true, pointBackgroundColor: '#10b981', pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } } }
    }
  });

  new Chart(document.getElementById('salesVsPurchaseChart'), {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        { label: 'Sales',    data: monthlySales,    backgroundColor: 'rgba(16,185,129,0.8)',  borderRadius: 4 },
        { label: 'Purchase', data: monthlyPurchases, backgroundColor: 'rgba(245,158,11,0.8)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } } }
    }
  });
}

loadDashboard();
