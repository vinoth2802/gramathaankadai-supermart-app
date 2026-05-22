import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const num = v => (v == null || v === '') ? 0    : Number(v);
const str = v => (v == null || v === '') ? null : String(v);
const dt  = v => v ? new Date(v) : null;

function rowToEst(r) {
  return {
    id:             r.id,
    estimateNo:     r.estimate_no,
    estimateDate:   r.estimate_date,
    validTill:      r.valid_till,
    customerName:   r.customer_name,
    partyId:        r.party_id,
    phone:          r.phone,
    billingAddress: r.billing_address,
    stateOfSupply:  r.state_of_supply,
    subtotal:       parseFloat(r.subtotal    ?? 0),
    gst:            parseFloat(r.gst         ?? 0),
    grandTotal:     parseFloat(r.grand_total ?? 0),
    adjustment:     parseFloat(r.adjustment  ?? 0),
    status:         r.status,
    notes:          r.notes,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  };
}

function rowToItem(r) {
  return {
    id:          r.id,
    estimateId:  r.estimate_id,
    productId:   r.product_id,
    name:        r.name || r.product_name || '',
    description: r.description,
    itemCount:   parseFloat(r.item_count  ?? 0),
    batchNo:     r.batch_no,
    expiryDate:  r.exp_date,
    mfgDate:     r.mfg_date,
    mrp:         parseFloat(r.mrp         ?? 0),
    size:        r.size,
    qty:         parseFloat(r.qty         ?? 0),
    freeQty:     parseFloat(r.free_qty    ?? 0),
    unit:        r.unit,
    rate:        parseFloat(r.rate != null ? r.rate : (r.price ?? 0)),
    gstRate:     parseFloat(r.gst_rate    ?? 0),
    gstAmount:   parseFloat(r.gst_amount  ?? 0),
    amount:      parseFloat(r.amount      ?? 0),
  };
}

async function withItems(estRows) {
  if (!estRows.length) return [];
  const ids = estRows.map(r => r.id);
  const items = await prisma.$queryRawUnsafe(
    `SELECT * FROM estimate_items WHERE estimate_id = ANY($1::int[]) ORDER BY id`,
    ids,
  );
  const byEst = {};
  for (const it of items) {
    (byEst[it.estimate_id] ??= []).push(rowToItem(it));
  }
  return estRows.map(r => ({ ...rowToEst(r), items: byEst[r.id] ?? [] }));
}

/* ── GET /next-number ── */
router.get('/next-number', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT COALESCE(MAX(estimate_no), 0) + 1 AS next FROM estimates`;
    res.json({ estimateNo: String(Number(rows[0].next)), number: Number(rows[0].next) });
  } catch (err) {
    console.error('estimates next-number error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET / ── */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    let rows;
    if (from && to) {
      rows = await prisma.$queryRaw`
        SELECT * FROM estimates
        WHERE estimate_date >= ${new Date(from)}
          AND estimate_date <= ${new Date(to + 'T23:59:59.999Z')}
        ORDER BY created_at DESC`;
    } else {
      rows = await prisma.$queryRaw`SELECT * FROM estimates ORDER BY created_at DESC`;
    }
    res.json(await withItems(rows));
  } catch (err) {
    console.error('GET /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /:id ── */
router.get('/:id', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT * FROM estimates WHERE id = ${Number(req.params.id)}`;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const [est] = await withItems(rows);
    res.json(est);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST / ── */
router.post('/', async (req, res) => {
  try {
    const {
      estimateNo, estimateDate, validTill,
      customerName, partyId, phone, billingAddress, stateOfSupply,
      subtotal, gst, grandTotal, adjustment,
      status = 'Open', notes, items = [],
    } = req.body;

    const [est] = await prisma.$queryRaw`
      INSERT INTO estimates
        (estimate_no, estimate_date, valid_till, customer_name, party_id, phone,
         billing_address, state_of_supply, subtotal, gst, grand_total, adjustment, status, notes)
      VALUES
        (${num(estimateNo)},
         ${dt(estimateDate) ?? new Date()},
         ${dt(validTill)},
         ${str(customerName) ?? 'Walk-in Customer'},
         ${partyId ? num(partyId) : null},
         ${str(phone)},
         ${str(billingAddress)},
         ${str(stateOfSupply) ?? 'Tamil Nadu'},
         ${num(subtotal)},
         ${num(gst)},
         ${num(grandTotal)},
         ${num(adjustment)},
         ${status},
         ${str(notes)})
      RETURNING *`;

    for (const it of items) {
      await prisma.$executeRaw`
        INSERT INTO estimate_items
          (estimate_id, product_id, name, description, item_count, batch_no,
           exp_date, mfg_date, mrp, size, qty, free_qty, unit, rate,
           gst_rate, gst_amount, amount)
        VALUES
          (${est.id},
           ${it.productId ? num(it.productId) : null},
           ${str(it.name)},
           ${str(it.description)},
           ${num(it.itemCount)},
           ${str(it.batchNo)},
           ${str(it.expiryDate)},
           ${str(it.mfgDate)},
           ${num(it.mrp)},
           ${str(it.size)},
           ${num(it.qty)},
           ${num(it.freeQty)},
           ${str(it.unit)},
           ${num(it.rate)},
           ${num(it.gstRate)},
           ${num(it.gstAmount)},
           ${num(it.amount)})`;
    }

    const [result] = await withItems([est]);
    res.status(201).json(result);
  } catch (err) {
    console.error('POST /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH /:id ── */
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      estimateDate, validTill, customerName, partyId, phone,
      billingAddress, stateOfSupply, subtotal, gst, grandTotal,
      adjustment, status, notes,
    } = req.body;

    const [est] = await prisma.$queryRaw`
      UPDATE estimates SET
        estimate_date   = COALESCE(${dt(estimateDate)},   estimate_date),
        valid_till      = ${dt(validTill)},
        customer_name   = COALESCE(${str(customerName)},  customer_name),
        party_id        = ${partyId ? num(partyId) : null},
        phone           = ${str(phone)},
        billing_address = ${str(billingAddress)},
        state_of_supply = COALESCE(${str(stateOfSupply)}, state_of_supply),
        subtotal        = COALESCE(${subtotal   != null ? num(subtotal)   : null}, subtotal),
        gst             = COALESCE(${gst        != null ? num(gst)        : null}, gst),
        grand_total     = COALESCE(${grandTotal != null ? num(grandTotal) : null}, grand_total),
        adjustment      = COALESCE(${adjustment != null ? num(adjustment) : null}, adjustment),
        status          = COALESCE(${str(status)}, status),
        notes           = ${str(notes)},
        updated_at      = NOW()
      WHERE id = ${id}
      RETURNING *`;

    const [result] = await withItems([est]);
    res.json(result);
  } catch (err) {
    console.error('PATCH /estimates error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /:id ── */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.$executeRaw`DELETE FROM estimates WHERE id = ${Number(req.params.id)}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /:id/convert ── */
router.post('/:id/convert', async (req, res) => {
  try {
    const { type } = req.body;
    const status = type === 'cancel' ? 'Cancelled' : 'Converted';
    const [est] = await prisma.$queryRaw`
      UPDATE estimates SET status = ${status}, updated_at = NOW()
      WHERE id = ${Number(req.params.id)}
      RETURNING *`;
    const [result] = await withItems([est]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
