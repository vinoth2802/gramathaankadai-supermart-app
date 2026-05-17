import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json(settings ?? {});
});

router.put('/', async (req, res) => {
  const { shopName, address, phone, gstin, invoicePrefix, currency } = req.body;
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      shopName:      shopName      || 'Gramathaankadai SuperMart',
      address:       address       || null,
      phone:         phone         || null,
      gstin:         gstin         || null,
      invoicePrefix: invoicePrefix || 'INV',
      currency:      currency      || 'INR',
    },
    update: {
      shopName:      shopName      || 'Gramathaankadai SuperMart',
      address:       address       || null,
      phone:         phone         || null,
      gstin:         gstin         || null,
      invoicePrefix: invoicePrefix || 'INV',
      currency:      currency      || 'INR',
    },
  });
  res.json(settings);
});

export default router;
