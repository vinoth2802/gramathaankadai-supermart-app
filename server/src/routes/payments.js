import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const fmtMoney = v => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

const router = Router();

// ── Payment Modes ──────────────────────────────────────────────
router.get('/modes', async (req, res) => {
  const modes = await prisma.paymentMode.findMany({
    where: { tenantId: req.tenantId, isActive: true },
    orderBy: { id: 'asc' },
  });
  res.json(modes);
});

// ── Payment Options (Cash always first, then bank accounts, then other active modes) ─
router.get('/options', async (req, res) => {
  try {
    const [allModes, banks] = await Promise.all([
      prisma.paymentMode.findMany({ where: { tenantId: req.tenantId }, orderBy: { id: 'asc' } }),
      prisma.bankAccount.findMany({ where: { tenantId: req.tenantId }, orderBy: { bankName: 'asc' } }),
    ]);
    const seen = new Set();
    const result = [];
    const push = (name) => {
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); result.push({ name: name.trim() }); }
    };
    // Cash always first (regardless of isActive)
    const cash = allModes.find(m => m.name.toLowerCase() === 'cash');
    if (cash) push(cash.name);
    // Bank accounts next
    banks.forEach(b => push(b.bankName));
    // Other active modes last
    allModes.filter(m => m.name.toLowerCase() !== 'cash' && m.isActive).forEach(m => push(m.name));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/modes', async (req, res) => {
  const mode = await prisma.paymentMode.create({
    data: { tenantId: req.tenantId, name: req.body.name, descr: req.body.descr || null },
  });
  res.status(201).json(mode);
});

router.delete('/modes/:id', async (req, res) => {
  await prisma.paymentMode.updateMany({
    where: { id: Number(req.params.id), tenantId: req.tenantId },
    data: { isActive: false },
  });
  res.status(204).end();
});

