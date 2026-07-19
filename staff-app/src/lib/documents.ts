// Invoice + delivery-note PDF generation for the staff app. The HTML
// mirrors the website's BillingInvoiceTemplate / DeliveryNoteTemplate 1:1
// (same company block, table styling, totals maths and footer) so a customer
// downloading from the app gets the identical document the office produces.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Shipment } from './shipment';

const LOGO_URL = 'https://www.zimbabweshipping.ie/logo.png';

type InvoiceItem = { description?: string; quantity?: number; unitPrice?: number };

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(amount: number, currency?: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  return `${sym}${(Number(amount) || 0).toFixed(2)}`;
}

function invoiceTotals(invoice: any) {
  const items: InvoiceItem[] = Array.isArray(invoice?.items) ? invoice.items : [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = Number(invoice?.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(invoice?.taxRate) || 0) / 100);
  const paidAmount = (invoice?.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const total = taxable + tax;
  return { items, subtotal, discount, tax, total, paidAmount, balance: Math.max(0, total - paidAmount) };
}

function headerHtml(title: string, refLines: string) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <img src="${LOGO_URL}" style="height:80px" onerror="this.style.display='none'" />
        <div style="font-size:18px;font-weight:700;color:#046A38;margin-top:4px">Zimbabwe Shipping</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:30px;font-weight:bold;letter-spacing:1px">${title}</div>
        <div style="font-size:12px;color:#444;line-height:1.6;margin-top:8px">${refLines}</div>
      </div>
    </div>
    <div style="border-top:2px solid #111;margin-bottom:24px"></div>`;
}

function sealsBlock(shipment: Shipment): string {
  const seals = shipment.metadata?.seals;
  const requested = Number(shipment.metadata?.sealsRequested || (shipment as any).seals_requested || 0);
  const sealed = seals ? Boolean(seals.used) : requested > 0;
  const codes = Array.isArray(seals?.codes) ? seals.codes.filter(Boolean) : [];
  return `
    <div style="margin-bottom:20px;padding:10px 14px;border-radius:4px;border:2px solid ${sealed ? '#2563eb' : '#94a3b8'};background:${sealed ? '#eff6ff' : '#f8fafc'};font-size:13px">
      <strong style="text-transform:uppercase;letter-spacing:.5px;color:${sealed ? '#1d4ed8' : '#475569'}">Metal Coded Seal: ${sealed ? 'Yes' : 'None'}</strong>
      ${sealed ? `<div style="color:#444;margin-top:2px">${
        codes.length
          ? `Seal code(s): <strong style="color:#111">${codes.map(esc).join(', ')}</strong>${seals?.condition ? ` — condition: ${esc(seals.condition)}` : ''}`
          : requested > 0
            ? `${requested} seal(s) to be supplied — codes recorded on sealing.`
            : 'Codes to be recorded on sealing.'
      }${seals?.notes ? `<div>Driver notes: ${esc(seals.notes)}</div>` : ''}</div>` : ''}
    </div>`;
}

export function buildInvoiceHtml(shipment: Shipment): string {
  const m: any = shipment.metadata || {};
  const invoice = m.invoice || {};
  const { items, subtotal, discount, tax, total, paidAmount, balance } = invoiceTotals(invoice);
  const sender = m.sender || m.senderDetails || {};
  const recipient = m.recipient || m.recipientDetails || {};
  const status = total > 0 && balance <= 0.005 ? 'paid' : paidAmount > 0 ? 'partial' : null;
  const description = (shipment as any).goods_description || m.shipment?.description || '';
  const correction = (shipment as any).driver_description_correction || m.driverDescriptionCorrection?.text || '';
  const collection = m.collection || {};

  const rows = items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};border-bottom:1px solid #e2e8f0">
      <td style="padding:10px 12px">${i + 1}</td>
      <td style="padding:10px 12px">${esc(it.description)}</td>
      <td style="padding:10px 12px;text-align:right">${Number(it.quantity) || 0}</td>
      <td style="padding:10px 12px;text-align:right">${fmtMoney(Number(it.unitPrice) || 0, invoice.currency)}</td>
      <td style="padding:10px 12px;text-align:right">${fmtMoney((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), invoice.currency)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
  <body style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px;position:relative">
    ${status === 'paid' ? `<div style="position:absolute;top:120px;right:60px;transform:rotate(-12deg);border:4px solid #16a34a;color:#16a34a;padding:6px 18px;font-size:32px;font-weight:bold;letter-spacing:2px;opacity:.8">PAID</div>` : ''}
    ${status === 'partial' ? `<div style="position:absolute;top:120px;right:60px;transform:rotate(-12deg);border:4px solid #d97706;color:#d97706;padding:6px 18px;font-size:28px;font-weight:bold;letter-spacing:2px;opacity:.8">PART PAID</div>` : ''}
    ${headerHtml('INVOICE', `
      <div>Invoice #: <strong style="font-size:15px;color:#111">${esc(invoice.invoiceNumber || `INV-${shipment.customer_reference || shipment.tracking_number || ''}`)}</strong></div>
      <div>Issue Date: <strong>${esc(invoice.issueDate || '')}</strong></div>
      <div>Due Date: <strong>${esc(invoice.dueDate || '')}</strong></div>
      <div>Customer Ref: <strong>${esc(shipment.customer_reference || '')}</strong></div>
      <div>Tracking #: <strong>${esc(shipment.tracking_number || '')}</strong></div>`)}
    <div style="display:flex;gap:40px;margin-bottom:28px">
      <div style="flex:1">
        <div style="font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px">FROM</div>
        <div style="font-weight:600">Zimbabwe Shipping</div>
        <div style="color:#444;line-height:1.6">www.zimbabweshipping.ie</div>
      </div>
      <div style="flex:1">
        <div style="font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px">BILL TO</div>
        <div style="font-weight:600">${esc(sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim())}</div>
        ${sender.email ? `<div style="color:#444">${esc(sender.email)}</div>` : ''}
        ${sender.phone ? `<div style="color:#444">${esc(sender.phone)}</div>` : ''}
        ${sender.address ? `<div style="color:#444">${esc(sender.address)}</div>` : ''}
        ${sender.city ? `<div style="color:#444">${esc(sender.city)} ${esc(sender.postalCode || '')}</div>` : ''}
      </div>
    </div>
    <div style="background:#f1f5f9;padding:10px 14px;font-size:12px;margin-bottom:12px;display:flex;justify-content:space-between;border-radius:4px">
      <span><strong>Tracking:</strong> ${esc(shipment.tracking_number || '')}</span>
      <span><strong>Recipient:</strong> ${esc(recipient.name || '')}</span>
      <span><strong>Route:</strong> ${esc(shipment.origin || '')} → ${esc(shipment.destination || '')}</span>
    </div>
    ${collection.route ? `<div style="font-size:12px;color:#444;margin-bottom:8px"><strong>Collection:</strong> ${esc(collection.route)} — ${esc(collection.date || '')}</div>` : ''}
    ${description ? `<div style="font-size:12px;color:#444;margin-bottom:8px"><strong>Goods description:</strong> ${esc(description)}</div>` : ''}
    ${correction ? `<div style="font-size:12px;color:#b45309;margin-bottom:8px"><strong>Driver correction:</strong> ${esc(correction)}</div>` : ''}
    ${sealsBlock(shipment)}
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
      <thead><tr style="background:#2563eb;color:#fff">
        <th style="padding:10px 12px;text-align:left;width:40px">#</th>
        <th style="padding:10px 12px;text-align:left">Description</th>
        <th style="padding:10px 12px;text-align:right;width:60px">Qty</th>
        <th style="padding:10px 12px;text-align:right;width:110px">Unit Price</th>
        <th style="padding:10px 12px;text-align:right;width:110px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
      <table style="font-size:13px"><tbody>
        <tr><td style="padding:4px 16px;text-align:right">Subtotal</td><td style="padding:4px 0;text-align:right;min-width:110px">${fmtMoney(subtotal, invoice.currency)}</td></tr>
        ${discount > 0 ? `<tr><td style="padding:4px 16px;text-align:right;color:#dc2626">Discount</td><td style="padding:4px 0;text-align:right;color:#dc2626">− ${fmtMoney(discount, invoice.currency)}</td></tr>` : ''}
        ${Number(invoice.taxRate) > 0 ? `<tr><td style="padding:4px 16px;text-align:right">Tax (${invoice.taxRate}%)</td><td style="padding:4px 0;text-align:right">${fmtMoney(tax, invoice.currency)}</td></tr>` : ''}
        <tr style="border-top:2px solid #111;font-weight:bold;font-size:15px"><td style="padding:8px 16px;text-align:right">Total</td><td style="padding:8px 0;text-align:right">${fmtMoney(total, invoice.currency)}</td></tr>
        ${paidAmount > 0 ? `<tr style="color:#16a34a"><td style="padding:4px 16px;text-align:right">Amount Paid</td><td style="padding:4px 0;text-align:right">− ${fmtMoney(paidAmount, invoice.currency)}</td></tr>
        <tr style="font-weight:bold;font-size:15px;color:${balance <= 0.005 ? '#16a34a' : '#b91c1c'}"><td style="padding:8px 16px;text-align:right">Balance Due</td><td style="padding:8px 0;text-align:right">${fmtMoney(balance, invoice.currency)}</td></tr>` : ''}
      </tbody></table>
    </div>
    ${invoice.paymentTerms ? `<div style="margin-bottom:12px"><div style="font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:4px">Payment Method</div><div style="color:#333;line-height:1.6">${esc(invoice.paymentTerms)}</div></div>` : ''}
    ${invoice.notes ? `<div style="margin-bottom:12px"><div style="font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:4px">Notes</div><div style="color:#333;line-height:1.6">${esc(invoice.notes)}</div></div>` : ''}
    <div style="margin-top:32px;border-top:1px solid #ddd;padding-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span>Ref: ${esc(shipment.customer_reference || shipment.tracking_number || '')}</span>
      <span>Generated: ${new Date().toLocaleString('en-GB')}</span>
    </div>
  </body></html>`;
}

export function buildDeliveryNoteHtml(shipment: Shipment, extras?: {
  deliveryNote?: any; seals?: any; proofSummary?: { count: number; capturedAt?: string | null } | null;
}): string {
  const m: any = shipment.metadata || {};
  const sender = m.sender || m.senderDetails || {};
  const recipient = m.recipient || m.recipientDetails || {};
  const collection = m.collection || {};
  const note = extras?.deliveryNote || {};
  const deliveryConfirmation = m.deliveryConfirmation || {};
  const collectionConfirmation = m.collectionConfirmation || {};
  const addresses: any[] = Array.isArray(m.deliveryAddresses) ? m.deliveryAddresses : [];
  const description = (shipment as any).goods_description || m.shipment?.description || '';
  const correction = (shipment as any).driver_description_correction || m.driverDescriptionCorrection?.text || '';
  const doorToDoor = addresses.length > 0 || Boolean(m.pricing?.doorDelivery);
  const invoice = m.invoice || {};
  const { total } = invoiceTotals(invoice);

  const extraAddresses = addresses.slice(doorToDoor && addresses.length ? 1 : 0);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
  <body style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px">
    ${headerHtml('DELIVERY NOTE', `
      <div>Ref #: <strong style="font-size:16px;color:#111">${esc(note.note_number || m.deliveryNote?.number || `DN-${shipment.customer_reference || shipment.tracking_number || ''}`)}</strong></div>
      <div>Customer Ref: <strong>${esc(shipment.customer_reference || '')}</strong></div>
      <div>Tracking #: <strong>${esc(shipment.tracking_number || '')}</strong></div>
      <div>Date: <strong>${new Date().toLocaleDateString('en-GB')}</strong></div>`)}
    <div style="display:flex;gap:40px;margin-bottom:24px">
      <div style="flex:1">
        <div style="font-weight:bold;font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">SHIPPER:</div>
        <div style="line-height:1.7;color:#222">
          <div style="font-weight:600">${esc(sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim())}</div>
          ${sender.phone ? `<div>${esc(sender.phone)}</div>` : ''}
          ${sender.address ? `<div>${esc(sender.address)}</div>` : ''}
          ${sender.city ? `<div>${esc(sender.city)} ${esc(sender.postalCode || '')}</div>` : ''}
          ${sender.country ? `<div>${esc(sender.country)}</div>` : ''}
        </div>
      </div>
      <div style="flex:1">
        <div style="font-weight:bold;font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">RECIPIENT:</div>
        <div style="line-height:1.7;color:#222">
          <div style="font-weight:600">${esc(recipient.name || '')}</div>
          ${recipient.phone ? `<div>${esc(recipient.phone)}</div>` : ''}
          ${recipient.address ? `<div>${esc(recipient.address)}</div>` : ''}
          ${recipient.city ? `<div>${esc(recipient.city)}</div>` : ''}
        </div>
      </div>
    </div>
    ${extraAddresses.length ? `<div style="margin-bottom:24px">
      <div style="font-weight:bold;font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;color:#2563eb">ADDITIONAL DELIVERY ADDRESSES:</div>
      ${extraAddresses.map((addr, i) => `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;line-height:1.6;font-size:12px;margin-bottom:8px">
        <div style="font-weight:600;margin-bottom:4px;color:#2563eb">Address #${i + 2}</div>
        ${addr.recipientName || addr.name ? `<div style="font-weight:500">${esc(addr.recipientName || addr.name)}</div>` : ''}
        ${addr.recipientPhone || addr.phone ? `<div>${esc(addr.recipientPhone || addr.phone)}</div>` : ''}
        ${addr.address ? `<div>${esc(addr.address)}</div>` : ''}
        ${addr.city ? `<div>${esc(addr.city)}${addr.province ? `, ${esc(addr.province)}` : ''}</div>` : ''}
        ${addr.instructions ? `<div style="color:#666">Note: ${esc(addr.instructions)}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
    <div style="font-size:12px;color:#444;margin-bottom:12px">
      <strong>Collection:</strong> ${esc(collection.route || 'Route to be assigned')} — ${esc(collection.date || '')}
      ${collectionConfirmation.collectedAt ? ` · Collected ${new Date(collectionConfirmation.collectedAt).toLocaleString('en-GB')}` : ''}
    </div>
    <div style="margin-bottom:20px;padding:10px 14px;border-radius:4px;border:2px solid ${doorToDoor ? '#16a34a' : '#94a3b8'};background:${doorToDoor ? '#f0fdf4' : '#f8fafc'};font-size:13px">
      <strong style="text-transform:uppercase;letter-spacing:.5px;color:${doorToDoor ? '#15803d' : '#475569'}">Delivery Method: ${doorToDoor ? 'Door-to-Door' : 'Depot Collection'}</strong>
      <div style="color:#444;margin-top:2px">${doorToDoor
        ? `Deliver to ${Math.max(1, addresses.length)} address${Math.max(1, addresses.length) > 1 ? 'es' : ''} listed above. Contact recipient(s) to arrange delivery.`
        : 'Recipient collects from the local depot. No door delivery included.'}</div>
    </div>
    ${sealsBlock(shipment)}
    <div style="margin-bottom:12px;font-size:12px;color:#444"><strong>Items in this shipment:</strong> ${esc(description || 'See invoice')}</div>
    ${correction ? `<div style="margin-bottom:12px;font-size:12px;color:#b45309"><strong>Driver correction / collection note:</strong> ${esc(correction)}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
      <thead><tr style="background:#2563eb;color:#fff">
        <th style="padding:10px 12px;text-align:center;width:32px">✓</th>
        <th style="padding:10px 12px;text-align:left;width:40px">#</th>
        <th style="padding:10px 12px;text-align:left;width:170px">Item</th>
        <th style="padding:10px 12px;text-align:left">Description / Item Details</th>
      </tr></thead>
      <tbody>${(Array.isArray(invoice.items) ? invoice.items : []).map((it: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 12px;text-align:center;font-size:14px">☐</td>
          <td style="padding:10px 12px;vertical-align:top">${i + 1}</td>
          <td style="padding:10px 12px;font-weight:600;vertical-align:top">${esc(it.description)}</td>
          <td style="padding:10px 12px;vertical-align:top;line-height:1.7">Qty: ${Number(it.quantity) || 0}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;gap:24px;margin-bottom:20px;font-size:12px">
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:12px;line-height:1.8">
        <div style="font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;font-size:11px;margin-bottom:4px">Payment</div>
        <div>Method: <strong>${esc(invoice.paymentTerms || '—')}</strong></div>
        <div>Amount: <strong>${fmtMoney(total, invoice.currency)}</strong></div>
        <div>Status: <strong>${invoice.paid ? 'Paid' : 'Payment due'}</strong></div>
      </div>
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:12px;line-height:1.8">
        <div style="font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;font-size:11px;margin-bottom:4px">Delivery Verification</div>
        <div>Delivery code verified: <strong>${note.customer_code_verified || deliveryConfirmation.codeVerified ? 'Yes' : 'Pending'}</strong></div>
        <div>Delivered: <strong>${note.delivered_at ? new Date(note.delivered_at).toLocaleString('en-GB') : deliveryConfirmation.deliveredAt ? new Date(deliveryConfirmation.deliveredAt).toLocaleString('en-GB') : 'Pending'}</strong></div>
        <div>Photographs on file: <strong>${extras?.proofSummary?.count ?? note.proof_count ?? deliveryConfirmation.proofCount ?? 0}</strong></div>
        ${note.notes ? `<div>Driver notes: ${esc(note.notes)}</div>` : ''}
      </div>
    </div>
    <div style="margin-top:32px;border-top:1px solid #ddd;padding-top:16px;display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span>Zimbabwe Shipping</span>
      <span>Tracking: ${esc(shipment.tracking_number || '')}</span>
      <span>Generated: ${new Date().toLocaleString('en-GB')}</span>
    </div>
  </body></html>`;
}

export async function sharePdf(html: string, fileName: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName, UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
