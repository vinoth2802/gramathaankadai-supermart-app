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
  });
  res.json(records);
});

router.post('/in', async (req, res) => {
  const { partyId, partyName, amount, paymentMode, reference, notes, date } = req.body;
  const record = await prisma.paymentInHistory.create({
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
