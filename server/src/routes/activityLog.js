import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { action, type, from, to, page = 1, limit = 200 } = req.query;
    const where = { tenantId: req.tenantId };

    if (action) where.action = action;
    if (from || to) {
      where.logTime = {};
      if (from) where.logTime.gte = new Date(from);
      if (to)   { const d = new Date(to); d.setHours(23, 59, 59, 999); where.logTime.lte = d; }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { logTime: 'desc' },
        take:  Number(limit),
        skip:  (Number(page) - 1) * Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Client-side type filter (JSON path filter has Prisma version constraints)
    const filtered = type ? logs.filter(l => l.details?.type === type) : logs;

    res.json({ logs: filtered, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await prisma.auditLog.deleteMany({ where: { tenantId: req.tenantId } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
