import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, Printer, Pencil, Save, X, CalendarPlus, Plus, Trash2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shipment } from '@/types/shipment';

interface DeliveryNoteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  // Called after edits are persisted, so the parent list can refresh in place.
  onSaved?: (updated: Shipment) => void;
}

// Manual edits to the auto-generated note, stored on the shipment's metadata.
// Any field left undefined falls back to the auto-generated value.
interface DeliveryNoteOverrides {
  refNumber?: string;
  date?: string;          // header "Date" (yyyy-MM-dd)
  deliveryDate?: string;  // optional separate delivery date (yyyy-MM-dd)
  itemDescriptions?: Record<string, string>; // line-item index → description
  itemNames?: Record<string, string>;        // line-item index → item label
  doorToDoor?: boolean;   // override the delivery-method (door-to-door vs depot)
  sealed?: boolean;       // override whether a metal coded seal applies
  sealCodes?: string;     // editable seal code(s), comma/newline separated
  // Shipper / recipient (any field can be corrected on the note)
  senderName?: string;
  senderPhone?: string;
  senderPhone2?: string;
  senderAddress?: string;    // newline-separated lines
  recipientName?: string;
  recipientPhone?: string;
  recipientPhone2?: string;
  recipientAddress?: string; // newline-separated lines
  deliveryAddresses?: Array<{ name: string; phone: string; address: string; city: string }>; // extra delivery addresses
  itemsSummary?: string;
  tracking?: string;
}

function getOverrides(s: Shipment): DeliveryNoteOverrides {
  return (s.metadata?.deliveryNoteOverrides as DeliveryNoteOverrides) || {};
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getSenderName(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.name || m.senderDetails?.name ||
    (m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim() : '') ||
    (m.senderDetails?.firstName ? `${m.senderDetails.firstName} ${m.senderDetails.lastName || ''}`.trim() : '') ||
    'Unknown Sender';
}

function getSenderPhone(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.phone || m.senderDetails?.phone || '';
}

function getSenderPhone2(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.phone2 || m.senderDetails?.phone2 || '';
}

function getRecipientPhone(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.phone || m.recipientDetails?.phone || '';
}

function getRecipientPhone2(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.phone2 || m.recipientDetails?.phone2 || '';
}

// Country dialling code ("post code") per country.
const DIAL_CODES: Record<string, string> = {
  Ireland: '+353',
  'Northern Ireland': '+353',
  England: '+44',
  UK: '+44',
  'United Kingdom': '+44',
  Scotland: '+44',
  Wales: '+44',
  Zimbabwe: '+263',
};

// Prepend the country dialling code if the phone doesn't already have one.
function withDialCode(phone: string, country: string | undefined): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const code = country ? DIAL_CODES[country] : '';
  if (!code) return trimmed;
  // Strip a single leading 0 (typical for IE/UK local format) before adding the code.
  const local = trimmed.replace(/^0+/, '');
  return `${code} ${local}`;
}

function getSenderAddress(s: Shipment) {
  const m = s.metadata || {};
  const parts: string[] = [];
  const src = m.sender || m.senderDetails || {};
  if (src.address) parts.push(src.address);
  if (src.city) parts.push(src.city);
  // Postcode intentionally omitted — not useful to the courier.
  if (src.country) parts.push(src.country);
  return parts.length ? parts : [s.origin || 'Ireland'];
}

function getRecipientName(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.name || m.recipientDetails?.name ||
    (m.recipient?.firstName ? `${m.recipient.firstName} ${m.recipient.lastName || ''}`.trim() : '') ||
    'Unknown Recipient';
}

function getRecipientAddress(s: Shipment) {
  const m = s.metadata || {};
  const parts: string[] = [];
  const src = m.recipient || m.recipientDetails || {};
  if (src.address) parts.push(src.address);
  if (src.city) parts.push(src.city);
  if (src.country) parts.push(src.country);
  return parts.length ? parts : [s.destination || 'Zimbabwe'];
}

// Additional delivery addresses for door-to-door service (charged per address)
function getDeliveryAddresses(s: Shipment): Array<{ name: string; phone: string; address: string; city: string }> {
  const m = s.metadata || {};
  const recipient = m.recipient || m.recipientDetails || {};
  return recipient.additionalAddresses || [];
}

