import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';

interface DeliveryNoteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
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

const DeliveryNoteTemplate = React.forwardRef<HTMLDivElement, { shipment: Shipment }>(
  ({ shipment }, ref) => {
    const refNumber = buildRefNumber(shipment);
    const deliveryDate = format(new Date(shipment.created_at), 'yyyy-MM-dd');
    const senderName = getSenderName(shipment);
    const senderAddress = getSenderAddress(shipment);
    const senderCountry = (shipment.metadata?.sender?.country || shipment.metadata?.senderDetails?.country) as string | undefined;
    const senderPhone = withDialCode(getSenderPhone(shipment), senderCountry);
    const senderPhone2 = withDialCode(getSenderPhone2(shipment), senderCountry);
    const recipientName = getRecipientName(shipment);
    const recipientAddress = getRecipientAddress(shipment);
    const recipientPhone = withDialCode(getRecipientPhone(shipment), 'Zimbabwe');
    const recipientPhone2 = withDialCode(getRecipientPhone2(shipment), 'Zimbabwe');
    const lineItems = buildLineItems(shipment);
    const itemsSummary = buildItemsSummary(shipment);

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
              <div>Delivery Date: <strong>{deliveryDate}</strong></div>
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
              {senderPhone && <div>📞 {senderPhone}</div>}
              {senderPhone2 && <div>📞 {senderPhone2}</div>}
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
              {recipientPhone && <div>📞 {recipientPhone}</div>}
              {recipientPhone2 && <div>📞 {recipientPhone2}</div>}
              {recipientAddress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
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
          <span>Tracking: {shipment.tracking_number}</span>
          <span>Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>
    );
  }
);
DeliveryNoteTemplate.displayName = 'DeliveryNoteTemplate';

// ── Main component ────────────────────────────────────────────────────────────

const DeliveryNoteGenerator: React.FC<DeliveryNoteGeneratorProps> = ({ isOpen, onClose, shipment }) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

        {/* Preview */}
        <div className="border rounded-lg overflow-auto bg-white">
          <DeliveryNoteTemplate ref={noteRef} shipment={shipment} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating} className="bg-green-600 hover:bg-green-700">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : <><Download className="h-4 w-4 mr-2" />Download PDF</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryNoteGenerator;
export { buildRefNumber, DeliveryNoteTemplate };
