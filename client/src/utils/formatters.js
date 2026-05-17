export const fmt = {
  currency: (amount = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount),

  date: (input) => input ? new Date(input).toLocaleDateString('en-IN') : '—',

  datetime: (input) => input ? new Date(input).toLocaleString('en-IN') : '—',

  today: () => new Date().toISOString().split('T')[0],

  daysAgo: (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  },

  truncate: (str, len = 30) =>
    str && str.length > len ? str.slice(0, len) + '…' : str,
};
