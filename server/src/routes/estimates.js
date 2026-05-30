import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const num = v => (v == null || v === '') ? 0    : Number(v);
const str = v => (v == null || v === '') ? null : String(v);
const dt  = v => v ? new Date(v) : null;

// EstimateItem stores the expiry in `expDate`; expose it as `expiryDate` for the client.
const outItem = i => ({ ...i, expiryDate: i.expDate });
const outEst  = e => ({ ...e, items: (e.items ?? []).map(outItem) });

const include = { items: { orderBy: { id: 'asc' } } };

const mapItem = it => ({
  productId:   it.productId ? num(it.productId) : null,
  name:        str(it.name),
  description: str(it.description),
  itemCount:   num(it.itemCount),
  batchNo:     str(it.batchNo),
  expDate:     dt(it.expiryDate),
  mfgDate:     dt(it.mfgDate),
  mrp:         num(it.mrp),
  size:        str(it.size),
  qty:         num(it.qty),
  freeQty:     num(it.freeQty),
  unit:        str(it.unit),
  rate:        num(it.rate),
  gstRate:     num(it.gstRate),
  gstAmount:   num(it.gstAmount),
  amount:      num(it.amount),
});

/* ── GET /next-number ── */
router.get('/next-number', async (req, res) => {
  try {
    const agg = await prisma.estimate.aggregate({ where: { tenantId: req.tenantId }, _max: { estimateNo: true } });
    const next = (agg._max.estimateNo ?? 0) + 1;
    res.json({ estimateNo: String(next), number: next });
  } catch (err) {
    console.error('estimates next-number error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET / ── */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { tenantId: req.tenantId };
    if (from && to) where.estimateDate = { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') };
    const rows = await prisma.estimate.findMany({ where, include, orderBy: { createdAt: 'desc' } });
    res.json(rows.map(outEst));
  } catch (err) {
    console.error('GET /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /:id ── */
router.get('/:id', async (req, res) => {
  try {
    const est = await prisma.estimate.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId }, include });
    if (!est) return res.status(404).json({ error: 'Not found' });
    res.json(outEst(est));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST / ── */
router.post('/', async (req, res) => {
  try {
    const {
      estimateNo, estimateDate, validTill,
      customerName, partyId, phone, billingAddress, stateOfSupply,
      subtotal, gst, grandTotal, adjustment,
      status = 'Open', notes, items = [],
    } = req.body;

    const est = await prisma.estimate.create({
      data: {
        tenantId:       req.tenantId,
        estimateNo:     num(estimateNo),
        estimateDate:   dt(estimateDate) ?? new Date(),
        validTill:      dt(validTill),
        customerName:   str(customerName) ?? 'Walk-in Customer',
        partyId:        partyId ? num(partyId) : null,
        phone:          str(phone),
        billingAddress: str(billingAddress),
        stateOfSupply:  str(stateOfSupply) ?? 'Tamil Nadu',
        subtotal:       num(subtotal),
        gst:            num(gst),
        grandTotal:     num(grandTotal),
        adjustment:     num(adjustment),
        status,
        notes:          str(notes),
        items: { create: items.map(it => ({ ...mapItem(it), tenantId: req.tenantId })) },
      },
      include,
    });
    res.status(201).json(outEst(est));
  } catch (err) {
    console.error('POST /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH /:id ── */
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.estimate.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const {
      estimateDate, validTill, customerName, partyId, phone,
      billingAddress, stateOfSupply, subtotal, gst, grandTotal,
      adjustment, status, notes,
    } = req.body;

    const data = { updatedAt: new Date() };
    if (estimateDate   !== undefined) data.estimateDate   = dt(estimateDate);
    if (validTill      !== undefined) data.validTill      = dt(validTill);
    if (customerName   !== undefined) data.customerName   = str(customerName);
    if (partyId        !== undefined) data.partyId        = partyId ? num(partyId) : null;
    if (phone          !== undefined) data.phone          = str(phone);
    if (billingAddress !== undefined) data.billingAddress = str(billingAddress);
    if (stateOfSupply  !== undefined) data.stateOfSupply  = str(stateOfSupply);
    if (subtotal       !== undefined) data.subtotal       = num(subtotal);
    if (gst            !== undefined) data.gst            = num(gst);
    if (grandTotal     !== undefined) data.grandTotal     = num(grandTotal);
    if (adjustment     !== undefined) data.adjustment     = num(adjustment);
    if (status         !== undefined) data.status         = str(status);
    if (notes          !== undefined) data.notes          = str(notes);

    const est = await prisma.estimate.update({ where: { id }, data, include });
    res.json(outEst(est));
  } catch (err) {
    console.error('PATCH /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /:id ── */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.estimate.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /:id/convert ── */
router.post('/:id/convert', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.estimate.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const status = req.body.type === 'cancel' ? 'Cancelled' : 'Converted';
    const est = await prisma.estimate.update({ where: { id }, data: { status, updatedAt: new Date() }, include });
    res.json(outEst(est));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
