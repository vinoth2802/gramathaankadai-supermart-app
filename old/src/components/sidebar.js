// ============================================================
// src/components/sidebar.js
// Single source of truth: auth, sidebar, navigation, audit log.
// ============================================================

// ── Auth ─────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return 'A';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function checkAuth() {
  const user = Auth.getUser();
  if (!user.loggedIn) {
    window.location.replace('/index.html');
    return false;
  }
  const info = document.getElementById('user-info');
  if (info) {
    const displayName = user.displayName || user.username || 'Admin';
    const color = user.avatarColor || '#f59e0b';
    info.innerHTML = `
      <button onclick="openProfileModal()" class="flex items-center gap-2.5 hover:bg-slate-100 px-3 py-2 rounded-xl transition-all group">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm" style="background:${color}">
          ${getInitials(displayName)}
        </div>
        <div class="leading-tight text-left">
          <div class="text-slate-800 font-semibold text-sm">${displayName}</div>
          <div class="text-amber-600 text-xs font-medium">Administrator</div>
        </div>
        <i class="fas fa-chevron-down text-slate-400 text-xs ml-1 group-hover:text-slate-600"></i>
      </button>`;
  }
  return true;
}

function secureLogout() {
  if (confirm('Are you sure you want to logout?')) {
    logAudit('USER_LOGOUT', { reason: 'manual' });
    Auth.clearUser();
    window.location.replace('/index.html');
  }
}

// ── Navigation ───────────────────────────────────────────────
function navigateTo(path) {
  window.location.href = path;
}

// ── Audit Log ────────────────────────────────────────────────
function logAudit(action, details = {}) {
  const user = Auth.getUser();
  APIClient.post('/auditLog', {
    timestamp: new Date().toISOString(),
    user: user.username || 'admin',
    action,
    details
  }).catch(() => {});
}

// ── Path helpers ──────────────────────────────────────────────
function p(rel)    { return '/src/pages/' + rel; }
function uc(label) { return '/src/pages/under-construction.html?page=' + encodeURIComponent(label); }

