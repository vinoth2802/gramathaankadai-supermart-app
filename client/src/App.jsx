import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout.jsx';
import Login  from '@features/auth/components/Login.jsx';

/* ── Lazy page imports ── */
const Dashboard    = lazy(() => import('@features/dashboard/components/Dashboard.jsx'));
const POS          = lazy(() => import('@features/pos/components/POS.jsx'));
const Items        = lazy(() => import('@features/inventory/components/Index.jsx'));
const Parties      = lazy(() => import('@features/parties/components/index.jsx'));
const LoyaltyPoints = lazy(() => import('@features/parties/components/LoyaltyPoints.jsx'));

const SalesIndex   = lazy(() => import('@features/sales/components/Sales.jsx'));
const SalesHistory = lazy(() => import('@features/sales/components/History.jsx'));
const Quotation    = lazy(() => import('@features/sales/components/Estimate.jsx'));
const PaymentIn    = lazy(() => import('@features/sales/components/PaymentIn.jsx'));
const SaleReturn   = lazy(() => import('@features/sales/components/Return.jsx'));

const Purchases       = lazy(() => import('@features/purchases/components/Purchases.jsx'));
const PurchaseHistory = lazy(() => import('@features/purchases/components/History.jsx'));
const PaymentOut      = lazy(() => import('@features/purchases/components/PaymentOut.jsx'));
const PurchaseReturn  = lazy(() => import('@features/purchases/components/Return.jsx'));

const BankAccounts      = lazy(() => import('@features/accounts/components/BankAccounts.jsx'));
const CashInHand        = lazy(() => import('@features/accounts/components/CashInHand.jsx'));
const ChequesPage       = lazy(() => import('@features/accounts/components/Cheques.jsx'));
const LoanAccounts      = lazy(() => import('@features/accounts/components/LoanAccounts.jsx'));
const FixedAssets       = lazy(() => import('@features/accounts/components/FixedAssets.jsx'));
const CapitalInvestment = lazy(() => import('@features/accounts/components/CapitalInvestment.jsx'));

const ReportsLayout    = lazy(() => import('@features/reports/components/Layout.jsx'));
const ReportStub       = lazy(() => import('@features/reports/components/Stub.jsx'));
const SaleReport       = lazy(() => import('@features/reports/components/SaleReport.jsx'));
const PurchaseReport   = lazy(() => import('@features/reports/components/PurchaseReport.jsx'));
const DayBook          = lazy(() => import('@features/reports/components/DayBook.jsx'));
const AllTransactions  = lazy(() => import('@features/reports/components/AllTransactions.jsx'));
const BillWiseProfit   = lazy(() => import('@features/reports/components/BillWiseProfit.jsx'));

const ImportItems   = lazy(() => import('@features/inventory/components/ImportItems.jsx'));
const ExportItems   = lazy(() => import('@features/utilities/components/ExportItems.jsx'));
const ImportParties = lazy(() => import('@features/utilities/components/ImportParties.jsx'));
const ExportParties = lazy(() => import('@features/utilities/components/ExportParties.jsx'));
const Barcode       = lazy(() => import('@features/utilities/components/Barcode.jsx'));
const Recyclebin    = lazy(() => import('@features/utilities/components/RecycleBin.jsx'));
const LogRegister   = lazy(() => import('@features/utilities/components/LogRegister.jsx'));
const CashBook        = lazy(() => import('@features/cashbook/components/daybook.jsx'));
const CashBookHistory = lazy(() => import('@features/cashbook/components/history.jsx'));

const ExpensesPage     = lazy(() => import('@features/expenses/components/expenses.jsx'));
const EmployeePage     = lazy(() => import('@features/employees/components/index.jsx'));
const AttendancePage   = lazy(() => import('@features/employees/components/Attendance.jsx'));
const SalaryLedger     = lazy(() => import('@features/employees/components/SalaryLedger.jsx'));
const SalaryManagement = lazy(() => import('@features/employees/components/SalaryManagement.jsx'));
const LeaveManagement  = lazy(() => import('@features/employees/components/LeaveManagement.jsx'));

const Backup         = lazy(() => import('@features/backup/components/backup.jsx'));
const UserManagement = lazy(() => import('@features/user-management/components/index.jsx'));
const ResetPage      = lazy(() => import('@features/settings/components/Reset.jsx'));

const SettingsGeneral      = lazy(() => import('@features/settings/components/General.jsx'));
const SettingsTransactions = lazy(() => import('@features/settings/components/Transactions.jsx'));
const SettingsPrint        = lazy(() => import('@features/settings/components/Print.jsx'));
const SettingsTaxes        = lazy(() => import('@features/settings/components/Taxes.jsx'));
const SettingsParty        = lazy(() => import('@features/settings/components/Party.jsx'));
const SettingsItem         = lazy(() => import('@features/settings/components/Item.jsx'));
const SettingsUnit         = lazy(() => import('@features/settings/components/Unit.jsx'));
const SettingsLoyalty      = lazy(() => import('@features/settings/components/Loyalty.jsx'));
const PaymentTypes         = lazy(() => import('@features/settings/components/PaymentTypes.jsx'));

/* ── Auth ── */
function isAuthenticated() {
  try {
    return !!localStorage.getItem('user');
  } catch {
    return false;
  }
}

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

