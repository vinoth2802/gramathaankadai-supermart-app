import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, Package, Users, ArrowUpRight, Store, Boxes, Clock, Monitor, Receipt, ArrowDownLeft } from 'lucide-react';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { ItemsAPI } from '../../api/items.js';
import { PartiesAPI } from '../../api/parties.js';
import { fmt } from '../../utils/formatters.js';

function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  const bgColorClass = color.replace('text-', 'bg-').replace('-600', '-50');
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start justify-between transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 cursor-pointer ${bgColorClass} hover:border-slate-300`}
    >
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        <Icon className={color} size={20} />
      </div>
    </div>
  );
}


export default function Dashboard() {
  const { data: sales = [] }     = useQuery({ queryKey: ['sales'],     queryFn: SalesAPI.getAll });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: PurchasesAPI.getAll });
  const { data: items = [] }     = useQuery({ queryKey: ['items'],     queryFn: ItemsAPI.getAll });
  const { data: parties = [] }   = useQuery({ queryKey: ['parties'],   queryFn: PartiesAPI.getAll });

  const today = fmt.today();
  const todaySales = sales.filter(s => (s.date || '').slice(0, 10) === today)
    .reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
  const todayPurchase = purchases.filter(p => (p.date || '').slice(0, 10) === today)
    .reduce((sum, p) => sum + Number(p.grand_total || 0), 0);
  const totalSales    = sales.reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
  const totalPurchase = purchases.reduce((sum, p) => sum + Number(p.grand_total || 0), 0);
  const totalStockValue = items.reduce((sum, i) => sum + Number(i.stock || 0) * Number(i.purchasePrice || i.salesPrice || 0), 0);
  const lowStock      = items.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const expiryStock   = items.filter(i => {
    if (!i.expiryDate) return false;
    const expiryDate = new Date(i.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }).length;
  const receivable = parties.reduce((sum, p) => sum + Number(p.balance || 0), 0);
  const payable    = parties.reduce((sum, p) => sum + Number(p.payable || 0), 0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Welcome back, {user.username || 'Admin'} —{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <Monitor size={13} /> Add POS Sale
          </button>
          <button onClick={() => navigate('/sales')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <Receipt size={13} /> Add Sale
          </button>
          <button onClick={() => navigate('/purchases/purchase')}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <ShoppingBag size={13} /> Add Purchase
          </button>
          <button onClick={() => navigate('/sales/paymentinmodal')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <ArrowDownLeft size={13} /> Add Payment In
          </button>
          <button onClick={() => navigate('/purchases/paymentoutmodal')}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <ArrowUpRight size={13} /> Add Payment Out
          </button>
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center ml-1">
            <Store className="text-amber-600" size={18} />
          </div>
        </div>
      </div>

      {/* Sales Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Sales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today's Sales" value={fmt.currency(todaySales)}  icon={TrendingUp}   color="text-emerald-600" onClick={() => navigate('/sales/history', { state: { initFilter: 'Today' } })} />
          <StatCard label="Total Sales"   value={fmt.currency(totalSales)}  icon={TrendingUp}   color="text-blue-600"    onClick={() => navigate('/sales/history', { state: { initFilter: 'This Year' } })} />
          <StatCard label="Receivable"    value={fmt.currency(receivable)}  icon={ArrowUpRight} color="text-rose-600"    sub="from customers" onClick={() => navigate('/parties')} />
        </div>
      </div>

      {/* Purchase Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Purchase</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today Purchase" value={fmt.currency(todayPurchase)} icon={ShoppingBag} color="text-orange-600" onClick={() => navigate('/purchases/history', { state: { initFilter: 'Today' } })} />
          <StatCard label="Total Purchase" value={fmt.currency(totalPurchase)} icon={ShoppingBag} color="text-purple-600" onClick={() => navigate('/purchases/history', { state: { initFilter: 'This Year' } })} />
          <StatCard label="Payable"        value={fmt.currency(payable)}       icon={Users}       color="text-indigo-600" sub="to suppliers" onClick={() => navigate('/parties')} />
        </div>
      </div>

      {/* Stock Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Low Stock"         value={lowStock}    icon={Package} color="text-amber-600" sub="items below reorder"    onClick={() => navigate('/items', { state: { initFilter: 'low' } })} />
          <StatCard label="Expiry Stock"      value={expiryStock} icon={Clock}   color="text-red-600"   sub="items expiring soon"    onClick={() => navigate('/items', { state: { initFilter: 'expiry' } })} />
          <StatCard label="Total Stock Value" value={fmt.currency(totalStockValue)} icon={Boxes} color="text-cyan-600" sub={`${items.length} items in inventory`} onClick={() => navigate('/items')} />
        </div>
      </div>

    </div>
  );
}