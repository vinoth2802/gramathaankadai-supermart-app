import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingBag, Package, Users, ArrowUpRight, Store, Boxes, Clock } from 'lucide-react';
import { SalesAPI } from '../../api/sales.js';
import { PurchasesAPI } from '../../api/purchases.js';
import { ItemsAPI } from '../../api/items.js';
import { PartiesAPI } from '../../api/parties.js';
import { fmt } from '../../utils/formatters.js';

function StatCard({ label, value, icon: Icon, color, sub }) {
  const bgColorClass = color.replace('text-', 'bg-').replace('-600', '-50');
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start justify-between transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 cursor-pointer ${bgColorClass} hover:bg-green-50 hover:border-slate-300`}>
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

function last6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    months.push({ label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function buildChartData(sales, purchases) {
  return last6Months().map(({ label, year, month }) => {
    const s = (sales || []).filter(x => {
      const d = new Date(x.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).reduce((sum, x) => sum + Number(x.grand_total || 0), 0);
    const p = (purchases || []).filter(x => {
      const d = new Date(x.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).reduce((sum, x) => sum + Number(x.grand_total || 0), 0);
    return { month: label, Sales: Math.round(s), Purchases: Math.round(p) };
  });
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
  const totalStock    = items.reduce((sum, i) => sum + Number(i.stock || 0), 0);
  const lowStock      = items.filter(i => Number(i.stock || 0) <= Number(i.reorderLevel || 10)).length;
  const expiryStock   = items.filter(i => {
    if (!i.expiryDate) return false;
    const expiryDate = new Date(i.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }).length;
  const receivable    = parties.reduce((sum, p) => sum + Number(p.balance || 0), 0);
  const payable       = parties.reduce((sum, p) => sum + Number(p.payable || 0), 0);

  const chartData = buildChartData(sales, purchases);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user.username || 'Admin'} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Store className="text-amber-600" size={20} />
        </div>
      </div>

      {/* Stats */}
      {/* Sales Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Sales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today's Sales"   value={fmt.currency(todaySales)}  icon={TrendingUp}  color="text-emerald-600" />
          <StatCard label="Total Sales"     value={fmt.currency(totalSales)}   icon={TrendingUp}  color="text-blue-600" />
          <StatCard label="Receivable"      value={fmt.currency(receivable)}   icon={ArrowUpRight} color="text-rose-600" sub="from customers" />
        </div>
      </div>

      {/* Purchase Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Purchase</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today Purchase"  value={fmt.currency(todayPurchase)} icon={ShoppingBag} color="text-orange-600" />
          <StatCard label="Total Purchase"  value={fmt.currency(totalPurchase)} icon={ShoppingBag} color="text-purple-600" />
          <StatCard label="Payable"         value={fmt.currency(payable)}      icon={Users}       color="text-indigo-600" sub="to suppliers" />
        </div>
      </div>

      {/* Stock Segment */}
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Low Stock"       value={lowStock}                   icon={Package}     color="text-amber-600" sub="items below reorder" />
          <StatCard label="Expiry Stock"    value={expiryStock}                icon={Clock}       color="text-red-600" sub="items expiring soon" />
          <StatCard label="Total Stock"     value={totalStock}                 icon={Boxes}       color="text-cyan-600" sub="items in inventory" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4">Sales Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={v => fmt.currency(v)} />
              <Line type="monotone" dataKey="Sales" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4">Sales vs Purchase (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={v => fmt.currency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Sales"     fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Purchases" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
