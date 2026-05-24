import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// GET /api/reports/bill-wise-profit?from=&to=
router.get('/bill-wise-profit', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        items:  { include: { product: { select: { purchasePrice: true } } } },
        party:  { select: { name: true } },
      },
    });

    const result = sales.map(s => {
      const saleAmount = Number(s.grandTotal);
      const cost = s.items.reduce((sum, item) => {
        const cp = item.product ? Number(item.product.purchasePrice) : 0;
        return sum + cp * Number(item.qty);
      }, 0);
      const profit = saleAmount - cost;
      return {
        id:          s.id,
        date:        s.date,
        invoice:     s.invoice,
        party:       s.party?.name ?? s.customerName ?? 'Walk-in Customer',
        saleAmount,
        cost,
        profit,
        profitPct:   saleAmount > 0 ? (profit / saleAmount) * 100 : 0,
        itemCount:   s.items.length,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/day-book?date=YYYY-MM-DD
router.get('/day-book', async (req, res) => {
  try {
    const { date } = req.query;
    const day = date ? new Date(date) : new Date();
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const to   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

    const [sales, purchases, cashTxns] = await Promise.all([
      prisma.sale.findMany({
        where: { date: { gte: from, lte: to } },
        include: { party: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: 'desc' },
      }),
      prisma.cashTransaction.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: 'desc' },
      }),
    ]);

    const transactions = [
      ...sales.map(s => ({
        id: `sale-${s.id}`, type: 'Sale', flow: 'in',
        party:       s.party?.name ?? s.customerName ?? 'Walk-in',
        date:        s.date,
        amount:      Number(s.grandTotal),
        invoice:     s.invoice,
        paymentMode: s.paymentMode,
      })),
      ...purchases.map(p => ({
        id: `pur-${p.id}`, type: 'Purchase', flow: 'out',
        party:       p.partyName ?? 'Supplier',
        date:        p.date,
        amount:      Number(p.grandTotal),
        invoice:     p.invoice ?? '—',
        paymentMode: p.paymentMode,
      })),
      ...cashTxns.map(c => ({
        id: `cash-${c.id}`, type: c.type, flow: c.type === 'Add Cash' ? 'in' : 'out',
        party:       c.description ?? 'Cash Adjustment',
        date:        c.date,
        amount:      Number(c.amount),
        invoice:     '—',
        paymentMode: 'Cash',
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalIn  = transactions.filter(t => t.flow === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.flow === 'out').reduce((s, t) => s + t.amount, 0);
    res.json({ transactions, totalIn, totalOut, net: totalIn - totalOut });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/all-transactions?from=&to=
router.get('/all-transactions', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from || to) {
      dateWhere.date = {};
      if (from) dateWhere.date.gte = new Date(from);
      if (to)   dateWhere.date.lte = new Date(to);
    }
    const hasFilter = Object.keys(dateWhere).length > 0;

    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({
        where: hasFilter ? dateWhere : undefined,
        include: { party: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.purchase.findMany({
        where: hasFilter ? dateWhere : undefined,
        orderBy: { date: 'desc' },
      }),
    ]);

    const transactions = [
      ...sales.map(s => ({
        id: `sale-${s.id}`, type: 'Sale', flow: 'in',
        party:       s.party?.name ?? s.customerName ?? 'Walk-in',
        date:        s.date,
        amount:      Number(s.grandTotal),
        invoice:     s.invoice,
        paymentMode: s.paymentMode,
      })),
      ...purchases.map(p => ({
        id: `pur-${p.id}`, type: 'Purchase', flow: 'out',
        party:       p.partyName ?? 'Supplier',
        date:        p.date,
        amount:      Number(p.grandTotal),
        invoice:     p.invoice ?? '—',
        paymentMode: p.paymentMode,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalIn  = transactions.filter(t => t.flow === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.flow === 'out').reduce((s, t) => s + t.amount, 0);
    res.json({ transactions, totalIn, totalOut, net: totalIn - totalOut });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
