
import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const fmtMoney = v => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

const router = Router();

// Flatten the Category relation back to a plain `category` name for the client.
const out = p => (p ? { ...p, category: p.category?.name ?? null } : p);

// Resolve a category name to its id within the tenant, creating it on demand.
async function resolveCategoryId(tenantId, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const cat = await prisma.category.upsert({
    where:  { tenantId_name: { tenantId, name: trimmed } },
    create: { tenantId, name: trimmed },
    update: {},
  });
  return cat.id;
}

router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { q } = req.query;
    const where = q?.trim()
      ? {
          tenantId,
          OR: [
            { shortName: { contains: q.trim() } },
            { itemCode:  { contains: q.trim() } },
          ],
        }
      : { tenantId };
    const items = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { shortName: 'asc' },
      take: q?.trim() ? 25 : undefined,
    });
    res.json(items.map(out));
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch items' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.product.findFirst({
      where: { id: Number(req.params.id), tenantId: req.tenantId },
      include: { category: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(out(item));
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch item' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      shortName, itemCode, type, category, hsnCode, description, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate,
    } = req.body;
    if (!shortName) return res.status(400).json({ error: 'Short Name is required' });
    const categoryId = await resolveCategoryId(tenantId, category);
    const item = await prisma.product.create({
      data: {
        tenantId,
        shortName,
        itemCode:         itemCode        || null,
        type:             type            || 'Product',
        categoryId,
        hsnCode:          hsnCode         || null,
        description:      description     || null,
        uom:              uom             || 'PCS',
        pcsPerUnit:       pcsPerUnit != null ? Number(pcsPerUnit) : null,
        purchasePrice:    Number(purchasePrice)    || 0,
        mrp:              Number(mrp)              || 0,
        salesPrice:       Number(salesPrice)       || 0,
        gstRate:          Number(gstRate)          || 0,
        stock:            Number(stock)            || 0,
        reorderLevel:     Number(reorderLevel)     || 10,
        minStock:         Number(minStock)         || 0,
        isBulk:           Boolean(isBulk),
        secondaryUnit:    isBulk ? (secondaryUnit || null) : null,
        salesPriceTax:    salesPriceTax    || 'with',
        wholesalePrice:   Number(wholesalePrice)   || 0,
        wholesaleQty:     Number(wholesaleQty)     || 0,
        purchasePriceTax: purchasePriceTax || 'with',
        atPrice:          Number(atPrice)          || 0,
        asOfDate:         asOfDate   ? new Date(asOfDate)   : null,
      },
      include: { category: true },
    });
    logActivity({ action: 'CREATE', type: 'Item', refNo: item.itemCode || '—', partyName: item.shortName, amount: Number(item.mrp || 0), userName: req.headers['x-user'] });
    res.status(201).json(out(item));
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: err.message || 'Failed to create item' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const prevItem = await prisma.product.findFirst({
      where: { id, tenantId },
      select: { shortName: true, salesPrice: true, purchasePrice: true, mrp: true, stock: true, gstRate: true, category: { select: { name: true } } },
    });
    if (!prevItem) return res.status(404).json({ error: 'Not found' });

    const {
      shortName, itemCode, type, category, hsnCode, description, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate,
    } = req.body;
    const categoryId = await resolveCategoryId(tenantId, category);
    const item = await prisma.product.update({
      where: { id },
      data: {
        shortName,
        itemCode:         itemCode        || null,
        type:             type            || 'Product',
        categoryId,
        hsnCode:          hsnCode         || null,
        description:      description     || null,
        uom:              uom             || 'PCS',
        pcsPerUnit:       pcsPerUnit != null ? Number(pcsPerUnit) : null,
        purchasePrice:    Number(purchasePrice)    || 0,
        mrp:              Number(mrp)              || 0,
        salesPrice:       Number(salesPrice)       || 0,
        gstRate:          Number(gstRate)          || 0,
        stock:            Number(stock)            || 0,
        reorderLevel:     Number(reorderLevel)     || 10,
        minStock:         Number(minStock)         || 0,
        isBulk:           Boolean(isBulk),
        secondaryUnit:    isBulk ? (secondaryUnit || null) : null,
        salesPriceTax:    salesPriceTax    || 'with',
        wholesalePrice:   Number(wholesalePrice)   || 0,
        wholesaleQty:     Number(wholesaleQty)     || 0,
        purchasePriceTax: purchasePriceTax || 'with',
        atPrice:          Number(atPrice)          || 0,
        asOfDate:         asOfDate   ? new Date(asOfDate)   : null,
      },
      include: { category: true },
    });
    const flatPrev = { ...prevItem, category: prevItem.category?.name ?? null };
    const changes = computeDiff(flatPrev, out(item), [
      { key: 'shortName',     label: 'Name' },
      { key: 'salesPrice',    label: 'Sales Price',    format: fmtMoney },
      { key: 'purchasePrice', label: 'Purchase Price', format: fmtMoney },
      { key: 'mrp',           label: 'MRP',            format: fmtMoney },
      { key: 'stock',         label: 'Stock',          format: v => String(parseFloat(String(v || 0))) },
      { key: 'gstRate',       label: 'GST Rate',       format: v => `${parseFloat(String(v || 0))}%` },
      { key: 'category',      label: 'Category' },
    ]);
    logActivity({ action: 'EDIT', type: 'Item', refNo: item.itemCode || '—', partyName: item.shortName, amount: Number(item.mrp || 0), userName: req.headers['x-user'], changes });
    res.json(out(item));
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
});

