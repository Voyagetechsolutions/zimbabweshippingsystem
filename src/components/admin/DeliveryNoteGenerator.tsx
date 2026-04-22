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

function getSenderAddress(s: Shipment) {
  const m = s.metadata || {};
  const parts: string[] = [];
  const src = m.sender || m.senderDetails || {};
  if (src.address) parts.push(src.address);
  if (src.city) parts.push(src.city);
  if (src.postcode || src.postalCode) parts.push(src.postcode || src.postalCode);
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

function buildLineItems(s: Shipment) {
  const m = s.metadata || {};
  const ship = m.shipment || m.shipmentDetails || {};
  const items: { item: string; description: string; qty: number; uom: string }[] = [];

  // WhatsApp bot bookings
  if (ship.drums && ship.drums > 0) {
    const sealText = ship.metalSeal
      ? ` Seals included.`
      : '';
    items.push({
      item: 'DRUMS',
      description: `Metal Drums (200-220L).${sealText}`,
      qty: ship.drums,
      uom: 'Pcs',
    });
  }
  if (ship.boxes && ship.boxes > 0) {
    items.push({
      item: 'TRUNKS/BOXES',
      description: 'Storage Boxes / Trunks.',
      qty: ship.boxes,
      uom: 'Pcs',
    });
  }

  // Website bookings (legacy structure)
  if (items.length === 0 && ship.includeDrums) {
    const qty = Number(ship.quantity) || 1;
    const sealText = ship.wantMetalSeal ? ' Metal seals included.' : '';
    items.push({
      item: 'DRUMS',
      description: `Metal Drums (200-220L).${sealText}`,
      qty,
      uom: 'Pcs',
    });
  }
  if (ship.includeOtherItems || ship.includeBoxes) {
    items.push({
      item: 'BOXES/ITEMS',
      description: ship.category || ship.description || 'General goods.',
      qty: 1,
      uom: 'Lot',
    });
  }

  // Fallback
  if (items.length === 0) {
    items.push({
      item: 'SHIPMENT',
      description: m.shipmentType || 'General shipment.',
      qty: 1,
      uom: 'Lot',
    });
  }

  return items;
}

function buildDNNumber(s: Shipment) {
  // DN-YYYYMMDD + last 4 of tracking
  const date = format(new Date(s.created_at), 'yyyyMMdd');
  const suffix = s.tracking_number?.replace('ZS-', '').slice(-4) || '0000';
  return `DN-${date}${suffix}`;
}

// ── Delivery Note print template ─────────────────────────────────────────────

const DeliveryNoteTemplate = React.forwardRef<HTMLDivElement, { shipment: Shipment }>(
  ({ shipment }, ref) => {
    const dnNumber = buildDNNumber(shipment);
    const deliveryDate = format(new Date(shipment.created_at), 'yyyy-MM-dd');
    const senderName = getSenderName(shipment);
    const senderAddress = getSenderAddress(shipment);
    const recipientName = getRecipientName(shipment);
    const recipientAddress = getRecipientAddress(shipment);
    const lineItems = buildLineItems(shipment);

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
            src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png"
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
              <div>Delivery Note #: <strong>{dnNumber}</strong></div>
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
              {recipientAddress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Items Table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '140px' }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>UOM</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, i) => (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ padding: '10px 12px' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>{row.item}</td>
                <td style={{ padding: '10px 12px' }}>{row.description}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{row.qty}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{row.uom}</td>
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
      pdf.save(`${buildDNNumber(shipment)}.pdf`);

      toast({ title: 'Downloaded', description: `${buildDNNumber(shipment)}.pdf saved.` });
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
      <html><head><title>${buildDNNumber(shipment)}</title>
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
          <DialogTitle>Delivery Note — {buildDNNumber(shipment)}</DialogTitle>
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
export { buildDNNumber, DeliveryNoteTemplate };
