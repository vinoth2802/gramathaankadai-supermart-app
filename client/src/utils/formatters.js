/* ─── Currency / numbers ─── */
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

/* ─── Padding ─── */
export const pad = (n) => String(n).padStart(2, '0');

/* ─── Date / time ─── */

/** YYYY-MM-DD for today */
export const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Current time as "hh:mm AM/PM" */
export const nowTime = () => {
  const d = new Date();
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

/** Expiry date as "MM/YY" for batch labels */
export const formatExpDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${pad(dt.getMonth() + 1)}/${String(dt.getFullYear()).slice(-2)}`;
};

/** ISO date string for <input type="date"> value */
export const toInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

/** "YYYY-MM" for month pickers */
export const fmtYM = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** "02 Jan 2025" — common short date across pages */
export const fmtDateShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** "02/01/2025 03:45 PM" — datetime with time */
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${nowTime.call(null, d)}`;
};

/** "₹1,23,456" — INR without paise */
export const fmtINR = (n) => '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

/** Fixed 2-decimal string */
export const fmt2 = (n) => Number(n || 0).toFixed(2);
