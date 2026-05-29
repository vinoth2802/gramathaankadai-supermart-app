import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* Build a human-readable label for the expense description */
function salaryDesc(empName, type, effectiveDate) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const month     = effectiveDate
    ? new Date(effectiveDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';
  return `${empName} – ${typeLabel}${month ? ` (${month})` : ''}`;
}

/* Create an expense for a paid salary record, skipping if one already exists */
async function createSalaryExpense(record, paidDateStr) {
  const refKey = `SAL-${record.id}`;
  const exists = await prisma.expense.count({ where: { reference: refKey } });
  if (exists) return;

  const empName = record.employee?.name ?? 'Employee';
  await prisma.expense.create({
    data: {
      date:        paidDateStr ? new Date(paidDateStr) : new Date(),
      category:    'Salaries',
      description: salaryDesc(empName, record.type, record.effectiveDate),
      amount:      Number(record.amount),
      paidAmount:  Number(record.amount),
      reference:   refKey,
    },
  });
}

router.get('/', async (req, res) => {
  const { employeeId, type, payStatus, month } = req.query;
  const where = {};
  if (employeeId) where.employeeId = Number(employeeId);
  if (type)       where.type = type;
  if (payStatus === 'pending') where.payStatus = { in: ['unpaid', 'partial'] };
  else if (payStatus)          where.payStatus = payStatus;
  if (month) {
    const [y, m] = month.split('-').map(Number);
    where.effectiveDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  const records = await prisma.salaryRecord.findMany({
    where,
    orderBy: { effectiveDate: 'desc' },
    include: { employee: { select: { name: true, designation: true } } },
  });
  res.json(records);
});

router.post('/', async (req, res) => {
  const { employeeId, type, amount, previousSalary, effectiveDate, description, paidDate, payStatus } = req.body;
  if (!employeeId || !type || !amount || !effectiveDate)
    return res.status(400).json({ error: 'employeeId, type, amount and effectiveDate are required' });

  const record = await prisma.salaryRecord.create({
    data: {
      employeeId:     Number(employeeId),
      type,
      amount:         Number(amount),
      previousSalary: previousSalary != null ? Number(previousSalary) : null,
      effectiveDate:  new Date(effectiveDate),
      paidDate:       paidDate ? new Date(paidDate) : null,
      payStatus:      payStatus || 'unpaid',
      description:    description || null,
    },
    include: { employee: { select: { name: true, designation: true } } },
  });

  if (type === 'increment') {
    await prisma.employee.update({
      where: { id: Number(employeeId) },
      data:  { basicSalary: Number(amount) },
    });
  }

  /* auto-expense if created as already paid */
  if ((payStatus || 'unpaid') === 'paid') {
    await createSalaryExpense(record, paidDate);
  }

  res.status(201).json(record);
});

router.patch('/bulk', async (req, res) => {
  const { ids, payStatus, paidDate } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });

  await prisma.salaryRecord.updateMany({
    where: { id: { in: ids.map(Number) } },
    data: {
      payStatus: payStatus || 'paid',
      ...(paidDate !== undefined ? { paidDate: paidDate ? new Date(paidDate) : null } : {}),
    },
  });

  /* auto-create expenses for each newly-paid record */
  if ((payStatus || 'paid') === 'paid') {
    const records = await prisma.salaryRecord.findMany({
      where:   { id: { in: ids.map(Number) } },
      include: { employee: { select: { name: true } } },
    });
    await Promise.all(records.map(r => createSalaryExpense(r, paidDate)));
  }

  res.json({ updated: ids.length });
});

router.patch('/:id', async (req, res) => {
  const { paidDate, payStatus } = req.body;

  const prev = await prisma.salaryRecord.findUnique({
    where:   { id: Number(req.params.id) },
    include: { employee: { select: { name: true } } },
  });

  const record = await prisma.salaryRecord.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(paidDate !== undefined ? { paidDate: paidDate ? new Date(paidDate) : null } : {}),
      ...(payStatus              ? { payStatus }                                       : {}),
    },
    include: { employee: { select: { name: true } } },
  });

  /* auto-expense when transitioning into 'paid' */
  if (payStatus === 'paid' && prev?.payStatus !== 'paid') {
    await createSalaryExpense(record, paidDate ?? record.paidDate?.toISOString().slice(0, 10));
  }

  res.json(record);
});

router.delete('/:id', async (req, res) => {
  await prisma.salaryRecord.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