// ── Payments In ───────────────────────────────────────────────
router.get('/in', async (req, res) => {
  const records = await prisma.paymentInHistory.findMany({
    where: { tenantId: req.tenantId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { party: { select: { id: true, name: true } } },
  });
  res.json(records);
});

router.get('/in/:id', async (req, res) => {
  const record = await prisma.paymentInHistory.findFirst({
    where: { id: Number(req.params.id), tenantId: req.tenantId },
    include: { party: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.post('/in', async (req, res) => {
  const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
  const record = await prisma.paymentInHistory.create({
    data: {
      tenantId:    req.tenantId,
      partyId:     partyId     ? Number(partyId) : null,
      partyName:   partyName   || null,
      amount:      Number(amount  || 0),
      discount:    Number(discount || 0),
      paymentMode: paymentMode || 'Cash',
      reference:   reference   || null,
      notes:       notes       || null,
      status:      status      || 'Unused',
      date:        date ? new Date(date) : undefined,
    },
  });
  logActivity({ tenantId: req.tenantId, action: 'CREATE', type: 'PaymentIn', refNo: record.reference || `#${record.id}`, partyName: record.partyName, amount: Number(record.amount), userName: req.headers['x-user'] });
  res.status(201).json(record);
});

router.patch('/in/:id', async (req, res) => {
  const id = Number(req.params.id);
  const prevRec = await prisma.paymentInHistory.findFirst({
    where: { id, tenantId: req.tenantId },
    select: { partyName: true, amount: true, discount: true, paymentMode: true, status: true, reference: true },
  });
  if (!prevRec) return res.status(404).json({ error: 'Not found' });

  const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
  const data = {};
  if (partyId     !== undefined) data.partyId     = partyId ? Number(partyId) : null;
  if (partyName   !== undefined) data.partyName   = partyName   || null;
  if (amount      !== undefined) data.amount      = Number(amount);
  if (discount    !== undefined) data.discount    = Number(discount);
  if (paymentMode !== undefined) data.paymentMode = paymentMode;
  if (reference   !== undefined) data.reference   = reference   || null;
  if (notes       !== undefined) data.notes       = notes       || null;
  if (status      !== undefined) data.status      = status;
  if (date        !== undefined) data.date        = new Date(date);

  const record = await prisma.paymentInHistory.update({
    where: { id },
    data,
  });
  const changes = computeDiff(prevRec, record, [
    { key: 'partyName',   label: 'Party' },
    { key: 'amount',      label: 'Amount',       format: fmtMoney },
    { key: 'discount',    label: 'Discount',     format: fmtMoney },
    { key: 'paymentMode', label: 'Payment Mode' },
    { key: 'status',      label: 'Status' },
    { key: 'reference',   label: 'Reference' },
  ]);
  logActivity({ tenantId: req.tenantId, action: 'EDIT', type: 'PaymentIn', refNo: record.reference || `#${record.id}`, partyName: record.partyName, amount: Number(record.amount), userName: req.headers['x-user'], changes });
  res.json(record);
});

router.delete('/in/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const rec = await prisma.paymentInHistory.findFirst({ where: { id, tenantId } });
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: { tenantId, type: 'PaymentIn', entityId: id, name: rec.partyName || `Payment #${id}`, amount: Number(rec.amount || 0), snapshot: JSON.stringify(rec) },
      }),
      prisma.paymentInHistory.delete({ where: { id } }),
    ]);
    logActivity({ tenantId, action: 'DELETE', type: 'PaymentIn', refNo: rec.reference || `#${id}`, partyName: rec.partyName, amount: Number(rec.amount), userName: req.headers['x-user'] });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Payments Out ──────────────────────────────────────────────
router.get('/out', async (req, res) => {
  const records = await prisma.paymentOutHistory.findMany({
    where: { tenantId: req.tenantId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { party: { select: { id: true, name: true } } },
  });
  res.json(records);
});

router.get('/out/:id', async (req, res) => {
  const record = await prisma.paymentOutHistory.findFirst({
    where: { id: Number(req.params.id), tenantId: req.tenantId },
    include: { party: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.post('/out', async (req, res) => {
  try {
    const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
    const record = await prisma.paymentOutHistory.create({
      data: {
        tenantId:    req.tenantId,
        partyId:     partyId     ? Number(partyId) : null,
        partyName:   partyName   || null,
        amount:      Number(amount   || 0),
        discount:    Number(discount || 0),
        paymentMode: paymentMode || 'Cash',
        reference:   reference   || null,
        notes:       notes       || null,
        status:      status      || 'Unused',
        date:        date ? new Date(date) : undefined,
      },
    });
    logActivity({ tenantId: req.tenantId, action: 'CREATE', type: 'PaymentOut', refNo: record.reference || `#${record.id}`, partyName: record.partyName, amount: Number(record.amount), userName: req.headers['x-user'] });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/out/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prevRec = await prisma.paymentOutHistory.findFirst({
      where: { id, tenantId: req.tenantId },
      select: { partyName: true, amount: true, discount: true, paymentMode: true, status: true, reference: true },
    });
    if (!prevRec) return res.status(404).json({ error: 'Not found' });

    const { partyId, partyName, amount, discount, paymentMode, reference, notes, status, date } = req.body;
    const data = {};
    if (partyId     !== undefined) data.partyId     = partyId ? Number(partyId) : null;
    if (partyName   !== undefined) data.partyName   = partyName   || null;
    if (amount      !== undefined) data.amount      = Number(amount);
    if (discount    !== undefined) data.discount    = Number(discount);
    if (paymentMode !== undefined) data.paymentMode = paymentMode;
    if (reference   !== undefined) data.reference   = reference   || null;
    if (notes       !== undefined) data.notes       = notes       || null;
    if (status      !== undefined) data.status      = status;
    if (date        !== undefined) data.date        = new Date(date);
    const record = await prisma.paymentOutHistory.update({
      where: { id },
      data,
    });
    const changes = computeDiff(prevRec, record, [
      { key: 'partyName',   label: 'Party' },
      { key: 'amount',      label: 'Amount',       format: fmtMoney },
      { key: 'discount',    label: 'Discount',     format: fmtMoney },
      { key: 'paymentMode', label: 'Payment Mode' },
      { key: 'status',      label: 'Status' },
      { key: 'reference',   label: 'Reference' },
    ]);
    logActivity({ tenantId: req.tenantId, action: 'EDIT', type: 'PaymentOut', refNo: record.reference || `#${record.id}`, partyName: record.partyName, amount: Number(record.amount), userName: req.headers['x-user'], changes });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/out/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const rec = await prisma.paymentOutHistory.findFirst({ where: { id, tenantId } });
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: { tenantId, type: 'PaymentOut', entityId: id, name: rec.partyName || `Payment #${id}`, amount: Number(rec.amount || 0), snapshot: JSON.stringify(rec) },
      }),
      prisma.paymentOutHistory.delete({ where: { id } }),
    ]);
    logActivity({ tenantId, action: 'DELETE', type: 'PaymentOut', refNo: rec.reference || `#${id}`, partyName: rec.partyName, amount: Number(rec.amount), userName: req.headers['x-user'] });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
