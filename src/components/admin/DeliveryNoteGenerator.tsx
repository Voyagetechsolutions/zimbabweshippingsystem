import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, Printer, Pencil, Save, X, CalendarPlus, Plus, Trash2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shipment } from '@/types/shipment';
import InvoiceNoteWizard from '@/components/admin/deliveryNote/InvoiceNoteWizard';

interface DeliveryNoteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  // Called after edits are persisted, so the parent list can refresh in place.
  onSaved?: (updated: Shipment) => void;
}

// One printed row: a short UPPERCASE label, the detail, the physical count and
// the unit. Legacy saved notes have no qty/uom, so both are optional.
export interface NoteItem {
  item: string;
  description: string;
  qty?: string;
  uom?: string;
}

// Manual edits to the auto-generated note, stored on the shipment's metadata.
// Any field left undefined falls back to the auto-generated value.
interface DeliveryNoteOverrides {
  refNumber?: string;
  date?: string;          // header "Date" (yyyy-MM-dd)
  deliveryDate?: string;  // optional separate delivery date (yyyy-MM-dd)
  itemDescriptions?: Record<string, string>; // line-item index → description (legacy)
  itemNames?: Record<string, string>;        // line-item index → item label (legacy)
  items?: NoteItem[];     // full item list (supports add/remove); seals and the
                          // delivery row are rows here, not separate flags
  paid?: boolean;         // red PAID stamp — only when the invoice is stamped and settled
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

// The destination city the goods are going to, for the closing delivery row.
function getDestinationCity(s: Shipment): string {
  const m = s.metadata || {};
  const src = m.recipient || m.recipientDetails || {};
  return (src.city || '').trim() || (s.destination || '').trim() || 'Zimbabwe';
}

// Free-text booking lines ("3x boxes of clothes") carry their own count, which is
// the physical count the driver has to load — not the invoice's billed quantity.
const ITEM_LABELS: Array<[RegExp, string, string]> = [
  [/\bbarrel/i, 'DRUMS', 'drum'],
  [/\bdrum/i, 'DRUMS', 'drum'],
  [/\bsuitcase|\bcase\b/i, 'SUITCASE', 'suitcase'],
  [/\btrunk/i, 'TRUNK', 'trunk'],
  [/\bbox|\bcarton/i, 'BOXES', 'box'],
  [/\bbag|\bsack/i, 'BAG', 'bag'],
  [/\btub\b/i, 'TUB', 'tub'],
  [/\bsofa|\bcouch|\blounge/i, 'SOFA', 'set'],
  [/\bchair/i, 'CHAIRS', 'chair'],
  [/\bmirror/i, 'MIRROR', 'item'],
  [/\bbed\b|\bmattress/i, 'BED', 'item'],
  [/\bfridge|\bfreezer/i, 'FRIDGE', 'item'],
  [/\bstove|\bcooker/i, 'STOVE', 'item'],
  [/\bwashing machine|\bwasher/i, 'WASHING MACHINE', 'item'],
  [/\btv\b|\btelevision/i, 'TV', 'item'],
];

function classifyFreeText(text: string): { item: string; uom: string; qty: string; description: string } {
  const leading = text.match(/^\s*(\d{1,3})\s*(?:x|×|\*)?\s+/i);
  const qty = leading ? leading[1] : '1';
  const rest = leading ? text.slice(leading[0].length).trim() : text.trim();
  const match = ITEM_LABELS.find(([re]) => re.test(rest));
  return {
    item: match ? match[1] : 'GOODS',
    uom: match ? match[2] : 'item',
    qty,
    description: rest || 'General goods',
  };
}

// Builds the printed rows: one row per kind of physical item, a single
// consolidated SEALS row, and the delivery (or self-collection) row last.
// Descriptions come from the customer's booking ("blue plastic drum with red
// lid") so the driver can identify each item without guessing.
function buildLineItems(s: Shipment): NoteItem[] {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  const itemsMeta = m.items || {};
  const rows: NoteItem[] = [];

  const drumsDescription = ship.drumsDescription || itemsMeta.drums?.description || null;
  const trunksDescription = ship.trunksDescription || itemsMeta.trunks?.description || null;

  const drumQty = Number(
    ship.drums ?? ship.drumQuantity ?? (ship.includeDrums ? ship.quantity : 0) ?? 0,
  );
  // Drums we supplied at collection are the same physical drums being carried —
  // counted once, noted in the description rather than billed as a second row.
  const purchased = itemsMeta.purchasedDrums;
  const suppliedQty = Number(purchased?.quantity ?? 0);
  const suppliedLabel = purchased?.type === 'metal' ? 'metal drum' : 'plastic barrel';
  const totalDrums = drumQty > 0 ? drumQty : suppliedQty;
  if (totalDrums > 0) {
    const notes = [drumsDescription || '200–220L drum'];
    if (suppliedQty > 0) notes.push(`${suppliedQty} × ${suppliedLabel} supplied at collection`);
    rows.push({
      item: 'DRUMS',
      description: notes.join('. '),
      qty: String(totalDrums),
      uom: 'drum',
    });
  }

  const trunkQty = Number(ship.boxes ?? ship.trunkQuantity ?? 0);
  if (trunkQty > 0) {
    rows.push({
      item: trunkQty > 1 ? 'BOXES' : 'BOX',
      description: trunksDescription || 'Storage box / trunk',
      qty: String(trunkQty),
      uom: 'box',
    });
  }

  // Custom-quote items (free text from booking) — split into one row per item so
  // the courier can tick each off. We split on newlines, semicolons and " + " to
  // respect natural list formatting; commas are left alone (they appear in
  // sentences like "1 box of clothes, books and shoes").
  const otherDesc =
    ship.boxesDescription || ship.category || ship.description ||
    ship.otherItemDescription || itemsMeta.boxes?.description || null;
  if (ship.includeOtherItems || ship.includeBoxes || otherDesc) {
    (otherDesc || 'General goods')
      .split(/\n+|;|\s\+\s/g)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((piece) => rows.push(classifyFreeText(piece)));
  }

  if (rows.length === 0) {
    rows.push({
      item: 'GOODS',
      description: m.shipmentType || 'General shipment',
      qty: '1',
      uom: 'item',
    });
  }

  // Exactly one seals row, carrying every code.
  const seal = getSealInfo(s);
  if (seal.sealed || seal.codes.length > 0) {
    const count = seal.codes.length || seal.quantity;
    rows.push({
      item: 'SEALS',
      description: seal.codes.length
        ? seal.codes.join(', ')
        : 'Codes to be recorded on sealing',
      qty: count > 0 ? String(count) : '',
      uom: 'seal',
    });
  }

  // Every note closes with a delivery or self-collection row.
  const city = getDestinationCity(s);
  rows.push(
    getDoorToDoor(s)
      ? { item: 'DELIVERY', description: `Door to door delivery, ${city}`, qty: '', uom: 'trip' }
      : { item: 'COLLECTION', description: `Self collection, ${city}`, qty: '', uom: '-' },
  );

  return rows;
}

// Ref # = first 3 letters of sender name + last 4 digits of their phone.
// Example: John Smith / +353 87 123 4567 → JOH-4567
function buildRefNumber(s: Shipment) {
  const override = getOverrides(s).refNumber;
  if (override && override.trim()) return override.trim();
  if (s.customer_reference) return s.customer_reference;
  if (s.metadata?.customerReference) return s.metadata.customerReference;
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
    const [qrDataUrl, setQrDataUrl] = useState('');
    useEffect(() => {
      const token = shipment.qr_token || shipment.metadata?.qrToken;
      if (!token) return setQrDataUrl('');
      QRCode.toDataURL(token, { width: 180, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }, [shipment.qr_token, shipment.metadata?.qrToken]);
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
    const lineItems: NoteItem[] = (overrides.items && overrides.items.length)
      ? overrides.items
      : buildLineItems(shipment).map((row, i) => ({
          ...row,
          item: overrides.itemNames?.[i] ?? row.item,
          description: overrides.itemDescriptions?.[i] ?? row.description,
        }));
    const deliveryAddresses = overrides.deliveryAddresses ?? getDeliveryAddresses(shipment);
    const tracking = overrides.tracking ?? shipment.tracking_number;
    const paid = overrides.paid === true;

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
              <div>Delivery Note #: <strong style={{ fontSize: '16px', color: '#111' }}>{refNumber}</strong></div>
              <div>Date: <strong>{docDate}</strong></div>
              {deliveryDate && <div>Delivery Date: <strong>{deliveryDate}</strong></div>}
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt={`Collection QR ${refNumber}`} style={{ width: '104px', height: '104px', marginTop: '8px', marginLeft: 'auto' }} />}
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

        {/* ── Items — no prices anywhere on a delivery note ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '160px' }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: '56px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '72px' }}>UOM</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, i) => (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: '600', verticalAlign: 'top' }}>{row.item}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: '1.7' }}>
                  {row.description}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'top' }}>{row.qty || ''}</td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{row.uom || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Footer — the PAID stamp only when the invoice itself is stamped ── */}
        <div style={{ marginTop: '40px', display: 'flex', alignItems: 'flex-end', minHeight: '64px' }}>
          {paid && (
            <div style={{
              transform: 'rotate(-12deg)',
              border: '3px solid #dc2626',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '26px',
              fontWeight: 'bold',
              letterSpacing: '3px',
              padding: '4px 18px',
            }}>
              PAID
            </div>
          )}
        </div>
        <div style={{ marginTop: '16px', borderTop: '1px solid #ddd', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
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

interface EditDraft {
  refNumber: string;
  date: string;
  deliveryDate: string;
  items: NoteItem[];
  paid: boolean;
  senderName: string;
  senderPhone: string;
  senderPhone2: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2: string;
  recipientAddress: string;
  deliveryAddresses: Array<{ name: string; phone: string; address: string; city: string }>;
  tracking: string;
}

const DeliveryNoteGenerator: React.FC<DeliveryNoteGeneratorProps> = ({ isOpen, onClose, shipment, onSaved }) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInvoiceWizard, setShowInvoiceWizard] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const { toast } = useToast();

  // Build the editable draft from saved overrides + auto-generated defaults.
  const startEditing = () => {
    const ov = getOverrides(shipment);
    const baseItems = buildLineItems(shipment).map((row, i) => ({
      ...row,
      item: ov.itemNames?.[i] ?? row.item,
      description: ov.itemDescriptions?.[i] ?? row.description,
    }));
    const senderCountry = (shipment.metadata?.sender?.country || shipment.metadata?.senderDetails?.country) as string | undefined;
    setDraft({
      refNumber: buildRefNumber(shipment),
      date: ov.date || format(new Date(shipment.created_at), 'yyyy-MM-dd'),
      deliveryDate: ov.deliveryDate || '',
      items: (ov.items && ov.items.length) ? ov.items.map(it => ({ ...it })) : baseItems,
      paid: ov.paid === true,
      senderName: ov.senderName ?? getSenderName(shipment),
      senderPhone: ov.senderPhone ?? withDialCode(getSenderPhone(shipment), senderCountry),
      senderPhone2: ov.senderPhone2 ?? withDialCode(getSenderPhone2(shipment), senderCountry),
      senderAddress: ov.senderAddress ?? getSenderAddress(shipment).join('\n'),
      recipientName: ov.recipientName ?? getRecipientName(shipment),
      recipientPhone: ov.recipientPhone ?? withDialCode(getRecipientPhone(shipment), 'Zimbabwe'),
      recipientPhone2: ov.recipientPhone2 ?? withDialCode(getRecipientPhone2(shipment), 'Zimbabwe'),
      recipientAddress: ov.recipientAddress ?? getRecipientAddress(shipment).join('\n'),
      deliveryAddresses: ov.deliveryAddresses ?? getDeliveryAddresses(shipment),
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
        items: draft.items,
        paid: draft.paid,
        senderName: draft.senderName,
        senderPhone: draft.senderPhone,
        senderPhone2: draft.senderPhone2,
        senderAddress: draft.senderAddress,
        recipientName: draft.recipientName,
        recipientPhone: draft.recipientPhone,
        recipientPhone2: draft.recipientPhone2,
        recipientAddress: draft.recipientAddress,
        deliveryAddresses: draft.deliveryAddresses,
        tracking: draft.tracking,
      }
    : undefined;

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);

    const overrides: DeliveryNoteOverrides = {
      refNumber: draft.refNumber.trim() || undefined,
      date: draft.date || undefined,
      deliveryDate: draft.deliveryDate.trim() || undefined,
      items: draft.items,
      paid: draft.paid,
      senderName: draft.senderName,
      senderPhone: draft.senderPhone,
      senderPhone2: draft.senderPhone2,
      senderAddress: draft.senderAddress,
      recipientName: draft.recipientName,
      recipientPhone: draft.recipientPhone,
      recipientPhone2: draft.recipientPhone2,
      recipientAddress: draft.recipientAddress,
      deliveryAddresses: draft.deliveryAddresses,
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
              <label className="text-xs font-medium text-muted-foreground">Paid stamp</label>
              <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 bg-background">
                <input
                  type="checkbox"
                  checked={draft.paid}
                  onChange={(e) => setDraft({ ...draft, paid: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  Invoice is stamped Paid
                  <span className="text-muted-foreground"> — only when the invoice shows the red stamp and a zero balance</span>
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Items — the last row is the delivery (or self-collection) row
              </label>
              {draft.items.map((it, i) => (
                <div key={i} className="space-y-1 rounded-md border p-2 bg-background">
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder={`Item ${i + 1} (e.g. DRUMS)`}
                      value={it.item}
                      onChange={(e) => {
                        const next = draft.items.map((x, j) => j === i ? { ...x, item: e.target.value } : x);
                        setDraft({ ...draft, items: next });
                      }}
                    />
                    <Input
                      className="w-20"
                      placeholder="Qty"
                      value={it.qty ?? ''}
                      onChange={(e) => {
                        const next = draft.items.map((x, j) => j === i ? { ...x, qty: e.target.value } : x);
                        setDraft({ ...draft, items: next });
                      }}
                    />
                    <Input
                      className="w-24"
                      placeholder="UOM"
                      value={it.uom ?? ''}
                      onChange={(e) => {
                        const next = draft.items.map((x, j) => j === i ? { ...x, uom: e.target.value } : x);
                        setDraft({ ...draft, items: next });
                      }}
                    />
                    {draft.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Description / item details"
                    value={it.description}
                    onChange={(e) => {
                      const next = draft.items.map((x, j) => j === i ? { ...x, description: e.target.value } : x);
                      setDraft({ ...draft, items: next });
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft({ ...draft, items: [...draft.items, { item: '', description: '', qty: '1', uom: 'item' }] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
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
              <Button variant="outline" onClick={() => setShowInvoiceWizard(true)}>
                <ScanLine className="h-4 w-4 mr-2" /> Note from invoice
              </Button>
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

      {/* A note raised from a source invoice goes through the reviewed
          pipeline and lands in the register, linked back to this booking.
          The booking's own recipient beats whatever the invoice says. */}
      <InvoiceNoteWizard
        isOpen={showInvoiceWizard}
        onClose={() => setShowInvoiceWizard(false)}
        shipmentId={shipment.id}
        initialRecipient={{
          name: getRecipientName(shipment),
          phone: withDialCode(getRecipientPhone(shipment), 'Zimbabwe'),
          address: getRecipientAddress(shipment).join('\n'),
          city: getDestinationCity(shipment),
        }}
      />
    </Dialog>
  );
};

export default DeliveryNoteGenerator;
export { buildRefNumber, DeliveryNoteTemplate };
