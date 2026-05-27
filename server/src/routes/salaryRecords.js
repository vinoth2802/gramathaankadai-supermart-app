import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { employeeId, type, payStatus } = req.query;
  const where = {};
  if (employeeId) where.employeeId = Number(employeeId);
  if (type)       where.type = type;
  if (payStatus)  where.payStatus = payStatus;
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

  res.status(201).json(record);
});

router.patch('/:id', async (req, res) => {
  const { paidDate, payStatus } = req.body;
  const record = await prisma.salaryRecord.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(paidDate !== undefined ? { paidDate: paidDate ? new Date(paidDate) : null } : {}),
      ...(payStatus            ? { payStatus }                                         : {}),
    },
  });
  res.json(record);
});

router.delete('/:id', async (req, res) => {
  await prisma.salaryRecord.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
