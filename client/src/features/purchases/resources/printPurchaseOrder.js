export function printPurchaseOrder(purchase, settings = {}) {
  const shopName = settings.tenantName || settings.shopName || 'SuperMart';
  const address  = settings.address || '';
  const phone    = settings.phone   || '';
  const gstin    = settings.gstin   || '';

  const date = new Date(purchase.date || Date.now());
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const items = purchase.items || [];
  const rows = items.filter(i => i.name).map((it, i) => `
    <tr>
      <td class="sno">${i + 1}</td>
      <td class="item-name">${it.name || ''}${it.batchNo ? `<br><span class="desc">Batch: ${it.batchNo}</span>` : ''}${it.expiryDate ? `<br><span class="desc">Exp: ${it.expiryDate}</span>` : ''}</td>
      <td class="center">${it.qty || 0}</td>
      <td class="center">${it.unit || ''}</td>
      <td class="right">₹${Number(it.mrp || 0).toFixed(2)}</td>
      <td class="right">₹${Number(it.price || 0).toFixed(2)}</td>
      <td class="center">${it.gstRate || 0}%</td>
      <td class="right">₹${Number(it.gstAmount || 0).toFixed(2)}</td>
      <td class="right amount">₹${Number(it.total || 0).toFixed(2)}</td>
    </tr>`).join('');

  const grandTotal = Number(purchase.grandTotal || 0);
  const totalPaid  = Number(purchase.totalPaid  || 0);
  const balance    = Math.max(0, grandTotal - totalPaid);
  const totalGst   = items.reduce((s, i) => s + Number(i.gstAmount || 0), 0);
  const subtotal   = grandTotal - totalGst;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Purchase ${purchase.invoice || ''}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
  .page { max-width: 850px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #92400e; padding-bottom: 16px; }
  .shop-name { font-size: 22px; font-weight: 700; color: #1e293b; }
  .shop-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .doc-title h2 { font-size: 18px; font-weight: 700; color: #92400e; letter-spacing: 1px; text-align: right; }
  .doc-no { font-size: 13px; font-weight: 700; color: #d97706; font-family: monospace; text-align: right; }
  .doc-meta { font-size: 11px; color: #475569; margin-top: 4px; text-align: right; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .info-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; }
  .info-label { font-size: 10px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .info-val { font-size: 12px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #92400e; color: #fff; }
  th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
  tr:hover td { background: #fffbeb; }
  .sno { width: 28px; color: #94a3b8; text-align: center; }
  .item-name { min-width: 160px; }
  .desc { color: #94a3b8; font-size: 10px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .amount { font-weight: 600; }
  tfoot td { border-top: 2px solid #92400e; background: #fffbeb; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .totals-box { min-width: 260px; border: 1px solid #fde68a; border-radius: 6px; overflow: hidden; }
  .tot-row { display: flex; justify-content: space-between; padding: 6px 14px; border-bottom: 1px solid #fef3c7; font-size: 12px; }
  .tot-row.grand { background: #92400e; color: #fff; font-weight: 700; font-size: 14px; padding: 10px 14px; border-bottom: none; }
  .footer-note { border-top: 1px dashed #d97706; padding-top: 10px; text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 24px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #92400e; width: 140px; margin: 0 auto; padding-top: 4px; font-size: 10px; color: #64748b; }
  @media print { @page { margin: 12mm; } body { padding: 0; } }
</style></head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="shop-name">${shopName}</div>
      ${address ? `<div class="shop-sub">${address}</div>` : ''}
      ${phone   ? `<div class="shop-sub">Ph: ${phone}</div>` : ''}
      ${gstin   ? `<div class="shop-sub">GSTIN: ${gstin}</div>` : ''}
    </div>
    <div class="doc-title">
      <h2>PURCHASE ORDER</h2>
      <div class="doc-no">GRN # ${purchase.invoice || ''}</div>
      <div class="doc-meta">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
      <div class="doc-meta">Status: ${purchase.paymentStatus || 'Paid'}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Supplier</div>
      <div class="info-val" style="font-weight:600">${purchase.partyName || 'Cash Purchase'}</div>
      ${purchase.supplierInvoiceNo   ? `<div class="info-val">Supplier Invoice: ${purchase.supplierInvoiceNo}</div>`     : ''}
      ${purchase.supplierInvoiceDate ? `<div class="info-val">Supplier Date: ${new Date(purchase.supplierInvoiceDate).toLocaleDateString('en-IN')}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-label">Payment Info</div>
      <div class="info-val">Mode: ${(purchase.paymentMode || 'Cash').replace(/^Credit \((.+)\)$/, 'Credit — $1')}</div>
      <div class="info-val">Paid: ₹${totalPaid.toFixed(2)}</div>
      ${balance > 0 ? `<div class="info-val" style="color:#dc2626;font-weight:600;">Balance: ₹${balance.toFixed(2)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="sno">#</th>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="center">Unit</th>
        <th class="right">MRP</th>
        <th class="right">Price</th>
        <th class="center">GST</th>
        <th class="right">Tax Amt</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="8" class="right" style="font-weight:600;font-size:11px;">Grand Total</td>
        <td class="right amount" style="font-size:13px;font-weight:700;">₹${grandTotal.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="tot-row"><span>Subtotal (excl. tax)</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="tot-row"><span>GST</span><span>₹${totalGst.toFixed(2)}</span></div>
      <div class="tot-row"><span>Amount Paid</span><span>₹${totalPaid.toFixed(2)}</span></div>
      ${balance > 0 ? `<div class="tot-row" style="color:#dc2626"><span>Balance Due</span><span>₹${balance.toFixed(2)}</span></div>` : ''}
      <div class="tot-row grand"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-box"><div class="sig-line">Supplier Signature</div></div>
    <div class="sig-box"><div class="sig-line">Authorised Signature</div></div>
  </div>

  <div class="footer-note">
    <p>Goods received in good condition.</p>
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
