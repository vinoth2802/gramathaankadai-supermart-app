import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const shape = (r) => ({
  id:           Number(r.id),
  name:         r.name,
  descr:        r.descr,
  isActive:     Boolean(r.isactive ?? r.isActive),
  color:        r.color        || 'gray',
  icon:         r.icon         || 'CreditCard',
  description:  r.description  || '',
  displayOrder: Number(r.displayorder ?? r.displayOrder ?? 999),
  isDefault:    Boolean(r.isdefault ?? r.isDefault),
  settingsId:   r.settingsid != null ? Number(r.settingsid) : null,
});

// GET /api/payment-types
router.get('/', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        pm.id,
        pm.name,
        pm.descr,
        pm.is_active            AS isactive,
        COALESCE(pts.color,       'gray')        AS color,
        COALESCE(pts.icon,        'CreditCard')  AS icon,
        COALESCE(pts.description, pm.descr, '')  AS description,
        COALESCE(pts.display_order, 999)         AS displayorder,
        COALESCE(pts.is_default,  false)         AS isdefault,
        pts.id                                   AS settingsid
      FROM payment_modes pm
      LEFT JOIN payment_type_settings pts ON pts.payment_mode_id = pm.id
      ORDER BY COALESCE(pts.display_order, 999), pm.id
    `;
    res.json(rows.map(shape));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payment-types/reorder  — must be before /:id
router.put('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      const modeId = Number(orderedIds[i]);
      await prisma.$executeRaw`
        UPDATE payment_type_settings SET display_order = ${i}
        WHERE payment_mode_id = ${modeId}
      `;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment-types
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const [{ maxorder }] = await prisma.$queryRaw`
      SELECT COALESCE(MAX(display_order), 0) + 1 AS maxorder FROM payment_type_settings
    `;
    const nextOrder = Number(maxorder);

    const mode = await prisma.paymentMode.create({
      data: {
        name:     name.trim(),
        descr:    description || null,
        isActive: isActive !== false,
      },
    });

    await prisma.$executeRaw`
      INSERT INTO payment_type_settings
        (payment_mode_id, color, icon, description, display_order, is_default)
      VALUES
        (${mode.id}, ${color || 'blue'}, ${icon || 'CreditCard'},
         ${description || null}, ${nextOrder}, false)
    `;

    const [row] = await prisma.$queryRaw`
      SELECT pm.id, pm.name, pm.descr, pm.is_active AS isactive,
             pts.color, pts.icon, pts.description,
             pts.display_order AS displayorder,
             pts.is_default    AS isdefault,
             pts.id            AS settingsid
      FROM payment_modes pm
      LEFT JOIN payment_type_settings pts ON pts.payment_mode_id = pm.id
      WHERE pm.id = ${mode.id}
    `;
    res.status(201).json(shape(row));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Payment type already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payment-types/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, color, icon, isActive } = req.body;

    const modeData = {};
    if (isActive     !== undefined) modeData.isActive = isActive;
    if (name         !== undefined) modeData.name     = name;
    if (description  !== undefined) modeData.descr    = description;

    if (Object.keys(modeData).length) {
      await prisma.paymentMode.update({ where: { id }, data: modeData });
    }

    await prisma.$executeRaw`
      INSERT INTO payment_type_settings (payment_mode_id, color, icon, description)
      VALUES (${id}, ${color || 'blue'}, ${icon || 'CreditCard'}, ${description || null})
      ON CONFLICT (payment_mode_id) DO UPDATE SET
        color       = COALESCE(EXCLUDED.color,       payment_type_settings.color),
        icon        = COALESCE(EXCLUDED.icon,        payment_type_settings.icon),
        description = COALESCE(EXCLUDED.description, payment_type_settings.description)
    `;

    const [row] = await prisma.$queryRaw`
      SELECT pm.id, pm.name, pm.descr, pm.is_active AS isactive,
             COALESCE(pts.color,'gray')       AS color,
             COALESCE(pts.icon,'CreditCard')  AS icon,
             COALESCE(pts.description,'')     AS description,
             COALESCE(pts.display_order, 999) AS displayorder,
             COALESCE(pts.is_default, false)  AS isdefault,
             pts.id                           AS settingsid
      FROM payment_modes pm
      LEFT JOIN payment_type_settings pts ON pts.payment_mode_id = pm.id
      WHERE pm.id = ${id}
    `;
    res.json(shape(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payment-types/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await prisma.$queryRaw`
      SELECT is_default FROM payment_type_settings WHERE payment_mode_id = ${id}
    `;
    if (rows[0]?.is_default) {
      return res.status(403).json({ error: 'Cannot delete a default payment type' });
    }
    await prisma.paymentMode.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
