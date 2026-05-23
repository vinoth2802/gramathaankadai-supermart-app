import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const include = { items: true };

router.get('/', async (req, res) => {
  const { from, to, invoiceSearch } = req.query;
  const where = {};
  if (from && to) where.date = { gte: new Date(from), lte: new Date(to) };
  if (invoiceSearch) where.invoice = { contains: invoiceSearch, mode: 'insensitive' };
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
  const { invoice, date, supplierInvoiceNo, supplierInvoiceDate, partyName, partyId, items = [], grandTotal, paymentMode } = req.body;
  const purchase = await prisma.purchase.create({
    data: {
      invoice,
      date:                date ? new Date(date) : new Date(),
      supplierInvoiceNo:   supplierInvoiceNo || null,
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : null,
      partyName:           partyName   || null,
      partyId:             partyId     || null,
      grandTotal:          grandTotal  ?? 0,
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
  res.status(201).json(purchase);
});

router.patch('/:id', async (req, res) => {
  try {
    const { status, partyName, paymentMode, date, grandTotal, items } = req.body;
    const data = {};
    if (status      !== undefined) data.status      = status;
    if (partyName   !== undefined) data.partyName   = partyName;
    if (paymentMode !== undefined) data.paymentMode = paymentMode;
    if (date        !== undefined) data.date        = new Date(date);
    if (grandTotal  !== undefined) data.grandTotal  = grandTotal;
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
      for (const item of purchase.items.filter(i => Number(i.qty) > 0)) {
        const product = await tx.item.findFirst({
          where: { shortName: { equals: item.name, mode: 'insensitive' } },
          select: { id: true },
        });
        if (product) {
          await tx.item.update({
            where: { id: product.id },
            data:  { stock: { increment: Number(item.qty) } },
          });
        }
      }
      await tx.purchase.delete({ where: { id: purchaseId } });
    });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
