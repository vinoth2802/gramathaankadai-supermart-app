import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const parties = await prisma.party.findMany({ orderBy: { name: 'asc' } });
  res.json(parties);
});

router.get('/:id', async (req, res) => {
  const party = await prisma.party.findUnique({ where: { id: Number(req.params.id) } });
  if (!party) return res.status(404).json({ error: 'Not found' });
  res.json(party);
});

router.post('/', async (req, res) => {
  const { name, type, phone, email, address, gstin, balance, payable, lastSale, notes } = req.body;
  const party = await prisma.party.create({
    data: {
      name,
      type:     type     || 'customer',
      phone:    phone    || null,
      email:    email    || null,
      address:  address  || null,
      gstin:    gstin    || null,
      balance:  balance  ?? 0,
      payable:  payable  ?? 0,
      lastSale: lastSale ? new Date(lastSale) : null,
      notes:    notes    || null,
    },
  });
  res.status(201).json(party);
});

router.put('/:id', async (req, res) => {
  const { name, type, phone, email, address, gstin, balance, payable, lastSale, notes } = req.body;
  const party = await prisma.party.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      type:     type     || 'customer',
      phone:    phone    || null,
      email:    email    || null,
      address:  address  || null,
      gstin:    gstin    || null,
      balance:  balance  ?? 0,
      payable:  payable  ?? 0,
      lastSale: lastSale ? new Date(lastSale) : null,
      notes:    notes    || null,
    },
  });
  res.json(party);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (req.body.balanceDelta !== undefined) {
    const party = await prisma.party.update({
      where: { id },
      data: { balance: { increment: req.body.balanceDelta } },
    });
    return res.json(party);
  }

  if (req.body.payableDelta !== undefined) {
    const party = await prisma.party.update({
      where: { id },
      data: { payable: { increment: req.body.payableDelta } },
    });
    return res.json(party);
  }

  return res.status(400).json({ error: 'Provide balanceDelta or payableDelta' });
});

router.delete('/:id', async (req, res) => {
  await prisma.party.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
