import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = {
  items: true,
  party: { select: { id: true, name: true } },
};

/* ── Next estimate number ── */
router.get('/next-number', async (req, res) => {
  try {
    const last = await prisma.estimate.findFirst({
      orderBy: { estimateNo: 'desc' },
      select:  { estimateNo: true },
    });
    const next = (last?.estimateNo ?? 0) + 1;
    res.json({ estimateNo: String(next), number: next });
  } catch (err) {
    console.error('estimates next-number error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET all ── */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const estimates = await prisma.estimate.findMany({
      where: from && to
        ? { estimateDate: { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) } }
        : undefined,
      include,
      orderBy: { createdAt: 'desc' },
    });
    res.json(estimates);
  } catch (err) {
    console.error('GET /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET by id ── */
router.get('/:id', async (req, res) => {
  try {
    const estimate = await prisma.estimate.findUnique({
      where: { id: Number(req.params.id) },
      include,
    });
    if (!estimate) return res.status(404).json({ error: 'Not found' });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST create ── */
router.post('/', async (req, res) => {
  try {
    const {
      estimateNo, estimateDate, validTill,
      customerName, partyId, phone, billingAddress, stateOfSupply,
      subtotal, gst, grandTotal, adjustment,
      status, notes, items = [],
    } = req.body;

    const estimate = await prisma.estimate.create({
      data: {
        estimateNo:    Number(estimateNo)    || 1,
        estimateDate:  estimateDate ? new Date(estimateDate) : new Date(),
        validTill:     validTill    ? new Date(validTill)    : null,
        customerName:  customerName  || 'Walk-in Customer',
        partyId:       partyId       ? Number(partyId)       : null,
        phone:         phone         || null,
        billingAddress: billingAddress || null,
        stateOfSupply: stateOfSupply  || 'Tamil Nadu',
        subtotal:      Number(subtotal)    || 0,
        gst:           Number(gst)         || 0,
        grandTotal:    Number(grandTotal)  || 0,
        adjustment:    Number(adjustment)  || 0,
        status:        status || 'Open',
        notes:         notes  || null,
        items: {
          create: items.map(it => ({
            productId:   it.productId ? Number(it.productId) : null,
            name:        it.name,
            description: it.description || null,
            itemCount:   Number(it.itemCount)  || 0,
            batchNo:     it.batchNo     || null,
            expiryDate:  it.expiryDate  || null,
            mfgDate:     it.mfgDate     || null,
            mrp:         Number(it.mrp)         || 0,
            size:        it.size        || null,
            qty:         Number(it.qty)         || 0,
            freeQty:     Number(it.freeQty)     || 0,
            unit:        it.unit        || null,
            rate:        Number(it.rate)        || 0,
            gstRate:     Number(it.gstRate)     || 0,
            gstAmount:   Number(it.gstAmount)   || 0,
            amount:      Number(it.amount)      || 0,
          })),
        },
      },
      include,
    });
    res.status(201).json(estimate);
  } catch (err) {
    console.error('POST /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH update ── */
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { items, estimateDate, validTill, partyId, estimateNo, grandTotal, subtotal, gst, adjustment, ...rest } = req.body;

    const estimate = await prisma.estimate.update({
      where: { id },
      data: {
        ...rest,
        ...(estimateNo    !== undefined && { estimateNo:   Number(estimateNo)   }),
        ...(estimateDate  !== undefined && { estimateDate: new Date(estimateDate) }),
        ...(validTill     !== undefined && { validTill:    validTill ? new Date(validTill) : null }),
        ...(partyId       !== undefined && { partyId:      partyId ? Number(partyId) : null }),
        ...(grandTotal    !== undefined && { grandTotal:   Number(grandTotal)   }),
        ...(subtotal      !== undefined && { subtotal:     Number(subtotal)     }),
        ...(gst           !== undefined && { gst:          Number(gst)          }),
        ...(adjustment    !== undefined && { adjustment:   Number(adjustment)   }),
      },
      include,
    });
    res.json(estimate);
  } catch (err) {
    console.error('PATCH /estimates/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE ── */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.estimate.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST convert ── */
router.post('/:id/convert', async (req, res) => {
  try {
    const { type } = req.body;
    const status = type === 'cancel' ? 'Cancelled' : 'Converted';
    const estimate = await prisma.estimate.update({
      where: { id: Number(req.params.id) },
      data:  { status },
      include,
    });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
