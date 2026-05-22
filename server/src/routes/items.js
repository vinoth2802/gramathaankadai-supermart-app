
import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const where = q?.trim()
      ? {
          OR: [
            { shortName: { contains: q.trim(), mode: 'insensitive' } },
            { itemCode:  { contains: q.trim(), mode: 'insensitive' } },
          ],
        }
      : undefined;
    const items = await prisma.product.findMany({
      where,
      orderBy: { shortName: 'asc' },
      take: q?.trim() ? 25 : undefined,
    });
    res.json(items);
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch items' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch item' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      shortName, itemCode, type, category, hsnCode, description, batch, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock, expiryDate,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate, location,
    } = req.body;
    if (!shortName) return res.status(400).json({ error: 'Short Name is required' });
    const item = await prisma.product.create({
      data: {
        shortName,
        itemCode:         itemCode        || null,
        type:             type            || 'Product',
        category:         category        || 'General',
        hsnCode:          hsnCode         || null,
        description:      description     || null,
        batch:            batch           || null,
        uom:              uom             || 'PCS',
        pcsPerUnit:       pcsPerUnit != null ? Number(pcsPerUnit) : null,
        purchasePrice:    Number(purchasePrice)    || 0,
        mrp:              Number(mrp)              || 0,
        salesPrice:       Number(salesPrice)       || 0,
        gstRate:          Number(gstRate)          || 0,
        stock:            Number(stock)            || 0,
        reorderLevel:     Number(reorderLevel)     || 10,
        minStock:         Number(minStock)         || 0,
        expiryDate:       expiryDate  ? new Date(expiryDate)  : null,
        isBulk:           Boolean(isBulk),
        secondaryUnit:    isBulk ? (secondaryUnit || null) : null,
        salesPriceTax:    salesPriceTax    || 'with',
        wholesalePrice:   Number(wholesalePrice)   || 0,
        wholesaleQty:     Number(wholesaleQty)     || 0,
        purchasePriceTax: purchasePriceTax || 'with',
        atPrice:          Number(atPrice)          || 0,
        asOfDate:         asOfDate   ? new Date(asOfDate)   : null,
        location:         location        || null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: err.message || 'Failed to create item' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      shortName, itemCode, type, category, hsnCode, description, batch, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock, expiryDate,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate, location,
    } = req.body;
    const item = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: {
        shortName,
        itemCode:         itemCode        || null,
        type:             type            || 'Product',
        category:         category        || 'General',
        hsnCode:          hsnCode         || null,
        description:      description     || null,
        batch:            batch           || null,
        uom:              uom             || 'PCS',
        pcsPerUnit:       pcsPerUnit != null ? Number(pcsPerUnit) : null,
        purchasePrice:    Number(purchasePrice)    || 0,
        mrp:              Number(mrp)              || 0,
        salesPrice:       Number(salesPrice)       || 0,
        gstRate:          Number(gstRate)          || 0,
        stock:            Number(stock)            || 0,
        reorderLevel:     Number(reorderLevel)     || 10,
        minStock:         Number(minStock)         || 0,
        expiryDate:       expiryDate  ? new Date(expiryDate)  : null,
        isBulk:           Boolean(isBulk),
        secondaryUnit:    isBulk ? (secondaryUnit || null) : null,
        salesPriceTax:    salesPriceTax    || 'with',
        wholesalePrice:   Number(wholesalePrice)   || 0,
        wholesaleQty:     Number(wholesaleQty)     || 0,
        purchasePriceTax: purchasePriceTax || 'with',
        atPrice:          Number(atPrice)          || 0,
        asOfDate:         asOfDate   ? new Date(asOfDate)   : null,
        location:         location        || null,
      },
    });
    res.json(item);
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (req.body.stockDelta !== undefined) {
      const item = await prisma.product.update({
        where: { id },
        data: { stock: { increment: req.body.stockDelta } },
      });
      return res.json(item);
    }

    const {
      shortName, itemCode, type, category, hsnCode, description, batch, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock, expiryDate,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate, location,
    } = req.body;
    const data = {};
    if (shortName         !== undefined) data.shortName         = shortName;
    if (itemCode          !== undefined) data.itemCode          = itemCode || null;
    if (type              !== undefined) data.type              = type;
    if (category          !== undefined) data.category          = category;
    if (hsnCode           !== undefined) data.hsnCode           = hsnCode || null;
    if (description       !== undefined) data.description       = description || null;
    if (batch             !== undefined) data.batch             = batch || null;
    if (uom               !== undefined) data.uom               = uom;
    if (pcsPerUnit        !== undefined) data.pcsPerUnit        = pcsPerUnit != null ? Number(pcsPerUnit) : null;
    if (purchasePrice     !== undefined) data.purchasePrice     = Number(purchasePrice);
    if (mrp               !== undefined) data.mrp               = Number(mrp);
    if (salesPrice        !== undefined) data.salesPrice        = Number(salesPrice);
    if (gstRate           !== undefined) data.gstRate           = Number(gstRate);
    if (stock             !== undefined) data.stock             = Number(stock);
    if (reorderLevel      !== undefined) data.reorderLevel      = Number(reorderLevel);
    if (minStock          !== undefined) data.minStock          = Number(minStock);
    if (expiryDate        !== undefined) data.expiryDate        = expiryDate ? new Date(expiryDate) : null;
    if (isBulk            !== undefined) data.isBulk            = Boolean(isBulk);
    if (secondaryUnit     !== undefined) data.secondaryUnit     = secondaryUnit || null;
    if (salesPriceTax     !== undefined) data.salesPriceTax     = salesPriceTax;
    if (wholesalePrice    !== undefined) data.wholesalePrice    = Number(wholesalePrice);
    if (wholesaleQty      !== undefined) data.wholesaleQty      = Number(wholesaleQty);
    if (purchasePriceTax  !== undefined) data.purchasePriceTax  = purchasePriceTax;
    if (atPrice           !== undefined) data.atPrice           = Number(atPrice);
    if (asOfDate          !== undefined) data.asOfDate          = asOfDate ? new Date(asOfDate) : null;
    if (location          !== undefined) data.location          = location || null;

    const item = await prisma.product.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    console.error('Patch item error:', err);
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
});

