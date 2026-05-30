import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const designations = await prisma.designation.findMany({ where: { tenantId: req.tenantId }, orderBy: { name: 'asc' } });
  res.json(designations);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const designation = await prisma.designation.create({ data: { tenantId: req.tenantId, name: name.trim() } });
    res.status(201).json(designation);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Designation already exists' });
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  await prisma.designation.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
  res.json({ success: true });
});

export default router;
