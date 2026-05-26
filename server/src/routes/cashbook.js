import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Cash actually received for a sale = totalReceived − changeGiven (not grandTotal, which may be unpaid)
const saleCash  = s => Math.max(0, Number(s.totalReceived) - Number(s.changeGiven));
// Cash actually paid for a purchase = totalPaid (not grandTotal, which may be unpaid/partial)
const purchCash = p => Math.max(0, Number(p.totalPaid));

router.get('/summary', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const [yr, mo, dy] = dateStr.split('-').map(Number);

    const dayStart  = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
    const dayEnd    = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
    const beforeDay = new Date(yr, mo - 1, dy, 0, 0, 0, 0);

    const [
      prevCashSales, prevCashPurch, prevCashTxns, prevPayIn, prevPayOut,
      daySales, dayPurchases, dayCashTxns, dayPayIn, dayPayOut,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: { date: { lt: beforeDay }, paymentMode: 'Cash' },
        select: { totalReceived: true, changeGiven: true },
      }),
      prisma.purchase.findMany({
        where: { date: { lt: beforeDay }, paymentMode: 'Cash' },
        select: { totalPaid: true },
      }),
      prisma.cashTransaction.findMany({
        where: { date: { lt: beforeDay } },
        select: { amount: true, type: true },
      }),
      prisma.paymentInHistory.findMany({
        where: { date: { lt: beforeDay }, paymentMode: 'Cash' },
        select: { amount: true },
      }),
      prisma.paymentOutHistory.findMany({
        where: { date: { lt: beforeDay }, paymentMode: 'Cash' },
        select: { amount: true },
      }),
      prisma.sale.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { grandTotal: true, totalReceived: true, changeGiven: true, paymentMode: true, customerName: true, invoice: true },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { grandTotal: true, totalPaid: true, paymentMode: true, partyName: true, invoice: true },
      }),
      prisma.cashTransaction.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { amount: true, type: true, description: true },
      }),
      prisma.paymentInHistory.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { amount: true, paymentMode: true, partyName: true },
      }),
      prisma.paymentOutHistory.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { amount: true, paymentMode: true, partyName: true },
      }),
    ]);

    // Opening balance = all actual cash flows before today
    let opening = 0;
    prevCashSales.forEach(s => opening += saleCash(s));
    prevCashPurch.forEach(p => opening -= purchCash(p));
    prevCashTxns.forEach(t  => { opening += t.type === 'Add Cash' ? Number(t.amount) : -Number(t.amount); });
    prevPayIn.forEach(p     => opening += Number(p.amount));
    prevPayOut.forEach(p    => opening -= Number(p.amount));

    // Today — sales
    const cashSales   = daySales.filter(s => s.paymentMode === 'Cash');
    const creditSales = daySales.filter(s => s.paymentMode !== 'Cash');
    const totalCashSales   = cashSales.reduce((s, i) => s + saleCash(i), 0);
    const totalCreditSales = creditSales.reduce((s, i) => s + Number(i.grandTotal), 0);

    // Today — purchases
    const cashPurch   = dayPurchases.filter(p => p.paymentMode === 'Cash');
    const creditPurch = dayPurchases.filter(p => p.paymentMode !== 'Cash');
    const totalCashPurch   = cashPurch.reduce((s, i) => s + purchCash(i), 0);
    const totalCreditPurch = creditPurch.reduce((s, i) => s + Number(i.grandTotal), 0);

    // Today — cash transactions
    const incomeItems   = dayCashTxns.filter(t => t.type === 'Add Cash');
    const withdrawItems = dayCashTxns.filter(t => t.type === 'Reduce Cash');
    const expenseItems  = dayCashTxns.filter(t => t.type !== 'Add Cash' && t.type !== 'Reduce Cash');
    const totalIncome   = incomeItems.reduce((s, t) => s + Number(t.amount), 0);
    const totalWithdraw = withdrawItems.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = expenseItems.reduce((s, t) => s + Number(t.amount), 0);

    // Today — payment in/out (cash only)
    const cashPayIn  = dayPayIn.filter(p => p.paymentMode === 'Cash');
    const cashPayOut = dayPayOut.filter(p => p.paymentMode === 'Cash');
    const totalPayIn  = cashPayIn.reduce((s, p) => s + Number(p.amount), 0);
    const totalPayOut = cashPayOut.reduce((s, p) => s + Number(p.amount), 0);

    const closing = opening + totalCashSales + totalIncome + totalPayIn
                             - totalCashPurch - totalExpenses - totalWithdraw - totalPayOut;

    res.json({
      date: dateStr,
      openingBalance: +opening.toFixed(2),
      sales: {
        cash:        +totalCashSales.toFixed(2),
        credit:      +totalCreditSales.toFixed(2),
        total:       +(totalCashSales + totalCreditSales).toFixed(2),
        cashCount:   cashSales.length,
        creditCount: creditSales.length,
      },
      purchases: {
        cash:        +totalCashPurch.toFixed(2),
        credit:      +totalCreditPurch.toFixed(2),
        total:       +(totalCashPurch + totalCreditPurch).toFixed(2),
        cashCount:   cashPurch.length,
        creditCount: creditPurch.length,
      },
      expenses: {
        cash:  +totalExpenses.toFixed(2),
        count: expenseItems.length,
      },
      cashWithdraw: {
        cash:  +totalWithdraw.toFixed(2),
        count: withdrawItems.length,
      },
      income: {
        cash:  +totalIncome.toFixed(2),
        count: incomeItems.length,
      },
      paymentIn:  { cash: +totalPayIn.toFixed(2),  count: cashPayIn.length  },
      paymentOut: { cash: +totalPayOut.toFixed(2), count: cashPayOut.length },
      closingBalance: +closing.toFixed(2),
    });
  } catch (err) {
    console.error('Cashbook summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── history: one row per active day in [from, to] ── */
router.get('/history', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const fromStr = req.query.from || today;
    const toStr   = req.query.to   || today;

    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);

    const rangeStart = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
    const rangeEnd   = new Date(ty, tm - 1, td, 23, 59, 59, 999);

    const [
      prevSales, prevPurch, prevTxns, prevPayIn, prevPayOut,
      ranSales, ranPurch, ranTxns, ranPayIn, ranPayOut,
    ] = await Promise.all([
      prisma.sale.findMany({ where: { date: { lt: rangeStart }, paymentMode: 'Cash' }, select: { totalReceived: true, changeGiven: true } }),
      prisma.purchase.findMany({ where: { date: { lt: rangeStart }, paymentMode: 'Cash' }, select: { totalPaid: true } }),
      prisma.cashTransaction.findMany({ where: { date: { lt: rangeStart } }, select: { amount: true, type: true } }),
      prisma.paymentInHistory.findMany({ where: { date: { lt: rangeStart }, paymentMode: 'Cash' }, select: { amount: true } }),
      prisma.paymentOutHistory.findMany({ where: { date: { lt: rangeStart }, paymentMode: 'Cash' }, select: { amount: true } }),
      prisma.sale.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd } }, select: { grandTotal: true, totalReceived: true, changeGiven: true, paymentMode: true, date: true } }),
      prisma.purchase.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd } }, select: { grandTotal: true, totalPaid: true, paymentMode: true, date: true } }),
      prisma.cashTransaction.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd } }, select: { amount: true, type: true, date: true } }),
      prisma.paymentInHistory.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd }, paymentMode: 'Cash' }, select: { amount: true, date: true } }),
      prisma.paymentOutHistory.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd }, paymentMode: 'Cash' }, select: { amount: true, date: true } }),
    ]);

    // Opening balance before rangeStart (actual cash exchanged)
    let runningBalance = 0;
    prevSales.forEach(s  => runningBalance += saleCash(s));
    prevPurch.forEach(p  => runningBalance -= purchCash(p));
    prevTxns.forEach(t   => { runningBalance += t.type === 'Add Cash' ? Number(t.amount) : -Number(t.amount); });
    prevPayIn.forEach(p  => runningBalance += Number(p.amount));
    prevPayOut.forEach(p => runningBalance -= Number(p.amount));

    // Helper: normalise any Date-like value to YYYY-MM-DD local string
    const toDateStr = v => {
      const d = new Date(v);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Collect only dates that have at least one transaction
    const dateSet = new Set();
    [...ranSales, ...ranPurch, ...ranTxns, ...ranPayIn, ...ranPayOut].forEach(r => dateSet.add(toDateStr(r.date)));

    // Per-date buckets
    const bucket = {};
    for (const ds of dateSet) {
      bucket[ds] = { cashSales: 0, creditSales: 0, cashSalesCount: 0, creditSalesCount: 0,
                     cashPurch: 0, creditPurch: 0, cashPurchCount: 0, creditPurchCount: 0,
                     expenses: 0, expensesCount: 0, income: 0, incomeCount: 0,
                     cashWithdraw: 0, cashWithdrawCount: 0,
                     payIn: 0, payInCount: 0, payOut: 0, payOutCount: 0 };
    }

    ranSales.forEach(s => {
      const b = bucket[toDateStr(s.date)]; if (!b) return;
      if (s.paymentMode === 'Cash') { b.cashSales += saleCash(s); b.cashSalesCount++; }
      else { b.creditSales += Number(s.grandTotal); b.creditSalesCount++; }
    });
    ranPurch.forEach(p => {
      const b = bucket[toDateStr(p.date)]; if (!b) return;
      if (p.paymentMode === 'Cash') { b.cashPurch += purchCash(p); b.cashPurchCount++; }
      else { b.creditPurch += Number(p.grandTotal); b.creditPurchCount++; }
    });
    ranTxns.forEach(t => {
      const b = bucket[toDateStr(t.date)]; if (!b) return;
      if (t.type === 'Add Cash')         { b.income       += Number(t.amount); b.incomeCount++;       }
      else if (t.type === 'Reduce Cash') { b.cashWithdraw += Number(t.amount); b.cashWithdrawCount++; }
      else                               { b.expenses     += Number(t.amount); b.expensesCount++;     }
    });
    ranPayIn.forEach(p  => { const b = bucket[toDateStr(p.date)]; if (b) { b.payIn  += Number(p.amount); b.payInCount++;  } });
    ranPayOut.forEach(p => { const b = bucket[toDateStr(p.date)]; if (b) { b.payOut += Number(p.amount); b.payOutCount++; } });

    // Build result with running balance (sorted ascending)
    const result = [];
    for (const ds of [...dateSet].sort()) {
      const d = bucket[ds];
      const opening = runningBalance;
      const cashIn  = d.cashSales + d.income + d.payIn;
      const cashOut = d.cashPurch + d.expenses + d.cashWithdraw + d.payOut;
      const closing = opening + cashIn - cashOut;
      result.push({
        date: ds,
        openingBalance: +opening.toFixed(2),
        sales:        { cash: +d.cashSales.toFixed(2), credit: +d.creditSales.toFixed(2), total: +(d.cashSales + d.creditSales).toFixed(2), cashCount: d.cashSalesCount, creditCount: d.creditSalesCount },
        purchases:    { cash: +d.cashPurch.toFixed(2), credit: +d.creditPurch.toFixed(2), total: +(d.cashPurch + d.creditPurch).toFixed(2), cashCount: d.cashPurchCount, creditCount: d.creditPurchCount },
        expenses:     { cash: +d.expenses.toFixed(2),     count: d.expensesCount     },
        cashWithdraw: { cash: +d.cashWithdraw.toFixed(2), count: d.cashWithdrawCount },
        income:       { cash: +d.income.toFixed(2),       count: d.incomeCount       },
        paymentIn:    { cash: +d.payIn.toFixed(2),        count: d.payInCount        },
        paymentOut:   { cash: +d.payOut.toFixed(2),       count: d.payOutCount       },
        cashIn:  +cashIn.toFixed(2),
        cashOut: +cashOut.toFixed(2),
        closingBalance: +closing.toFixed(2),
      });
      runningBalance = closing;
    }

    res.json(result.reverse()); // most-recent first
  } catch (err) {
    console.error('Cashbook history error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
