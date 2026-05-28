import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const fmtMoney = v => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

const router = Router();

const include = { items: true };

function deriveStatus(grandTotal, totalPaid) {
  const gt = Number(grandTotal ?? 0);
  const tp = Number(totalPaid  ?? 0);
  if (tp <= 0)  return 'Unpaid';
  if (tp >= gt) return 'Paid';
  return 'Partial';
}

router.get('/', async (req, res) => {
  const { from, to, invoiceSearch, partyId, partyName, paymentStatus } = req.query;
  const where = {};
  if (from && to) where.date = { gte: new Date(from), lte: new Date(to) };
  if (invoiceSearch) where.invoice = { contains: invoiceSearch, mode: 'insensitive' };
  if (partyId && partyName) {
    where.OR = [
      { partyId: Number(partyId) },
      { partyName: { equals: partyName, mode: 'insensitive' } },
    ];
  } else if (partyId) {
    where.partyId = Number(partyId);
  } else if (partyName) {
    where.partyName = { equals: partyName, mode: 'insensitive' };
  }
  if (paymentStatus) {
    const statuses = paymentStatus.split(',').map(s => s.trim());
    where.paymentStatus = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  const purchases = await prisma.purchase.findMany({
    where: Object.keys(where).length ? where : undefined,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
});

router.get('/:id', async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

router.post('/', async (req, res) => {
  const { invoice, date, supplierInvoiceNo, supplierInvoiceDate, partyName, partyId, items = [], grandTotal, totalPaid, paymentStatus, paymentMode } = req.body;
  const purchase = await prisma.purchase.create({
    data: {
      invoice,
      date:                date ? new Date(date) : new Date(),
      supplierInvoiceNo:   supplierInvoiceNo || null,
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : null,
      partyName:           partyName   || null,
      partyId:             partyId     || null,
      grandTotal:          grandTotal  ?? 0,
      totalPaid:           totalPaid   ?? grandTotal ?? 0,
      paymentStatus:       paymentStatus ?? deriveStatus(grandTotal, totalPaid),
      paymentMode:         paymentMode || 'Cash',
      items: {
        create: items.map(({
          name,
          batchNo,
          expiryDate,
          mfgDate,
          mrp,
          qty,
          unit,
          price,
          gstRate,
          gstAmount,
          total,
        }) => ({
          name,
          batchNo: batchNo || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          mrp: mrp ?? 0,
          qty,
          unit: unit || null,
          price,
          gstRate: gstRate ?? 0,
          gstAmount: gstAmount ?? 0,
          total,
        })),
      },
    },
    include,
  });
  logActivity({ action: 'CREATE', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'] });
  res.status(201).json(purchase);
});

router.patch('/:id', async (req, res) => {
  try {
    const prevPurchase = await prisma.purchase.findUnique({
      where: { id: Number(req.params.id) },
      select: { partyName: true, grandTotal: true, totalPaid: true, paymentStatus: true, paymentMode: true },
    });

    const { status, partyName, paymentMode, date, grandTotal, totalPaid, paymentStatus, items } = req.body;
    const data = {};
    if (status        !== undefined) data.status        = status;
    if (partyName     !== undefined) data.partyName     = partyName;
    if (paymentMode   !== undefined) data.paymentMode   = paymentMode;
    if (date          !== undefined) data.date          = new Date(date);
    if (grandTotal    !== undefined) data.grandTotal    = grandTotal;
    if (totalPaid     !== undefined) data.totalPaid     = totalPaid;
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    else if (totalPaid !== undefined || grandTotal !== undefined) {
      const purchase = await prisma.purchase.findUnique({ where: { id: Number(req.params.id) }, select: { grandTotal: true, totalPaid: true } });
      data.paymentStatus = deriveStatus(
        grandTotal  ?? purchase?.grandTotal,
        totalPaid   ?? purchase?.totalPaid,
      );
    }
    if (items) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: Number(req.params.id) } });
      data.items = {
        create: items.map(({ name, batchNo, expiryDate, mfgDate, mrp, qty, unit, price, gstRate, gstAmount, total }) => ({
          name,
          batchNo: batchNo || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          mrp: Number(mrp) ?? 0,
          qty: Number(qty),
          unit: unit || null,
          price: Number(price),
          gstRate: Number(gstRate) ?? 0,
          gstAmount: Number(gstAmount) ?? 0,
          total: Number(total),
        })),
      };
    }
    const purchase = await prisma.purchase.update({ where: { id: Number(req.params.id) }, data, include });
    const changes = computeDiff(prevPurchase, purchase, [
      { key: 'partyName',     label: 'Supplier' },
      { key: 'grandTotal',    label: 'Grand Total', format: fmtMoney },
      { key: 'totalPaid',     label: 'Amt Paid',    format: fmtMoney },
      { key: 'paymentStatus', label: 'Status' },
      { key: 'paymentMode',   label: 'Payment Mode' },
    ]);
    logActivity({ action: 'EDIT', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'], changes });
    res.json(purchase);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    await prisma.$transaction(async (tx) => {
      await tx.recycleBin.create({
        data: {
          type:     'Purchase',
          entityId: purchase.id,
          name:     purchase.invoice,
          amount:   Number(purchase.grandTotal || 0),
          snapshot: JSON.stringify(purchase),
        },
      });
      for (const item of purchase.items.filter(i => Number(i.qty) > 0)) {
        const product = await tx.product.findFirst({
          where: { shortName: { equals: item.name, mode: 'insensitive' } },
          select: { id: true },
        });
        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data:  { stock: { increment: Number(item.qty) } },
          });
        }
      }
      await tx.purchase.delete({ where: { id: purchaseId } });
    });
    logActivity({ action: 'DELETE', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'] });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
