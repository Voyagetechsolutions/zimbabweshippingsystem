import { issuedInvoiceView } from './invoiceTotals';
// Shipment metadata helpers + the customer-facing journey timeline.
export type Shipment = {
  id: string;
  tracking_number: string;
  customer_reference?: string | null;
  status: string;
  origin?: string | null;
  destination?: string | null;
  qr_token?: string | null;
  collection_code?:string|null;
  delivery_code?:string|null;
  driver_status?:string|null;
  created_at: string;
  metadata?: any;
};

export const JOURNEY_STAGES:Array<{key:string;label:string;title:string;description:string;icon:string}>=[];
export function configureJourneyStages(stages:Array<{id:string;label:string;title?:string;description?:string;icon?:string}>){JOURNEY_STAGES.splice(0,JOURNEY_STAGES.length,...stages.map((stage)=>({key:stage.id,label:stage.label,title:stage.title||stage.label,description:stage.description||'',icon:stage.icon||'ellipse-outline'})));}

// Map the operational statuses (set by staff/driver/admin) onto the timeline.
export function journeyIndex(status: string): number {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver') && !s.includes('out for')) return 5;
  if (s.includes('out for delivery')) return 4;
  if (s.includes('arrived') || s.includes('zw warehouse') || s.includes('processing in zw') || s.includes('zim warehouse')) return 3;
  if (s.includes('transit')) return 2;
  if (s.includes('collected')) return 1;
  return 0; // Booking Confirmed / Pending / Ready for Pickup
}

export function senderOf(s: Shipment) {
  return s.metadata?.sender || s.metadata?.senderDetails || {};
}

export function recipientOf(s: Shipment) {
  return s.metadata?.recipient || s.metadata?.recipientDetails || {};
}

export function itemsSummary(s: Shipment): string {
  const meta = s.metadata || {};
  const desc = meta.shipment?.description || meta.shipmentDetails?.description;
  if (desc) return String(desc);
  const drums = Number(meta.shipment?.drums || 0);
  const boxes = Number(meta.shipment?.boxes || 0);
  const parts = [] as string[];
  if (drums) parts.push(`${drums} drum${drums > 1 ? 's' : ''}`);
  if (boxes) parts.push(`${boxes} box${boxes > 1 ? 'es' : ''}`);
  if (meta.shipment?.otherItems) parts.push(String(meta.shipment.otherItems));
  return parts.join(', ') || 'Shipment';
}

/**
 * The shipment's invoice exactly as the office issued it — same total, same
 * paid/partial reading. The arithmetic lives in one place so the app can never
 * quote a customer a figure the admin does not recognise.
 */
export function invoiceOf(s: Shipment) {
  const invoice = s.metadata?.invoice;
  if (!invoice) return null;
  const view = issuedInvoiceView(invoice);
  return {
    currency: view.currency,
    total: view.total,
    paid: view.settled,
    partial: view.partial,
    paidAmount: view.paidAmount,
    balance: view.balance,
  };
}

export function statusTone(status: string): { bg: string; fg: string } {
  const i = journeyIndex(status);
  if (i >= 5) return { bg: '#e8f5ee', fg: '#06622F' };
  if (i >= 2) return { bg: '#eff6ff', fg: '#1d4ed8' };
  return { bg: '#fff8e0', fg: '#8a6d00' };
}