// Whether the customer paid for door-to-door delivery in Zimbabwe (vs depot
// collection). Checked across the various places booking/manual flows store it.
function getDoorToDoor(s: Shipment): boolean {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  return !!(
    ship.doorToDoor ||
    m.items?.addOns?.doorToDoor ||
    m.delivery?.doorToDoor ||
    m.doorToDoor
  );
}

// Metal coded seal info for the shipment (sealed?, the code(s), how many supplied).
function getSealInfo(s: Shipment): { sealed: boolean; codes: string[]; quantity: number } {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  const addOns = (m.items && m.items.addOns) || {};
  const sealed = !!(ship.wantMetalSeal || ship.metalSeal || addOns.metalSeal);
  const rawCodes = ship.metalSealCodes || addOns.metalSealCodes || [];
  const codes = Array.isArray(rawCodes) ? rawCodes.map((c: string) => String(c).trim()).filter(Boolean) : [];
  const quantity = Number(ship.metalSealQuantity ?? addOns.metalSealQuantity ?? 0);
  return { sealed, codes, quantity };
}

// Builds one row per physical item. Description is taken from the customer's
// booking ("blue plastic drum with red lid", etc.) so the driver can identify
// each item without guessing.
function buildLineItems(s: Shipment) {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  const itemsMeta = m.items || {};
  const rows: { item: string; description: string }[] = [];

  const sealOn = !!(ship.metalSeal || ship.wantMetalSeal);
  const sealNote = sealOn ? ' Sealed.' : '';

  const drumsDescription =
    ship.drumsDescription || itemsMeta.drums?.description || null;
  const trunksDescription =
    ship.trunksDescription || itemsMeta.trunks?.description || null;

  const drumQty = Number(
    ship.drums ?? ship.drumQuantity ?? (ship.includeDrums ? ship.quantity : 0) ?? 0,
  );
  for (let i = 1; i <= drumQty; i++) {
    rows.push({
      item: `Drum #${i}`,
      description: `${drumsDescription || '200–220L drum'}.${sealNote}`,
    });
  }

  const trunkQty = Number(ship.boxes ?? ship.trunkQuantity ?? 0);
  for (let i = 1; i <= trunkQty; i++) {
    rows.push({
      item: `Trunk / Box #${i}`,
      description: `${trunksDescription || 'Storage box / trunk'}.${sealNote}`,
    });
  }

  // Drums supplied by us at collection (UK only)
  const purchased = itemsMeta.purchasedDrums;
  if (purchased && purchased.quantity > 0) {
    const label = purchased.type === 'metal' ? 'Metal Drum' : 'Plastic Barrel';
    for (let i = 1; i <= purchased.quantity; i++) {
      rows.push({
        item: `${label} #${i} (supplied)`,
        description: `${label} supplied at collection.`,
      });
    }
  }

  // Custom-quote items (free text from booking) — split into one row per item
  // so the courier can tick each off. We split on newlines, semicolons, and " + "
  // to respect natural list formatting; commas are left alone (they appear in
  // sentences like "1 box of clothes, books and shoes").
  const otherDesc =
    ship.boxesDescription || ship.category || ship.description ||
    ship.otherItemDescription || itemsMeta.boxes?.description || null;
  if (ship.includeOtherItems || ship.includeBoxes || otherDesc) {
    const splitOther = (otherDesc || 'General goods.')
      .split(/\n+|;|\s\+\s/g)
      .map((p) => p.trim())
      .filter(Boolean);
    if (splitOther.length <= 1) {
      rows.push({ item: 'Other Items', description: splitOther[0] || 'General goods.' });
    } else {
      splitOther.forEach((piece, idx) => {
        rows.push({ item: `Other Item #${idx + 1}`, description: piece });
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      item: 'Shipment',
      description: m.shipmentType || 'General shipment.',
    });
  }

  return rows;
}

// Quick at-a-glance count above the per-item table.
function buildItemsSummary(s: Shipment) {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  const itemsMeta = m.items || {};
  const parts: string[] = [];

  const drumQty = Number(ship.drums ?? ship.drumQuantity ?? 0);
  if (drumQty > 0) parts.push(`${drumQty} × Drum`);

  const trunkQty = Number(ship.boxes ?? ship.trunkQuantity ?? 0);
  if (trunkQty > 0) parts.push(`${trunkQty} × Trunk`);

  const purchasedQty = Number(itemsMeta.purchasedDrums?.quantity ?? 0);
  if (purchasedQty > 0) {
    const t = itemsMeta.purchasedDrums?.type === 'metal' ? 'Metal Drum' : 'Plastic Barrel';
    parts.push(`${purchasedQty} × ${t} (supplied)`);
  }

  if (ship.includeOtherItems || ship.includeBoxes || itemsMeta.boxes) {
    parts.push('plus other items');
  }

  return parts.length ? parts.join(', ') : 'See items below';
}

// Ref # = first 3 letters of sender name + last 4 digits of their phone.
// Example: John Smith / +353 87 123 4567 → JOH-4567
function buildRefNumber(s: Shipment) {
  const override = getOverrides(s).refNumber;
  if (override && override.trim()) return override.trim();
  const name = getSenderName(s);
  const phone = getSenderPhone(s);
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
  const digits = phone.replace(/\D/g, '').slice(-4);
  if (letters && digits) return `${letters}-${digits}`;
  // Fallbacks when sender data is missing on legacy shipments
  const trackingTail = (s.tracking_number || '').replace(/[^0-9A-Z]/gi, '').slice(-4) || '0000';
  if (letters) return `${letters}-${trackingTail}`;
  if (digits) return `REF-${digits}`;
  return `REF-${trackingTail}`;
}

// ── Delivery Note print template ─────────────────────────────────────────────

const DeliveryNoteTemplate = React.forwardRef<HTMLDivElement, { shipment: Shipment; overrides?: DeliveryNoteOverrides }>(
  ({ shipment, overrides: overridesProp }, ref) => {
    // Live edits (overridesProp) take priority; otherwise fall back to what's saved.
    const overrides = overridesProp ?? getOverrides(shipment);
    const refNumber = buildRefNumber(shipment);
    const docDate = overrides.date || format(new Date(shipment.created_at), 'yyyy-MM-dd');
    const deliveryDate = (overrides.deliveryDate || '').trim();
    const senderCountry = (shipment.metadata?.sender?.country || shipment.metadata?.senderDetails?.country) as string | undefined;
    // Each field uses its override when present (incl. empty string to clear), else the auto value.
    const senderName = overrides.senderName ?? getSenderName(shipment);
    const senderAddress = overrides.senderAddress !== undefined
      ? overrides.senderAddress.split('\n').map(l => l.trim()).filter(Boolean)
      : getSenderAddress(shipment);
    const senderPhone = overrides.senderPhone ?? withDialCode(getSenderPhone(shipment), senderCountry);
    const senderPhone2 = overrides.senderPhone2 ?? withDialCode(getSenderPhone2(shipment), senderCountry);
    const recipientName = overrides.recipientName ?? getRecipientName(shipment);
    const recipientAddress = overrides.recipientAddress !== undefined
      ? overrides.recipientAddress.split('\n').map(l => l.trim()).filter(Boolean)
      : getRecipientAddress(shipment);
    const recipientPhone = overrides.recipientPhone ?? withDialCode(getRecipientPhone(shipment), 'Zimbabwe');
    const recipientPhone2 = overrides.recipientPhone2 ?? withDialCode(getRecipientPhone2(shipment), 'Zimbabwe');
    const lineItems = buildLineItems(shipment).map((row, i) => ({
      item: overrides.itemNames?.[i] ?? row.item,
      description: overrides.itemDescriptions?.[i] ?? row.description,
    }));
    const deliveryAddresses = overrides.deliveryAddresses ?? getDeliveryAddresses(shipment);
    const itemsSummary = overrides.itemsSummary ?? buildItemsSummary(shipment);
    const tracking = overrides.tracking ?? shipment.tracking_number;
    const doorToDoor = overrides.doorToDoor ?? getDoorToDoor(shipment);
    const sealInfoBase = getSealInfo(shipment);
    const sealed = overrides.sealed ?? sealInfoBase.sealed;
    const sealCodesText = (overrides.sealCodes ?? sealInfoBase.codes.join(', ')).trim();

    return (
      <div
        ref={ref}
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          color: '#111',
          backgroundColor: '#fff',
          padding: '40px 48px',
          width: '794px',       // A4 at 96dpi
          minHeight: '600px',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Zimbabwe Shipping"
            crossOrigin="anonymous"
            style={{ height: '80px', width: 'auto' }}
          />
          {/* Title block */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>
              DELIVERY NOTE
            </div>
            <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.6' }}>
              <div>Ref #: <strong style={{ fontSize: '16px', color: '#111' }}>{refNumber}</strong></div>
              <div>Date: <strong>{docDate}</strong></div>
              {deliveryDate && <div>Delivery Date: <strong>{deliveryDate}</strong></div>}
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: '2px solid #111', marginBottom: '24px' }} />

        {/* ── Shipper / Recipient ── */}
        <div style={{ display: 'flex', gap: '40px', marginBottom: '32px' }}>
          {/* Shipper */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SHIPPER:
            </div>
            <div style={{ lineHeight: '1.7', color: '#222' }}>
              <div style={{ fontWeight: '600' }}>{senderName}</div>
              {senderPhone && <div>{senderPhone}</div>}
              {senderPhone2 && <div>{senderPhone2}</div>}
              {senderAddress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
          {/* Recipient */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              RECIPIENT:
            </div>
            <div style={{ lineHeight: '1.7', color: '#222' }}>
              <div style={{ fontWeight: '600' }}>{recipientName}</div>
              {recipientPhone && <div>{recipientPhone}</div>}
              {recipientPhone2 && <div>{recipientPhone2}</div>}
              {recipientAddress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Delivery Addresses */}
        {deliveryAddresses.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563eb' }}>
              ADDITIONAL DELIVERY ADDRESSES:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {deliveryAddresses.map((addr, i) => (
                <div key={i} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc', lineHeight: '1.6', fontSize: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#2563eb' }}>Address #{i + 2}</div>
                  {addr.name && <div style={{ fontWeight: '500' }}>{addr.name}</div>}
                  {addr.phone && <div>{withDialCode(addr.phone, 'Zimbabwe')}</div>}
                  {addr.address && <div>{addr.address}</div>}
                  {addr.city && <div>{addr.city}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Delivery method ── */}
        <div style={{
          marginBottom: '20px',
          padding: '10px 14px',
          borderRadius: '4px',
          border: `2px solid ${doorToDoor ? '#16a34a' : '#94a3b8'}`,
          backgroundColor: doorToDoor ? '#f0fdf4' : '#f8fafc',
          fontSize: '13px',
        }}>
          <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: doorToDoor ? '#15803d' : '#475569' }}>
            Delivery Method: {doorToDoor ? 'Door-to-Door' : 'Depot Collection'}
          </strong>
          <div style={{ color: '#444', marginTop: '2px' }}>
            {doorToDoor
              ? `Deliver to ${1 + deliveryAddresses.length} address${1 + deliveryAddresses.length > 1 ? 'es' : ''} listed above. Contact recipient(s) to arrange delivery.`
              : 'Recipient collects from the local depot. No door delivery included.'}
          </div>
        </div>

        {/* ── Metal coded seal ── */}
        <div style={{
          marginBottom: '20px',
          padding: '10px 14px',
          borderRadius: '4px',
          border: `2px solid ${sealed ? '#2563eb' : '#94a3b8'}`,
          backgroundColor: sealed ? '#eff6ff' : '#f8fafc',
          fontSize: '13px',
        }}>
          <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: sealed ? '#1d4ed8' : '#475569' }}>
            Metal Coded Seal: {sealed ? 'Yes' : 'None'}
          </strong>
          {sealed && (
            <div style={{ color: '#444', marginTop: '2px' }}>
              {sealCodesText
                ? <>Seal code(s): <strong style={{ color: '#111' }}>{sealCodesText}</strong></>
                : (sealInfoBase.quantity > 0
                    ? `${sealInfoBase.quantity} seal(s) to be supplied — codes to be recorded on sealing.`
                    : 'Codes to be recorded on sealing.')}
            </div>
          )}
        </div>

        {/* ── Items summary ── */}
        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#444' }}>
          <strong>Items in this shipment:</strong> {itemsSummary}
        </div>

        {/* ── Per-item Table — courier ticks each off and notes color/contents ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: '32px' }}>✓</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '170px' }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description / Item Details</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, i) => (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '14px' }}>☐</td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: '600', verticalAlign: 'top' }}>{row.item}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: '1.7' }}>
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Footer ── */}
        <div style={{ marginTop: '48px', borderTop: '1px solid #ddd', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
          <span>Zimbabwe Shipping — Ireland Branch</span>
          <span>Tracking: {tracking}</span>
          <span>Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>
    );
  }
);
DeliveryNoteTemplate.displayName = 'DeliveryNoteTemplate';

// ── Main component ────────────────────────────────────────────────────────────

// ── Invoice scan parsing (best-effort, from on-device OCR text) ──────────────

// Normalise a loosely-formatted date to yyyy-MM-dd. Returns null if unparseable.
function toIsoDate(raw: string): string | null {
  const s = (raw || '').trim();
  const m = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (!m) return null;
  let [, a, b, c] = m;
  let year: string, month: string, day: string;
  if (a.length === 4) { year = a; month = b; day = c; }   // yyyy-mm-dd
  else { day = a; month = b; year = c; }                   // dd-mm-yyyy (assume day first)
  if (year.length === 2) year = '20' + year;
  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${year}-${mm}-${dd}`;
}

// Pull a labelled block (e.g. "Ship To") and the few lines that follow it.
function extractBlock(lines: string[], keywords: string[]): { name?: string; phone?: string; address?: string } | null {
  const labelRe = new RegExp(`(?:${keywords.join('|')})\\s*:?`, 'i');
  const stopRe = /^(bill\s*to|ship\s*to|deliver\s*to|sold\s*to|sender|shipper|recipient|consignee|from|to|invoice|date|total|amount|qty|quantity|description|item|sub\s*total|tax)\b/i;
  const idx = lines.findIndex(l => labelRe.test(l));
  if (idx === -1) return null;

  const block: string[] = [];
  const sameLine = lines[idx].replace(new RegExp(`^.*?(?:${keywords.join('|')})\\s*:?`, 'i'), '').trim();
  if (sameLine) block.push(sameLine);
  for (let i = idx + 1; i < Math.min(lines.length, idx + 6); i++) {
    if (stopRe.test(lines[i])) break;
    block.push(lines[i]);
  }
  if (block.length === 0) return null;

  const phoneIdx = block.findIndex(l => /(\+?\d[\d\s().\-]{7,}\d)/.test(l));
  const phone = phoneIdx >= 0 ? (block[phoneIdx].match(/(\+?\d[\d\s().\-]{7,}\d)/)?.[1].trim()) : undefined;
  const name = block[0];
  const addressLines = block.slice(1).filter((_, i) => i + 1 !== phoneIdx);
  return { name, phone, address: addressLines.join('\n') || undefined };
}

// Returns only the fields we could confidently detect from the scanned text.
function parseInvoiceText(text: string): Partial<EditDraft> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  const out: Partial<EditDraft> = {};

  const refM = joined.match(/\b(?:invoice|inv|ref(?:erence)?|order)\s*(?:no\.?|number|#)?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i);
  if (refM) out.refNumber = refM[1].toUpperCase();

  const labelledDate = joined.match(/\b(?:date|issued|invoice date)\b\s*[:#\-]?\s*([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4})/i);
  const anyDate = joined.match(/\b([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4})\b/);
  const iso = toIsoDate(labelledDate?.[1] || anyDate?.[1] || '');
  if (iso) out.date = iso;

  const recipient = extractBlock(lines, ['ship to', 'deliver to', 'consignee', 'recipient']);
  if (recipient) {
    if (recipient.name) out.recipientName = recipient.name;
    if (recipient.phone) out.recipientPhone = recipient.phone;
    if (recipient.address) out.recipientAddress = recipient.address;
  }
  const sender = extractBlock(lines, ['bill to', 'sold to', 'shipper', 'sender', 'from']);
  if (sender) {
    if (sender.name) out.senderName = sender.name;
    if (sender.phone) out.senderPhone = sender.phone;
    if (sender.address) out.senderAddress = sender.address;
  }

  // Fall back to global phone detection if a block didn't yield one.
  const phones = [...new Set(Array.from(joined.matchAll(/(\+?\d[\d\s().\-]{7,}\d)/g)).map(m => m[1].replace(/\s{2,}/g, ' ').trim()))];
  if (!out.senderPhone && phones[0]) out.senderPhone = phones[0];
  if (!out.recipientPhone && phones[1]) out.recipientPhone = phones[1];

  return out;
}

interface EditDraft {
  refNumber: string;
  date: string;
  deliveryDate: string;
  itemNames: string[];
  itemDescriptions: string[];
  doorToDoor: boolean;
  sealed: boolean;
  sealCodes: string;
  senderName: string;
  senderPhone: string;
  senderPhone2: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2: string;
  recipientAddress: string;
  deliveryAddresses: Array<{ name: string; phone: string; address: string; city: string }>;
  itemsSummary: string;
  tracking: string;
}

const DeliveryNoteGenerator: React.FC<DeliveryNoteGeneratorProps> = ({ isOpen, onClose, shipment, onSaved }) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanText, setScanText] = useState('');
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const { toast } = useToast();

  // Read an invoice photo on-device (Tesseract OCR) and pre-fill what we can.
  const handleScanFile = async (file: File | undefined) => {
    if (!file || !draft) return;
    setIsScanning(true);
    setScanText('');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(file, 'eng');
      const text = (data.text || '').trim();
      setScanText(text);
      const parsed = parseInvoiceText(text);
      const count = Object.keys(parsed).length;
      setDraft(prev => (prev ? { ...prev, ...parsed } : prev));
      toast({
        title: count ? 'Scan complete' : 'Scan finished',
        description: count
          ? `Pre-filled ${count} field(s) — please review before saving.`
          : 'No fields detected automatically — use the scanned text below.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read the image.';
      toast({ title: 'Scan failed', description: msg, variant: 'destructive' });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  // Build the editable draft from saved overrides + auto-generated defaults.
  const startEditing = () => {
    const ov = getOverrides(shipment);
    const items = buildLineItems(shipment);
    const senderCountry = (shipment.metadata?.sender?.country || shipment.metadata?.senderDetails?.country) as string | undefined;
    setDraft({
      refNumber: buildRefNumber(shipment),
      date: ov.date || format(new Date(shipment.created_at), 'yyyy-MM-dd'),
      deliveryDate: ov.deliveryDate || '',
      itemNames: items.map((row, i) => ov.itemNames?.[i] ?? row.item),
      itemDescriptions: items.map((row, i) => ov.itemDescriptions?.[i] ?? row.description),
      doorToDoor: ov.doorToDoor ?? getDoorToDoor(shipment),
      sealed: ov.sealed ?? getSealInfo(shipment).sealed,
      sealCodes: ov.sealCodes ?? getSealInfo(shipment).codes.join(', '),
      senderName: ov.senderName ?? getSenderName(shipment),
      senderPhone: ov.senderPhone ?? withDialCode(getSenderPhone(shipment), senderCountry),
      senderPhone2: ov.senderPhone2 ?? withDialCode(getSenderPhone2(shipment), senderCountry),
      senderAddress: ov.senderAddress ?? getSenderAddress(shipment).join('\n'),
      recipientName: ov.recipientName ?? getRecipientName(shipment),
      recipientPhone: ov.recipientPhone ?? withDialCode(getRecipientPhone(shipment), 'Zimbabwe'),
      recipientPhone2: ov.recipientPhone2 ?? withDialCode(getRecipientPhone2(shipment), 'Zimbabwe'),
      recipientAddress: ov.recipientAddress ?? getRecipientAddress(shipment).join('\n'),
      deliveryAddresses: ov.deliveryAddresses ?? getDeliveryAddresses(shipment),
      itemsSummary: ov.itemsSummary ?? buildItemsSummary(shipment),
      tracking: ov.tracking ?? shipment.tracking_number,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft(null);
  };

  // Live preview while editing: feed the draft to the template as overrides.
  const previewOverrides: DeliveryNoteOverrides | undefined = isEditing && draft
    ? {
        refNumber: draft.refNumber.trim() || undefined,
        date: draft.date || undefined,
        deliveryDate: draft.deliveryDate.trim() || undefined,
        itemNames: draft.itemNames.reduce<Record<string, string>>((acc, d, i) => {
          acc[i] = d;
          return acc;
        }, {}),
        itemDescriptions: draft.itemDescriptions.reduce<Record<string, string>>((acc, d, i) => {
          acc[i] = d;
          return acc;
        }, {}),
        doorToDoor: draft.doorToDoor,
        sealed: draft.sealed,
        sealCodes: draft.sealCodes,
        senderName: draft.senderName,
        senderPhone: draft.senderPhone,
        senderPhone2: draft.senderPhone2,
        senderAddress: draft.senderAddress,
        recipientName: draft.recipientName,
        recipientPhone: draft.recipientPhone,
        recipientPhone2: draft.recipientPhone2,
        recipientAddress: draft.recipientAddress,
        deliveryAddresses: draft.deliveryAddresses,
        itemsSummary: draft.itemsSummary,
        tracking: draft.tracking,
      }
    : undefined;

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);

    const itemDescriptions = draft.itemDescriptions.reduce<Record<string, string>>((acc, d, i) => {
      acc[String(i)] = d;
      return acc;
    }, {});
    const itemNames = draft.itemNames.reduce<Record<string, string>>((acc, d, i) => {
      acc[String(i)] = d;
      return acc;
    }, {});

    const overrides: DeliveryNoteOverrides = {
      refNumber: draft.refNumber.trim() || undefined,
      date: draft.date || undefined,
      deliveryDate: draft.deliveryDate.trim() || undefined,
      itemNames,
      itemDescriptions,
      doorToDoor: draft.doorToDoor,
      sealed: draft.sealed,
      sealCodes: draft.sealCodes.trim(),
      senderName: draft.senderName,
      senderPhone: draft.senderPhone,
      senderPhone2: draft.senderPhone2,
      senderAddress: draft.senderAddress,
      recipientName: draft.recipientName,
      recipientPhone: draft.recipientPhone,
      recipientPhone2: draft.recipientPhone2,
      recipientAddress: draft.recipientAddress,
      deliveryAddresses: draft.deliveryAddresses,
      itemsSummary: draft.itemsSummary,
      tracking: draft.tracking,
    };

    const newMetadata = { ...(shipment.metadata || {}), deliveryNoteOverrides: overrides };

    const { error } = await supabase
      .from('shipments')
      .update({ metadata: newMetadata })
      .eq('id', shipment.id);

    setIsSaving(false);

    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }

    onSaved?.({ ...shipment, metadata: newMetadata });
    toast({ title: 'Saved', description: 'Delivery note updated.' });
    setIsEditing(false);
    setDraft(null);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!noteRef.current) throw new Error('Element not found');

      const canvas = await html2canvas(noteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${buildRefNumber(shipment)}.pdf`);

      toast({ title: 'Downloaded', description: `${buildRefNumber(shipment)}.pdf saved.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!noteRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${buildRefNumber(shipment)}</title>
      <style>body{margin:0;padding:0;}@media print{body{margin:0;}}</style>
      </head><body>${noteRef.current.outerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Note — Ref {buildRefNumber(shipment)}</DialogTitle>
          <DialogDescription>
            Office copy for {shipment.tracking_number}. Not for customer distribution.
          </DialogDescription>
        </DialogHeader>

        {/* Edit form */}
        {isEditing && draft && (
          <div className="border rounded-lg p-4 bg-muted/40 space-y-4">
            {/* Scan-to-fill */}
            <div className="rounded-md border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium flex items-center gap-1.5"><ScanLine className="h-4 w-4" /> Scan an invoice to auto-fill</div>
                  <div className="text-xs text-muted-foreground">Photograph or upload the external invoice. Detected fields pre-fill below for review — nothing is saved until you click Save.</div>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={isScanning} onClick={() => scanInputRef.current?.click()}>
                  {isScanning
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading…</>
                    : <><ScanLine className="h-4 w-4 mr-2" />Scan invoice</>}
                </Button>
                <input
                  ref={scanInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleScanFile(e.target.files?.[0])}
                />
              </div>
              {scanText && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">View scanned text (copy anything not auto-filled)</summary>
                  <Textarea readOnly rows={6} value={scanText} className="mt-2 font-mono text-xs" />
                </details>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ref #</label>
                <Input
                  value={draft.refNumber}
                  onChange={(e) => setDraft({ ...draft, refNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Delivery Date (optional)</label>
                {draft.deliveryDate ? (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={draft.deliveryDate}
                      onChange={(e) => setDraft({ ...draft, deliveryDate: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDraft({ ...draft, deliveryDate: '' })}
                      title="Remove delivery date"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setDraft({ ...draft, deliveryDate: format(new Date(), 'yyyy-MM-dd') })}
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" /> Add delivery date
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shipper */}
              <div className="space-y-2 rounded-md border p-3 bg-background">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipper</div>
                <Input placeholder="Name" value={draft.senderName} onChange={(e) => setDraft({ ...draft, senderName: e.target.value })} />
                <Input placeholder="Phone" value={draft.senderPhone} onChange={(e) => setDraft({ ...draft, senderPhone: e.target.value })} />
                <Input placeholder="Phone 2 (optional)" value={draft.senderPhone2} onChange={(e) => setDraft({ ...draft, senderPhone2: e.target.value })} />
                <Textarea rows={3} placeholder="Address (one line per row)" value={draft.senderAddress} onChange={(e) => setDraft({ ...draft, senderAddress: e.target.value })} />
              </div>
              {/* Recipient */}
              <div className="space-y-2 rounded-md border p-3 bg-background">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient</div>
                <Input placeholder="Name" value={draft.recipientName} onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })} />
                <Input placeholder="Phone" value={draft.recipientPhone} onChange={(e) => setDraft({ ...draft, recipientPhone: e.target.value })} />
                <Input placeholder="Phone 2 (optional)" value={draft.recipientPhone2} onChange={(e) => setDraft({ ...draft, recipientPhone2: e.target.value })} />
                <Textarea rows={3} placeholder="Address (one line per row)" value={draft.recipientAddress} onChange={(e) => setDraft({ ...draft, recipientAddress: e.target.value })} />
              </div>
            </div>

            {/* Additional Delivery Addresses */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Additional Delivery Addresses</label>
              {draft.deliveryAddresses.map((addr, i) => (
                <div key={i} className="rounded-md border-2 border-dashed p-3 bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600">Address #{i + 2}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setDraft({ ...draft, deliveryAddresses: draft.deliveryAddresses.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Recipient name"
                    value={addr.name}
                    onChange={(e) => {
                      const next = [...draft.deliveryAddresses];
                      next[i] = { ...next[i], name: e.target.value };
                      setDraft({ ...draft, deliveryAddresses: next });
                    }}
                  />
                  <Input
                    placeholder="Phone"
                    value={addr.phone}
                    onChange={(e) => {
                      const next = [...draft.deliveryAddresses];
                      next[i] = { ...next[i], phone: e.target.value };
                      setDraft({ ...draft, deliveryAddresses: next });
                    }}
                  />
                  <Input
                    placeholder="Street address"
                    value={addr.address}
                    onChange={(e) => {
                      const next = [...draft.deliveryAddresses];
                      next[i] = { ...next[i], address: e.target.value };
                      setDraft({ ...draft, deliveryAddresses: next });
                    }}
                  />
                  <Input
                    placeholder="City"
                    value={addr.city}
                    onChange={(e) => {
                      const next = [...draft.deliveryAddresses];
                      next[i] = { ...next[i], city: e.target.value };
                      setDraft({ ...draft, deliveryAddresses: next });
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDraft({ ...draft, deliveryAddresses: [...draft.deliveryAddresses, { name: '', phone: '', address: '', city: '' }] })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add another delivery address
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tracking #</label>
              <Input value={draft.tracking} onChange={(e) => setDraft({ ...draft, tracking: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Delivery method</label>
              <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 bg-background">
                <input
                  type="checkbox"
                  checked={draft.doorToDoor}
                  onChange={(e) => setDraft({ ...draft, doorToDoor: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  Door-to-Door Delivery
                  <span className="text-muted-foreground"> — {draft.doorToDoor ? 'deliver to recipient address' : 'depot collection (off)'}</span>
                </span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Metal coded seal</label>
              <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 bg-background">
                <input
                  type="checkbox"
                  checked={draft.sealed}
                  onChange={(e) => setDraft({ ...draft, sealed: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">Shipment has a metal coded seal</span>
              </label>
              {draft.sealed && (
                <Input
                  placeholder="Seal code(s) — comma separated, e.g. ABC123, DEF456"
                  value={draft.sealCodes}
                  onChange={(e) => setDraft({ ...draft, sealCodes: e.target.value })}
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Items summary line</label>
              <Input value={draft.itemsSummary} onChange={(e) => setDraft({ ...draft, itemsSummary: e.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Items (name & description)</label>
              {draft.itemDescriptions.map((desc, i) => (
                <div key={i} className="space-y-1 rounded-md border p-2 bg-background">
                  <Input
                    placeholder={`Item ${i + 1} name`}
                    value={draft.itemNames[i] ?? ''}
                    onChange={(e) => {
                      const next = [...draft.itemNames];
                      next[i] = e.target.value;
                      setDraft({ ...draft, itemNames: next });
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Description / item details"
                    value={desc}
                    onChange={(e) => {
                      const next = [...draft.itemDescriptions];
                      next[i] = e.target.value;
                      setDraft({ ...draft, itemDescriptions: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="border rounded-lg overflow-auto bg-white">
          <DeliveryNoteTemplate ref={noteRef} shipment={shipment} overrides={previewOverrides} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                {isSaving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4 mr-2" />Save</>
                }
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button variant="outline" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button onClick={handleDownload} disabled={isGenerating} className="bg-green-600 hover:bg-green-700">
                {isGenerating
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                  : <><Download className="h-4 w-4 mr-2" />Download PDF</>
                }
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryNoteGenerator;
export { buildRefNumber, DeliveryNoteTemplate };
