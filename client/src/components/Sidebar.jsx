import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog.jsx';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt,
  ShoppingBag, BarChart2, Settings, LogOut, Store, ChevronDown,
  FileText, MessageSquareQuote, HandCoins, RotateCcw,
  Truck, ArrowUpToLine, Undo2,
  Landmark, Building2, Wallet, FileCheck, TrendingDown, HardDrive, TrendingUp,
  Wrench, Upload, Download, QrCode,
  SlidersHorizontal, ArrowLeftRight, Printer, Percent, UserCog, Box, Ruler, Star, Gift, Trash2,
  Database, CreditCard, ClipboardList, BookOpen, History,
} from 'lucide-react';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos',       icon: ShoppingCart,    label: 'Point of Sale' },
  {
    icon: Database,
    label: 'Master',
    children: [
      { to: '/items',           icon: Package, label: 'Items' },
      { to: '/parties',         icon: Users,   label: 'Parties',       end: true },
      { to: '/parties/loyalty', icon: Gift,    label: 'Loyalty Points' },
    ],
  },
  {
    icon: Receipt,
    label: 'Sales',
    children: [
      { to: '/sales',            icon: Receipt,            label: 'Sales',         end: true },
      { to: '/sales/history',    icon: Receipt,            label: 'Sales History' },
      { to: '/sales/quotation',  icon: MessageSquareQuote, label: 'Estimate' },
      { to: '/sales/payment-in', icon: HandCoins,          label: 'Payment In' },
      { to: '/sales/return',     icon: RotateCcw,          label: 'Sale Return' },
    ],
  },
  {
    icon: ShoppingBag,
    label: 'Purchase',
    children: [
      { to: '/purchase',               icon: Truck,         label: 'Purchase' },
      { to: '/purchases/history',     icon: ShoppingBag,   label: 'Purchase History' },
      { to: '/purchases/payment-out', icon: ArrowUpToLine, label: 'Payment Out' },
      { to: '/purchases/return',      icon: Undo2,         label: 'Purchase Return' },
    ],
  },
  {
    icon: Landmark,
    label: 'Accounts',
    children: [
      { to: '/accounts/bank',         icon: Building2,   label: 'Bank Accounts' },
      { to: '/accounts/cash',         icon: Wallet,      label: 'Cash in Hand' },
      { to: '/accounts/cheques',      icon: FileCheck,   label: 'Cheques' },
      { to: '/accounts/loans',        icon: TrendingDown, label: 'Loan Accounts' },
      { to: '/accounts/fixed-assets',       icon: HardDrive,   label: 'Fixed Assets' },
      { to: '/accounts/capital-investment', icon: TrendingUp,  label: 'Capital Investment' },
      { to: '/accounts/payment-types',      icon: CreditCard,  label: 'Payment Types' },
    ],
  },
  { to: '/reports',  icon: BarChart2, label: 'Reports' },
  {
    icon: BookOpen,
    label: 'Day Cash Book',
    children: [
      { to: '/utilities/cashbook',         icon: BookOpen, label: 'Day Cash Book' },
      { to: '/utilities/cashbook-history', icon: History,  label: 'History' },
    ],
  },
  {
    icon: Wrench,
    label: 'Utilities',
    children: [
      { to: '/utilities/import-items',   icon: Upload,   label: 'Import Items' },
      { to: '/utilities/export-items',   icon: Download, label: 'Export Items' },
      { to: '/utilities/import-parties', icon: Upload,   label: 'Import Parties' },
      { to: '/utilities/export-parties', icon: Download, label: 'Export Parties' },
      { to: '/utilities/barcode',        icon: QrCode,   label: 'Barcode Generator' },
      { to: '/utilities/recycle-bin',    icon: Trash2,        label: 'Recycle Bin' },
      { to: '/utilities/log-register',   icon: ClipboardList, label: 'Log Register' },
    ],
  },
  {
    icon: Settings,
    label: 'Settings',
    children: [
      { to: '/settings/general',      icon: SlidersHorizontal, label: 'General' },
      { to: '/settings/transactions',  icon: ArrowLeftRight,    label: 'Transactions' },
      { to: '/settings/print',         icon: Printer,           label: 'Print' },
      { to: '/settings/taxes',         icon: Percent,           label: 'Taxes & GST' },
      { to: '/settings/party',         icon: UserCog,           label: 'Party' },
      { to: '/settings/item',          icon: Box,               label: 'Item' },
      { to: '/settings/unit',          icon: Ruler,             label: 'Unit' },
      { to: '/settings/loyalty',        icon: Star,              label: 'Loyalty Points' },
      { to: '/settings/user-management', icon: UserCog,           label: 'User Management' },
      { to: '/settings/reset',           icon: Trash2,            label: 'Reset Data' },
    ],
  },
];

function NavItem({ item, open, onToggle }) {
  const location = useLocation();
  const hasChildren = Boolean(item.children?.length);
  const isChildActive = hasChildren &&
    item.children.some(c => location.pathname.startsWith(c.to));
  const Icon = item.icon;

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        onClick={onToggle}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isActive
              ? 'bg-amber-500 text-white shadow-md shadow-amber-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`
        }
      >
        <Icon size={17} className="shrink-0" />
        <span className="flex-1">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isChildActive
            ? 'bg-slate-800 text-amber-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Icon size={17} className="shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-slate-700 space-y-0.5">
          {item.children.map(child => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.end ?? false}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <ChildIcon size={15} className="shrink-0" />
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const activeGroup = nav.find(
    item => item.children?.some(c => location.pathname.startsWith(c.to))
  )?.label ?? null;

  const [openGroup, setOpenGroup] = useState(activeGroup);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleToggle = (label) =>
    setOpenGroup(prev => (prev === label ? null : label));

  const doLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-30">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <Store className="text-white" size={18} />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Gramathaankadai</div>
            <div className="text-amber-400 text-xs font-medium">SuperMart</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item, i) => (
          <NavItem
            key={item.to ?? item.label ?? i}
            item={item}
            open={openGroup === item.label}
            onToggle={
              item.children
                ? () => handleToggle(item.label)
                : () => setOpenGroup(null)
            }
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {(user.username || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.username || 'Admin'}</div>
            <div className="text-slate-500 text-xs">Owner</div>
          </div>
        </div>
        <button
          onClick={() => setLogoutOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-sm transition"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        onConfirm={doLogout}
        onClose={() => setLogoutOpen(false)}
      />
    </aside>
  );
}
