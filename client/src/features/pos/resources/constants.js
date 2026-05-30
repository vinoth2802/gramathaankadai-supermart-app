export const RS = '₹';

export function genNextInvoice(items = []) {
  let maxNum = 0;
  let prefix = '';
  for (const item of items) {
    const m = String(item.invoice || '').trim().match(/^([^0-9]*)(\d+)$/);
    if (m && Number(m[2]) > maxNum) {
      maxNum = Number(m[2]);
      prefix = m[1];
    }
  }
  return maxNum === 0 ? '1' : `${prefix}${maxNum + 1}`;
}

export const makePaymentLines = () => [{ mode: 'Cash', amount: 0 }];

export const makeSaleTab = (invoice) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  invoice,
  cart: [],
  paymentLines: makePaymentLines(),
  selectedParty: null,
  saleType: 'cash',
});
