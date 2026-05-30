import { Router } from 'express';
import prisma from '../db.js';
import { logActivity, computeDiff } from '../utils/log.js';

const fmtMoney = v => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

const router = Router();

const include = {
  items: true,
  party: { select: { id: true, name: true } },
};

const mapItem = (tenantId) => (i) => ({
  tenantId,
  productId:   i.productId   ? Number(i.productId) : null,
  name:        i.name        || '',
  description: i.description || null,
  itemCount:   Number(i.itemCount ?? i.count ?? 0),
  batchNo:     i.batchNo     || null,
  expDate:     i.expiryDate  ? new Date(i.expiryDate) : null,
  mfgDate:     i.mfgDate     ? new Date(i.mfgDate) : null,
  mrp:         Number(i.mrp  ?? 0),
  size:        i.size        || null,
  qty:         Number(i.qty  ?? 0),
  freeQty:     Number(i.freeQty ?? 0),
  unit:        i.unit        || null,
  rate:        Number(i.rate ?? 0),
  gstRate:     Number(i.gstRate ?? 0),
  gstAmount:   Number(i.gstAmount ?? 0),
  amount:      Number(i.amount ?? 0),
});

function deriveStatus(grandTotal, totalReceived, explicit) {
  if (explicit) return explicit;
  const gt = Number(grandTotal  ?? 0);
  const tr = Number(totalReceived ?? 0);
  if (tr <= 0)  return 'Unpaid';
  if (tr >= gt) return 'Paid';
  return 'Partial';
}

/* ── Next invoice number ── */
router.get('/next-number', async (req, res) => {
  try {
    const allSales = await prisma.sale.findMany({ where: { tenantId: req.tenantId }, select: { invoice: true } });

    let maxNum = 0;
    for (const s of allSales) {
      const m = String(s.invoice || '').trim().match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }

    const nextNum = maxNum + 1;
    res.json({ invoice: String(nextNum), number: nextNum });
  } catch (err) {
    console.error('next-number error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const { from, to, invoiceSearch, partyId } = req.query;
  const where = { tenantId: req.tenantId };
  if (from && to) where.date = { gte: new Date(from), lte: new Date(to) };
  if (invoiceSearch) where.invoice = { contains: invoiceSearch };
  if (partyId) where.partyId = Number(partyId);
  const sales = await prisma.sale.findMany({
    where,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(sales);
});

router.get('/:id', async (req, res) => {
  const sale = await prisma.sale.findFirst({
    where: { id: Number(req.params.id), tenantId: req.tenantId },
    include,
  });
  if (!sale) return res.status(404).json({ error: 'Not found' });
  res.json(sale);
});

router.post('/', async (req, res) => {
  const tenantId = req.tenantId;
  const {
    invoice, date, customerName, partyId,
    phone, billingAddress, shippingAddress, stateOfSupply,
    items = [], subtotal, gst, grandTotal,
    paymentMode, totalReceived, changeGiven,
    paymentStatus, dueDate,
    vehicleNo, deliveryDate, deliveryLocation, dispatchLocation,
    notes, terms,
  } = req.body;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        tenantId,
        invoice,
        date:             date ? new Date(date) : new Date(),
        customerName:     customerName     || 'Walk-in Customer',
        partyId:          partyId          || null,
        phone:            phone            || null,
        billingAddress:   billingAddress   || null,
        shippingAddress:  shippingAddress  || null,
        stateOfSupply:    stateOfSupply    || 'Tamil Nadu',
        subtotal:         subtotal         ?? 0,
        gst:              gst              ?? 0,
        grandTotal:       grandTotal       ?? 0,
        paymentMode:      paymentMode      || 'Cash',
        totalReceived:    totalReceived    ?? 0,
        changeGiven:      changeGiven      ?? 0,
        paymentStatus:    deriveStatus(grandTotal, totalReceived, paymentStatus),
        dueDate:          dueDate          ? new Date(dueDate) : null,
        vehicleNo:        vehicleNo        || null,
        deliveryDate:     deliveryDate     ? new Date(deliveryDate) : null,
        deliveryLocation: deliveryLocation || null,
        dispatchLocation: dispatchLocation || null,
        notes:            notes            || null,
        terms:            terms            || null,
        items: { create: items.map(mapItem(tenantId)) },
      },
      include,
    });
    // Decrement stock for items that carry a productId (Sales page entries).
    // POS items are sent without productId so they are unaffected here
    // (POS already adjusts stock live via the adjustStock endpoint).
    for (const item of created.items) {
      if (item.productId && Number(item.qty) > 0) {
        await tx.product.updateMany({
          where: { id: item.productId, tenantId },
          data:  { stock: { decrement: Number(item.qty) } },
        });
      }
    }
    return created;
  });
  logActivity({ tenantId, action: 'CREATE', type: 'Sale', refNo: sale.invoice, partyName: sale.customerName, amount: Number(sale.grandTotal), userName: req.headers['x-user'] });
  res.status(201).json(sale);
});

