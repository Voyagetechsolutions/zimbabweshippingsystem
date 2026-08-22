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

export const JOURNEY_STAGES = [
  { key: 'booked', label: 'Booking confirmed', icon: 'checkmark-circle-outline' },
  { key: 'collected', label: 'Collected', icon: 'cube-outline' },
  { key: 'transit', label: 'On the water', icon: 'boat-outline' },
  { key: 'arrived', label: 'Arrived in Zimbabwe', icon: 'flag-outline' },
  { key: 'delivery', label: 'Out for delivery', icon: 'car-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
] as const;

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

export function invoiceOf(s: Shipment): { currency: string; total: number; paid: boolean } | null {
  const invoice = s.metadata?.invoice;
  if (!invoice) return null;
  const subtotal = Array.isArray(invoice.items)
    ? invoice.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
    : 0;
  const discounted = Math.max(0, subtotal - Number(invoice.discount || 0));
  const total = discounted + discounted * (Number(invoice.taxRate || 0) / 100);
  return { currency: invoice.currency || 'GBP', total, paid: Boolean(invoice.paid) };
}

export function statusTone(status: string): { bg: string; fg: string } {
  const i = journeyIndex(status);
  if (i >= 5) return { bg: '#e8f5ee', fg: '#06622F' };
  if (i >= 2) return { bg: '#eff6ff', fg: '#1d4ed8' };
  return { bg: '#fff8e0', fg: '#8a6d00' };
}
