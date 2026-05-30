import { Router } from 'express';
import prisma from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR  = path.join(__dirname, '../../backups');
const CONFIG_FILE = path.join(__dirname, '../../backup-config.json');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE))
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {}
  return {
    auto: { enabled: false, frequency: 'daily', time: '02:00', weekDay: 1, monthDay: 1, retention: 7 },
  };
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// ---------------------------------------------------------------------------
// BigInt serialization / deserialization
// ---------------------------------------------------------------------------
const BIGINT_FIELDS = new Set([
  'id', 'tenantId', 'tenant_id',
  'partyId', 'productId', 'saleId', 'purchaseId', 'employeeId',
  'categoryId', 'roleId', 'userId', 'bankAccountId', 'loanId',
  'expenseCategoryId', 'estimateId', 'returnId', 'fixedAssetId',
  'bomId', 'componentProductId', 'adjustmentId', 'transferId',
  'fromLocationId', 'toLocationId', 'locationId', 'batchId',
  'paymentInId', 'paymentOutId', 'purchaseOrderId', 'originalSaleId',
  'originalPurchaseId', 'convertedSaleId', 'payrollRunId', 'payslipId',
  'componentId', 'leaveTypeId', 'designationId', 'departmentId',
  'posSessionId', 'cashierUserId', 'createdByUserId', 'approvedByUserId',
  'permissionId', 'taxSlabId', 'employeeId', 'planId', 'ownerUserId',
  'baseUomId', 'secondaryUomId', 'paymentModeId', 'journalEntryId',
  'accountId', 'parentId', 'partyGroupId', 'entityId', 'deletedByUserId',
  'refId', 'subscriptionId', 'platformInvoiceId', 'openedByUserId',
]);

/** JSON replacer: serialize BigInt as string */
function bigIntReplacer(_k, v) {
  return typeof v === 'bigint' ? v.toString() : v;
}

/**
 * Deep-walk a restored record and coerce string values back to BigInt
 * for known ID fields, so Prisma accepts them.
 */
