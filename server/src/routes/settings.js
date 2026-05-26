import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json(settings ?? {});
});

router.put('/', async (req, res) => {
  const { shopName, firmName, address, pincode, state, phone, gstin, invoicePrefix, currency } = req.body;
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      shopName:      shopName      || 'Gramathaankadai SuperMart',
      firmName:      firmName      || null,
      address:       address       || null,
      pincode:       pincode       || null,
      state:         state         || null,
      phone:         phone         || null,
      gstin:         gstin         || null,
      invoicePrefix: invoicePrefix || 'INV',
      currency:      currency      || 'INR',
    },
    update: {
      shopName:      shopName      || 'Gramathaankadai SuperMart',
      firmName:      firmName      || null,
      address:       address       || null,
      pincode:       pincode       || null,
      state:         state         || null,
      phone:         phone         || null,
      gstin:         gstin         || null,
      invoicePrefix: invoicePrefix || 'INV',
      currency:      currency      || 'INR',
    },
  });
  res.json(settings);
});

/* GET /api/settings/loyalty */
router.get('/loyalty', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      loyaltyEnabled:        s?.loyaltyEnabled        ?? true,
      loyaltyPointsPerRupee: s?.loyaltyPointsPerRupee ?? 1,
      loyaltyMinPoints:      s?.loyaltyMinPoints      ?? 100,
      loyaltyPointsValue:    s?.loyaltyPointsValue    ?? 0.10,
      loyaltyExpiryDays:     s?.loyaltyExpiryDays     ?? 365,
      loyaltyMaxDiscount:    s?.loyaltyMaxDiscount    ?? 10,
      loyaltyAllowPartial:   s?.loyaltyAllowPartial   ?? true,
      loyaltyShowOnInvoice:  s?.loyaltyShowOnInvoice  ?? true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* PUT /api/settings/loyalty */
router.put('/loyalty', async (req, res) => {
  try {
    const {
      loyaltyEnabled, loyaltyPointsPerRupee, loyaltyMinPoints,
      loyaltyPointsValue, loyaltyExpiryDays, loyaltyMaxDiscount,
      loyaltyAllowPartial, loyaltyShowOnInvoice,
    } = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        shopName: 'Gramathaankadai SuperMart',
        loyaltyEnabled:        loyaltyEnabled        ?? true,
        loyaltyPointsPerRupee: loyaltyPointsPerRupee ?? 1,
        loyaltyMinPoints:      loyaltyMinPoints      ?? 100,
        loyaltyPointsValue:    loyaltyPointsValue    ?? 0.10,
        loyaltyExpiryDays:     loyaltyExpiryDays     ?? 365,
        loyaltyMaxDiscount:    loyaltyMaxDiscount    ?? 10,
        loyaltyAllowPartial:   loyaltyAllowPartial   ?? true,
        loyaltyShowOnInvoice:  loyaltyShowOnInvoice  ?? true,
      },
      update: {
        loyaltyEnabled:        loyaltyEnabled        ?? true,
        loyaltyPointsPerRupee: loyaltyPointsPerRupee ?? 1,
        loyaltyMinPoints:      loyaltyMinPoints      ?? 100,
        loyaltyPointsValue:    loyaltyPointsValue    ?? 0.10,
        loyaltyExpiryDays:     loyaltyExpiryDays     ?? 365,
        loyaltyMaxDiscount:    loyaltyMaxDiscount    ?? 10,
        loyaltyAllowPartial:   loyaltyAllowPartial   ?? true,
        loyaltyShowOnInvoice:  loyaltyShowOnInvoice  ?? true,
      },
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Print settings ── */
router.get('/print', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      paperSize:           s?.printPaperSize           ?? 'A4',
      invoiceTitle:        s?.printInvoiceTitle        ?? 'Tax Invoice',
      copies:              s?.printCopies              ?? 1,
      showLogo:            s?.printShowLogo            ?? false,
      showAddress:         s?.printShowAddress         ?? true,
      showGstin:           s?.printShowGstin           ?? true,
      showPhone:           s?.printShowPhone           ?? true,
      showCustomerDetails: s?.printShowCustomerDetails ?? true,
      showDueDate:         s?.printShowDueDate         ?? true,
      showHsn:             s?.printShowHsn             ?? true,
      showBatch:           s?.printShowBatch           ?? false,
      showExpiry:          s?.printShowExpiry          ?? false,
      showMrp:             s?.printShowMrp             ?? true,
      showFreeQty:         s?.printShowFreeQty         ?? false,
      showGstBreakdown:    s?.printShowGstBreakdown    ?? true,
      showGstSplit:        s?.printShowGstSplit        ?? false,
      footerText:          s?.printFooterText          ?? 'Thank you for shopping with us!',
      showSignature:       s?.printShowSignature       ?? false,
      showTerms:           s?.printShowTerms           ?? false,
      termsText:           s?.printTermsText           ?? 'Goods once sold will not be returned.',
      showLoyaltyPoints:   s?.printShowLoyaltyPoints   ?? true,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/print', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      printPaperSize:           d.paperSize           ?? 'A4',
      printInvoiceTitle:        d.invoiceTitle        ?? 'Tax Invoice',
      printCopies:              d.copies              ?? 1,
      printShowLogo:            d.showLogo            ?? false,
      printShowAddress:         d.showAddress         ?? true,
      printShowGstin:           d.showGstin           ?? true,
      printShowPhone:           d.showPhone           ?? true,
      printShowCustomerDetails: d.showCustomerDetails ?? true,
      printShowDueDate:         d.showDueDate         ?? true,
      printShowHsn:             d.showHsn             ?? true,
      printShowBatch:           d.showBatch           ?? false,
      printShowExpiry:          d.showExpiry          ?? false,
      printShowMrp:             d.showMrp             ?? true,
      printShowFreeQty:         d.showFreeQty         ?? false,
      printShowGstBreakdown:    d.showGstBreakdown    ?? true,
      printShowGstSplit:        d.showGstSplit        ?? false,
      printFooterText:          d.footerText          ?? 'Thank you for shopping with us!',
      printShowSignature:       d.showSignature       ?? false,
      printShowTerms:           d.showTerms           ?? false,
      printTermsText:           d.termsText           ?? 'Goods once sold will not be returned.',
      printShowLoyaltyPoints:   d.showLoyaltyPoints   ?? true,
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Tax settings ── */
router.get('/tax', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      taxMethod:           s?.taxMethod            ?? 'exclusive',
      defaultGstRate:      Number(s?.taxDefaultGstRate ?? 5),
      roundOff:            s?.taxRoundOff          ?? 'nearest_rupee',
      supplyType:          s?.taxSupplyType        ?? 'intrastate',
      businessType:        s?.taxBusinessType      ?? 'regular',
      compositionRate:     Number(s?.taxCompositionRate ?? 1),
      enableTcs:           s?.taxEnableTcs         ?? false,
      tcsRate:             Number(s?.taxTcsRate    ?? 1),
      enableTds:           s?.taxEnableTds         ?? false,
      tdsRate:             Number(s?.taxTdsRate    ?? 2),
      enableCess:          s?.taxEnableCess        ?? false,
      cessRate:            Number(s?.taxCessRate   ?? 0),
      enableReverseCharge: s?.taxEnableReverseCharge ?? false,
      activeSlabs:         s?.taxActiveSlabs       ?? [0, 5, 12, 18, 28],
      customSlabs:         s?.taxCustomSlabs       ?? [],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tax', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      taxMethod:             d.taxMethod            ?? 'exclusive',
      taxDefaultGstRate:     d.defaultGstRate       ?? 5,
      taxRoundOff:           d.roundOff             ?? 'nearest_rupee',
      taxSupplyType:         d.supplyType           ?? 'intrastate',
      taxBusinessType:       d.businessType         ?? 'regular',
      taxCompositionRate:    d.compositionRate      ?? 1,
      taxEnableTcs:          d.enableTcs            ?? false,
      taxTcsRate:            d.tcsRate              ?? 1,
      taxEnableTds:          d.enableTds            ?? false,
      taxTdsRate:            d.tdsRate              ?? 2,
      taxEnableCess:         d.enableCess           ?? false,
      taxCessRate:           d.cessRate             ?? 0,
      taxEnableReverseCharge: d.enableReverseCharge ?? false,
      taxActiveSlabs:        d.activeSlabs          ?? [0, 5, 12, 18, 28],
      taxCustomSlabs:        d.customSlabs          ?? [],
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Transaction settings ── */
router.get('/transaction', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      // Sales
      salePaymentMode:      s?.txnSalePaymentMode      ?? 'Cash',
      saleCreditDays:       s?.txnSaleCreditDays       ?? 30,
      requireCustomer:      s?.txnRequireCustomer      ?? false,
      allowNegativeStock:   s?.txnAllowNegativeStock   ?? false,
      decimalQty:           s?.txnDecimalQty           ?? true,
      enableSaleReturns:    s?.txnEnableSaleReturns    ?? true,
      saleReturnDays:       s?.txnSaleReturnDays       ?? 7,
      // Purchases
      purchasePaymentMode:     s?.txnPurchasePaymentMode     ?? 'Cash',
      purchaseCreditDays:      s?.txnPurchaseCreditDays      ?? 30,
      autoUpdatePurchasePrice: s?.txnAutoUpdatePurchasePrice ?? true,
      autoUpdateMrp:           s?.txnAutoUpdateMrp           ?? false,
      enablePurchaseReturns:   s?.txnEnablePurchaseReturns   ?? true,
      // Invoice numbering
      purchasePrefix:      s?.txnPurchasePrefix      ?? 'PUR',
      estimatePrefix:      s?.txnEstimatePrefix      ?? 'EST',
      invoiceResetPeriod:  s?.txnInvoiceResetPeriod  ?? 'never',
      invoicePadding:      s?.txnInvoicePadding      ?? 4,
      // Discount
      allowItemDiscount:  s?.txnAllowItemDiscount  ?? true,
      allowBillDiscount:  s?.txnAllowBillDiscount  ?? true,
      maxDiscountPct:     Number(s?.txnMaxDiscountPct ?? 100),
      // Estimates & stock
      enableEstimates:     s?.txnEnableEstimates     ?? true,
      lowStockWarning:     s?.txnLowStockWarning     ?? true,
      blockBelowMinStock:  s?.txnBlockBelowMinStock  ?? false,
      enableBarcode:       s?.txnEnableBarcode       ?? true,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/transaction', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      txnSalePaymentMode:      d.salePaymentMode      ?? 'Cash',
      txnSaleCreditDays:       d.saleCreditDays       ?? 30,
      txnRequireCustomer:      d.requireCustomer      ?? false,
      txnAllowNegativeStock:   d.allowNegativeStock   ?? false,
      txnDecimalQty:           d.decimalQty           ?? true,
      txnEnableSaleReturns:    d.enableSaleReturns    ?? true,
      txnSaleReturnDays:       d.saleReturnDays       ?? 7,
      txnPurchasePaymentMode:     d.purchasePaymentMode     ?? 'Cash',
      txnPurchaseCreditDays:      d.purchaseCreditDays      ?? 30,
      txnAutoUpdatePurchasePrice: d.autoUpdatePurchasePrice ?? true,
      txnAutoUpdateMrp:           d.autoUpdateMrp           ?? false,
      txnEnablePurchaseReturns:   d.enablePurchaseReturns   ?? true,
      txnPurchasePrefix:      d.purchasePrefix      ?? 'PUR',
      txnEstimatePrefix:      d.estimatePrefix      ?? 'EST',
      txnInvoiceResetPeriod:  d.invoiceResetPeriod  ?? 'never',
      txnInvoicePadding:      d.invoicePadding      ?? 4,
      txnAllowItemDiscount:  d.allowItemDiscount  ?? true,
      txnAllowBillDiscount:  d.allowBillDiscount  ?? true,
      txnMaxDiscountPct:     d.maxDiscountPct     ?? 100,
      txnEnableEstimates:     d.enableEstimates     ?? true,
      txnLowStockWarning:     d.lowStockWarning     ?? true,
      txnBlockBelowMinStock:  d.blockBelowMinStock  ?? false,
      txnEnableBarcode:       d.enableBarcode       ?? true,
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Party settings ── */
router.get('/party', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      defaultType:        s?.partyDefaultType        ?? 'customer',
      defaultPartyType:   s?.partyDefaultPartyType   ?? 'B2C',
      requirePhone:       s?.partyRequirePhone       ?? false,
      requireGstin:       s?.partyRequireGstin       ?? false,
      enableCreditLimit:  s?.partyEnableCreditLimit  ?? false,
      defaultCreditLimit: Number(s?.partyDefaultCreditLimit ?? 0),
      duplicateCheck:     s?.partyDuplicateCheck     ?? true,
      showBalance:        s?.partyShowBalance        ?? true,
      autoWhatsapp:       s?.partyAutoWhatsapp       ?? false,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/party', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      partyDefaultType:        d.defaultType        ?? 'customer',
      partyDefaultPartyType:   d.defaultPartyType   ?? 'B2C',
      partyRequirePhone:       d.requirePhone       ?? false,
      partyRequireGstin:       d.requireGstin       ?? false,
      partyEnableCreditLimit:  d.enableCreditLimit  ?? false,
      partyDefaultCreditLimit: d.defaultCreditLimit ?? 0,
      partyDuplicateCheck:     d.duplicateCheck     ?? true,
      partyShowBalance:        d.showBalance        ?? true,
      partyAutoWhatsapp:       d.autoWhatsapp       ?? false,
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Item settings ── */
router.get('/item', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      defaultUom:          s?.itemDefaultUom          ?? 'PCS',
      enableBatch:         s?.itemEnableBatch         ?? false,
      enableExpiry:        s?.itemEnableExpiry        ?? false,
      enableMrp:           s?.itemEnableMrp           ?? true,
      enableHsn:           s?.itemEnableHsn           ?? true,
      enableLocation:      s?.itemEnableLocation      ?? false,
      defaultReorderLevel: Number(s?.itemDefaultReorderLevel ?? 10),
      priceDecimals:       s?.itemPriceDecimals       ?? 2,
      qtyDecimals:         s?.itemQtyDecimals         ?? 3,
      enableWholesale:     s?.itemEnableWholesale     ?? false,
      barcodeType:         s?.itemBarcodeType         ?? 'EAN13',
      negativeStockAlert:  s?.itemNegativeStockAlert  ?? true,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/item', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      itemDefaultUom:          d.defaultUom          ?? 'PCS',
      itemEnableBatch:         d.enableBatch         ?? false,
      itemEnableExpiry:        d.enableExpiry        ?? false,
      itemEnableMrp:           d.enableMrp           ?? true,
      itemEnableHsn:           d.enableHsn           ?? true,
      itemEnableLocation:      d.enableLocation      ?? false,
      itemDefaultReorderLevel: d.defaultReorderLevel ?? 10,
      itemPriceDecimals:       d.priceDecimals       ?? 2,
      itemQtyDecimals:         d.qtyDecimals         ?? 3,
      itemEnableWholesale:     d.enableWholesale     ?? false,
      itemBarcodeType:         d.barcodeType         ?? 'EAN13',
      itemNegativeStockAlert:  d.negativeStockAlert  ?? true,
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Unit settings ── */
router.get('/unit', async (_req, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      defaultCode:      s?.unitDefaultCode      ?? 'PCS',
      enableConversion: s?.unitEnableConversion ?? false,
      enableSecondary:  s?.unitEnableSecondary  ?? false,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/unit', async (req, res) => {
  try {
    const d = req.body;
    const data = {
      unitDefaultCode:      d.defaultCode      ?? 'PCS',
      unitEnableConversion: d.enableConversion ?? false,
      unitEnableSecondary:  d.enableSecondary  ?? false,
    };
    const s = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, shopName: 'Gramathaankadai SuperMart', ...data },
      update: data,
    });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
