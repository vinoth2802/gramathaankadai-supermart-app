import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// ── UOM ───────────────────────────────────────────────────────
router.get('/uom', async (_req, res) => {
  const uoms = await prisma.uom.findMany({ orderBy: { id: 'asc' } });
  res.json(uoms);
});

router.post('/uom', async (req, res) => {
  const uom = await prisma.uom.create({
    data: { code: req.body.code.toUpperCase(), descr: req.body.descr || '' },
  });
  res.status(201).json(uom);
});

router.delete('/uom/:id', async (req, res) => {
  await prisma.uom.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ── Cash Transactions ─────────────────────────────────────────
router.get('/cash', async (_req, res) => {
  const records = await prisma.cashTransaction.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(records);
});

router.post('/cash', async (req, res) => {
  const { date, type, amount, description } = req.body;
  const record = await prisma.cashTransaction.create({
    data: {
      date:        date ? new Date(date) : undefined,
      type,
      amount,
      description: description || null,
    },
  });
  res.status(201).json(record);
});

// ── Bank Accounts ─────────────────────────────────────────────
router.get('/bank', async (_req, res) => {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });
  res.json(accounts);
});

router.post('/bank', async (req, res) => {
  const { bankName, accountNo, ifsc, balance, type } = req.body;
  const account = await prisma.bankAccount.create({
    data: {
      bankName,
      accountNo: accountNo || null,
      ifsc:      ifsc      || null,
      balance:   balance   ?? 0,
      type:      type      || 'Current',
    },
  });
  res.status(201).json(account);
});

// ── Cheques ───────────────────────────────────────────────────
router.get('/cheques', async (_req, res) => {
  const cheques = await prisma.cheque.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(cheques);
});

router.post('/cheques', async (req, res) => {
  const { partyId, partyName, amount, chequeNo, bank, issueDate, dueDate, type } = req.body;
  const cheque = await prisma.cheque.create({
    data: {
      partyId:   partyId   || null,
      partyName: partyName || null,
      amount,
      chequeNo:  chequeNo  || null,
      bank:      bank      || null,
      issueDate: issueDate ? new Date(issueDate) : null,
      dueDate:   dueDate   ? new Date(dueDate)   : null,
      type,
    },
  });
  res.status(201).json(cheque);
});

router.patch('/cheques/:id', async (req, res) => {
  const cheque = await prisma.cheque.update({
    where: { id: Number(req.params.id) },
    data: { status: req.body.status },
  });
  res.json(cheque);
});

// ── Audit Log ─────────────────────────────────────────────────
router.get('/audit', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { logTime: 'desc' },
    take: 500,
  });
  res.json(logs);
});

router.post('/audit', async (req, res) => {
  const log = await prisma.auditLog.create({
    data: {
      userName: req.body.userName || 'admin',
      action:   req.body.action,
      details:  req.body.details ?? undefined,
    },
  });
  res.status(201).json(log);
});

export default router;
