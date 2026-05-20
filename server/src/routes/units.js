import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// ── Units (UOM) ───────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const units = await prisma.uom.findMany({ orderBy: { descr: 'asc' } });
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fullName, shortName } = req.body;
    if (!fullName?.trim() || !shortName?.trim())
      return res.status(400).json({ error: 'Full name and short name are required' });
    const unit = await prisma.uom.create({
      data: { descr: fullName.trim().toUpperCase(), code: shortName.trim().toUpperCase() },
    });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Unit already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { fullName, shortName } = req.body;
    if (!fullName?.trim() || !shortName?.trim())
      return res.status(400).json({ error: 'Full name and short name are required' });
    const unit = await prisma.uom.update({
      where: { id: Number(req.params.id) },
      data: { descr: fullName.trim().toUpperCase(), code: shortName.trim().toUpperCase() },
    });
    res.json(unit);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Unit already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.uom.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Conversions ───────────────────────────────────────────────
router.get('/:id/conversions', async (req, res) => {
  try {
    const conversions = await prisma.uomConversion.findMany({
      where: { baseUomId: Number(req.params.id) },
      include: { baseUom: true, secondaryUom: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(conversions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversions', async (req, res) => {
  try {
    const { baseUomId, factor, secondaryUomId } = req.body;
    if (!baseUomId || !secondaryUomId)
      return res.status(400).json({ error: 'Base and secondary units are required' });
    if (baseUomId === secondaryUomId)
      return res.status(400).json({ error: 'Base and secondary units must be different' });
    const conv = await prisma.uomConversion.create({
      data: {
        baseUomId:      Number(baseUomId),
        factor:         Number(factor) || 1,
        secondaryUomId: Number(secondaryUomId),
      },
      include: { baseUom: true, secondaryUom: true },
    });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conversions/:id', async (req, res) => {
  try {
    await prisma.uomConversion.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