function coerceBigInts(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(coerceBigInts);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (BIGINT_FIELDS.has(k) && v !== null && v !== undefined) {
        out[k] = BigInt(v);
      } else if (typeof v === 'object') {
        out[k] = coerceBigInts(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Backup — full data export for one tenant
// ---------------------------------------------------------------------------
async function doCreateBackup(tenantId) {
  const tid = BigInt(tenantId);

  // ── Tier 0: no tenant FK (global) ────────────────────────────────────────
  const [appPermissions] = await Promise.all([
    prisma.appPermission.findMany(),
  ]);

  // ── Tier 1: tenant root + lookup tables ──────────────────────────────────
  const [
    settings,
    categories, partyGroups, paymentModes,
    expenseCategories, otherIncomeCategories,
    designations, departments, shifts, taxSlabs,
    salaryComponents, leaveTypes,
    uoms, chartOfAccounts, numberSequences,
    appRoles,
  ] = await Promise.all([
    prisma.settings.findMany({ where: { tenantId: tid } }),
    prisma.category.findMany({ where: { tenantId: tid } }),
    prisma.partyGroup.findMany({ where: { tenantId: tid } }),
    prisma.paymentMode.findMany({ where: { tenantId: tid } }),
    prisma.expenseCategory.findMany({ where: { tenantId: tid } }),
    prisma.otherIncomeCategory.findMany({ where: { tenantId: tid } }),
    prisma.designation.findMany({ where: { tenantId: tid } }),
    prisma.department.findMany({ where: { tenantId: tid } }),
    prisma.shift.findMany({ where: { tenantId: tid } }),
    prisma.taxSlab.findMany({ where: { tenantId: tid } }),
    prisma.salaryComponent.findMany({ where: { tenantId: tid } }),
    prisma.leaveType.findMany({ where: { tenantId: tid } }),
    prisma.uom.findMany({ where: { tenantId: tid } }),
    prisma.chartOfAccount.findMany({ where: { tenantId: tid } }),
    prisma.numberSequence.findMany({ where: { tenantId: tid } }),
    prisma.appRole.findMany({ where: { tenantId: tid } }),
  ]);

  // ── Tier 2: depends on Tier-1 ─────────────────────────────────────────────
  const [
    uomConversions, paymentTypeSettings,
    parties, products, employees, tenantLocations,
    appRolePermissions,
  ] = await Promise.all([
    prisma.uomConversion.findMany({ where: { tenantId: tid } }),
    prisma.paymentTypeSetting.findMany({ where: { tenantId: tid } }),
    prisma.party.findMany({ where: { tenantId: tid } }),
    prisma.product.findMany({ where: { tenantId: tid } }),
    prisma.employee.findMany({ where: { tenantId: tid } }),
    prisma.tenantLocation.findMany({ where: { tenantId: tid } }),
    prisma.appRolePermission.findMany(), // global join table
  ]);

  // ── Tier 3: depends on Tier-2 ─────────────────────────────────────────────
  const [
    appUsers, bankAccounts, loanAccounts, fixedAssets,
    purchaseOrders, billOfMaterials, productBatches, productPrices,
    leaveBalances, capitalInvestments, employeeSalaryStructure,
  ] = await Promise.all([
    prisma.appUser.findMany({ where: { tenantId: tid } }),
    prisma.bankAccount.findMany({ where: { tenantId: tid } }),
    prisma.loanAccount.findMany({ where: { tenantId: tid } }),
    prisma.fixedAsset.findMany({ where: { tenantId: tid } }),
    prisma.purchaseOrder.findMany({ where: { tenantId: tid } }),
    prisma.billOfMaterials.findMany({ where: { tenantId: tid } }),
    prisma.productBatch.findMany({ where: { tenantId: tid } }),
    prisma.productPrice.findMany({ where: { tenantId: tid } }),
    prisma.leaveBalance.findMany({ where: { tenantId: tid } }),
    prisma.capitalInvestment.findMany({ where: { tenantId: tid } }),
    prisma.employeeSalaryStructure.findMany({ where: { tenantId: tid } }),
  ]);

  // ── Tier 4: transactional data ────────────────────────────────────────────
  const [
    sales, purchases, estimates,
    paymentInHistory, paymentOutHistory,
    cashTransactions, bankTransactions,
    cheques, loanTransactions,
    expenses, otherIncomes,
    salaryRecords, attendanceRecords,
    purchaseOrderItems, purchaseOrders2,
    posSessions, stockAdjustments, stockTransfers,
    payrollRuns, leaveRequests,
    manufacturingOrders, bomComponents,
    partyLedger, journalEntries,
    assetDepreciationSchedule,
    recycleBin, auditLogs, importJobs,
    notifications, userSessions,
    gstReturnFilings,
  ] = await Promise.all([
    prisma.sale.findMany({ where: { tenantId: tid } }),
    prisma.purchase.findMany({ where: { tenantId: tid } }),
    prisma.estimate.findMany({ where: { tenantId: tid } }),
    prisma.paymentInHistory.findMany({ where: { tenantId: tid } }),
    prisma.paymentOutHistory.findMany({ where: { tenantId: tid } }),
    prisma.cashTransaction.findMany({ where: { tenantId: tid } }),
    prisma.bankTransaction.findMany({ where: { tenantId: tid } }),
    prisma.cheque.findMany({ where: { tenantId: tid } }),
    prisma.loanTransaction.findMany({ where: { tenantId: tid } }),
    prisma.expense.findMany({ where: { tenantId: tid } }),
    prisma.otherIncome.findMany({ where: { tenantId: tid } }),
    prisma.salaryRecord.findMany({ where: { tenantId: tid } }),
    prisma.attendanceRecord.findMany({ where: { tenantId: tid } }),
    prisma.purchaseOrderItem.findMany({ where: { tenantId: tid } }),
    prisma.purchaseOrder.findMany({ where: { tenantId: tid } }), // already fetched above, reuse below
    prisma.posSession.findMany({ where: { tenantId: tid } }),
    prisma.stockAdjustment.findMany({ where: { tenantId: tid } }),
    prisma.stockTransfer.findMany({ where: { tenantId: tid } }),
    prisma.payrollRun.findMany({ where: { tenantId: tid } }),
    prisma.leaveRequest.findMany({ where: { tenantId: tid } }),
    prisma.manufacturingOrder.findMany({ where: { tenantId: tid } }),
    prisma.bomComponent.findMany({ where: { tenantId: tid } }),
    prisma.partyLedger.findMany({ where: { tenantId: tid } }),
    prisma.journalEntry.findMany({ where: { tenantId: tid } }),
    prisma.assetDepreciationSchedule.findMany({ where: { tenantId: tid } }),
    prisma.recycleBin.findMany({ where: { tenantId: tid } }),
    prisma.auditLog.findMany({ where: { tenantId: tid } }),
    prisma.importJob.findMany({ where: { tenantId: tid } }),
    prisma.notification.findMany({ where: { tenantId: tid } }),
    prisma.userSession.findMany({ where: { tenantId: tid } }),
    prisma.gstReturnFiling.findMany({ where: { tenantId: tid } }),
  ]);

  // ── Tier 5: line items (depend on Tier-4 headers) ─────────────────────────
  const [
    saleItems, purchaseItems, estimateItems,
    saleReturns, purchaseReturns,
    paymentInAllocations, paymentOutAllocations,
    stockAdjustmentItems, stockTransferItems,
    stockLedger, journalLines,
    payslips, loyaltyTransactions,
  ] = await Promise.all([
    prisma.saleItem.findMany({ where: { tenantId: tid } }),
    prisma.purchaseItem.findMany({ where: { tenantId: tid } }),
    prisma.estimateItem.findMany({ where: { tenantId: tid } }),
    prisma.saleReturn.findMany({ where: { tenantId: tid } }),
    prisma.purchaseReturn.findMany({ where: { tenantId: tid } }),
    prisma.paymentInAllocation.findMany({ where: { tenantId: tid } }),
    prisma.paymentOutAllocation.findMany({ where: { tenantId: tid } }),
    prisma.stockAdjustmentItem.findMany({ where: { tenantId: tid } }),
    prisma.stockTransferItem.findMany({ where: { tenantId: tid } }),
    prisma.stockLedger.findMany({ where: { tenantId: tid } }),
    prisma.journalLine.findMany({ where: { tenantId: tid } }),
    prisma.payslip.findMany({ where: { tenantId: tid } }),
    prisma.loyaltyTransaction.findMany({ where: { tenantId: tid } }),
  ]);

  // ── Tier 6: deepest line items ────────────────────────────────────────────
  const [
    saleReturnItems, purchaseReturnItems,
    payslipLines, leaveBalances2,
  ] = await Promise.all([
    prisma.saleReturnItem.findMany({ where: { tenantId: tid } }),
    prisma.purchaseReturnItem.findMany({ where: { tenantId: tid } }),
    prisma.payslipLine.findMany({ where: { tenantId: tid } }),
    prisma.leaveBalance.findMany({ where: { tenantId: tid } }),
  ]);

  const payload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    tenantId: tenantId.toString(),
    // Tables are ordered by restore dependency (parents before children)
    tables: {
      // Tier 0 – global
      appPermissions,
      // Tier 1 – lookups
      settings,
      categories, partyGroups, paymentModes,
      expenseCategories, otherIncomeCategories,
      designations, departments, shifts, taxSlabs,
      salaryComponents, leaveTypes,
      uoms, chartOfAccounts, numberSequences,
      appRoles,
      // Tier 2
      uomConversions, paymentTypeSettings,
      parties, products, employees, tenantLocations,
      appRolePermissions,
      // Tier 3
      appUsers, bankAccounts, loanAccounts, fixedAssets,
      purchaseOrders, billOfMaterials, productBatches, productPrices,
      leaveBalances, capitalInvestments, employeeSalaryStructure,
      // Tier 4 – transaction headers
      posSessions,
      sales, purchases, estimates,
      paymentInHistory, paymentOutHistory,
      cashTransactions, bankTransactions,
      cheques, loanTransactions,
      expenses, otherIncomes,
      salaryRecords, attendanceRecords,
      purchaseOrderItems,
      stockAdjustments, stockTransfers,
      payrollRuns, leaveRequests,
      manufacturingOrders, bomComponents,
      partyLedger, journalEntries,
      assetDepreciationSchedule,
      recycleBin, auditLogs, importJobs,
      notifications, userSessions,
      gstReturnFilings,
      // Tier 5 – line items
      saleItems, purchaseItems, estimateItems,
      saleReturns, purchaseReturns,
      paymentInAllocations, paymentOutAllocations,
      stockAdjustmentItems, stockTransferItems,
      stockLedger, journalLines,
      payslips, loyaltyTransactions,
      // Tier 6 – deepest
      saleReturnItems, purchaseReturnItems,
      payslipLines,
    },
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${ts}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(payload, bigIntReplacer));

  // Enforce retention
  const cfg = loadConfig();
  const retention = cfg.auto?.retention ?? 30;
  const allFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.t - a.t);
  allFiles.slice(retention).forEach(({ f }) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
  });

  return { filename, size: fs.statSync(filepath).size, createdAt: fs.statSync(filepath).mtime };
}

