import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';

const router = Router();
const SALT   = 10;

const safe = u => ({
  id:        u.id,
  name:      u.name,
  email:     u.email,
  phone:     u.phone,
  roleId:    u.roleId,
  role:      u.role,
  isActive:  u.isActive,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
});

/* GET /api/users */
router.get('/', async (req, res) => {
  try {
    const users = await prisma.appUser.findMany({
      where:   { tenantId: req.tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(safe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/users/:id */
router.get('/:id', async (req, res) => {
  try {
    const u = await prisma.appUser.findFirst({
      where:   { id: Number(req.params.id), tenantId: req.tenantId },
      include: { role: true },
    });
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(safe(u));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/users */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, roleId, isActive } = req.body;
    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ error: 'name, email, password, roleId are required' });
    }
    const passwordHash = await bcrypt.hash(password, SALT);
    const u = await prisma.appUser.create({
      data: { tenantId: req.tenantId, name, email, phone: phone || null, passwordHash, roleId: Number(roleId), isActive: isActive ?? true },
      include: { role: true },
    });
    res.status(201).json(safe(u));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

/* PUT /api/users/:id */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.appUser.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { name, email, phone, password, roleId, isActive } = req.body;
    const data = { name, email, phone: phone || null, roleId: Number(roleId), isActive };
    if (password) data.passwordHash = await bcrypt.hash(password, SALT);
    const u = await prisma.appUser.update({
      where:   { id },
      data,
      include: { role: true },
    });
    res.json(safe(u));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

/* PATCH /api/users/:id/status */
router.patch('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.appUser.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const u = await prisma.appUser.update({
      where: { id },
      data:  { isActive: req.body.isActive },
      include: { role: true },
    });
    res.json(safe(u));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/users/:id */
router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.appUser.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
