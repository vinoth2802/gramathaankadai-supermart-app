import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout.jsx';

import Login        from './pages/auth/Login.jsx';
import Dashboard    from './pages/dashboard/index.jsx';
import POS          from './pages/pos/index.jsx';
import Items        from './pages/inventory/index.jsx';
import Parties      from './pages/parties/index.jsx';

import SalesInvoice from './pages/sales/Invoice.jsx';
import Quotation    from './pages/sales/Quotation.jsx';
import PaymentIn    from './pages/sales/PaymentIn.jsx';
import SaleReturn   from './pages/sales/Return.jsx';

import Purchases    from './pages/purchases/index.jsx';
import PaymentOut   from './pages/purchases/PaymentOut.jsx';
import PurchaseReturn from './pages/purchases/Return.jsx';

import BankAccounts from './pages/accounts/BankAccounts.jsx';
import CashInHand   from './pages/accounts/CashInHand.jsx';
import ChequesPage  from './pages/accounts/Cheques.jsx';
import LoanAccounts from './pages/accounts/LoanAccounts.jsx';
import FixedAssets  from './pages/accounts/FixedAssets.jsx';

import ReportsLayout from './pages/reports/Layout.jsx';
import ReportStub    from './pages/reports/Stub.jsx';

import ImportItems    from './pages/utilities/ImportItems.jsx';
import ExportItems    from './pages/utilities/ExportItems.jsx';
import ImportParties  from './pages/utilities/ImportParties.jsx';
import ExportParties  from './pages/utilities/ExportParties.jsx';
import Barcode        from './pages/utilities/Barcode.jsx';

import SettingsGeneral      from './pages/settings/General.jsx';
import SettingsTransactions from './pages/settings/Transactions.jsx';
import SettingsPrint        from './pages/settings/Print.jsx';
import SettingsTaxes        from './pages/settings/Taxes.jsx';
import SettingsParty        from './pages/settings/Party.jsx';
import SettingsItem         from './pages/settings/Item.jsx';
import SettingsUnit         from './pages/settings/Unit.jsx';
import SettingsLoyalty      from './pages/settings/Loyalty.jsx';

