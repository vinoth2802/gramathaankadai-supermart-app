import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = { items: true };

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const purchases = await prisma.purchase.findMany({
    where: from && to
      ? { date: { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) } }
      : undefined,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
});

router.get('/:id', async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

router.post('/', async (req, res) => {
  const { invoice, date, partyName, partyId, items = [], grandTotal, paymentMode } = req.body;
  const purchase = await prisma.purchase.create({
    data: {
      invoice,
      date:        date ? new Date(date) : new Date(),
      partyName:   partyName   || null,
      partyId:     partyId     || null,
      grandTotal:  grandTotal  ?? 0,
      paymentMode: paymentMode || 'Cash',
      items: {
        create: items.map(({ name, qty, price, total }) => ({ name, qty, price, total })),
      },
    },
    include,
  });
  res.status(201).json(purchase);
});

router.delete('/:id', async (req, res) => {
  await prisma.purchase.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
