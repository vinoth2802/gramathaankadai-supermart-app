import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Flatten Designation/Department relations back to plain name strings for the client.
const out = e => (e ? {
  ...e,
  designation: e.designation?.name ?? null,
  department:  e.department?.name ?? null,
} : e);

const withRel = { designation: { select: { name: true } }, department: { select: { name: true } } };

async function resolveDesignationId(tenantId, name) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  const d = await prisma.designation.upsert({ where: { tenantId_name: { tenantId, name: n } }, create: { tenantId, name: n }, update: {} });
  return d.id;
}
async function resolveDepartmentId(tenantId, name) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  const d = await prisma.department.upsert({ where: { tenantId_name: { tenantId, name: n } }, create: { tenantId, name: n }, update: {} });
  return d.id;
}

// Build the persisted Employee columns from the request body. Salary-component
// fields (hra/da/pf/…) from the legacy single-table model are no longer columns
// on Employee (they live in employee_salary_structure) and are ignored here.
async function toData(tenantId, body) {
  const { employeeCode, name, phone, email, designation, department, dateOfJoining, basicSalary, salaryType, address, notes, employeeType } = body;
  return {
    employeeCode:   employeeCode || null,
    name,
    phone:          phone || null,
    email:          email || null,
    designationId:  await resolveDesignationId(tenantId, designation),
    departmentId:   await resolveDepartmentId(tenantId, department),
    dateOfJoining:  dateOfJoining ? new Date(dateOfJoining) : null,
    basicSalary:    basicSalary ?? 0,
    salaryType:     salaryType === 'perDay' ? 'perDay' : 'perMonth',
    address:        address || null,
    notes:          notes || null,
    employeeType:   employeeType || 'salaried',
  };
}

router.get('/', async (req, res) => {
  const employees = await prisma.employee.findMany({ where: { tenantId: req.tenantId }, include: withRel, orderBy: { name: 'asc' } });
  res.json(employees.map(out));
});

router.get('/:id', async (req, res) => {
  const employee = await prisma.employee.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId }, include: withRel });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(out(employee));
});

router.post('/', async (req, res) => {
  try {
    const data = await toData(req.tenantId, req.body);
    const employee = await prisma.employee.create({ data: { ...data, tenantId: req.tenantId }, include: withRel });
    res.status(201).json(out(employee));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Employee code already exists' });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.employee.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = await toData(req.tenantId, req.body);
    const employee = await prisma.employee.update({ where: { id }, data, include: withRel });
    res.json(out(employee));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Employee code already exists' });
    throw err;
  }
});

router.patch('/:id/toggle', async (req, res) => {
  const employee = await prisma.employee.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { isActive: !employee.isActive },
    include: withRel,
  });
  res.json(out(updated));
});

router.delete('/:id', async (req, res) => {
  await prisma.employee.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
  res.json({ success: true });
});

export default router;
