import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const cat = await prisma.category.create({ data: { name: name.trim() } });
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
    const cat = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: { name: name.trim() },
    });
    res.json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