function RequireAuth({ children }) {
  return localStorage.getItem('user') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton expand />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pos"       element={<POS />} />
          <Route path="items"     element={<Items />} />
          <Route path="parties"   element={<Parties />} />

          <Route path="sales">
            <Route index element={<Navigate to="/sales/invoice" replace />} />
            <Route path="invoice"    element={<SalesInvoice />} />
            <Route path="quotation"  element={<Quotation />} />
            <Route path="payment-in" element={<PaymentIn />} />
            <Route path="return"     element={<SaleReturn />} />
          </Route>

          <Route path="purchases">
            <Route index element={<Navigate to="/purchases/purchase" replace />} />
            <Route path="purchase"    element={<Purchases />} />
            <Route path="payment-out" element={<PaymentOut />} />
            <Route path="return"      element={<PurchaseReturn />} />
          </Route>

          <Route path="accounts">
            <Route index element={<Navigate to="/accounts/bank" replace />} />
            <Route path="bank"         element={<BankAccounts />} />
            <Route path="cash"         element={<CashInHand />} />
            <Route path="cheques"      element={<ChequesPage />} />
            <Route path="loans"        element={<LoanAccounts />} />
            <Route path="fixed-assets" element={<FixedAssets />} />
          </Route>

          <Route path="reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="/reports/sale" replace />} />
            {/* Transaction Report */}
            <Route path="sale"                      element={<ReportStub title="Sale" />} />
            <Route path="purchase"                  element={<ReportStub title="Purchase" />} />
            <Route path="day-book"                  element={<ReportStub title="Day Book" />} />
            <Route path="all-transactions"          element={<ReportStub title="All Transactions" />} />
            <Route path="profit-loss"               element={<ReportStub title="Profit & Loss" />} />
            <Route path="bill-wise-profit"          element={<ReportStub title="Bill Wise Profit" />} />
            <Route path="cash-flow"                 element={<ReportStub title="Cash Flow" />} />
            <Route path="trial-balance"             element={<ReportStub title="Trial Balance" />} />
            <Route path="balance-sheet"             element={<ReportStub title="Balance Sheet" />} />
            {/* Party Report */}
            <Route path="party-statement"              element={<ReportStub title="Party Statement" />} />
            <Route path="party-wise-pl"                element={<ReportStub title="Party Wise Profit & Loss" />} />
            <Route path="all-parties"                  element={<ReportStub title="All Parties" />} />
            <Route path="party-by-item"                element={<ReportStub title="Party Report by Item" />} />
            <Route path="sale-purchase-by-party"       element={<ReportStub title="Sale Purchase by Party" />} />
            <Route path="sale-purchase-by-party-group" element={<ReportStub title="Sale Purchase by Party Group" />} />
            {/* GST Report */}
            <Route path="gstr-1"       element={<ReportStub title="GSTR 1" />} />
            <Route path="gstr-2"       element={<ReportStub title="GSTR 2" />} />
            <Route path="gstr-3b"      element={<ReportStub title="GSTR 3B" />} />
            <Route path="gstr-9"       element={<ReportStub title="GSTR 9" />} />
            <Route path="sale-by-hsn"  element={<ReportStub title="Sale by HSN" />} />
            {/* Item / Stock Report */}
            <Route path="stock-summary"              element={<ReportStub title="Stock Summary" />} />
            <Route path="item-batch"                 element={<ReportStub title="Item Batch Report" />} />
            <Route path="item-by-party"              element={<ReportStub title="Item Report by Party" />} />
            <Route path="item-wise-pl"               element={<ReportStub title="Item Wise Profit & Loss" />} />
            <Route path="item-category-pl"           element={<ReportStub title="Item Category Wise Profit & Loss" />} />
            <Route path="low-stock"                  element={<ReportStub title="Low Stock Summary" />} />
            <Route path="stock-detail"               element={<ReportStub title="Stock Detail" />} />
            <Route path="item-detail"                element={<ReportStub title="Item Detail" />} />
            <Route path="sale-purchase-by-category"  element={<ReportStub title="Sale / Purchase by Item Category" />} />
            <Route path="stock-by-category"          element={<ReportStub title="Stock Summary by Item Category" />} />
            <Route path="item-wise-discount"         element={<ReportStub title="Item Wise Discount" />} />
            <Route path="manufacturing"              element={<ReportStub title="Manufacturing Report" />} />
            <Route path="consumption"                element={<ReportStub title="Consumption Report" />} />
            <Route path="stock-transfer"             element={<ReportStub title="Stock Transfer Report" />} />
            {/* Business Status */}
            <Route path="bank-statement"   element={<ReportStub title="Bank Statement" />} />
            <Route path="loan-statement"   element={<ReportStub title="Loan Statement" />} />
            <Route path="discount-report"  element={<ReportStub title="Discount Report" />} />
            {/* Taxes */}
            <Route path="gst-report"       element={<ReportStub title="GST Report" />} />
            <Route path="gst-rate-report"  element={<ReportStub title="GST Rate Report" />} />
            <Route path="tds-receivable"   element={<ReportStub title="TDS Receivable" />} />
            <Route path="tds-payable"      element={<ReportStub title="TDS Payable" />} />
            <Route path="tcs-receivable"   element={<ReportStub title="TCS Receivable" />} />
            {/* Expense Report */}
            <Route path="expense"           element={<ReportStub title="Expense" />} />
            <Route path="expense-category"  element={<ReportStub title="Expense Category Report" />} />
            <Route path="expense-item"      element={<ReportStub title="Expense Item Report" />} />
            {/* Other Income Report */}
            <Route path="other-income"           element={<ReportStub title="Other Income" />} />
            <Route path="other-income-category"  element={<ReportStub title="Other Income Category Report" />} />
            <Route path="other-income-item"      element={<ReportStub title="Other Income Item Report" />} />
          </Route>

          <Route path="utilities">
            <Route index element={<Navigate to="/utilities/import-items" replace />} />
            <Route path="import-items"   element={<ImportItems />} />
            <Route path="export-items"   element={<ExportItems />} />
            <Route path="import-parties" element={<ImportParties />} />
            <Route path="export-parties" element={<ExportParties />} />
            <Route path="barcode"        element={<Barcode />} />
          </Route>

          <Route path="settings">
            <Route index element={<Navigate to="/settings/general" replace />} />
            <Route path="general"      element={<SettingsGeneral />} />
            <Route path="transactions" element={<SettingsTransactions />} />
            <Route path="print"        element={<SettingsPrint />} />
            <Route path="taxes"        element={<SettingsTaxes />} />
            <Route path="party"        element={<SettingsParty />} />
            <Route path="item"         element={<SettingsItem />} />
            <Route path="unit"         element={<SettingsUnit />} />
            <Route path="loyalty"      element={<SettingsLoyalty />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
