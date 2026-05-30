import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* GET /api/roles */
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.appRole.findMany({
      where: { tenantId: req.tenantId },
      include: {
        _count:         { select: { users: true } },
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/roles/permissions — all permission definitions (global catalog) */
router.get('/permissions', async (_req, res) => {
  try {
    const perms = await prisma.appPermission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/roles */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const role = await prisma.appRole.create({ data: { tenantId: req.tenantId, name, description } });
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Role name already exists' });
    res.status(500).json({ error: err.message });
  }
});

/* PUT /api/roles/:id/permissions — replace all permissions for a role */
router.put('/:id/permissions', async (req, res) => {
  try {
    const roleId      = Number(req.params.id);
    const { permissionIds } = req.body;   // number[]

    const role = await prisma.appRole.findFirst({ where: { id: roleId, tenantId: req.tenantId } });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem && role.name === 'Owner') {
      return res.status(403).json({ error: 'Cannot modify Owner permissions' });
    }

    await prisma.$transaction([
      prisma.appRolePermission.deleteMany({ where: { roleId } }),
      prisma.appRolePermission.createMany({
        data: (permissionIds ?? []).map(pid => ({ roleId, permissionId: pid })),
        skipDuplicates: true,
      }),
    ]);

    const updated = await prisma.appRole.findFirst({
      where:   { id: roleId, tenantId: req.tenantId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/roles/:id */
router.delete('/:id', async (req, res) => {
  try {
    const role = await prisma.appRole.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!role) return res.status(404).json({ error: 'Not found' });
    if (role.isSystem) return res.status(403).json({ error: 'Cannot delete system roles' });
    await prisma.appRole.delete({ where: { id: role.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
