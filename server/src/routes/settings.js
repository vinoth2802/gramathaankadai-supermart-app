import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/*
 * v2 note: the tenant_settings table keeps a small set of typed columns plus a
 * `printFlags` JSON column. The legacy single-row settings table (id = 1) had
 * dozens of flat columns that no longer exist. To preserve every settings group
 * without data loss, each group is stored under a namespaced key inside the
 * `printFlags` JSON, scoped per tenant. Shop profile (name/address/…) ideally
 * belongs on Tenant/TenantLocation; it is kept here under `profile` for now.
 */

async function loadFlags(tenantId) {
  const row = await prisma.settings.findUnique({ where: { tenantId } });
  const flags = (row && typeof row.printFlags === 'object' && row.printFlags) ? row.printFlags : {};
  return { row, flags };
}

async function readGroup(tenantId, key) {
  const { flags } = await loadFlags(tenantId);
  return flags[key] ?? {};
}

async function writeGroup(tenantId, key, value) {
  const { flags } = await loadFlags(tenantId);
  flags[key] = value;
  await prisma.settings.upsert({
    where:  { tenantId },
    create: { tenantId, printFlags: flags },
    update: { printFlags: flags },
  });
  return value;
}

// Merge stored group over defaults so the client always gets a complete shape.
const merged = (defaults, stored) => ({ ...defaults, ...stored });

/* ── Shop profile ── */
const PROFILE_DEFAULTS = {
  shopName: 'Gramathaankadai SuperMart', firmName: null, address: null,
  pincode: null, state: null, phone: null, gstin: null,
  invoicePrefix: 'INV', currency: 'INR',
};

router.get('/', async (req, res) => {
  try {
    const profile = merged(PROFILE_DEFAULTS, await readGroup(req.tenantId, 'profile'));
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.tenantId },
      select: { displayName: true, legalName: true, slug: true },
    });
    const tenantName = tenant?.displayName || tenant?.legalName || tenant?.slug || null;
    res.json({ ...profile, tenantName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const { shopName, firmName, address, pincode, state, phone, gstin, invoicePrefix, currency } = req.body;
    const value = {
      shopName:      shopName      || 'Gramathaankadai SuperMart',
      firmName:      firmName      || null,
      address:       address       || null,
      pincode:       pincode       || null,
      state:         state         || null,
      phone:         phone         || null,
      gstin:         gstin         || null,
      invoicePrefix: invoicePrefix || 'INV',
      currency:      currency      || 'INR',
    };
    res.json(await writeGroup(req.tenantId, 'profile', value));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Loyalty ── */
const LOYALTY_DEFAULTS = {
  loyaltyEnabled: true, loyaltyPointsPerRupee: 1, loyaltyMinPoints: 100,
  loyaltyPointsValue: 0.10, loyaltyExpiryDays: 365, loyaltyMaxDiscount: 10,
  loyaltyAllowPartial: true, loyaltyShowOnInvoice: true,
};

router.get('/loyalty', async (req, res) => {
  try { res.json(merged(LOYALTY_DEFAULTS, await readGroup(req.tenantId, 'loyalty'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/loyalty', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'loyalty', merged(LOYALTY_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Print ── */
const PRINT_DEFAULTS = {
  paperSize: 'A4', invoiceTitle: 'Tax Invoice', copies: 1, showLogo: false,
  showAddress: true, showGstin: true, showPhone: true, showCustomerDetails: true,
  showDueDate: true, showHsn: true, showBatch: false, showExpiry: false,
  showMrp: true, showFreeQty: false, showGstBreakdown: true, showGstSplit: false,
  footerText: 'Thank you for shopping with us!', showSignature: false,
  showTerms: false, termsText: 'Goods once sold will not be returned.', showLoyaltyPoints: true,
};

router.get('/print', async (req, res) => {
  try { res.json(merged(PRINT_DEFAULTS, await readGroup(req.tenantId, 'print'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/print', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'print', merged(PRINT_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Tax ── */
const TAX_DEFAULTS = {
  taxMethod: 'exclusive', defaultGstRate: 5, roundOff: 'nearest_rupee',
  supplyType: 'intrastate', businessType: 'regular', compositionRate: 1,
  enableTcs: false, tcsRate: 1, enableTds: false, tdsRate: 2,
  enableCess: false, cessRate: 0, enableReverseCharge: false,
  activeSlabs: [0, 5, 12, 18, 28], customSlabs: [],
};

router.get('/tax', async (req, res) => {
  try { res.json(merged(TAX_DEFAULTS, await readGroup(req.tenantId, 'tax'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tax', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'tax', merged(TAX_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Transaction ── */
const TXN_DEFAULTS = {
  salePaymentMode: 'Cash', saleCreditDays: 30, requireCustomer: false,
  allowNegativeStock: false, decimalQty: true, enableSaleReturns: true, saleReturnDays: 7,
  purchasePaymentMode: 'Cash', purchaseCreditDays: 30, autoUpdatePurchasePrice: true,
  autoUpdateMrp: false, enablePurchaseReturns: true,
  purchasePrefix: 'PUR', estimatePrefix: 'EST', invoiceResetPeriod: 'never', invoicePadding: 4,
  allowItemDiscount: true, allowBillDiscount: true, maxDiscountPct: 100,
  enableEstimates: true, lowStockWarning: true, blockBelowMinStock: false, enableBarcode: true,
};

router.get('/transaction', async (req, res) => {
  try { res.json(merged(TXN_DEFAULTS, await readGroup(req.tenantId, 'transaction'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/transaction', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'transaction', merged(TXN_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Party ── */
const PARTY_DEFAULTS = {
  defaultType: 'customer', defaultPartyType: 'B2C', requirePhone: false,
  requireGstin: false, enableCreditLimit: false, defaultCreditLimit: 0,
  duplicateCheck: true, showBalance: true, autoWhatsapp: false,
};

router.get('/party', async (req, res) => {
  try { res.json(merged(PARTY_DEFAULTS, await readGroup(req.tenantId, 'party'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/party', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'party', merged(PARTY_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Item ── */
const ITEM_DEFAULTS = {
  defaultUom: 'PCS', enableBatch: false, enableExpiry: false, enableMrp: true,
  enableHsn: true, enableLocation: false, defaultReorderLevel: 10,
  priceDecimals: 2, qtyDecimals: 3, enableWholesale: false,
  barcodeType: 'EAN13', negativeStockAlert: true,
};

router.get('/item', async (req, res) => {
  try { res.json(merged(ITEM_DEFAULTS, await readGroup(req.tenantId, 'item'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/item', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'item', merged(ITEM_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Unit ── */
const UNIT_DEFAULTS = { defaultCode: 'PCS', enableConversion: false, enableSecondary: false };

router.get('/unit', async (req, res) => {
  try { res.json(merged(UNIT_DEFAULTS, await readGroup(req.tenantId, 'unit'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/unit', async (req, res) => {
  try { res.json(await writeGroup(req.tenantId, 'unit', merged(UNIT_DEFAULTS, req.body))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