/* ── Loading fallback ── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Toaster position="top-right" richColors closeButton expand />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pos"      element={<RequireAuth><POS /></RequireAuth>} />
          <Route path="/sales"    element={<RequireAuth><SalesIndex /></RequireAuth>} />
          <Route path="/purchase" element={<RequireAuth><Purchases /></RequireAuth>} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="items"     element={<Items />} />
            <Route path="employee">
              <Route index element={<EmployeePage />} />
              <Route path="attendance"         element={<AttendancePage />} />
              <Route path="salary-management"  element={<SalaryManagement />} />
              <Route path="leave-management"   element={<LeaveManagement />} />
              <Route path="salary-ledger"      element={<SalaryLedger />} />
            </Route>
            <Route path="expenses">
              <Route index element={<ExpensesPage />} />
            </Route>
            <Route path="parties">
              <Route index element={<Parties />} />
              <Route path="loyalty" element={<LoyaltyPoints />} />
            </Route>
            <Route path="sales">
              <Route path="history"         element={<SalesHistory />} />
              <Route path="quotation"       element={<Quotation />} />
              <Route path="payment-in"      element={<PaymentIn />} />
              <Route path="paymentinmodal"  element={<PaymentIn openModal />} />
              <Route path="return"          element={<SaleReturn />} />
            </Route>
            <Route path="purchases">
              <Route index element={<Navigate to="/purchase" replace />} />
              <Route path="history"          element={<PurchaseHistory />} />
              <Route path="payment-out"      element={<PaymentOut />} />
              <Route path="paymentoutmodal"  element={<PaymentOut openModal />} />
              <Route path="return"           element={<PurchaseReturn />} />
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
              <Route path="sale"                      element={<SaleReport />} />
              <Route path="purchase"                  element={<PurchaseReport />} />
              <Route path="day-book"                  element={<DayBook />} />
              <Route path="all-transactions"          element={<AllTransactions />} />
              <Route path="profit-loss"               element={<ReportStub title="Profit & Loss" />} />
              <Route path="bill-wise-profit"          element={<BillWiseProfit />} />
              <Route path="cash-flow"                 element={<ReportStub title="Cash Flow" />} />
              <Route path="trial-balance"             element={<ReportStub title="Trial Balance" />} />
              <Route path="balance-sheet"             element={<ReportStub title="Balance Sheet" />} />
              <Route path="party-statement"              element={<ReportStub title="Party Statement" />} />
              <Route path="party-wise-pl"                element={<ReportStub title="Party Wise Profit & Loss" />} />
              <Route path="all-parties"                  element={<ReportStub title="All Parties" />} />
              <Route path="party-by-item"                element={<ReportStub title="Party Report by Item" />} />
              <Route path="sale-purchase-by-party"       element={<ReportStub title="Sale Purchase by Party" />} />
              <Route path="sale-purchase-by-party-group" element={<ReportStub title="Sale Purchase by Party Group" />} />
              <Route path="gstr-1"       element={<ReportStub title="GSTR 1" />} />
              <Route path="gstr-2"       element={<ReportStub title="GSTR 2" />} />
              <Route path="gstr-3b"      element={<ReportStub title="GSTR 3B" />} />
              <Route path="gstr-9"       element={<ReportStub title="GSTR 9" />} />
              <Route path="sale-by-hsn"  element={<ReportStub title="Sale by HSN" />} />
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
              <Route path="bank-statement"   element={<ReportStub title="Bank Statement" />} />
              <Route path="loan-statement"   element={<ReportStub title="Loan Statement" />} />
              <Route path="discount-report"  element={<ReportStub title="Discount Report" />} />
              <Route path="gst-report"       element={<ReportStub title="GST Report" />} />
              <Route path="gst-rate-report"  element={<ReportStub title="GST Rate Report" />} />
              <Route path="tds-receivable"   element={<ReportStub title="TDS Receivable" />} />
              <Route path="tds-payable"      element={<ReportStub title="TDS Payable" />} />
              <Route path="tcs-receivable"   element={<ReportStub title="TCS Receivable" />} />
              <Route path="expense"           element={<ReportStub title="Expense" />} />
              <Route path="expense-category"  element={<ReportStub title="Expense Category Report" />} />
              <Route path="expense-item"      element={<ReportStub title="Expense Item Report" />} />
              <Route path="other-income"           element={<ReportStub title="Other Income" />} />
              <Route path="other-income-category"  element={<ReportStub title="Other Income Category Report" />} />
              <Route path="other-income-item"      element={<ReportStub title="Other Income Item Report" />} />
            </Route>
            <Route path="utilities">
              <Route index element={<Navigate to="/utilities/import-items" replace />} />
              <Route path="import-items"     element={<ImportItems />} />
              <Route path="export-items"     element={<ExportItems />} />
              <Route path="import-parties"   element={<ImportParties />} />
              <Route path="export-parties"   element={<ExportParties />} />
              <Route path="barcode"          element={<Barcode />} />
              <Route path="recycle-bin"      element={<Recyclebin />} />
              <Route path="log-register"     element={<LogRegister />} />
              <Route path="cashbook"         element={<CashBook />} />
              <Route path="cashbook-history" element={<CashBookHistory />} />
            </Route>
            <Route path="backup" element={<Backup />} />
            <Route path="settings">
              <Route index element={<Navigate to="/settings/general" replace />} />
              <Route path="general"          element={<SettingsGeneral />} />
              <Route path="transactions"     element={<SettingsTransactions />} />
              <Route path="print"            element={<SettingsPrint />} />
              <Route path="taxes"            element={<SettingsTaxes />} />
              <Route path="party"            element={<SettingsParty />} />
              <Route path="item"             element={<SettingsItem />} />
              <Route path="unit"             element={<SettingsUnit />} />
              <Route path="loyalty"          element={<SettingsLoyalty />} />
              <Route path="user-management"  element={<UserManagement />} />
              <Route path="reset"            element={<ResetPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