// ── Sidebar HTML ─────────────────────────────────────────────
function insertSidebar() {
  const html = `
  <aside class="fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 flex flex-col z-50 overflow-y-auto">

    <!-- Brand -->
    <div class="px-5 py-5 border-b border-slate-700/60">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <i class="fas fa-store text-white text-base"></i>
        </div>
        <div>
          <h1 class="text-white text-base font-bold leading-none tracking-wide">SuperMart</h1>
          <p class="text-slate-500 text-xs mt-0.5">Gramathaankadai</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 py-3 px-2">

      <!-- Main Menu -->
      <p class="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 mt-1">Main Menu</p>
      <ul class="space-y-0.5">

        <li>
          <a onclick="navigateTo('${p('dashboard/dashboard.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="dashboard">
            <i class="fas fa-home w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">Dashboard</span>
          </a>
        </li>

        <li>
          <a onclick="navigateTo('${p('pos/pos.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="pos">
            <i class="fas fa-cash-register w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">POS / Billing</span>
          </a>
        </li>

        <li>
          <a onclick="navigateTo('${p('purchases/purchase.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="purchase">
            <i class="fas fa-truck w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">Purchase</span>
          </a>
        </li>

        <li>
          <a onclick="navigateTo('${p('inventory/inventory.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="inventory">
            <i class="fas fa-boxes-stacked w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">Inventory</span>
          </a>
        </li>

        <li>
          <a onclick="navigateTo('${p('parties/parties.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="parties">
            <i class="fas fa-users w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">Parties</span>
          </a>
        </li>

        <li>
          <a onclick="navigateTo('${p('sales/sales-history.html')}')"
             class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
             data-page="sales-history">
            <i class="fas fa-chart-line w-4 text-base text-slate-500"></i>
            <span class="text-sm font-medium">Sales History</span>
          </a>
        </li>

      </ul>

      <!-- Reports & Data -->
      <p class="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 mt-4">Analytics</p>
      <ul class="space-y-0.5">

        <li>
          <button onclick="toggleSubmenu('reportsMenu')"
                  class="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
                  data-page="reports">
            <i class="fas fa-chart-bar w-4 text-base text-slate-500"></i>
            <span class="flex-1 text-left text-sm font-medium">Reports</span>
            <i class="fas fa-chevron-down text-[10px] text-slate-600 transition-transform duration-300" id="reportsArrow"></i>
          </button>
          <ul id="reportsMenu" class="hidden bg-slate-950/40 rounded-lg mx-1 mt-0.5 overflow-hidden">
            <li><a onclick="navigateTo('${p('reports/reports.html')}')"              class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-file-alt w-3"></i>Summary Report</a></li>
            <li><a onclick="navigateTo('${p('sales/sales-report.html')}')"           class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-shopping-bag w-3"></i>Sales Report</a></li>
            <li><a onclick="navigateTo('${p('purchases/purchase-report.html')}')"    class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-truck w-3"></i>Purchase Report</a></li>
            <li><a onclick="navigateTo('${p('parties/party-report.html')}')"         class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-users w-3"></i>Party Report</a></li>
            <li><a onclick="navigateTo('${p('reports/gstr1.html')}')"                class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-receipt w-3"></i>GSTR-1</a></li>
            <li><a onclick="navigateTo('${p('reports/gstr3b.html')}')"               class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-receipt w-3"></i>GSTR-3B</a></li>
            <li><a onclick="navigateTo('${p('reports/daily-sales-summary.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-calendar-day w-3"></i>Daily Summary</a></li>
          </ul>
        </li>

        <!-- Accounts -->
        <li>
          <button onclick="toggleSubmenu('accountsMenu')"
                  class="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
                  data-page="accounts">
            <i class="fas fa-wallet w-4 text-base text-slate-500"></i>
            <span class="flex-1 text-left text-sm font-medium">Accounts</span>
            <i class="fas fa-chevron-down text-[10px] text-slate-600 transition-transform duration-300" id="accountsArrow"></i>
          </button>
          <ul id="accountsMenu" class="hidden bg-slate-950/40 rounded-lg mx-1 mt-0.5 overflow-hidden">
            <li><a onclick="navigateTo('${p('payments/payment-in.html')}')"     class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-arrow-down w-3 text-emerald-500"></i>Payment In</a></li>
            <li><a onclick="navigateTo('${p('payments/payment-out.html')}')"    class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-arrow-up w-3 text-rose-500"></i>Payment Out</a></li>
            <li><a onclick="navigateTo('${p('payments/payment-mode.html')}')"   class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-credit-card w-3"></i>Payment Modes</a></li>
            <li><a onclick="navigateTo('${p('accounts/cash-in-hand.html')}')"   class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-money-bill w-3"></i>Cash in Hand</a></li>
            <li><a onclick="navigateTo('${p('accounts/bank-accounts.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-building-columns w-3"></i>Bank Accounts</a></li>
            <li><a onclick="navigateTo('${p('accounts/cheques.html')}')"        class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-file-invoice w-3"></i>Cheques</a></li>
            <li><a onclick="navigateTo('${p('accounts/loan-accounts.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-hand-holding-dollar w-3"></i>Loan Accounts</a></li>
          </ul>
        </li>

      </ul>

      <!-- Tools -->
      <p class="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 mt-4">Tools</p>
      <ul class="space-y-0.5">

        <li>
          <button onclick="toggleSubmenu('utilityMenu')"
                  class="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent">
            <i class="fas fa-wrench w-4 text-base text-slate-500"></i>
            <span class="flex-1 text-left text-sm font-medium">Utility</span>
            <i class="fas fa-chevron-down text-[10px] text-slate-600 transition-transform duration-300" id="utilityArrow"></i>
          </button>
          <ul id="utilityMenu" class="hidden bg-slate-950/40 rounded-lg mx-1 mt-0.5 overflow-hidden">
            <li><a onclick="navigateTo('${p('import-export/import-items.html')}')"    class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-upload w-3"></i>Import Items</a></li>
            <li><a onclick="navigateTo('${p('import-export/export-items.html')}')"    class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-download w-3"></i>Export Items</a></li>
            <li><a onclick="navigateTo('${p('import-export/import-parties.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-upload w-3"></i>Import Parties</a></li>
            <li><a onclick="navigateTo('${p('import-export/export-parties.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-download w-3"></i>Export Parties</a></li>
            <li><a onclick="navigateTo('${p('inventory/stock-check.html')}')"         class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-clipboard-check w-3"></i>Stock Check</a></li>
          </ul>
        </li>

      </ul>

      <!-- System -->
      <p class="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 mt-4">System</p>
      <ul class="space-y-0.5">

        <li>
          <button onclick="toggleSubmenu('settingsMenu')"
                  class="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
                  data-page="settings">
            <i class="fas fa-gear w-4 text-base text-slate-500"></i>
            <span class="flex-1 text-left text-sm font-medium">Settings</span>
            <i class="fas fa-chevron-down text-[10px] text-slate-600 transition-transform duration-300" id="settingsArrow"></i>
          </button>
          <ul id="settingsMenu" class="hidden bg-slate-950/40 rounded-lg mx-1 mt-0.5 overflow-hidden">
            <li><a onclick="navigateTo('${p('settings/settings.html')}')"              class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-sliders w-3"></i>General</a></li>
            <li><a onclick="navigateTo('${p('settings/settings-transaction.html')}')"  class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-exchange-alt w-3"></i>Transaction</a></li>
            <li><a onclick="navigateTo('${p('settings/settings-taxes.html')}')"        class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-percent w-3"></i>Taxes</a></li>
            <li><a onclick="navigateTo('${p('settings/settings-party.html')}')"        class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-users w-3"></i>Party</a></li>
            <li><a onclick="navigateTo('${p('settings/settings-item.html')}')"         class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-box w-3"></i>Item</a></li>
            <li><a onclick="navigateTo('${p('settings/settings-uom.html')}')"          class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-ruler w-3"></i>UOM</a></li>
            <li><a onclick="navigateTo('${p('settings/audit-log.html')}')"             class="flex items-center gap-2 px-4 py-2 pl-10 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 cursor-pointer transition-all"><i class="fas fa-shield-alt w-3"></i>Audit Log</a></li>
          </ul>
        </li>

      </ul>
    </nav>

    <!-- User profile footer -->
    <div class="px-3 pb-3 pt-2 border-t border-slate-700/60 mt-auto">
      <button onclick="openProfileModal()"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-all group mb-1">
        <div id="sidebarAvatar"
             class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
        </div>
        <div class="flex-1 text-left overflow-hidden">
          <div id="sidebarName" class="text-slate-200 text-sm font-semibold leading-none truncate"></div>
          <div class="text-slate-500 text-xs mt-0.5">Administrator</div>
        </div>
        <i class="fas fa-pen-to-square text-slate-600 group-hover:text-amber-400 text-xs transition-colors"></i>
      </button>
      <button onclick="secureLogout()"
              class="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
        <i class="fas fa-right-from-bracket w-4 text-sm"></i>
        <span class="text-sm font-medium">Logout</span>
      </button>
    </div>
  </aside>`;

  const container = document.getElementById('sidebar-container');
  if (container) { container.innerHTML = html; setActiveMenu(); }
}

