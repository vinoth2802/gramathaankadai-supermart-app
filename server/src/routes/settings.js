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

export default router;
