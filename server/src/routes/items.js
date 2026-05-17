import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const items = await prisma.product.findMany({ orderBy: { shortName: 'asc' } });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', async (req, res) => {
  const { shortName, itemCode, category, hsnCode, uom, purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, expiryDate } = req.body;
  const item = await prisma.product.create({
    data: {
      shortName,
      itemCode:      itemCode   || null,
      category:      category   || 'General',
      hsnCode:       hsnCode    || null,
      uom:           uom        || 'PCS',
      purchasePrice: purchasePrice ?? 0,
      mrp:           mrp        ?? 0,
      salesPrice:    salesPrice ?? 0,
      gstRate:       gstRate    ?? 5,
      stock:         stock      ?? 0,
      reorderLevel:  reorderLevel ?? 10,
      expiryDate:    expiryDate ? new Date(expiryDate) : null,
    },
  });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const { shortName, itemCode, category, hsnCode, uom, purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, expiryDate } = req.body;
  const item = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: {
      shortName,
      itemCode:      itemCode   || null,
      category:      category   || 'General',
      hsnCode:       hsnCode    || null,
      uom:           uom        || 'PCS',
      purchasePrice: purchasePrice ?? 0,
      mrp:           mrp        ?? 0,
      salesPrice:    salesPrice ?? 0,
      gstRate:       gstRate    ?? 5,
      stock:         stock      ?? 0,
      reorderLevel:  reorderLevel ?? 10,
      expiryDate:    expiryDate ? new Date(expiryDate) : null,
    },
  });
  res.json(item);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (req.body.stockDelta !== undefined) {
    const item = await prisma.product.update({
      where: { id },
      data: { stock: { increment: req.body.stockDelta } },
    });
    return res.json(item);
  }

  // Generic partial update — only pass defined fields
  const { shortName, itemCode, category, hsnCode, uom, purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, expiryDate } = req.body;
  const data = {};
  if (shortName      !== undefined) data.shortName      = shortName;
  if (itemCode       !== undefined) data.itemCode        = itemCode || null;
  if (category       !== undefined) data.category        = category;
  if (hsnCode        !== undefined) data.hsnCode         = hsnCode || null;
  if (uom            !== undefined) data.uom             = uom;
  if (purchasePrice  !== undefined) data.purchasePrice   = purchasePrice;
  if (mrp            !== undefined) data.mrp             = mrp;
  if (salesPrice     !== undefined) data.salesPrice      = salesPrice;
  if (gstRate        !== undefined) data.gstRate         = gstRate;
  if (stock          !== undefined) data.stock           = stock;
  if (reorderLevel   !== undefined) data.reorderLevel    = reorderLevel;
  if (expiryDate     !== undefined) data.expiryDate      = expiryDate ? new Date(expiryDate) : null;

  const item = await prisma.product.update({ where: { id }, data });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
