import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const cats = await prisma.category.findMany({ where: { tenantId: req.tenantId }, orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const cat = await prisma.category.create({ data: { tenantId: req.tenantId, name: name.trim() } });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = Number(req.params.id);
    const existing = await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const cat = await prisma.category.update({ where: { id }, data: { name: name.trim() } });
    res.json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.category.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
