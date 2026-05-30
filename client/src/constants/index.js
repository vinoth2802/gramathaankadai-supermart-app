/* ─── Geography ─── */
export const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chandigarh','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];

/* ─── Items / Inventory ─── */
export const UNITS     = ['NO.','PCS','KG','G','LTR','ML','BOX','PKT','BAG','DOZ','MTR','SET'];
export const TAX_RATES = ['','0','5','12','18','28'];

/* ─── Payments ─── */
export const PAYMENT_MODES = ['Cash','UPI','Card','Bank Transfer','Cheque','Credit'];
export const RS             = '₹';

/* ─── Sales / Invoicing ─── */
export const TERMS_TEMPLATES = {
  'Sale Invoice': 'Your satisfaction is our priority. Please visit us again!',
  'Delivery':     'Goods once sold will not be taken back. Subject to local jurisdiction.',
  'Credit':       'Payment due within 30 days from the date of invoice.',
  'Custom':       '',
};
export const DEFAULT_STATE = 'Tamil Nadu';

/* ─── Employee management ─── */
export const PAY_STATUS = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
  unpaid:  { label: 'Unpaid',  cls: 'bg-rose-100 text-rose-600'      },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700'    },
};

/* ─── UI / Tailwind helpers ─── */
export const CELL_INPUT_CLS =
  'w-full px-2 py-1 text-xs bg-transparent focus:outline-none focus:bg-amber-50 rounded';

export const COLOR = {
  emerald: { bg:'bg-emerald-100', text:'text-emerald-700', badge:'bg-emerald-100 text-emerald-700', btn:'bg-emerald-500 hover:bg-emerald-600', light:'bg-emerald-50' },
  amber:   { bg:'bg-amber-100',   text:'text-amber-700',   badge:'bg-amber-100 text-amber-700',     btn:'bg-amber-500 hover:bg-amber-600',     light:'bg-amber-50'   },
  violet:  { bg:'bg-violet-100',  text:'text-violet-700',  badge:'bg-violet-100 text-violet-700',   btn:'bg-violet-500 hover:bg-violet-600',   light:'bg-violet-50'  },
  blue:    { bg:'bg-blue-100',    text:'text-blue-700',    badge:'bg-blue-100 text-blue-700',       btn:'bg-blue-500 hover:bg-blue-600',       light:'bg-blue-50'    },
};

export const COLOR_PRESETS = [
  { label: 'Blue',    cls: 'bg-blue-100 text-blue-700'       },
  { label: 'Amber',   cls: 'bg-amber-100 text-amber-700'     },
  { label: 'Cyan',    cls: 'bg-cyan-100 text-cyan-700'       },
  { label: 'Indigo',  cls: 'bg-indigo-100 text-indigo-700'   },
  { label: 'Violet',  cls: 'bg-violet-100 text-violet-700'   },
  { label: 'Emerald', cls: 'bg-emerald-100 text-emerald-700' },
  { label: 'Orange',  cls: 'bg-orange-100 text-orange-700'   },
  { label: 'Pink',    cls: 'bg-pink-100 text-pink-700'       },
  { label: 'Yellow',  cls: 'bg-yellow-100 text-yellow-700'   },
  { label: 'Teal',    cls: 'bg-teal-100 text-teal-700'       },
];

/* ─── Validation limits ─── */
export const MAX_NAME_LEN  = 100;
export const MAX_NOTE_LEN  = 500;
export const MAX_PHONE_LEN = 15;
