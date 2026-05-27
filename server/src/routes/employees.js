import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
  res.json(employees);
});

router.get('/:id', async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.post('/', async (req, res) => {
  const { employeeCode, name, phone, email, designation, department, dateOfJoining, basicSalary, salaryType, address, notes } = req.body;
  try {
    const employee = await prisma.employee.create({
      data: {
        employeeCode:  employeeCode || null,
        name,
        phone:         phone        || null,
        email:         email        || null,
        designation:   designation  || null,
        department:    department   || null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        basicSalary:   basicSalary  ?? 0,
        salaryType:    salaryType === 'perDay' ? 'perDay' : 'perMonth',
        address:       address      || null,
        notes:         notes        || null,
      },
    });
    res.status(201).json(employee);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Employee code already exists' });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { employeeCode, name, phone, email, designation, department, dateOfJoining, basicSalary, salaryType, address, notes } = req.body;
  try {
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: {
        employeeCode:  employeeCode || null,
        name,
        phone:         phone        || null,
        email:         email        || null,
        designation:   designation  || null,
        department:    department   || null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        basicSalary:   basicSalary  ?? 0,
        salaryType:    salaryType === 'perDay' ? 'perDay' : 'perMonth',
        address:       address      || null,
        notes:         notes        || null,
      },
    });
    res.json(employee);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Employee code already exists' });
    throw err;
  }
});

router.patch('/:id/toggle', async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.employee.update({
    where: { id: Number(req.params.id) },
    data: { isActive: !employee.isActive },
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await prisma.employee.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
