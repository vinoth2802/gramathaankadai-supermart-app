import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const includeParty = { party: { select: { id: true, name: true } } };

router.get('/', async (req, res) => {
  const { from, to, category, month } = req.query;
  const where = {};
  if (category) where.category = category;
  if (month) {
    const [y, m] = month.split('-').map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) };
  } else if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to)   where.date.lte = new Date(to);
  }
  const expenses = await prisma.expense.findMany({
    where,
    include: includeParty,
    orderBy: { date: 'desc' },
  });
  res.json(expenses);
});

router.post('/', async (req, res) => {
  const { date, category, description, amount, paidAmount, paymentMode, reference, notes, partyId } = req.body;
  if (!category || !amount)
    return res.status(400).json({ error: 'category and amount are required' });
  const expense = await prisma.expense.create({
    data: {
      date:        date ? new Date(date) : new Date(),
      category,
      description: description || null,
      amount:      Number(amount),
      paidAmount:  paidAmount !== undefined && paidAmount !== '' ? Number(paidAmount) : null,
      paymentMode: paymentMode || null,
      reference:   reference || null,
      notes:       notes || null,
      partyId:     partyId ? Number(partyId) : null,
    },
    include: includeParty,
  });
  res.status(201).json(expense);
});

router.patch('/:id', async (req, res) => {
  const { date, category, description, amount, paidAmount, paymentMode, reference, notes, partyId } = req.body;
  const expense = await prisma.expense.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(date        !== undefined ? { date: new Date(date) }       : {}),
      ...(category    !== undefined ? { category }                   : {}),
      ...(description !== undefined ? { description }                : {}),
      ...(amount      !== undefined ? { amount: Number(amount) }     : {}),
      ...(paidAmount  !== undefined ? { paidAmount: paidAmount !== '' ? Number(paidAmount) : null } : {}),
      ...(paymentMode !== undefined ? { paymentMode }                : {}),
      ...(reference   !== undefined ? { reference }                  : {}),
      ...(notes       !== undefined ? { notes }                      : {}),
      ...(partyId     !== undefined ? { partyId: partyId ? Number(partyId) : null } : {}),
    },
    include: includeParty,
  });
  res.json(expense);
});

router.delete('/:id', async (req, res) => {
  await prisma.expense.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
