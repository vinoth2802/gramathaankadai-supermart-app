/**
 * GST line-item calculation.
 *
 * priceMode: 'withtax'  → rate already includes GST (used in Sales)
 *            'withouttax' → rate is before GST (used in Sales)
 *
 * Returns { gstAmount, amount } both rounded to 2 decimal places.
 */
export function calcRow(row, priceMode) {
  const qty     = Number(row.qty  || 0);
  const rate    = Number(row.rate || 0);
  const gstRate = Number(row.gstRate || 0);
  const gross   = qty * rate;

  let taxable, gstAmt, amount;
  if (priceMode === 'withtax') {
    taxable = gross / (1 + gstRate / 100);
    gstAmt  = gross - taxable;
    amount  = gross;
  } else {
    taxable = gross;
    gstAmt  = taxable * gstRate / 100;
    amount  = taxable + gstAmt;
  }
  return {
    gstAmount: isNaN(gstAmt)  ? 0 : +gstAmt.toFixed(2),
    amount:    isNaN(amount)  ? 0 : +amount.toFixed(2),
  };
}

/**
 * Reverse-calculate unit rate from a known row total (Sales).
 * priceMode: 'withtax' | 'withouttax'
 */
export function backCalcRate(total, qty, gstRate, priceMode) {
  const t = Number(total)   || 0;
  const q = Number(qty)     || 1;
  const r = Number(gstRate) || 0;
  if (priceMode === 'withtax') return t / q;
  return r > 0 ? t / (q * (1 + r / 100)) : t / q;
}

/**
 * GST line-item calculation used in Purchases.
 *
 * priceType: 'With Tax' | 'Without Tax'
 * Returns { gstAmount, total }
 */
export function calcAmounts(qty, price, gstRate, priceType) {
  const lineAmt = Number(qty) * Number(price);
  const rate    = Number(gstRate) || 0;
  if (priceType === 'With Tax') {
    const gstAmount = rate > 0 ? lineAmt * rate / (100 + rate) : 0;
    return { gstAmount, total: lineAmt };
  }
  const gstAmount = lineAmt * rate / 100;
  return { gstAmount, total: lineAmt + gstAmount };
}

/**
 * Reverse-calculate unit price from a known row total (Purchases).
 * priceType: 'With Tax' | 'Without Tax'
 */
export function backCalcFromTotal(total, qty, gstRate, priceType) {
  const t    = Number(total)   || 0;
  const q    = Number(qty)     || 1;
  const rate = Number(gstRate) || 0;
  if (priceType === 'With Tax') {
    const price     = t / q;
    const gstAmount = rate > 0 ? t * rate / (100 + rate) : 0;
    return { price, gstAmount };
  }
  const price     = rate > 0 ? t / (q * (1 + rate / 100)) : t / q;
  const gstAmount = t - q * price;
  return { price, gstAmount };
}
