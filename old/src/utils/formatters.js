// src/utils/formatters.js — pure formatting helpers, no dependencies
const Formatters = {
  currency(amount, decimals = 2) {
    return '₹ ' + (parseFloat(amount)||0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },
  date(input) { const d = input instanceof Date ? input : new Date(input); return isNaN(d) ? '—' : d.toLocaleDateString('en-IN'); },
  datetime(input) { const d = input instanceof Date ? input : new Date(input); return isNaN(d) ? '—' : d.toLocaleString('en-IN'); },
  today() { return new Date().toISOString().split('T')[0]; },
  daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; },
  truncate(str, len=30) { if (!str) return '—'; return str.length > len ? str.slice(0,len)+'…' : str; }
};
window.Formatters = Formatters;
