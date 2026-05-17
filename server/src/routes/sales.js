import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = { items: true };

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const sales = await prisma.sale.findMany({
    where: from && to
      ? { date: { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) } }
      : undefined,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(sales);
});

router.get('/:id', async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!sale) return res.status(404).json({ error: 'Not found' });
  res.json(sale);
});

router.post('/', async (req, res) => {
  const { invoice, date, customerName, partyId, items = [], subtotal, gst, grandTotal, paymentMode, totalReceived, changeGiven } = req.body;
  const sale = await prisma.sale.create({
    data: {
      invoice,
      date:          date ? new Date(date) : new Date(),
      customerName:  customerName  || 'Walk-in Customer',
      partyId:       partyId       || null,
      subtotal:      subtotal      ?? 0,
      gst:           gst           ?? 0,
      grandTotal:    grandTotal    ?? 0,
      paymentMode:   paymentMode   || 'Cash',
      totalReceived: totalReceived ?? 0,
      changeGiven:   changeGiven   ?? 0,
      items: {
        create: items.map(({ name, qty, rate, amount }) => ({ name, qty, rate, amount })),
      },
    },
    include,
  });
  res.status(201).json(sale);
});

router.delete('/:id', async (req, res) => {
  await prisma.sale.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
