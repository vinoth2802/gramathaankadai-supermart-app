import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* GET /api/reset/counts */
router.get('/counts', async (_req, res) => {
  try {
    const [items, parties, purchases, sales, paymentsIn, paymentsOut] = await Promise.all([
      prisma.product.count(),
      prisma.party.count(),
      prisma.purchase.count(),
      prisma.sale.count(),
      prisma.paymentInHistory.count(),
      prisma.paymentOutHistory.count(),
    ]);
    res.json({ items, parties, purchases, sales, paymentsIn, paymentsOut });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/reset/:type */
router.delete('/:type', async (req, res) => {
  const { type } = req.params;
  try {
    let count = 0;

    if (type === 'items') {
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.updateMany({ data: { productId: null } });
        const r = await tx.product.deleteMany();
        count = r.count;
      });

    } else if (type === 'parties') {
      await prisma.$transaction(async (tx) => {
        await tx.sale.updateMany({ data: { partyId: null } });
        await tx.purchase.updateMany({ data: { partyId: null } });
        await tx.paymentInHistory.updateMany({ data: { partyId: null } });
        await tx.paymentOutHistory.updateMany({ data: { partyId: null } });
        await tx.cheque.updateMany({ data: { partyId: null } });
        await tx.estimate.updateMany({ data: { partyId: null } });
        const r = await tx.party.deleteMany();
        count = r.count;
      });

    } else if (type === 'purchases') {
      const r = await prisma.purchase.deleteMany();
      count = r.count;

    } else if (type === 'sales') {
      const r = await prisma.sale.deleteMany();
      count = r.count;

    } else if (type === 'payments-in') {
      const r = await prisma.paymentInHistory.deleteMany();
      count = r.count;

    } else if (type === 'payments-out') {
      const r = await prisma.paymentOutHistory.deleteMany();
      count = r.count;

    } else {
      return res.status(400).json({ error: 'Invalid reset type' });
    }

    res.json({ deleted: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