function toggleSubmenu(menuId) {
  const menu  = document.getElementById(menuId);
  const arrow = document.getElementById(menuId.replace('Menu', 'Arrow'));
  if (!menu) return;
  const isOpen = !menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function setActiveMenu() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const map = {
    'dashboard.html':           ['dashboard'],
    'pos.html':                 ['pos'],
    'purchase.html':            ['purchase'],
    'inventory.html':           ['inventory'],
    'stock-check.html':         ['inventory'],
    'parties.html':             ['parties'],
    'sales-history.html':       ['sales-history'],
    'reports.html':             ['reports','reportsMenu'],
    'sales-report.html':        ['reports','reportsMenu'],
    'purchase-report.html':     ['reports','reportsMenu'],
    'party-report.html':        ['reports','reportsMenu'],
    'gstr1.html':               ['reports','reportsMenu'],
    'gstr3b.html':              ['reports','reportsMenu'],
    'daily-sales-summary.html': ['reports','reportsMenu'],
    'payment-in.html':          ['accounts','accountsMenu'],
    'payment-out.html':         ['accounts','accountsMenu'],
    'payment-mode.html':        ['accounts','accountsMenu'],
    'cash-in-hand.html':        ['accounts','accountsMenu'],
    'bank-accounts.html':       ['accounts','accountsMenu'],
    'cheques.html':             ['accounts','accountsMenu'],
    'loan-accounts.html':       ['accounts','accountsMenu'],
    'settings.html':            ['settings','settingsMenu'],
    'settings-transaction.html':['settings','settingsMenu'],
    'settings-taxes.html':      ['settings','settingsMenu'],
    'settings-party.html':      ['settings','settingsMenu'],
    'settings-item.html':       ['settings','settingsMenu'],
    'settings-uom.html':        ['settings','settingsMenu'],
    'audit-log.html':           ['settings','settingsMenu'],
    'import-items.html':        ['utilityMenu'],
    'export-items.html':        ['utilityMenu'],
    'import-parties.html':      ['utilityMenu'],
    'export-parties.html':      ['utilityMenu'],
  };

  const targets = map[page] || [];
  document.querySelectorAll('.sidebar-link').forEach(el => {
    if (targets.includes(el.dataset.page)) {
      el.classList.add('bg-amber-500/10','text-amber-400','border-amber-500','font-semibold');
      el.classList.remove('border-transparent');
    }
  });
  targets.filter(t => t.endsWith('Menu')).forEach(id => {
    const m = document.getElementById(id);
    const a = document.getElementById(id.replace('Menu','Arrow'));
    if (m) { m.classList.remove('hidden'); if (a) a.style.transform = 'rotate(180deg)'; }
  });
}

