import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const includeCat = { party: { select: { id: true, name: true } }, expenseCategory: { select: { name: true } } };

// Flatten the ExpenseCategory relation back to a plain `category` name for the client.
const out = e => (e ? { ...e, category: e.expenseCategory?.name ?? null } : e);

// Resolve a category name to its id within the tenant, creating it on demand.
async function resolveCategoryId(tenantId, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const cat = await prisma.expenseCategory.upsert({
    where:  { tenantId_name: { tenantId, name: trimmed } },
    create: { tenantId, name: trimmed },
    update: {},
  });
  return cat.id;
}

router.get('/', async (req, res) => {
  const tenantId = req.tenantId;
  const { from, to, category, month } = req.query;
  const where = { tenantId };
  if (category) {
    const cat = await prisma.expenseCategory.findFirst({ where: { tenantId, name: category }, select: { id: true } });
    where.expenseCategoryId = cat?.id ?? -1;
  }
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
    include: includeCat,
    orderBy: { date: 'desc' },
  });
  res.json(expenses.map(out));
});

router.post('/', async (req, res) => {
  const tenantId = req.tenantId;
  const { date, category, description, amount, paidAmount, paymentMode, reference, notes, partyId } = req.body;
  if (!category || !amount)
    return res.status(400).json({ error: 'category and amount are required' });
  const expense = await prisma.expense.create({
    data: {
      tenantId,
      date:              date ? new Date(date) : new Date(),
      expenseCategoryId: await resolveCategoryId(tenantId, category),
      description: description || null,
      amount:      Number(amount),
      paidAmount:  paidAmount !== undefined && paidAmount !== '' ? Number(paidAmount) : null,
      paymentMode: paymentMode || null,
      reference:   reference || null,
      notes:       notes || null,
      partyId:     partyId ? Number(partyId) : null,
    },
    include: includeCat,
  });
  res.status(201).json(out(expense));
});

router.patch('/:id', async (req, res) => {
  const tenantId = req.tenantId;
  const id = Number(req.params.id);
  const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { date, category, description, amount, paidAmount, paymentMode, reference, notes, partyId } = req.body;
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(date        !== undefined ? { date: new Date(date) }       : {}),
      ...(category    !== undefined ? { expenseCategoryId: await resolveCategoryId(tenantId, category) } : {}),
      ...(description !== undefined ? { description }                : {}),
      ...(amount      !== undefined ? { amount: Number(amount) }     : {}),
      ...(paidAmount  !== undefined ? { paidAmount: paidAmount !== '' ? Number(paidAmount) : null } : {}),
      ...(paymentMode !== undefined ? { paymentMode }                : {}),
      ...(reference   !== undefined ? { reference }                  : {}),
      ...(notes       !== undefined ? { notes }                      : {}),
      ...(partyId     !== undefined ? { partyId: partyId ? Number(partyId) : null } : {}),
    },
    include: includeCat,
  });
  res.json(out(expense));
});

router.delete('/:id', async (req, res) => {
  const result = await prisma.expense.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
  if (!result.count) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
