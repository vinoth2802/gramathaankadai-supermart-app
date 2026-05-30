import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/* GET all recycle-bin entries, newest first */
router.get('/', async (req, res) => {
  try {
    const items = await prisma.recycleBin.findMany({ where: { tenantId: req.tenantId }, orderBy: { deletedAt: 'desc' } });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE permanently (single) */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.recycleBin.deleteMany({ where: { id: Number(req.params.id), tenantId: req.tenantId } });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE permanently (all) */
router.delete('/', async (req, res) => {
  try {
    await prisma.recycleBin.deleteMany({ where: { tenantId: req.tenantId } });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST restore — recreates the original record */
router.post('/:id/restore', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const entry = await prisma.recycleBin.findFirst({ where: { id: Number(req.params.id), tenantId } });
    if (!entry) return res.status(404).json({ error: 'Not found' });

    const data = JSON.parse(entry.snapshot);

    await prisma.$transaction(async (tx) => {
      switch (entry.type) {

        case 'Sale': {
          const { items, party, ...sale } = data;
          await tx.sale.create({
            data: {
              ...sale,
              tenantId,
              id:        sale.id,
              date:      new Date(sale.date),
              createdAt: new Date(sale.createdAt),
              dueDate:   sale.dueDate   ? new Date(sale.dueDate)   : null,
              deliveryDate: sale.deliveryDate ? new Date(sale.deliveryDate) : null,
              grandTotal:    Number(sale.grandTotal   || 0),
              subtotal:      Number(sale.subtotal     || 0),
              gst:           Number(sale.gst          || 0),
              totalReceived: Number(sale.totalReceived|| 0),
              changeGiven:   Number(sale.changeGiven  || 0),
              partyId:       sale.partyId || null,
              items: {
                create: (items || []).map(i => ({
                  tenantId,
                  name: i.name, qty: Number(i.qty), rate: Number(i.rate),
                  amount: Number(i.amount), gstRate: Number(i.gstRate || 0),
                  gstAmount: Number(i.gstAmount || 0), mrp: Number(i.mrp || 0),
                  freeQty: Number(i.freeQty || 0), unit: i.unit || null,
                  batchNo: i.batchNo || null, description: i.description || null,
                  expDate: i.expDate ? new Date(i.expDate) : null,
                  mfgDate: i.mfgDate ? new Date(i.mfgDate) : null,
                  size: i.size || null, itemCount: Number(i.itemCount || 0),
                  productId: i.productId || null,
                })),
              },
            },
          });
          break;
        }

        case 'Purchase': {
          const { items, party, ...purchase } = data;
          await tx.purchase.create({
            data: {
              ...purchase,
              tenantId,
              id:        purchase.id,
              date:      new Date(purchase.date),
              createdAt: new Date(purchase.createdAt),
              supplierInvoiceDate: purchase.supplierInvoiceDate ? new Date(purchase.supplierInvoiceDate) : null,
              grandTotal:   Number(purchase.grandTotal  || 0),
              totalPaid:    Number(purchase.totalPaid   || 0),
              partyId:      purchase.partyId || null,
              items: {
                create: (items || []).map(i => ({
                  tenantId,
                  name: i.name, qty: Number(i.qty), price: Number(i.price),
                  total: Number(i.total), gstRate: Number(i.gstRate || 0),
                  gstAmount: Number(i.gstAmount || 0), mrp: Number(i.mrp || 0),
                  unit: i.unit || null, batchNo: i.batchNo || null,
                  expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
                  mfgDate:    i.mfgDate    ? new Date(i.mfgDate)    : null,
                })),
              },
            },
          });
          break;
        }

        case 'PaymentIn': {
          await tx.paymentInHistory.create({
            data: {
              ...data,
              tenantId,
              id:        data.id,
              date:      new Date(data.date),
              createdAt: new Date(data.createdAt),
              amount:    Number(data.amount),
              discount:  Number(data.discount || 0),
              partyId:   data.partyId || null,
            },
          });
          break;
        }

        case 'PaymentOut': {
          await tx.paymentOutHistory.create({
            data: {
              ...data,
              tenantId,
              id:        data.id,
              date:      new Date(data.date),
              createdAt: new Date(data.createdAt),
              amount:    Number(data.amount),
              discount:  Number(data.discount || 0),
              partyId:   data.partyId || null,
            },
          });
          break;
        }

        case 'Party': {
          const { purchases, sales, cheques, paymentInHistory, paymentOutHistory, estimates, saleReturns, purchaseReturns, ...party } = data;
          await tx.party.create({
            data: {
              ...party,
              tenantId,
              id:        party.id,
              createdAt: new Date(party.createdAt),
              balance:   Number(party.balance || 0),
              payable:   Number(party.payable || 0),
            },
          });
          break;
        }

        case 'Item': {
          const { saleItems, category, ...item } = data;
          await tx.product.create({
            data: {
              ...item,
              tenantId,
              id:           item.id,
              createdAt:    new Date(item.createdAt),
              purchasePrice: Number(item.purchasePrice || 0),
              salesPrice:    Number(item.salesPrice    || 0),
              mrp:           Number(item.mrp           || 0),
              stock:         Number(item.stock         || 0),
              gstRate:       Number(item.gstRate       || 0),
            },
          });
          break;
        }

        default:
          throw new Error(`Unknown type: ${entry.type}`);
      }

      await tx.recycleBin.delete({ where: { id: entry.id } });
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
