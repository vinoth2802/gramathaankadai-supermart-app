export function printSaleInvoice(sale, settings = {}) {
  const shopName = settings.tenantName || settings.shopName || 'SuperMart';
  const address  = settings.address || '';
  const phone    = settings.phone   || '';
  const gstin    = settings.gstin   || '';
  const email    = settings.email   || '';

  const date = new Date(sale.date || Date.now());
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const items = sale.items || [];
  const rows = items.map((it, i) => {
    const taxable = Number(it.amount || 0) - Number(it.gstAmount || 0);
    return `
    <tr>
      <td class="sno">${i + 1}</td>
      <td class="item-name">${it.name || ''}${it.description ? `<br><span class="desc">${it.description}</span>` : ''}${it.batchNo ? `<br><span class="desc">Batch: ${it.batchNo}</span>` : ''}</td>
      <td class="center">${it.qty || 0}</td>
      <td class="right">${it.unit || ''}</td>
      <td class="right">₹${Number(it.rate || 0).toFixed(2)}</td>
      <td class="center">${it.gstRate || 0}%</td>
      <td class="right">₹${Number(it.gstAmount || 0).toFixed(2)}</td>
      <td class="right amount">₹${Number(it.amount || 0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const subtotal   = Number(sale.subtotal  || 0);
  const gst        = Number(sale.gst       || 0);
  const grandTotal = Number(sale.grandTotal|| 0);
  const received   = Number(sale.totalReceived || grandTotal);
  const change     = Number(sale.changeGiven || 0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Invoice ${sale.invoice || ''}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
  .page { max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #334155; padding-bottom: 16px; }
  .shop-name { font-size: 22px; font-weight: 700; color: #1e293b; }
  .shop-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: 1px; }
  .invoice-meta { font-size: 11px; color: #475569; margin-top: 4px; }
  .invoice-no { font-size: 13px; font-weight: 700; color: #1d4ed8; font-family: monospace; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
  .info-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .info-val { font-size: 12px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #1e293b; color: #fff; }
  th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
  tr:hover td { background: #f8fafc; }
  .sno { width: 28px; color: #94a3b8; text-align: center; }
  .item-name { min-width: 160px; }
  .desc { color: #94a3b8; font-size: 10px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .amount { font-weight: 600; }
  tfoot td { border-top: 2px solid #334155; background: #f8fafc; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .totals-box { min-width: 260px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .tot-row { display: flex; justify-content: space-between; padding: 6px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .tot-row:last-child { border-bottom: none; background: #1e293b; color: #fff; font-weight: 700; font-size: 14px; padding: 10px 14px; }
  .footer-note { border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #94a3b8; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 24px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #334155; width: 140px; margin: 0 auto; padding-top: 4px; font-size: 10px; color: #64748b; }
  @media print { @page { margin: 12mm; } body { padding: 0; } }
</style></head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="shop-name">${shopName}</div>
      ${address ? `<div class="shop-sub">${address}</div>` : ''}
      ${phone   ? `<div class="shop-sub">Ph: ${phone}</div>` : ''}
      ${email   ? `<div class="shop-sub">Email: ${email}</div>` : ''}
      ${gstin   ? `<div class="shop-sub">GSTIN: ${gstin}</div>` : ''}
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <div class="invoice-no"># ${sale.invoice || ''}</div>
      <div class="invoice-meta">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
      <div class="invoice-meta">Status: ${sale.paymentStatus || 'Paid'}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Bill To</div>
      <div class="info-val" style="font-weight:600">${sale.customerName || 'Walk-in Customer'}</div>
      ${sale.phone           ? `<div class="info-val">Ph: ${sale.phone}</div>`           : ''}
      ${sale.billingAddress  ? `<div class="info-val">${sale.billingAddress}</div>`       : ''}
    </div>
    <div class="info-box">
      <div class="info-label">Payment Info</div>
      <div class="info-val">Mode: ${sale.paymentMode || 'Cash'}</div>
      ${sale.stateOfSupply ? `<div class="info-val">State: ${sale.stateOfSupply}</div>` : ''}
      ${sale.vehicleNo     ? `<div class="info-val">Vehicle: ${sale.vehicleNo}</div>`   : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="sno">#</th>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="center">Unit</th>
        <th class="right">Rate</th>
        <th class="center">GST</th>
        <th class="right">Tax Amt</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="7" class="right" style="font-weight:600;font-size:11px;">Grand Total</td>
        <td class="right amount" style="font-size:13px;font-weight:700;">₹${grandTotal.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="tot-row"><span>Subtotal (excl. tax)</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="tot-row"><span>GST</span><span>₹${gst.toFixed(2)}</span></div>
      <div class="tot-row"><span>Amount Received</span><span>₹${received.toFixed(2)}</span></div>
      ${change > 0 ? `<div class="tot-row"><span>Change Given</span><span>₹${change.toFixed(2)}</span></div>` : ''}
      <div class="tot-row"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-box"><div class="sig-line">Customer Signature</div></div>
    <div class="sig-box"><div class="sig-line">Authorised Signature</div></div>
  </div>

  <div class="footer-note" style="margin-top:16px">
    <p>Thank you for your business!</p>
    ${sale.notes ? `<p style="margin-top:4px">${sale.notes}</p>` : ''}
  </div>

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
