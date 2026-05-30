import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const fmtMoney = v => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

const router = Router();

const include = { items: true };

const mapItem = (tenantId) => ({ name, batchNo, expiryDate, mfgDate, mrp, qty, unit, price, gstRate, gstAmount, total }) => ({
  tenantId,
  name,
  batchNo: batchNo || null,
  expiryDate: expiryDate ? new Date(expiryDate) : null,
  mfgDate: mfgDate ? new Date(mfgDate) : null,
  mrp: Number(mrp) || 0,
  qty: Number(qty),
  unit: unit || null,
  price: Number(price),
  gstRate: Number(gstRate) || 0,
  gstAmount: Number(gstAmount) || 0,
  total: Number(total),
});

function deriveStatus(grandTotal, totalPaid) {
  const gt = Number(grandTotal ?? 0);
  const tp = Number(totalPaid  ?? 0);
  if (tp <= 0)  return 'Unpaid';
  if (tp >= gt) return 'Paid';
  return 'Partial';
}

router.get('/', async (req, res) => {
  const { from, to, invoiceSearch, partyId, partyName, paymentStatus } = req.query;
  const where = { tenantId: req.tenantId };
  if (from && to) where.date = { gte: new Date(from), lte: new Date(to) };
  if (invoiceSearch) where.invoice = { contains: invoiceSearch };
  if (partyId && partyName) {
    where.OR = [
      { partyId: Number(partyId) },
      { partyName: { equals: partyName } },
    ];
  } else if (partyId) {
    where.partyId = Number(partyId);
  } else if (partyName) {
    where.partyName = { equals: partyName };
  }
  if (paymentStatus) {
    const statuses = paymentStatus.split(',').map(s => s.trim());
    where.paymentStatus = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  const purchases = await prisma.purchase.findMany({
    where,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
});

router.get('/:id', async (req, res) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id: Number(req.params.id), tenantId: req.tenantId },
    include,
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

router.post('/', async (req, res) => {
  const tenantId = req.tenantId;
  const { invoice, date, supplierInvoiceNo, supplierInvoiceDate, partyName, partyId, items = [], grandTotal, totalPaid, paymentStatus, paymentMode } = req.body;
  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        tenantId,
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
        items: { create: items.map(mapItem(tenantId)) },
      },
      include,
    });
    // Increment stock for each received item.
    // Match by name since purchase items don't carry a productId.
    for (const item of created.items) {
      if (!item.name || Number(item.qty) <= 0) continue;
      const product = await tx.product.findFirst({
        where: { tenantId, shortName: item.name },
        select: { id: true },
      });
      if (product) {
        await tx.product.update({
          where: { id: product.id },
          data:  { stock: { increment: Number(item.qty) } },
        });
      }
    }
    return created;
  });
  logActivity({ tenantId, action: 'CREATE', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'] });
  res.status(201).json(purchase);
});

router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const prevPurchase = await prisma.purchase.findFirst({
      where: { id, tenantId },
      select: { partyName: true, grandTotal: true, totalPaid: true, paymentStatus: true, paymentMode: true },
    });
    if (!prevPurchase) return res.status(404).json({ error: 'Not found' });

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
      data.paymentStatus = deriveStatus(
        grandTotal  ?? prevPurchase?.grandTotal,
        totalPaid   ?? prevPurchase?.totalPaid,
      );
    }
    if (items) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: id, tenantId } });
      data.items = { create: items.map(mapItem(tenantId)) };
    }
    const purchase = await prisma.purchase.update({ where: { id }, data, include });
    const changes = computeDiff(prevPurchase, purchase, [
      { key: 'partyName',     label: 'Supplier' },
      { key: 'grandTotal',    label: 'Grand Total', format: fmtMoney },
      { key: 'totalPaid',     label: 'Amt Paid',    format: fmtMoney },
      { key: 'paymentStatus', label: 'Status' },
      { key: 'paymentMode',   label: 'Payment Mode' },
    ]);
    logActivity({ tenantId, action: 'EDIT', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'], changes });
    res.json(purchase);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const purchaseId = Number(req.params.id);

    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      include: { items: true },
    });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    await prisma.$transaction(async (tx) => {
      await tx.recycleBin.create({
        data: {
          tenantId,
          type:     'Purchase',
          entityId: purchase.id,
          name:     purchase.invoice,
          amount:   Number(purchase.grandTotal || 0),
          snapshot: JSON.stringify(purchase),
        },
      });
      for (const item of purchase.items.filter(i => Number(i.qty) > 0)) {
        const product = await tx.product.findFirst({
          where: { tenantId, shortName: { equals: item.name } },
          select: { id: true },
        });
        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data:  { stock: { decrement: Number(item.qty) } },
          });
        }
      }
      await tx.purchase.delete({ where: { id: purchaseId } });
    });
    logActivity({ tenantId, action: 'DELETE', type: 'Purchase', refNo: purchase.invoice, partyName: purchase.partyName, amount: Number(purchase.grandTotal), userName: req.headers['x-user'] });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
