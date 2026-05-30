import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Map frontend field names → Prisma field names
function toDb(body) {
  return {
    investorName:     body.name        || body.investorName,
    type:             body.type,
    contactNumber:    body.phone       || body.contactNumber  || null,
    email:            body.email       || null,
    address:          body.address     || null,
    investmentAmount: body.amount      != null ? Number(body.amount)  : (body.investmentAmount != null ? Number(body.investmentAmount) : 0),
    equityPercent:    body.equity      != null ? Number(body.equity)  : (body.equityPercent    != null ? Number(body.equityPercent)    : 0),
    investmentDate:   new Date(body.date || body.investmentDate),
    paymentMode:      body.paymentMode || null,
    referenceNo:      body.reference   || body.referenceNo   || null,
    notes:            body.notes       || null,
    status:           body.status      || 'Active',
  };
}

// Map Prisma record → frontend-friendly shape
function toClient(rec) {
  return {
    id:          rec.id,
    name:        rec.investorName,
    type:        rec.type,
    phone:       rec.contactNumber,
    email:       rec.email,
    address:     rec.address,
    amount:      rec.investmentAmount,
    equity:      rec.equityPercent,
    date:        rec.investmentDate,
    paymentMode: rec.paymentMode,
    reference:   rec.referenceNo,
    notes:       rec.notes,
    status:      rec.status,
    createdAt:   rec.createdAt,
    updatedAt:   rec.updatedAt,
  };
}

// GET /api/capital-investments?type=Director
router.get('/', async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    if (req.query.type) where.type = req.query.type;
    const records = await prisma.capitalInvestment.findMany({
      where,
      orderBy: { investmentDate: 'desc' },
    });
    res.json(records.map(toClient));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/capital-investments/:id
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.capitalInvestment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(toClient(record));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/capital-investments
router.post('/', async (req, res) => {
  try {
    const data = toDb(req.body);
    if (!data.investorName) return res.status(400).json({ error: 'Investor name required' });
    if (!data.investmentDate || isNaN(data.investmentDate)) return res.status(400).json({ error: 'Valid investment date required' });
    const record = await prisma.capitalInvestment.create({ data: { ...data, tenantId: req.tenantId } });
    res.status(201).json(toClient(record));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/capital-investments/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.capitalInvestment.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = toDb(req.body);
    data.updatedAt = new Date();
    const record = await prisma.capitalInvestment.update({ where: { id }, data });
    res.json(toClient(record));
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/capital-investments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.capitalInvestment.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
