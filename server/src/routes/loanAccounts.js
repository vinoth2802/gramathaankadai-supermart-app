import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

function computeBalance(txns) {
  return txns.reduce((bal, t) => {
    if (t.type === 'opening_loan' || t.type === 'drawdown') return bal + Number(t.principal);
    if (t.type === 'payment') return bal - Number(t.principal);
    return bal;
  }, 0);
}

// GET /api/loan-accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.loanAccount.findMany({
      where: { tenantId: req.tenantId },
      include: { transactions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts.map(a => ({ ...a, balance: computeBalance(a.transactions) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/loan-accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const account = await prisma.loanAccount.findFirst({
      where: { id: Number(req.params.id), tenantId: req.tenantId },
      include: { transactions: { orderBy: { transactionDate: 'asc' } } },
    });
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json({ ...account, balance: computeBalance(account.transactions) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loan-accounts
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { name, principal, interestRate, startDate, durationMonths, lenderName, paymentMode, notes } = req.body;
    const account = await prisma.loanAccount.create({
      data: {
        tenantId,
        name,
        principal:      principal      ? Number(principal)      : null,
        interestRate:   interestRate   ? Number(interestRate)   : null,
        startDate:      startDate      ? new Date(startDate)    : null,
        durationMonths: durationMonths ? Number(durationMonths) : null,
        lenderName:     lenderName     || null,
        paymentMode:    paymentMode    || 'Cash',
        notes:          notes          || null,
        transactions: {
          create: {
            tenantId,
            type:            'opening_loan',
            principal:       Number(principal) || 0,
            totalAmount:     Number(principal) || 0,
            paymentMode:     paymentMode || 'Cash',
            transactionDate: startDate ? new Date(startDate) : new Date(),
            notes:           notes || null,
          },
        },
      },
      include: { transactions: true },
    });
    res.status(201).json({ ...account, balance: computeBalance(account.transactions) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/loan-accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.loanAccount.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/loan-accounts/:id/transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const txns = await prisma.loanTransaction.findMany({
      where: { loanId: Number(req.params.id), tenantId: req.tenantId },
      orderBy: { transactionDate: 'asc' },
    });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guard: ensure the loan belongs to the tenant before adding a transaction.
async function assertLoan(req, res) {
  const loan = await prisma.loanAccount.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenantId }, select: { id: true } });
  if (!loan) { res.status(404).json({ error: 'Loan not found' }); return false; }
  return true;
}

// POST /api/loan-accounts/:id/payments
router.post('/:id/payments', async (req, res) => {
  try {
    if (!(await assertLoan(req, res))) return;
    const { paymentDate, principal, interest, otherCharges, paymentMode, referenceNo, notes } = req.body;
    const p = Number(principal) || 0;
    const i = Number(interest)  || 0;
    const o = Number(otherCharges) || 0;
    const txn = await prisma.loanTransaction.create({
      data: {
        tenantId:        req.tenantId,
        loanId:          Number(req.params.id),
        type:            'payment',
        principal:       p,
        interest:        i,
        otherCharges:    o,
        totalAmount:     p + i + o,
        paymentMode:     paymentMode || 'Cash',
        referenceNo:     referenceNo || null,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes:           notes || null,
      },
    });
    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loan-accounts/:id/drawdowns
router.post('/:id/drawdowns', async (req, res) => {
  try {
    if (!(await assertLoan(req, res))) return;
    const { date, amount, paymentMode, notes } = req.body;
    const amt = Number(amount) || 0;
    const txn = await prisma.loanTransaction.create({
      data: {
        tenantId:        req.tenantId,
        loanId:          Number(req.params.id),
        type:            'drawdown',
        principal:       amt,
        interest:        0,
        otherCharges:    0,
        totalAmount:     amt,
        paymentMode:     paymentMode || 'Cash',
        transactionDate: date ? new Date(date) : new Date(),
        notes:           notes || null,
      },
    });
    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loan-accounts/:id/charges
router.post('/:id/charges', async (req, res) => {
  try {
    if (!(await assertLoan(req, res))) return;
    const { chargeType, amount, date, notes } = req.body;
    const amt = Number(amount) || 0;
    const txn = await prisma.loanTransaction.create({
      data: {
        tenantId:        req.tenantId,
        loanId:          Number(req.params.id),
        type:            'charge',
        principal:       0,
        interest:        0,
        otherCharges:    amt,
        totalAmount:     amt,
        chargeType:      chargeType || null,
        transactionDate: date ? new Date(date) : new Date(),
        notes:           notes || null,
      },
    });
    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
