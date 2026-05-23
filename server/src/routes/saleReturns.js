import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = {
  items: true,
  party: { select: { id: true, name: true } },
};

/* GET /api/sale-returns/next-number */
router.get('/next-number', async (_req, res) => {
  try {
    const all = await prisma.saleReturn.findMany({ select: { creditNoteNo: true } });
    let max = 0;
    for (const r of all) {
      const m = String(r.creditNoteNo || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    res.json({ creditNoteNo: `CN-${String(max + 1).padStart(4, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/sale-returns */
router.get('/', async (req, res) => {
  try {
    const { type, from, to, payment } = req.query;
    const where = {};
    if (type)    where.type        = type;
    if (payment) where.paymentMode = payment;
    if (from && to) {
      where.date = { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) };
    }
    const returns = await prisma.saleReturn.findMany({
      where,
      include,
      orderBy: { date: 'desc' },
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/sale-returns/:id */
router.get('/:id', async (req, res) => {
  try {
    const r = await prisma.saleReturn.findUnique({
      where: { id: Number(req.params.id) },
      include,
    });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/sale-returns */
router.post('/', async (req, res) => {
  try {
    const {
      creditNoteNo, date, partyId, partyName, referenceInvoice,
      type, subtotal, gst, grandTotal,
      paymentMode, totalReceived, dueDate, paymentStatus,
      notes, items = [],
    } = req.body;

    if (!creditNoteNo) return res.status(400).json({ error: 'creditNoteNo is required' });

    const gt = Number(grandTotal ?? 0);
    const tr = Number(totalReceived ?? 0);
    const derivedStatus = paymentStatus
      || (tr <= 0 ? 'Unpaid' : tr >= gt ? 'Paid' : 'Partial');

    const record = await prisma.saleReturn.create({
      data: {
        creditNoteNo,
        date:             date ? new Date(date) : new Date(),
        partyId:          partyId ? Number(partyId) : null,
        partyName:        partyName        || 'Walk-in Customer',
        referenceInvoice: referenceInvoice || null,
        type:             type             || 'Credit Note',
        subtotal:         subtotal         ?? 0,
        gst:              gst              ?? 0,
        grandTotal:       gt,
        paymentMode:      paymentMode      || 'Cash',
        totalReceived:    tr,
        dueDate:          dueDate ? new Date(dueDate) : null,
        paymentStatus:    derivedStatus,
        notes:            notes || null,
        items: {
          create: items.map(i => ({
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
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Credit note number already exists' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