// ---------------------------------------------------------------------------
// Restore — wipe tenant data and re-insert from backup file
// The order here MUST match the dependency graph (parents before children).
// We use createMany with skipDuplicates so re-running is safe.
// ---------------------------------------------------------------------------
async function doRestore(filepath, tenantId) {
  const raw  = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);
  const t    = data.tables;

  if (!t) throw new Error('Invalid backup file: missing tables key');

  const tid = BigInt(tenantId);

  // Helper: coerce + strip any rows that belong to a different tenant
  function rows(arr, strict = true) {
    if (!arr?.length) return [];
    return arr
      .map(coerceBigInts)
      .filter(r => !strict || !r.tenantId || r.tenantId === tid);
  }

  // We wrap everything in a long transaction.
  // MySQL's default FK checks are ON; we temporarily disable them so we
  // can delete child rows before parents without ordering issues.
  await prisma.$transaction(async (tx) => {

    // ── 1. Disable FK checks for the duration of the wipe ────────────────
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

    // ── 2. Delete ALL tenant data (deepest first to be safe, but FK off) ──
    const where = { tenantId: tid };
    await tx.payslipLine.deleteMany({ where });
    await tx.saleReturnItem.deleteMany({ where });
    await tx.purchaseReturnItem.deleteMany({ where });
    await tx.payslip.deleteMany({ where });
    await tx.loyaltyTransaction.deleteMany({ where });
    await tx.stockLedger.deleteMany({ where });
    await tx.journalLine.deleteMany({ where });
    await tx.paymentInAllocation.deleteMany({ where });
    await tx.paymentOutAllocation.deleteMany({ where });
    await tx.stockAdjustmentItem.deleteMany({ where });
    await tx.stockTransferItem.deleteMany({ where });
    await tx.saleReturn.deleteMany({ where });
    await tx.purchaseReturn.deleteMany({ where });
    await tx.saleItem.deleteMany({ where });
    await tx.purchaseItem.deleteMany({ where });
    await tx.estimateItem.deleteMany({ where });
    await tx.gstReturnFiling.deleteMany({ where });
    await tx.notification.deleteMany({ where });
    await tx.userSession.deleteMany({ where });
    await tx.recycleBin.deleteMany({ where });
    await tx.auditLog.deleteMany({ where });
    await tx.importJob.deleteMany({ where });
    await tx.assetDepreciationSchedule.deleteMany({ where });
    await tx.journalEntry.deleteMany({ where });
    await tx.partyLedger.deleteMany({ where });
    await tx.bomComponent.deleteMany({ where });
    await tx.manufacturingOrder.deleteMany({ where });
    await tx.leaveRequest.deleteMany({ where });
    await tx.leaveBalance.deleteMany({ where });
    await tx.payrollRun.deleteMany({ where });
    await tx.stockTransfer.deleteMany({ where });
    await tx.stockAdjustment.deleteMany({ where });
    await tx.purchaseOrderItem.deleteMany({ where });
    await tx.attendanceRecord.deleteMany({ where });
    await tx.salaryRecord.deleteMany({ where });
    await tx.otherIncome.deleteMany({ where });
    await tx.expense.deleteMany({ where });
    await tx.loanTransaction.deleteMany({ where });
    await tx.cheque.deleteMany({ where });
    await tx.bankTransaction.deleteMany({ where });
    await tx.cashTransaction.deleteMany({ where });
    await tx.paymentOutHistory.deleteMany({ where });
    await tx.paymentInHistory.deleteMany({ where });
    await tx.estimate.deleteMany({ where });
    await tx.purchase.deleteMany({ where });
    await tx.sale.deleteMany({ where });
    await tx.posSession.deleteMany({ where });
    await tx.employeeSalaryStructure.deleteMany({ where });
    await tx.capitalInvestment.deleteMany({ where });
    await tx.productPrice.deleteMany({ where });
    await tx.productBatch.deleteMany({ where });
    await tx.billOfMaterials.deleteMany({ where });
    await tx.purchaseOrder.deleteMany({ where });
    await tx.fixedAsset.deleteMany({ where });
    await tx.loanAccount.deleteMany({ where });
    await tx.bankAccount.deleteMany({ where });
    await tx.appUser.deleteMany({ where });
    await tx.tenantLocation.deleteMany({ where });
    await tx.employee.deleteMany({ where });
    await tx.product.deleteMany({ where });
    await tx.party.deleteMany({ where });
    await tx.uomConversion.deleteMany({ where });
    await tx.paymentTypeSetting.deleteMany({ where });
    // appRolePermissions is global — skip tenant-scoped delete
    await tx.appRole.deleteMany({ where });
    await tx.numberSequence.deleteMany({ where: { tenantId: tid } });
    await tx.chartOfAccount.deleteMany({ where });
    await tx.uom.deleteMany({ where });
    await tx.leaveType.deleteMany({ where });
    await tx.salaryComponent.deleteMany({ where });
    await tx.taxSlab.deleteMany({ where });
    await tx.shift.deleteMany({ where });
    await tx.department.deleteMany({ where });
    await tx.designation.deleteMany({ where });
    await tx.otherIncomeCategory.deleteMany({ where });
    await tx.expenseCategory.deleteMany({ where });
    await tx.paymentMode.deleteMany({ where });
    await tx.partyGroup.deleteMany({ where });
    await tx.category.deleteMany({ where });
    await tx.settings.deleteMany({ where });

    // ── 3. Re-enable FK checks ────────────────────────────────────────────
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    const skip = { skipDuplicates: true };

    // ── 4. Re-insert in dependency order ─────────────────────────────────

    // Tier 1 — lookups
    if (t.settings?.length)              await tx.settings.createMany({ data: rows(t.settings), ...skip });
    if (t.categories?.length)            await tx.category.createMany({ data: rows(t.categories), ...skip });
    if (t.partyGroups?.length)           await tx.partyGroup.createMany({ data: rows(t.partyGroups), ...skip });
    if (t.paymentModes?.length)          await tx.paymentMode.createMany({ data: rows(t.paymentModes), ...skip });
    if (t.expenseCategories?.length)     await tx.expenseCategory.createMany({ data: rows(t.expenseCategories), ...skip });
    if (t.otherIncomeCategories?.length) await tx.otherIncomeCategory.createMany({ data: rows(t.otherIncomeCategories), ...skip });
    if (t.designations?.length)          await tx.designation.createMany({ data: rows(t.designations), ...skip });
    if (t.departments?.length)           await tx.department.createMany({ data: rows(t.departments), ...skip });
    if (t.shifts?.length)                await tx.shift.createMany({ data: rows(t.shifts), ...skip });
    if (t.taxSlabs?.length)              await tx.taxSlab.createMany({ data: rows(t.taxSlabs), ...skip });
    if (t.salaryComponents?.length)      await tx.salaryComponent.createMany({ data: rows(t.salaryComponents), ...skip });
    if (t.leaveTypes?.length)            await tx.leaveType.createMany({ data: rows(t.leaveTypes), ...skip });
    if (t.uoms?.length)                  await tx.uom.createMany({ data: rows(t.uoms), ...skip });
    if (t.chartOfAccounts?.length)       await tx.chartOfAccount.createMany({ data: rows(t.chartOfAccounts), ...skip });
    if (t.numberSequences?.length)       await tx.numberSequence.createMany({ data: rows(t.numberSequences), ...skip });
    if (t.appRoles?.length)              await tx.appRole.createMany({ data: rows(t.appRoles), ...skip });

    // Tier 2
    if (t.uomConversions?.length)        await tx.uomConversion.createMany({ data: rows(t.uomConversions), ...skip });
    if (t.paymentTypeSettings?.length)   await tx.paymentTypeSetting.createMany({ data: rows(t.paymentTypeSettings), ...skip });
    if (t.parties?.length)               await tx.party.createMany({ data: rows(t.parties), ...skip });
    if (t.products?.length)              await tx.product.createMany({ data: rows(t.products), ...skip });
    if (t.employees?.length)             await tx.employee.createMany({ data: rows(t.employees), ...skip });
    if (t.tenantLocations?.length)       await tx.tenantLocation.createMany({ data: rows(t.tenantLocations), ...skip });
    // appRolePermissions: global, restore carefully
    if (t.appRolePermissions?.length) {
      const validRoleIds = new Set((t.appRoles || []).map(r => BigInt(r.id).toString()));
      const filtered = rows(t.appRolePermissions, false)
        .filter(r => validRoleIds.has(r.roleId.toString()));
      if (filtered.length) await tx.appRolePermission.createMany({ data: filtered, ...skip });
    }

    // Tier 3
    if (t.appUsers?.length)                  await tx.appUser.createMany({ data: rows(t.appUsers), ...skip });
    if (t.bankAccounts?.length)              await tx.bankAccount.createMany({ data: rows(t.bankAccounts), ...skip });
    if (t.loanAccounts?.length)              await tx.loanAccount.createMany({ data: rows(t.loanAccounts), ...skip });
    if (t.fixedAssets?.length)               await tx.fixedAsset.createMany({ data: rows(t.fixedAssets), ...skip });
    if (t.purchaseOrders?.length)            await tx.purchaseOrder.createMany({ data: rows(t.purchaseOrders), ...skip });
    if (t.billOfMaterials?.length)           await tx.billOfMaterials.createMany({ data: rows(t.billOfMaterials), ...skip });
    if (t.productBatches?.length)            await tx.productBatch.createMany({ data: rows(t.productBatches), ...skip });
    if (t.productPrices?.length)             await tx.productPrice.createMany({ data: rows(t.productPrices), ...skip });
    if (t.leaveBalances?.length)             await tx.leaveBalance.createMany({ data: rows(t.leaveBalances), ...skip });
    if (t.capitalInvestments?.length)        await tx.capitalInvestment.createMany({ data: rows(t.capitalInvestments), ...skip });
    if (t.employeeSalaryStructure?.length)   await tx.employeeSalaryStructure.createMany({ data: rows(t.employeeSalaryStructure), ...skip });

    // Tier 4 — transaction headers
    if (t.posSessions?.length)               await tx.posSession.createMany({ data: rows(t.posSessions), ...skip });
    if (t.sales?.length)                     await tx.sale.createMany({ data: rows(t.sales), ...skip });
    if (t.purchases?.length)                 await tx.purchase.createMany({ data: rows(t.purchases), ...skip });
    if (t.estimates?.length)                 await tx.estimate.createMany({ data: rows(t.estimates), ...skip });
    if (t.paymentInHistory?.length)          await tx.paymentInHistory.createMany({ data: rows(t.paymentInHistory), ...skip });
    if (t.paymentOutHistory?.length)         await tx.paymentOutHistory.createMany({ data: rows(t.paymentOutHistory), ...skip });
    if (t.cashTransactions?.length)          await tx.cashTransaction.createMany({ data: rows(t.cashTransactions), ...skip });
    if (t.bankTransactions?.length)          await tx.bankTransaction.createMany({ data: rows(t.bankTransactions), ...skip });
    if (t.cheques?.length)                   await tx.cheque.createMany({ data: rows(t.cheques), ...skip });
    if (t.loanTransactions?.length)          await tx.loanTransaction.createMany({ data: rows(t.loanTransactions), ...skip });
    if (t.expenses?.length)                  await tx.expense.createMany({ data: rows(t.expenses), ...skip });
    if (t.otherIncomes?.length)              await tx.otherIncome.createMany({ data: rows(t.otherIncomes), ...skip });
    if (t.salaryRecords?.length)             await tx.salaryRecord.createMany({ data: rows(t.salaryRecords), ...skip });
    if (t.attendanceRecords?.length)         await tx.attendanceRecord.createMany({ data: rows(t.attendanceRecords), ...skip });
    if (t.purchaseOrderItems?.length)        await tx.purchaseOrderItem.createMany({ data: rows(t.purchaseOrderItems), ...skip });
    if (t.stockAdjustments?.length)          await tx.stockAdjustment.createMany({ data: rows(t.stockAdjustments), ...skip });
    if (t.stockTransfers?.length)            await tx.stockTransfer.createMany({ data: rows(t.stockTransfers), ...skip });
    if (t.payrollRuns?.length)               await tx.payrollRun.createMany({ data: rows(t.payrollRuns), ...skip });
    if (t.leaveRequests?.length)             await tx.leaveRequest.createMany({ data: rows(t.leaveRequests), ...skip });
    if (t.manufacturingOrders?.length)       await tx.manufacturingOrder.createMany({ data: rows(t.manufacturingOrders), ...skip });
    if (t.bomComponents?.length)             await tx.bomComponent.createMany({ data: rows(t.bomComponents), ...skip });
    if (t.partyLedger?.length)               await tx.partyLedger.createMany({ data: rows(t.partyLedger), ...skip });
    if (t.journalEntries?.length)            await tx.journalEntry.createMany({ data: rows(t.journalEntries), ...skip });
    if (t.assetDepreciationSchedule?.length) await tx.assetDepreciationSchedule.createMany({ data: rows(t.assetDepreciationSchedule), ...skip });
    if (t.recycleBin?.length)                await tx.recycleBin.createMany({ data: rows(t.recycleBin), ...skip });
    if (t.auditLogs?.length)                 await tx.auditLog.createMany({ data: rows(t.auditLogs), ...skip });
    if (t.importJobs?.length)                await tx.importJob.createMany({ data: rows(t.importJobs), ...skip });
    if (t.notifications?.length)             await tx.notification.createMany({ data: rows(t.notifications), ...skip });
    if (t.userSessions?.length)              await tx.userSession.createMany({ data: rows(t.userSessions), ...skip });
    if (t.gstReturnFilings?.length)          await tx.gstReturnFiling.createMany({ data: rows(t.gstReturnFilings), ...skip });

    // Tier 5 — line items
    if (t.saleItems?.length)                 await tx.saleItem.createMany({ data: rows(t.saleItems), ...skip });
    if (t.purchaseItems?.length)             await tx.purchaseItem.createMany({ data: rows(t.purchaseItems), ...skip });
    if (t.estimateItems?.length)             await tx.estimateItem.createMany({ data: rows(t.estimateItems), ...skip });
    if (t.saleReturns?.length)               await tx.saleReturn.createMany({ data: rows(t.saleReturns), ...skip });
    if (t.purchaseReturns?.length)           await tx.purchaseReturn.createMany({ data: rows(t.purchaseReturns), ...skip });
    if (t.paymentInAllocations?.length)      await tx.paymentInAllocation.createMany({ data: rows(t.paymentInAllocations), ...skip });
    if (t.paymentOutAllocations?.length)     await tx.paymentOutAllocation.createMany({ data: rows(t.paymentOutAllocations), ...skip });
    if (t.stockAdjustmentItems?.length)      await tx.stockAdjustmentItem.createMany({ data: rows(t.stockAdjustmentItems), ...skip });
    if (t.stockTransferItems?.length)        await tx.stockTransferItem.createMany({ data: rows(t.stockTransferItems), ...skip });
    if (t.stockLedger?.length)               await tx.stockLedger.createMany({ data: rows(t.stockLedger), ...skip });
    if (t.journalLines?.length)              await tx.journalLine.createMany({ data: rows(t.journalLines), ...skip });
    if (t.payslips?.length)                  await tx.payslip.createMany({ data: rows(t.payslips), ...skip });
    if (t.loyaltyTransactions?.length)       await tx.loyaltyTransaction.createMany({ data: rows(t.loyaltyTransactions), ...skip });

    // Tier 6 — deepest
    if (t.saleReturnItems?.length)           await tx.saleReturnItem.createMany({ data: rows(t.saleReturnItems), ...skip });
    if (t.purchaseReturnItems?.length)       await tx.purchaseReturnItem.createMany({ data: rows(t.purchaseReturnItems), ...skip });
    if (t.payslipLines?.length)              await tx.payslipLine.createMany({ data: rows(t.payslipLines), ...skip });

  }, {
    // Large datasets need a longer timeout (default is 5s)
    timeout: 120_000,
    maxWait: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Auto-backup scheduler (checks every hour)
// ---------------------------------------------------------------------------
function checkAutoBackup() {
  try {
    const cfg = loadConfig();
    if (!cfg.auto?.enabled) return;

    const now = new Date();
    const [hStr, mStr] = (cfg.auto.time || '02:00').split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const files = fs.existsSync(BACKUP_DIR)
      ? fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
          .map(f => fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime())
          .sort((a, b) => b - a)
      : [];
    const lastTs = files.length ? new Date(files[0]) : null;

    let shouldRun = false;
    if (cfg.auto.frequency === 'daily') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      shouldRun = now >= today && (!lastTs || lastTs < today);
    } else if (cfg.auto.frequency === 'weekly') {
      const dayOfWeek = cfg.auto.weekDay ?? 1;
      const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
      const target = new Date(now);
      target.setDate(now.getDate() - (daysUntil === 0 ? 0 : 7 - daysUntil));
      target.setHours(h, m, 0, 0);
      shouldRun = now >= target && (!lastTs || lastTs < target);
    } else if (cfg.auto.frequency === 'monthly') {
      const monthDay = cfg.auto.monthDay ?? 1;
      const target = new Date(now.getFullYear(), now.getMonth(), monthDay, h, m);
      shouldRun = now >= target && (!lastTs || lastTs < target);
    }

    if (shouldRun) {
      const defaultTenantId = process.env.DEFAULT_TENANT_ID || '1';
      doCreateBackup(BigInt(defaultTenantId))
        .catch(err => console.error('[backup] auto backup failed:', err));
    }
  } catch (err) {
    console.error('[backup] scheduler error:', err);
  }
}

setTimeout(checkAutoBackup, 10_000);
setInterval(checkAutoBackup, 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

/* GET /api/backup/list */
router.get('/list', (_req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const items = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/backup/create */
router.post('/create', async (req, res) => {
  try {
    const result = await doCreateBackup(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/backup/download/:filename */
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!filename.startsWith('backup_') || !filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.download(filepath);
});

/**
 * POST /api/backup/restore/:filename
 *
 * Restores the tenant's data from a local backup file.
 * ⚠️  This is DESTRUCTIVE — all current tenant data is wiped first.
 *
 * Optional body: { confirm: true }  (require explicit confirmation)
 */
router.post('/restore/:filename', async (req, res) => {
  const { filename } = req.params;

  if (!filename.startsWith('backup_') || !filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!req.body?.confirm) {
    return res.status(400).json({
      error: 'Restore is destructive. Send { "confirm": true } in the request body to proceed.',
    });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup file not found' });

  try {
    await doRestore(filepath, req.tenantId);
    res.json({ success: true, restoredFrom: filename });
  } catch (err) {
    console.error('[backup] restore failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/backup/:filename */
router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  if (!filename.startsWith('backup_') || !filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  try {
    fs.unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/backup/settings */
router.get('/settings', (_req, res) => res.json(loadConfig()));

/* PUT /api/backup/settings */
router.put('/settings', (req, res) => {
  try {
    const updated = { ...loadConfig(), ...req.body };
    saveConfig(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;