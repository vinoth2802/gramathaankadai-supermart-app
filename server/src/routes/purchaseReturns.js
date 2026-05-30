import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = {
  items: true,
  party: { select: { id: true, name: true } },
};

/* GET /api/purchase-returns/next-number */
router.get('/next-number', async (req, res) => {
  try {
    const all = await prisma.purchaseReturn.findMany({ where: { tenantId: req.tenantId }, select: { debitNoteNo: true } });
    let max = 0;
    for (const r of all) {
      const m = String(r.debitNoteNo || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    res.json({ debitNoteNo: `DN-${String(max + 1).padStart(4, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/purchase-returns */
router.get('/', async (req, res) => {
  try {
    const { type, from, to, payment } = req.query;
    const where = { tenantId: req.tenantId };
    if (type)    where.type        = type;
    if (payment) where.paymentMode = payment;
    if (from && to) {
      where.date = { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) };
    }
    const returns = await prisma.purchaseReturn.findMany({
      where,
      include,
      orderBy: { date: 'desc' },
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/purchase-returns/:id */
router.get('/:id', async (req, res) => {
  try {
    const r = await prisma.purchaseReturn.findFirst({
      where: { id: Number(req.params.id), tenantId: req.tenantId },
      include,
    });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/purchase-returns */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      debitNoteNo, date, partyId, partyName, referenceInvoice,
      type, subtotal, gst, grandTotal,
      paymentMode, totalPaid, dueDate, paymentStatus,
      notes, items = [],
    } = req.body;

    if (!debitNoteNo) return res.status(400).json({ error: 'debitNoteNo is required' });

    const gt = Number(grandTotal ?? 0);
    const tp = Number(totalPaid   ?? 0);
    const derivedStatus = paymentStatus
      || (tp <= 0 ? 'Unpaid' : tp >= gt ? 'Paid' : 'Partial');

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseReturn.create({
        data: {
          tenantId,
          debitNoteNo,
          date:             date ? new Date(date) : new Date(),
          partyId:          partyId ? Number(partyId) : null,
          partyName:        partyName        || 'Walk-in Supplier',
          referenceInvoice: referenceInvoice || null,
          type:             type             || 'Debit Note',
          subtotal:         subtotal         ?? 0,
          gst:              gst              ?? 0,
          grandTotal:       gt,
          paymentMode:      paymentMode      || 'Cash',
          totalPaid:        tp,
          dueDate:          dueDate ? new Date(dueDate) : null,
          paymentStatus:    derivedStatus,
          notes:            notes || null,
          items: {
            create: items.map(i => ({
              tenantId,
              productId: i.productId ? Number(i.productId) : null,
              name:      i.name      || '',
              qty:       Number(i.qty      ?? 0),
              rate:      Number(i.rate     ?? 0),
              unit:      i.unit      || null,
              gstRate:   Number(i.gstRate  ?? 0),
              gstAmount: Number(i.gstAmount ?? 0),
              amount:    Number(i.amount   ?? 0),
            })),
          },
        },
        include,
      });
      // Reduce stock: goods returned to supplier leave inventory.
      for (const item of created.items) {
        if (item.productId && Number(item.qty) > 0) {
          await tx.product.updateMany({
            where: { id: item.productId, tenantId },
            data:  { stock: { decrement: Number(item.qty) } },
          });
        }
      }
      return created;
    });
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Debit note number already exists' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
