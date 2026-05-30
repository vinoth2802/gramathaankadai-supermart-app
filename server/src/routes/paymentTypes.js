import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Combine a PaymentMode with its (optional) PaymentTypeSetting into the client shape.
const shape = (m) => {
  const s = m.paymentTypeSettings?.[0] ?? null;
  return {
    id:           Number(m.id),
    name:         m.name,
    descr:        m.descr,
    isActive:     Boolean(m.isActive),
    color:        s?.color        || 'gray',
    icon:         s?.icon         || 'CreditCard',
    description:  s?.description  || m.descr || '',
    displayOrder: s?.displayOrder != null ? Number(s.displayOrder) : 999,
    isDefault:    Boolean(s?.isDefault),
    settingsId:   s ? Number(s.id) : null,
  };
};

const withSettings = { paymentTypeSettings: true };

// GET /api/payment-types
router.get('/', async (req, res) => {
  try {
    const modes = await prisma.paymentMode.findMany({ where: { tenantId: req.tenantId }, include: withSettings });
    const rows = modes.map(shape).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payment-types/reorder  — must be before /:id
router.put('/reorder', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await prisma.paymentTypeSetting.updateMany({
        where: { tenantId, paymentModeId: Number(orderedIds[i]) },
        data:  { displayOrder: i },
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment-types
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { name, description, color, icon, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const agg = await prisma.paymentTypeSetting.aggregate({ where: { tenantId }, _max: { displayOrder: true } });
    const nextOrder = (agg._max.displayOrder ?? 0) + 1;

    const mode = await prisma.paymentMode.create({
      data: { tenantId, name: name.trim(), descr: description || null, isActive: isActive !== false },
    });

    await prisma.paymentTypeSetting.create({
      data: {
        tenantId,
        paymentModeId: mode.id,
        color:         color || 'blue',
        icon:          icon || 'CreditCard',
        description:   description || null,
        displayOrder:  nextOrder,
        isDefault:     false,
      },
    });

    const full = await prisma.paymentMode.findFirst({ where: { id: mode.id, tenantId }, include: withSettings });
    res.status(201).json(shape(full));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Payment type already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payment-types/:id
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const { name, description, color, icon, isActive } = req.body;

    const mode = await prisma.paymentMode.findFirst({ where: { id, tenantId } });
    if (!mode) return res.status(404).json({ error: 'Not found' });

    const modeData = {};
    if (isActive     !== undefined) modeData.isActive = isActive;
    if (name         !== undefined) modeData.name     = name;
    if (description  !== undefined) modeData.descr    = description;
    if (Object.keys(modeData).length) {
      await prisma.paymentMode.update({ where: { id }, data: modeData });
    }

    await prisma.paymentTypeSetting.upsert({
      where:  { tenantId_paymentModeId: { tenantId, paymentModeId: id } },
      update: {
        ...(color       != null ? { color }       : {}),
        ...(icon        != null ? { icon }        : {}),
        ...(description != null ? { description } : {}),
      },
      create: {
        tenantId,
        paymentModeId: id,
        color:         color || 'blue',
        icon:          icon || 'CreditCard',
        description:   description || null,
      },
    });

    const full = await prisma.paymentMode.findFirst({ where: { id, tenantId }, include: withSettings });
    res.json(shape(full));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payment-types/:id
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const setting = await prisma.paymentTypeSetting.findFirst({ where: { tenantId, paymentModeId: id }, select: { isDefault: true } });
    if (setting?.isDefault) {
      return res.status(403).json({ error: 'Cannot delete a default payment type' });
    }
    await prisma.paymentMode.deleteMany({ where: { id, tenantId } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