/* ── POST /check-codes ── */
router.post('/check-codes', async (req, res) => {
  try {
    const { itemCodes } = req.body;
    const codes = Array.isArray(itemCodes)
      ? [...new Set(itemCodes.map(c => String(c ?? '').trim()).filter(Boolean))]
      : [];
    if (!codes.length) return res.json({ existing: [] });

    const found = await prisma.product.findMany({
      where:  { itemCode: { in: codes } },
      select: { itemCode: true, shortName: true },
    });
    res.json({ existing: found.map(p => ({ code: p.itemCode, name: p.shortName })) });
  } catch (err) {
    console.error('check-codes error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /bulk-import ── */
router.post('/bulk-import', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }

    // Parse tax rate string like "5%", "12%", "IGST@5%", "IGST@0%" → number
    const parseTaxRate = v => {
      if (v == null || v === '') return 0;
      const match = String(v).match(/(\d+(?:\.\d+)?)\s*%?$/);
      return match ? parseFloat(match[1]) : 0;
    };

    const s = v => String(v ?? '').trim();   // safe string — works for numbers too

    const data = items
      .filter(it => s(it.itemName))          // skip rows with no name
      .map(it => ({
        shortName:       s(it.itemName),
        itemCode:        s(it.itemCode)       || null,
        hsnCode:         s(it.hsn)            || null,
        mrp:             Number(it.mrp)       || 0,
        salesPrice:      Number(it.salePrice) || 0,
        purchasePrice:   Number(it.purchasePrice) || 0,
        stock:           Number(it.openingStock)  || 0,
        minStock:        Number(it.minStock)  || 0,
        reorderLevel:    Number(it.reorderLevel)  || 0,
        location:        s(it.location)       || null,
        gstRate:         parseTaxRate(it.taxRate),
        salesPriceTax:   s(it.taxInclusive).toUpperCase() === 'Y' ? 'with' : 'without',
      }));

    const result = await prisma.product.createMany({ data, skipDuplicates: true });
    res.status(201).json({ success: true, imported: result.count });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: err.message || 'Bulk import failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete item' });
  }
});

export default router;