/* ── PATCH /bulk ── apply field updates to multiple items at once */
router.patch('/bulk', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No ids provided' });

    const update = {};
    if (data.isActive        !== undefined) update.isActive        = Boolean(data.isActive);
    if (data.uom             !== undefined) update.uom             = data.uom;
    if (data.category        !== undefined) update.categoryId      = await resolveCategoryId(tenantId, data.category);
    if (data.gstRate         !== undefined) update.gstRate         = Number(data.gstRate);
    if (data.purchasePrice   !== undefined) update.purchasePrice   = Number(data.purchasePrice);
    if (data.salesPrice      !== undefined) update.salesPrice      = Number(data.salesPrice);
    if (data.mrp             !== undefined) update.mrp             = Number(data.mrp);
    if (data.reorderLevel    !== undefined) update.reorderLevel    = Number(data.reorderLevel);

    // Bulk assign item codes — codes is an array of { id, itemCode } pairs
    if (Array.isArray(data.codes)) {
      await Promise.all(
        data.codes.map(({ id, itemCode }) =>
          prisma.product.updateMany({ where: { id: Number(id), tenantId }, data: { itemCode } })
        )
      );
      return res.json({ updated: data.codes.length });
    }

    if (!Object.keys(update).length) return res.status(400).json({ error: 'No fields to update' });

    const result = await prisma.product.updateMany({
      where: { id: { in: ids.map(Number) }, tenantId },
      data:  update,
    });
    res.json({ updated: result.count });
  } catch (err) {
    console.error('Bulk update error:', err);
    res.status(500).json({ error: err.message || 'Bulk update failed' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);

    if (req.body.stockDelta !== undefined) {
      const result = await prisma.product.updateMany({
        where: { id, tenantId },
        data: { stock: { increment: req.body.stockDelta } },
      });
      if (!result.count) return res.status(404).json({ error: 'Not found' });
      const item = await prisma.product.findFirst({ where: { id, tenantId }, include: { category: true } });
      return res.json(out(item));
    }

    const {
      shortName, itemCode, type, category, hsnCode, description, uom, pcsPerUnit,
      purchasePrice, mrp, salesPrice, gstRate, stock, reorderLevel, minStock,
      isBulk, secondaryUnit, salesPriceTax, wholesalePrice, wholesaleQty,
      purchasePriceTax, atPrice, asOfDate,
    } = req.body;
    const data = {};
    if (shortName         !== undefined) data.shortName         = shortName;
    if (itemCode          !== undefined) data.itemCode          = itemCode || null;
    if (type              !== undefined) data.type              = type;
    if (category          !== undefined) data.categoryId        = await resolveCategoryId(tenantId, category);
    if (hsnCode           !== undefined) data.hsnCode           = hsnCode || null;
    if (description       !== undefined) data.description       = description || null;
    if (uom               !== undefined) data.uom               = uom;
    if (pcsPerUnit        !== undefined) data.pcsPerUnit        = pcsPerUnit != null ? Number(pcsPerUnit) : null;
    if (purchasePrice     !== undefined) data.purchasePrice     = Number(purchasePrice);
    if (mrp               !== undefined) data.mrp               = Number(mrp);
    if (salesPrice        !== undefined) data.salesPrice        = Number(salesPrice);
    if (gstRate           !== undefined) data.gstRate           = Number(gstRate);
    if (stock             !== undefined) data.stock             = Number(stock);
    if (reorderLevel      !== undefined) data.reorderLevel      = Number(reorderLevel);
    if (minStock          !== undefined) data.minStock          = Number(minStock);
    if (isBulk            !== undefined) data.isBulk            = Boolean(isBulk);
    if (secondaryUnit     !== undefined) data.secondaryUnit     = secondaryUnit || null;
    if (salesPriceTax     !== undefined) data.salesPriceTax     = salesPriceTax;
    if (wholesalePrice    !== undefined) data.wholesalePrice    = Number(wholesalePrice);
    if (wholesaleQty      !== undefined) data.wholesaleQty      = Number(wholesaleQty);
    if (purchasePriceTax  !== undefined) data.purchasePriceTax  = purchasePriceTax;
    if (atPrice           !== undefined) data.atPrice           = Number(atPrice);
    if (asOfDate          !== undefined) data.asOfDate          = asOfDate ? new Date(asOfDate) : null;

    const result = await prisma.product.updateMany({ where: { id, tenantId }, data });
    if (!result.count) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.product.findFirst({ where: { id, tenantId }, include: { category: true } });
    res.json(out(item));
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
      where:  { tenantId: req.tenantId, itemCode: { in: codes } },
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
    const tenantId = req.tenantId;
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
        tenantId,
        shortName:       s(it.itemName),
        itemCode:        s(it.itemCode)       || null,
        hsnCode:         s(it.hsn)            || null,
        mrp:             Number(it.mrp)       || 0,
        salesPrice:      Number(it.salePrice) || 0,
        purchasePrice:   Number(it.purchasePrice) || 0,
        stock:           Number(it.openingStock)  || 0,
        minStock:        Number(it.minStock)  || 0,
        reorderLevel:    Number(it.reorderLevel)  || 0,
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
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const item = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: { tenantId, type: 'Item', entityId: id, name: item.shortName, amount: Number(item.mrp || 0), snapshot: JSON.stringify(item) },
      }),
      prisma.product.delete({ where: { id } }),
    ]);
    logActivity({ action: 'DELETE', type: 'Item', refNo: item.itemCode || '—', partyName: item.shortName, amount: Number(item.mrp || 0), userName: req.headers['x-user'] });
    res.status(204).end();
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete item' });
  }
});

export default router;
