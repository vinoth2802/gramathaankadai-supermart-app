import { NavLink, Outlet } from 'react-router-dom';

const sections = [
  {
    title: 'Transaction Report',
    items: [
      { to: '/reports/sale',                     label: 'Sale' },
      { to: '/reports/purchase',                 label: 'Purchase' },
      { to: '/reports/day-book',                 label: 'Day Book' },
      { to: '/reports/all-transactions',         label: 'All Transactions' },
      { to: '/reports/profit-loss',              label: 'Profit & Loss' },
      { to: '/reports/bill-wise-profit',         label: 'Bill Wise Profit' },
      { to: '/reports/cash-flow',                label: 'Cash Flow' },
      { to: '/reports/trial-balance',            label: 'Trial Balance' },
      { to: '/reports/balance-sheet',            label: 'Balance Sheet' },
    ],
  },
  {
    title: 'Party Report',
    items: [
      { to: '/reports/party-statement',               label: 'Party Statement' },
      { to: '/reports/party-wise-pl',                 label: 'Party Wise Profit & Loss' },
      { to: '/reports/all-parties',                   label: 'All Parties' },
      { to: '/reports/party-by-item',                 label: 'Party Report by Item' },
      { to: '/reports/sale-purchase-by-party',        label: 'Sale Purchase by Party' },
      { to: '/reports/sale-purchase-by-party-group',  label: 'Sale Purchase by Party Group' },
    ],
  },
  {
    title: 'GST Report',
    items: [
      { to: '/reports/gstr-1',       label: 'GSTR 1' },
      { to: '/reports/gstr-2',       label: 'GSTR 2' },
      { to: '/reports/gstr-3b',      label: 'GSTR 3B' },
      { to: '/reports/gstr-9',       label: 'GSTR 9' },
      { to: '/reports/sale-by-hsn',  label: 'Sale by HSN' },
    ],
  },
  {
    title: 'Item / Stock Report',
    items: [
      { to: '/reports/stock-summary',              label: 'Stock Summary' },
      { to: '/reports/item-batch',                 label: 'Item Batch Report' },
      { to: '/reports/item-by-party',              label: 'Item Report by Party' },
      { to: '/reports/item-wise-pl',               label: 'Item Wise Profit & Loss' },
      { to: '/reports/item-category-pl',           label: 'Item Category Wise Profit & Loss' },
      { to: '/reports/low-stock',                  label: 'Low Stock Summary' },
      { to: '/reports/stock-detail',               label: 'Stock Detail' },
      { to: '/reports/item-detail',                label: 'Item Detail' },
      { to: '/reports/sale-purchase-by-category',  label: 'Sale / Purchase by Item Category' },
      { to: '/reports/stock-by-category',          label: 'Stock Summary by Item Category' },
      { to: '/reports/item-wise-discount',         label: 'Item Wise Discount' },
      { to: '/reports/manufacturing',              label: 'Manufacturing Report' },
      { to: '/reports/consumption',                label: 'Consumption Report' },
      { to: '/reports/stock-transfer',             label: 'Stock Transfer Report' },
    ],
  },
  {
    title: 'Business Status',
    items: [
      { to: '/reports/bank-statement',   label: 'Bank Statement' },
      { to: '/reports/loan-statement',   label: 'Loan Statement' },
      { to: '/reports/discount-report',  label: 'Discount Report' },
    ],
  },
  {
    title: 'Taxes',
    items: [
      { to: '/reports/gst-report',       label: 'GST Report' },
      { to: '/reports/gst-rate-report',  label: 'GST Rate Report' },
      { to: '/reports/tds-receivable',   label: 'TDS Receivable' },
      { to: '/reports/tds-payable',      label: 'TDS Payable' },
      { to: '/reports/tcs-receivable',   label: 'TCS Receivable' },
    ],
  },
  {
    title: 'Expense Report',
    items: [
      { to: '/reports/expense',           label: 'Expense' },
      { to: '/reports/expense-category',  label: 'Expense Category Report' },
      { to: '/reports/expense-item',      label: 'Expense Item Report' },
    ],
  },
  {
    title: 'Other Income Report',
    items: [
      { to: '/reports/other-income',           label: 'Other Income' },
      { to: '/reports/other-income-category',  label: 'Other Income Category Report' },
      { to: '/reports/other-income-item',      label: 'Other Income Item Report' },
    ],
  },
];

export default function ReportsLayout() {
  return (
    <div className="flex">
      {/* Reports secondary sidebar */}
      <aside className="reports-sidebar w-56 shrink-0 bg-white border-r border-slate-200 min-h-screen overflow-y-auto sticky top-0 h-screen">
        <div className="py-2">
          {sections.map((section, si) => (
            <div key={section.title}>
              {si > 0 && <hr className="my-2 border-slate-200" />}
              <div className="px-4 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {section.title}
              </div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block px-4 py-1.5 text-[13px] transition-colors border-r-2 ${
                      isActive
                        ? 'bg-amber-50 text-amber-600 font-medium border-amber-500'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Report content area */}
      <div className="flex-1 p-6 min-h-screen bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
}
