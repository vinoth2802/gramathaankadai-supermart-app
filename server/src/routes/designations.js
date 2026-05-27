import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const designations = await prisma.designation.findMany({ orderBy: { name: 'asc' } });
  res.json(designations);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const designation = await prisma.designation.create({ data: { name: name.trim() } });
    res.status(201).json(designation);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Designation already exists' });
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  await prisma.designation.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

export default router;
