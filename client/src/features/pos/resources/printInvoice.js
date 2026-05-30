export function printInvoice(sale, cfg = {}) {
  const shopName = cfg.tenantName || cfg.shopName || 'Gramathaankadai SuperMart';
  const address = cfg.address || '';
  const phone = cfg.phone || '';
  const gstin = cfg.gstin || '';

  const dateStr = new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const rows = (sale.items || []).map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${Number(it.rate).toFixed(2)}</td>
      <td style="text-align:right">₹${Number(it.amount).toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Invoice ${sale.invoice}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:11px;color:#000;width:80mm;margin:0 auto;padding:4mm}
  .c{text-align:center} .r{text-align:right} .b{font-weight:bold}
  .shop{font-size:15px;font-weight:bold;text-align:center;letter-spacing:.5px}
  .dash{border-top:1px dashed #000;margin:5px 0}
  .solid{border-top:1px solid #000;margin:5px 0}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;padding:2px 1px;border-bottom:1px solid #000}
  td{font-size:10px;padding:1px 1px;vertical-align:top}
  .grand td{font-size:12px;font-weight:bold;border-top:1px solid #000;border-bottom:2px solid #000;padding:3px 1px}
  .footer{text-align:center;margin-top:8px;font-size:10px}
  @media print{@page{margin:4mm;size:80mm auto}body{width:100%}}
</style></head><body>
<div class="shop">${shopName}</div>
${address ? `<div class="c">${address}</div>` : ''}
${phone ? `<div class="c">Ph: ${phone}</div>` : ''}
${gstin ? `<div class="c">GSTIN: ${gstin}</div>` : ''}
<div class="solid"></div>
<div class="c b" style="font-size:12px;margin:4px 0">TAX INVOICE</div>
<div class="dash"></div>
<table>
  <tr><td>Invoice</td><td class="r b">${sale.invoice}</td></tr>
  <tr><td>Date</td><td class="r">${dateStr} ${timeStr}</td></tr>
  <tr><td>Customer</td><td class="r">${sale.customerName}</td></tr>
  ${sale.party?.phone ? `<tr><td>Phone</td><td class="r">${sale.party.phone}</td></tr>` : ''}
</table>
<div class="dash"></div>
<table>
  <thead><tr>
    <th style="width:14px">#</th>
    <th style="text-align:left">Item</th>
    <th style="text-align:center;width:24px">Qty</th>
    <th style="text-align:right;width:52px">Rate</th>
    <th style="text-align:right;width:56px">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="dash"></div>
<table>
  <tr><td>Subtotal</td><td class="r">₹${Number(sale.subtotal).toFixed(2)}</td></tr>
  <tr><td>Tax (GST)</td><td class="r">₹${Number(sale.gst).toFixed(2)}</td></tr>
  <tr class="grand"><td>Grand Total</td><td class="r">₹${Number(sale.grandTotal).toFixed(0)}</td></tr>
</table>
<div class="dash"></div>
<table>
  <tr><td>Received</td><td class="r">₹${Number(sale.totalReceived || sale.grandTotal).toFixed(2)}</td></tr>
  ${Number(sale.changeGiven) > 0 ? `<tr><td>Change</td><td class="r">₹${Number(sale.changeGiven).toFixed(2)}</td></tr>` : ''}
  <tr><td>Payment</td><td class="r">${sale.paymentMode}</td></tr>
</table>
<div class="solid"></div>
<div class="footer">
  <p class="b">Thank you for your purchase!</p>
  <p>Please visit us again</p>
</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  };
}
