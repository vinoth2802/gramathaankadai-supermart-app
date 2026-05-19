import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// ── Payment Modes ──────────────────────────────────────────────
router.get('/modes', async (_req, res) => {
  const modes = await prisma.paymentMode.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });
  res.json(modes);
});

router.post('/modes', async (req, res) => {
  const mode = await prisma.paymentMode.create({
    data: { name: req.body.name, descr: req.body.descr || null },
  });
  res.status(201).json(mode);
});

router.delete('/modes/:id', async (req, res) => {
  await prisma.paymentMode.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false },
  });
  res.status(204).end();
});

// ── Payments In ───────────────────────────────────────────────
router.get('/in', async (_req, res) => {
  const records = await prisma.paymentInHistory.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { party: { select: { id: true, name: true } } },
  });
  res.json(records);
});

router.get('/in/:id', async (req, res) => {
  const record = await prisma.paymentInHistory.findUnique({
    where: { id: Number(req.params.id) },
    include: { party: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.post('/in', async (req, res) => {
  const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
  const record = await prisma.paymentInHistory.create({
    data: {
      partyId:     partyId     ? Number(partyId) : null,
      partyName:   partyName   || null,
      amount:      Number(amount  || 0),
      discount:    Number(discount || 0),
      paymentMode: paymentMode || 'Cash',
      reference:   reference   || null,
      notes:       notes       || null,
      status:      status      || 'Unused',
      date:        date ? new Date(date) : undefined,
    },
  });
  res.status(201).json(record);
});

router.patch('/in/:id', async (req, res) => {
  const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
  const data = {};
  if (partyId     !== undefined) data.partyId     = partyId ? Number(partyId) : null;
  if (partyName   !== undefined) data.partyName   = partyName   || null;
  if (amount      !== undefined) data.amount      = Number(amount);
  if (discount    !== undefined) data.discount    = Number(discount);
  if (paymentMode !== undefined) data.paymentMode = paymentMode;
  if (reference   !== undefined) data.reference   = reference   || null;
  if (notes       !== undefined) data.notes       = notes       || null;
  if (status      !== undefined) data.status      = status;
  if (date        !== undefined) data.date        = new Date(date);

  const record = await prisma.paymentInHistory.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json(record);
});

router.delete('/in/:id', async (req, res) => {
  await prisma.paymentInHistory.delete({
    where: { id: Number(req.params.id) },
  });
  res.status(204).end();
});

// ── Payments Out ──────────────────────────────────────────────
router.get('/out', async (_req, res) => {
  const records = await prisma.paymentOutHistory.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(records);
});

router.post('/out', async (req, res) => {
  const { partyId, partyName, amount, paymentMode, reference, notes, date } = req.body;
  const record = await prisma.paymentOutHistory.create({
    data: {
      partyId:     partyId     || null,
      partyName:   partyName   || null,
      amount,
      paymentMode: paymentMode || 'Cash',
      reference:   reference   || null,
      notes:       notes       || null,
      date:        date ? new Date(date) : undefined,
    },
  });
  res.status(201).json(record);
});

export default router;
