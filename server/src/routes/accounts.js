import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// ── UOM ───────────────────────────────────────────────────────
router.get('/uom', async (_req, res) => {
  try {
    const uoms = await prisma.uom.findMany({ orderBy: { id: 'asc' } });
    res.json(uoms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/uom', async (req, res) => {
  try {
    if (!req.body.code?.trim()) return res.status(400).json({ error: 'Code is required' });
    const uom = await prisma.uom.create({
      data: { code: req.body.code.trim().toUpperCase(), descr: req.body.descr || '' },
    });
    res.status(201).json(uom);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/uom/:id', async (req, res) => {
  try {
    await prisma.uom.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Cash Overview (balance + combined transactions) ───────────
router.get('/cash/overview', async (_req, res) => {
  try {
    const [adjustments, sales, purchases] = await Promise.all([
      prisma.cashTransaction.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
      prisma.sale.findMany({
        where: { paymentMode: 'Cash' },
        select: { id: true, customerName: true, date: true, grandTotal: true, invoice: true, createdAt: true },
      }),
      prisma.purchase.findMany({
        where: { paymentMode: 'Cash' },
        select: { id: true, partyName: true, date: true, grandTotal: true, invoice: true, createdAt: true },
      }),
    ]);

    let balance = 0;
    sales.forEach(s      => { balance += Number(s.grandTotal); });
    purchases.forEach(p  => { balance -= Number(p.grandTotal); });
    adjustments.forEach(a => {
      if (a.type === 'Add Cash')    balance += Number(a.amount);
      else                          balance -= Number(a.amount);
    });

    const transactions = [
      ...adjustments.map(a => ({
        id: `adj-${a.id}`, source: 'adjustment',
        type:   a.type,
        name:   a.description || 'Cash Adjustment',
        date:   a.createdAt,
        amount: Number(a.amount),
        flow:   a.type === 'Add Cash' ? 'in' : 'out',
      })),
      ...sales.map(s => ({
        id: `sale-${s.id}`, source: 'sale',
        type:   'Sale',
        name:   s.customerName || 'Walk-in Customer',
        date:   s.createdAt,
        amount: Number(s.grandTotal),
        flow:   'in',
        refNo:  s.invoice,
      })),
      ...purchases.map(p => ({
        id: `pur-${p.id}`, source: 'purchase',
        type:   'Purchase',
        name:   p.partyName || 'Supplier',
        date:   p.createdAt,
        amount: Number(p.grandTotal),
        flow:   'out',
        refNo:  p.invoice,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ balance, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

router.patch('/cash/:id', async (req, res) => {
  try {
    const { date, type, amount, description } = req.body;
    const record = await prisma.cashTransaction.update({
      where: { id: Number(req.params.id) },
      data: {
        date:        date ? new Date(date) : undefined,
        type,
        amount,
        description: description || null,
      },
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cash/:id', async (req, res) => {
  try {
    await prisma.cashTransaction.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bank Accounts ─────────────────────────────────────────────
router.get('/bank', async (_req, res) => {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });
  res.json(accounts);
});

router.post('/bank', async (req, res) => {
  try {
    const { bankName, accountNo, ifsc, balance, type } = req.body;
    if (!bankName?.trim()) return res.status(400).json({ error: 'Bank name is required' });
    const account = await prisma.bankAccount.create({
      data: {
        bankName:  bankName.trim(),
        accountNo: accountNo || null,
        ifsc:      ifsc      || null,
        balance:   balance   ?? 0,
        type:      type      || 'Current',
      },
    });
    // Auto-register as a payment mode so POS / Sales / Purchases dropdowns pick it up
    await prisma.paymentMode.upsert({
      where:  { name: bankName.trim() },
      update: { isActive: true },
      create: { name: bankName.trim(), descr: 'Bank Account' },
    });
    res.status(201).json(account);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bank account already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/bank/:id', async (req, res) => {
  try {
    const { bankName, accountNo, ifsc, type } = req.body;
    if (!bankName?.trim()) return res.status(400).json({ error: 'Bank name is required' });
    const account = await prisma.bankAccount.update({
      where: { id: Number(req.params.id) },
      data:  { bankName: bankName.trim(), accountNo: accountNo || null, ifsc: ifsc || null, type: type || 'Current' },
    });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bank/:id', async (req, res) => {
  try {
    await prisma.bankAccount.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bank/transfer', async (req, res) => {
  try {
    const { type, fromBankId, toBankId, amount } = req.body;
    const amt = Number(amount) || 0;
    if (type === 'adjust') {
      await prisma.bankAccount.update({ where: { id: Number(fromBankId) }, data: { balance: amt } });
    } else if (type === 'bankToCash') {
      await prisma.bankAccount.update({ where: { id: Number(fromBankId) }, data: { balance: { decrement: amt } } });
    } else if (type === 'cashToBank') {
      await prisma.bankAccount.update({ where: { id: Number(fromBankId) }, data: { balance: { increment: amt } } });
    } else if (type === 'bankToBank') {
      await prisma.$transaction([
        prisma.bankAccount.update({ where: { id: Number(fromBankId) }, data: { balance: { decrement: amt } } }),
        prisma.bankAccount.update({ where: { id: Number(toBankId)   }, data: { balance: { increment: amt } } }),
      ]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bank/:id/transactions', async (req, res) => {
  try {
    const bank = await prisma.bankAccount.findUnique({ where: { id: Number(req.params.id) }, select: { bankName: true } });
    if (!bank) return res.status(404).json({ error: 'Bank not found' });

    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({
        where: { paymentMode: bank.bankName },
        select: { id: true, customerName: true, date: true, grandTotal: true, invoice: true },
        orderBy: { date: 'desc' },
      }),
      prisma.purchase.findMany({
        where: { paymentMode: bank.bankName },
        select: { id: true, partyName: true, date: true, grandTotal: true, invoice: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const txns = [
      ...sales.map(s => ({ id: s.id, type: 'Sale',     name: s.customerName,       date: s.date, amount: s.grandTotal, refNo: s.invoice })),
      ...purchases.map(p => ({ id: p.id, type: 'Purchase', name: p.partyName || 'Supplier', date: p.date, amount: p.grandTotal, refNo: p.invoice })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