// ── Profile modal ─────────────────────────────────────────────
const AVATAR_COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899'];

function renderSidebarAvatar() {
  const user = Auth.getUser();
  const displayName = user.displayName || user.username || 'Admin';
  const color = user.avatarColor || AVATAR_COLORS[0];
  const el = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarName');
  if (el) { el.style.background = color; el.textContent = getInitials(displayName); }
  if (nameEl) nameEl.textContent = displayName;
}

function openProfileModal() {
  const user = Auth.getUser();
  document.getElementById('profileDisplayName').value = user.displayName || user.username || '';
  document.getElementById('profileStoreName').value   = user.storeName  || 'Gramathaankadai';
  document.getElementById('profilePhone').value       = user.phone      || '';
  document.getElementById('profileEmail').value       = user.email      || '';
  document.getElementById('profileUsername').textContent = user.username || 'admin';
  // render avatar preview
  renderProfileAvatar(user.avatarColor || AVATAR_COLORS[0], user.displayName || user.username || 'Admin');
  // render color swatches
  const swatchContainer = document.getElementById('avatarColorSwatches');
  swatchContainer.innerHTML = AVATAR_COLORS.map(c => `
    <button onclick="selectAvatarColor('${c}')"
            data-color="${c}"
            class="w-7 h-7 rounded-full transition-all ${(user.avatarColor||AVATAR_COLORS[0])===c ? 'ring-2 ring-offset-2 ring-slate-600 scale-110' : 'opacity-70 hover:opacity-100'}"
            style="background:${c}"></button>`).join('');
  document.getElementById('profileModal').classList.remove('hidden');
}