router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = Number(req.params.id);
    const prevSale = await prisma.sale.findFirst({
      where: { id, tenantId },
      select: { customerName: true, grandTotal: true, totalReceived: true, paymentStatus: true, paymentMode: true },
    });
    if (!prevSale) return res.status(404).json({ error: 'Not found' });

    const {
      status, customerName, partyId, paymentMode, date,
      phone, billingAddress, shippingAddress, stateOfSupply,
      subtotal, gst, grandTotal, totalReceived, changeGiven,
      paymentStatus, dueDate,
      vehicleNo, deliveryDate, deliveryLocation, dispatchLocation,
      notes, terms, items,
    } = req.body;

    const data = {};
    if (status           !== undefined) data.status           = status;
    if (customerName     !== undefined) data.customerName     = customerName;
    if (partyId          !== undefined) data.partyId          = partyId ? Number(partyId) : null;
    if (paymentMode      !== undefined) data.paymentMode      = paymentMode;
    if (date             !== undefined) data.date             = new Date(date);
    if (phone            !== undefined) data.phone            = phone || null;
    if (billingAddress   !== undefined) data.billingAddress   = billingAddress || null;
    if (shippingAddress  !== undefined) data.shippingAddress  = shippingAddress || null;
    if (stateOfSupply    !== undefined) data.stateOfSupply    = stateOfSupply;
    if (subtotal         !== undefined) data.subtotal         = subtotal;
    if (gst              !== undefined) data.gst              = gst;
    if (grandTotal       !== undefined) data.grandTotal       = grandTotal;
    if (totalReceived    !== undefined) data.totalReceived    = totalReceived;
    if (changeGiven      !== undefined) data.changeGiven      = changeGiven;
    if (paymentStatus    !== undefined) data.paymentStatus    = paymentStatus;
    if (dueDate          !== undefined) data.dueDate          = dueDate ? new Date(dueDate) : null;
    if (vehicleNo        !== undefined) data.vehicleNo        = vehicleNo || null;
    if (deliveryDate     !== undefined) data.deliveryDate     = deliveryDate ? new Date(deliveryDate) : null;
    if (deliveryLocation !== undefined) data.deliveryLocation = deliveryLocation || null;
    if (dispatchLocation !== undefined) data.dispatchLocation = dispatchLocation || null;
    if (notes            !== undefined) data.notes            = notes || null;
    if (terms            !== undefined) data.terms            = terms || null;

    if (items) {
      await prisma.saleItem.deleteMany({ where: { saleId: id, tenantId } });
      data.items = { create: items.map(mapItem(tenantId)) };
    }

    const sale = await prisma.sale.update({
      where: { id },
      data,
      include,
    });
    const changes = computeDiff(prevSale, sale, [
      { key: 'customerName',  label: 'Customer' },
      { key: 'grandTotal',    label: 'Grand Total',   format: fmtMoney },
      { key: 'totalReceived', label: 'Amt Received',  format: fmtMoney },
      { key: 'paymentStatus', label: 'Status' },
      { key: 'paymentMode',   label: 'Payment Mode' },
    ]);
    logActivity({ tenantId, action: 'EDIT', type: 'Sale', refNo: sale.invoice, partyName: sale.customerName, amount: Number(sale.grandTotal), userName: req.headers['x-user'], changes });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const saleId = Number(req.params.id);

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const stockRestores = sale.items
      .filter(i => i.productId && Number(i.qty) > 0)
      .map(i =>
        prisma.product.updateMany({
          where: { id: i.productId, tenantId },
          data:  { stock: { increment: Number(i.qty) } },
        })
      );

    await prisma.$transaction([
      prisma.recycleBin.create({
        data: {
          tenantId,
          type:     'Sale',
          entityId: sale.id,
          name:     sale.invoice,
          amount:   Number(sale.grandTotal || 0),
          snapshot: JSON.stringify(sale),
        },
      }),
      ...stockRestores,
      prisma.sale.delete({ where: { id: saleId } }),
    ]);
    logActivity({ tenantId, action: 'DELETE', type: 'Sale', refNo: sale.invoice, partyName: sale.customerName, amount: Number(sale.grandTotal), userName: req.headers['x-user'] });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
