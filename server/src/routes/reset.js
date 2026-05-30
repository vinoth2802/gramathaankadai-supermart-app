import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* GET /api/reset/counts */
router.get('/counts', async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    const [items, parties, purchases, purchaseReturns, sales, saleReturns, paymentsIn, paymentsOut] = await Promise.all([
      prisma.product.count({ where }),
      prisma.party.count({ where }),
      prisma.purchase.count({ where }),
      prisma.purchaseReturn.count({ where }),
      prisma.sale.count({ where }),
      prisma.saleReturn.count({ where }),
      prisma.paymentInHistory.count({ where }),
      prisma.paymentOutHistory.count({ where }),
    ]);
    res.json({
      items,
      parties,
      purchases: purchases + purchaseReturns,
      sales: sales + saleReturns,
      paymentsIn,
      paymentsOut,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/reset/:type */
router.delete('/:type', async (req, res) => {
  const { type } = req.params;
  const tenantId = req.tenantId;
  try {
    let count = 0;

    if (type === 'items') {
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.updateMany({ where: { tenantId }, data: { productId: null } });
        const r = await tx.product.deleteMany({ where: { tenantId } });
        count = r.count;
      });

    } else if (type === 'parties') {
      await prisma.$transaction(async (tx) => {
        await tx.sale.updateMany({ where: { tenantId }, data: { partyId: null } });
        await tx.purchase.updateMany({ where: { tenantId }, data: { partyId: null } });
        await tx.paymentInHistory.updateMany({ where: { tenantId }, data: { partyId: null } });
        await tx.paymentOutHistory.updateMany({ where: { tenantId }, data: { partyId: null } });
        await tx.cheque.updateMany({ where: { tenantId }, data: { partyId: null } });
        await tx.estimate.updateMany({ where: { tenantId }, data: { partyId: null } });
        const r = await tx.party.deleteMany({ where: { tenantId } });
        count = r.count;
      });

    } else if (type === 'purchases') {
      await prisma.$transaction(async (tx) => {
        const ret = await tx.purchaseReturn.deleteMany({ where: { tenantId } });
        const r   = await tx.purchase.deleteMany({ where: { tenantId } });
        count = r.count + ret.count;
      });

    } else if (type === 'sales') {
      await prisma.$transaction(async (tx) => {
        const ret = await tx.saleReturn.deleteMany({ where: { tenantId } });
        const r   = await tx.sale.deleteMany({ where: { tenantId } });
        count = r.count + ret.count;
      });

    } else if (type === 'payments-in') {
      const r = await prisma.paymentInHistory.deleteMany({ where: { tenantId } });
      count = r.count;

    } else if (type === 'payments-out') {
      const r = await prisma.paymentOutHistory.deleteMany({ where: { tenantId } });
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