function renderProfileAvatar(color, name) {
  const av = document.getElementById('profileAvatarCircle');
  if (av) { av.style.background = color; av.textContent = getInitials(name); }
}

function selectAvatarColor(color) {
  document.querySelectorAll('#avatarColorSwatches button').forEach(b => {
    const active = b.dataset.color === color;
    b.classList.toggle('ring-2',        active);
    b.classList.toggle('ring-offset-2', active);
    b.classList.toggle('ring-slate-600',active);
    b.classList.toggle('scale-110',     active);
    b.classList.toggle('opacity-70',    !active);
    b.classList.toggle('hover:opacity-100', !active);
  });
  const name = document.getElementById('profileDisplayName').value || Auth.getUser().username || 'Admin';
  renderProfileAvatar(color, name);
}

function saveProfile() {
  const user = Auth.getUser();
  const selectedColor = document.querySelector('#avatarColorSwatches button.ring-2')?.dataset.color || user.avatarColor || AVATAR_COLORS[0];
  user.displayName  = document.getElementById('profileDisplayName').value.trim() || user.username;
  user.storeName    = document.getElementById('profileStoreName').value.trim();
  user.phone        = document.getElementById('profilePhone').value.trim();
  user.email        = document.getElementById('profileEmail').value.trim();
  user.avatarColor  = selectedColor;
  Auth.setUser(user);
  // refresh sidebar avatar + all user-info blocks
  renderSidebarAvatar();
  checkAuth();
  document.getElementById('profileModal').classList.add('hidden');
}

function injectProfileModal() {
  if (document.getElementById('profileModal')) return;
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] hidden';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

      <!-- Header with avatar inside -->
      <div class="bg-gradient-to-br from-slate-800 to-slate-700 px-6 py-5 relative">
        <button onclick="document.getElementById('profileModal').classList.add('hidden')"
                class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition">
          <i class="fas fa-times"></i>
        </button>
        <div class="flex items-center gap-4">
          <div id="profileAvatarCircle"
               class="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg"
               style="background:#f59e0b">A</div>
          <div>
            <p class="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-0.5">Logged in as</p>
            <p id="profileUsername" class="text-white font-bold text-lg leading-tight"></p>
            <p class="text-amber-400 text-xs font-medium mt-0.5">Administrator</p>
          </div>
        </div>
      </div>

      <!-- Color swatches -->
      <div class="px-6 pt-3 pb-4 border-b border-slate-100">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Avatar Color</p>
        <div id="avatarColorSwatches" class="flex gap-2 flex-wrap"></div>
      </div>

      <!-- Form fields -->
      <div class="px-6 py-5 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Display Name</label>
          <input id="profileDisplayName" type="text" placeholder="Your name"
                 oninput="renderProfileAvatar(document.querySelector('#avatarColorSwatches button.ring-2')?.dataset.color||'#f59e0b', this.value)"
                 class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Store Name</label>
          <input id="profileStoreName" type="text" placeholder="Store name"
                 class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input id="profilePhone" type="tel" placeholder="9876543210"
                   class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input id="profileEmail" type="email" placeholder="you@email.com"
                   class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
          </div>
        </div>
        <div class="flex gap-3 pt-1">
          <button onclick="saveProfile()"
                  class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2">
            <i class="fas fa-save"></i> Save Profile
          </button>
          <button onclick="document.getElementById('profileModal').classList.add('hidden')"
                  class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', () => {
  insertSidebar();
  injectProfileModal();
  renderSidebarAvatar();
  const page = window.location.pathname.split('/').pop() || 'unknown';
  logAudit('PAGE_VISIT', { page });
});

window.checkAuth          = checkAuth;
window.secureLogout       = secureLogout;
window.navigateTo         = navigateTo;
window.logAudit           = logAudit;
window.toggleSubmenu      = toggleSubmenu;
window.openProfileModal   = openProfileModal;
window.saveProfile        = saveProfile;
window.selectAvatarColor  = selectAvatarColor;
window.renderProfileAvatar = renderProfileAvatar;
