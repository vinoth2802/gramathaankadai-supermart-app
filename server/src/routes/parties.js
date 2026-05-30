import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const router = Router();

router.get('/', async (req, res) => {
  const parties = await prisma.party.findMany({ where: { tenantId: req.tenantId }, orderBy: { name: 'asc' } });
  res.json(parties);
});

router.get('/:id', async (req, res) => {
  const party = await prisma.party.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
  if (!party) return res.status(404).json({ error: 'Not found' });
  res.json(party);
});

router.post('/', async (req, res) => {
  const { name, type, partyType, phone, email, address, gstin, balance, payable, lastSale, notes } = req.body;
  const resolvedPartyType = partyType === 'B2B' ? 'B2B' : 'B2C';
  const party = await prisma.party.create({
    data: {
      tenantId:  req.tenantId,
      name,
      type:      type      || 'customer',
      partyType: resolvedPartyType,
      phone:     phone     || null,
      email:     email     || null,
      address:   address   || null,
      gstin:     resolvedPartyType === 'B2B' ? (gstin || null) : null,
      balance:   balance   ?? 0,
      payable:   payable   ?? 0,
      lastSale:  lastSale  ? new Date(lastSale) : null,
      notes:     notes     || null,
    },
  });
  logActivity({ tenantId: req.tenantId, action: 'CREATE', type: 'Party', refNo: '—', partyName: party.name, amount: 0, userName: req.headers['x-user'] });
  res.status(201).json(party);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const prevParty = await prisma.party.findFirst({
    where: { id, tenantId: req.tenantId },
    select: { name: true, phone: true, email: true, address: true, type: true, gstin: true },
  });
  if (!prevParty) return res.status(404).json({ error: 'Not found' });

  const { name, type, partyType, phone, email, address, gstin, balance, payable, lastSale, notes } = req.body;
  const resolvedPartyType = partyType === 'B2B' ? 'B2B' : 'B2C';
  const party = await prisma.party.update({
    where: { id },
    data: {
      name,
      type:      type      || 'customer',
      partyType: resolvedPartyType,
      phone:     phone     || null,
      email:     email     || null,
      address:   address   || null,
      gstin:     resolvedPartyType === 'B2B' ? (gstin || null) : null,
      balance:   balance   ?? 0,
      payable:   payable   ?? 0,
      lastSale:  lastSale  ? new Date(lastSale) : null,
      notes:     notes     || null,
    },
  });
  const changes = computeDiff(prevParty, party, [
    { key: 'name',    label: 'Name' },
    { key: 'phone',   label: 'Phone' },
    { key: 'email',   label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'type',    label: 'Type' },
    { key: 'gstin',   label: 'GSTIN' },
  ]);
  logActivity({ tenantId: req.tenantId, action: 'EDIT', type: 'Party', refNo: '—', partyName: party.name, amount: 0, userName: req.headers['x-user'], changes });
  res.json(party);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tenantId = req.tenantId;

  if (req.body.balanceDelta !== undefined) {
    const result = await prisma.party.updateMany({
      where: { id, tenantId },
      data: { balance: { increment: req.body.balanceDelta } },
    });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    const party = await prisma.party.findFirst({ where: { id, tenantId } });
    return res.json(party);
  }

  if (req.body.payableDelta !== undefined) {
    const result = await prisma.party.updateMany({
      where: { id, tenantId },
      data: { payable: { increment: req.body.payableDelta } },
    });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    const party = await prisma.party.findFirst({ where: { id, tenantId } });
    return res.json(party);
  }

  return res.status(400).json({ error: 'Provide balanceDelta or payableDelta' });
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tenantId = req.tenantId;
    const party = await prisma.party.findFirst({ where: { id, tenantId } });
    if (!party) return res.status(404).json({ error: 'Not found' });
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: { tenantId, type: 'Party', entityId: id, name: party.name, amount: 0, snapshot: JSON.stringify(party) },
      }),
      prisma.party.delete({ where: { id } }),
    ]);
    logActivity({ tenantId, action: 'DELETE', type: 'Party', refNo: '—', partyName: party.name, amount: 0, userName: req.headers['x-user'] });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── POST /check-names ── */
router.post('/check-names', async (req, res) => {
  try {
    const { names } = req.body;
    const list = Array.isArray(names)
      ? [...new Set(names.map(n => String(n ?? '').trim()).filter(Boolean))]
      : [];
    if (!list.length) return res.json({ existing: [] });
    const found = await prisma.party.findMany({
      where:  { tenantId: req.tenantId, name: { in: list } },
      select: { name: true },
    });
    res.json({ existing: found.map(p => p.name) });
  } catch (err) {
    console.error('check-names error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /bulk-import ── */
router.post('/bulk-import', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { parties } = req.body;
    if (!Array.isArray(parties) || parties.length === 0) {
      return res.status(400).json({ error: 'parties array is required and must not be empty' });
    }

    const s = v => String(v ?? '').trim();

    const data = parties
      .filter(p => s(p.partyName))
      .map(p => {
        const typeRaw = s(p.partyType).toLowerCase();
        const type    = typeRaw === 'supplier' ? 'supplier' : 'customer';
        const gstin   = s(p.gstin) || null;
        const opening = Number(p.openingBal) || 0;
        const isCr    = s(p.balanceType).toUpperCase() === 'CR';
        const addrParts = [s(p.address), s(p.city), s(p.state), s(p.pincode)].filter(Boolean);

        return {
          tenantId,
          name:      s(p.partyName),
          type,
          partyType: gstin ? 'B2B' : 'B2C',
          phone:     s(p.phone)  || null,
          email:     s(p.email)  || null,
          gstin,
          address:   addrParts.join(', ') || null,
          balance:   isCr ? 0 : opening,
          payable:   isCr ? opening : 0,
        };
      });

    const result = await prisma.party.createMany({ data, skipDuplicates: true });
    res.status(201).json({ success: true, imported: result.count });
  } catch (err) {
    console.error('Bulk import parties error:', err);
    res.status(500).json({ error: err.message || 'Bulk import failed' });
  }
});

export default router;
