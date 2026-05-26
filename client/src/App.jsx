import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
import Layout from './components/Layout.jsx';

import Login        from './pages/auth/Login.jsx';
import Dashboard    from './pages/dashboard/index.jsx';
import POS          from './pages/pos/index.jsx';
import Items        from './pages/items/index.jsx';
import Parties        from './pages/parties/index.jsx';
import LoyaltyPoints  from './pages/parties/Loyaltypoints.jsx';

import SalesIndex   from './pages/sales/index.jsx';
import SalesHistory from './pages/sales/History.jsx';
import Quotation    from './pages/sales/Estimate.jsx';
import PaymentIn    from './pages/sales/PaymentIn.jsx';
import SaleReturn   from './pages/sales/Return.jsx';

import Purchases    from './pages/purchases/index.jsx';
import PurchaseHistory from './pages/purchases/History.jsx';
import PaymentOut   from './pages/purchases/PaymentOut.jsx';
import PurchaseReturn from './pages/purchases/Return.jsx';

import BankAccounts       from './pages/accounts/BankAccounts.jsx';
import CashInHand         from './pages/accounts/CashInHand.jsx';
import ChequesPage        from './pages/accounts/Cheques.jsx';
import LoanAccounts       from './pages/accounts/LoanAccounts.jsx';
import FixedAssets        from './pages/accounts/FixedAssets.jsx';
import CapitalInvestment  from './pages/accounts/CapitalInvestment.jsx';

import ReportsLayout    from './pages/reports/Layout.jsx';
import ReportStub      from './pages/reports/Stub.jsx';
import SaleReport      from './pages/reports/SaleReport.jsx';
import PurchaseReport  from './pages/reports/PurchaseReport.jsx';
import DayBook         from './pages/reports/DayBook.jsx';
import AllTransactions from './pages/reports/AllTransactions.jsx';
import BillWiseProfit  from './pages/reports/BillWiseProfit.jsx';

import ImportItems        from './pages/items/ImportItems.jsx';
import ExportItems    from './pages/utilities/ExportItems.jsx';
import ImportParties  from './pages/utilities/ImportParties.jsx';
import ExportParties  from './pages/utilities/ExportParties.jsx';
import Barcode        from './pages/utilities/Barcode.jsx';
import Recyclebin     from './pages/utilities/Recyclebin.jsx';
import LogRegister    from './pages/utilities/LogRegister.jsx';
import CashBook          from './pages/Cashbook/daybook.jsx';
import CashBookHistory   from './pages/Cashbook/history.jsx';

import UserManagement from './pages/usermanagement/index.jsx';
import ResetPage      from './pages/settings/Reset.jsx';

import SettingsGeneral      from './pages/settings/General.jsx';
import SettingsTransactions from './pages/settings/Transactions.jsx';
import SettingsPrint        from './pages/settings/Print.jsx';
import SettingsTaxes        from './pages/settings/Taxes.jsx';
import SettingsParty        from './pages/settings/Party.jsx';
import SettingsItem         from './pages/settings/Item.jsx';
import SettingsUnit         from './pages/settings/Unit.jsx';
import SettingsLoyalty      from './pages/settings/Loyalty.jsx';
import PaymentTypes         from './pages/settings/PaymentTypes.jsx';

function RequireAuth({ children }) {
  return localStorage.getItem('user') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" richColors closeButton expand />
          <HotToaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Full-screen pages — no sidebar */}
        <Route path="/pos"      element={<RequireAuth><POS /></RequireAuth>} />
        <Route path="/sales"    element={<RequireAuth><SalesIndex /></RequireAuth>} />
        <Route path="/purchase" element={<RequireAuth><Purchases /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="items"     element={<Items />} />
          <Route path="parties">
            <Route index element={<Parties />} />
            <Route path="loyalty" element={<LoyaltyPoints />} />
          </Route>

          <Route path="sales">
            <Route path="history"    element={<SalesHistory />} />
            <Route path="quotation"  element={<Quotation />} />
            <Route path="payment-in"      element={<PaymentIn />} />
            <Route path="paymentinmodal"  element={<PaymentIn openModal />} />
            <Route path="return"     element={<SaleReturn />} />
          </Route>

          <Route path="purchases">
            <Route index element={<Navigate to="/purchase" replace />} />
            <Route path="history"     element={<PurchaseHistory />} />
            <Route path="payment-out"     element={<PaymentOut />} />
            <Route path="paymentoutmodal" element={<PaymentOut openModal />} />
            <Route path="return"      element={<PurchaseReturn />} />
          </Route>

          <Route path="accounts">
            <Route index element={<Navigate to="/accounts/bank" replace />} />
            <Route path="bank"               element={<BankAccounts />} />
            <Route path="cash"               element={<CashInHand />} />
            <Route path="cheques"            element={<ChequesPage />} />
            <Route path="loans"              element={<LoanAccounts />} />
            <Route path="fixed-assets"       element={<FixedAssets />} />
            <Route path="capital-investment" element={<CapitalInvestment />} />
            <Route path="payment-types"      element={<PaymentTypes />} />
          </Route>

          <Route path="reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="/reports/sale" replace />} />
            {/* Transaction Report */}
            <Route path="sale"                      element={<SaleReport />} />
            <Route path="purchase"                  element={<PurchaseReport />} />
            <Route path="day-book"                  element={<DayBook />} />
            <Route path="all-transactions"          element={<AllTransactions />} />
            <Route path="profit-loss"               element={<ReportStub title="Profit & Loss" />} />
            <Route path="bill-wise-profit"          element={<BillWiseProfit />} />
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
            <Route path="import-items" element={<ImportItems />} />
            <Route path="export-items"         element={<ExportItems />} />
            <Route path="import-parties" element={<ImportParties />} />
            <Route path="export-parties" element={<ExportParties />} />
            <Route path="barcode"        element={<Barcode />} />
            <Route path="recycle-bin"    element={<Recyclebin />} />
            <Route path="log-register"   element={<LogRegister />} />
            <Route path="cashbook"         element={<CashBook />} />
            <Route path="cashbook-history" element={<CashBookHistory />} />
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
            <Route path="loyalty"          element={<SettingsLoyalty />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="reset"           element={<ResetPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
