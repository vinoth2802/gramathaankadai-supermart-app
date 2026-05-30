import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const types = await prisma.leaveType.findMany({ where: { tenantId: req.tenantId }, orderBy: { name: 'asc' } });
    res.json(types);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, code, annualAllotment, isPaid, color } = req.body;
    if (!name?.trim() || !code?.trim()) return res.status(400).json({ error: 'Name and code are required' });
    const type = await prisma.leaveType.create({
      data: {
        tenantId:        req.tenantId,
        name:            name.trim(),
        code:            code.trim().toUpperCase(),
        annualAllotment: annualAllotment ?? 0,
        isPaid:          isPaid ?? true,
        color:           color || 'blue',
      },
    });
    res.status(201).json(type);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Name or code already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.leaveType.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { name, code, annualAllotment, isPaid, isActive, color } = req.body;
    const type = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(name            !== undefined ? { name }                          : {}),
        ...(code            !== undefined ? { code: code.toUpperCase() }      : {}),
        ...(annualAllotment !== undefined ? { annualAllotment }               : {}),
        ...(isPaid          !== undefined ? { isPaid }                        : {}),
        ...(isActive        !== undefined ? { isActive }                      : {}),
        ...(color           !== undefined ? { color }                         : {}),
      },
    });
    res.json(type);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.leaveType.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
