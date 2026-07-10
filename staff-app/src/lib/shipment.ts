// Ported 1:1 from the website's ShipmentManagementTab so the mobile app behaves
// identically: same statuses, same customer-ref scheme, same metadata fallbacks.

export interface Shipment {
  id: string;
  tracking_number: string | null;
  status: string;
  origin: string | null;
  destination: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  can_cancel?: boolean;
  can_modify?: boolean;
  deleted_at?: string | null;
  collection_period_id?: string | null;
}

export const STATUS_OPTIONS = [
  'Pending', 'Confirmed', 'Collected', 'In Transit', 'Zim Warehouse', 'Out for Delivery', 'Delivered', 'Cancelled',
];

export const STATUS_STEPS = [
  'Pending', 'Confirmed', 'Collected', 'In Transit', 'Zim Warehouse', 'Out for Delivery', 'Delivered',
];

const STEP_MAP: Record<string, number> = {
  pending: 0, confirmed: 1, collected: 2,
  'in transit': 3, intransit: 3, ontransit: 3,
  'zim warehouse': 4, 'out for delivery': 5, delivered: 6,
};

export function statusProgress(status: string): number {
  const step = STEP_MAP[status?.toLowerCase()] ?? 0;
  return Math.round((step / (STATUS_STEPS.length - 1)) * 100);
}
export function currentStepIndex(status: string): number {
  return STEP_MAP[status?.toLowerCase()] ?? 0;
}

export function statusStyle(status: string): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s.includes('cancelled')) return { bg: '#fee2e2', fg: '#b91c1c' };
  if (s.includes('delivered')) return { bg: '#d1fae5', fg: '#047857' };
  if (s.includes('transit') || s.includes('warehouse') || s.includes('delivery') || s.includes('collected'))
    return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (s.includes('confirmed')) return { bg: '#ecfdf5', fg: '#047857' };
  return { bg: '#f1f5f9', fg: '#475569' };
}

export function senderName(s: Shipment): string {
  const m = s?.metadata; if (!m) return 'No Name';
  if (m.sender?.name) return m.sender.name;
  if (m.sender?.firstName && m.sender.lastName) return `${m.sender.firstName} ${m.sender.lastName}`;
  if (m.senderDetails?.firstName && m.senderDetails.lastName) return `${m.senderDetails.firstName} ${m.senderDetails.lastName}`;
  if (m.senderDetails?.name) return m.senderDetails.name;
  if (m.firstName && m.lastName) return `${m.firstName} ${m.lastName}`;
  if (m.sender_name) return m.sender_name;
  if (m.sender_details?.name) return m.sender_details.name;
  return 'No Name';
}
export function senderEmail(s: Shipment): string {
  const m = s?.metadata || {};
  return m.sender?.email || m.senderDetails?.email || m.email || m.sender_email || 'No Email';
}
export function senderPhone(s: Shipment): string {
  const m = s?.metadata || {};
  return m.sender?.phone || m.senderDetails?.phone || m.phone || m.sender_phone || m.sender_details?.phone ||
    m.sender?.additionalPhone || m.additionalPhone || 'No Phone';
}
export function receiverName(s: Shipment): string {
  const m = s?.metadata || {};
  return m.recipient?.name || m.recipientDetails?.name || m.recipientName || m.receiver_name || m.recipient_details?.name || 'No Name';
}
export function receiverPhone(s: Shipment): string {
  const m = s?.metadata || {};
  return m.recipient?.phone || m.recipientDetails?.phone || m.recipientPhone || m.receiver_phone ||
    m.recipient_details?.phone || m.additionalRecipientPhone || m.recipient?.additionalPhone || 'No Phone';
}
export function pickupAddress(s: Shipment): string {
  const m = s?.metadata || {};
  return m.senderDetails?.address || m.sender?.address || m.pickupAddress || s.origin || 'No Address';
}
export function deliveryAddress(s: Shipment): string {
  const m = s?.metadata || {};
  return m.recipientDetails?.address || m.recipient?.address || m.deliveryAddress || s.destination || 'No Address';
}

// Customer Ref: first 3 letters of sender name + last 4 digits of phone (e.g. JOH-4567).
export function customerRef(s: Shipment): string {
  const name = senderName(s); const phone = senderPhone(s);
  const letters = (name === 'No Name' ? '' : name).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
  const digits = (phone === 'No Phone' ? '' : phone).replace(/\D/g, '').slice(-4);
  if (letters && digits) return `${letters}-${digits}`;
  const tail = (s.tracking_number || '').replace(/[^0-9A-Z]/gi, '').slice(-4) || '0000';
  if (letters) return `${letters}-${tail}`;
  if (digits) return `REF-${digits}`;
  return `REF-${tail}`;
}

export function collectionInfo(s: Shipment) {
  const m = s?.metadata || {};
  const c = m.collection || {};
  return {
    route: c.route || m.collectionRoute || m.route || 'Not assigned',
    date: c.date || m.collectionDate || m.date || 'To be confirmed',
    postalCode: m.senderDetails?.postcode || m.senderDetails?.postalCode || m.sender?.postcode ||
      m.sender?.postalCode || m.pickupPostcode || m.postalCode || m.postcode || '',
    city: m.senderDetails?.city || m.sender?.city || m.pickupCity || m.city || '',
    country: m.senderDetails?.country || m.sender?.country || m.pickupCountry || m.country || 'England',
  };
}

export function paymentAmount(s: Shipment): string {
  const m = s?.metadata || {};
  const amount = m.payment?.amount || m.paymentAmount || m.amount || m.totalAmount || m.total ||
    m.pricing?.total || m.pricing?.finalAmount || m.cost || m.price || m.quotedAmount;
  const symbol = m.pricing?.currency === 'EUR' ? '€' : '£';
  return amount ? `${symbol}${amount}` : 'Amount to be confirmed';
}

export function shipmentType(s: Shipment): string {
  const m = s?.metadata || {};
  const d = m.shipmentDetails || {};
  const types: string[] = [];
  if (d.includeDrums) types.push('Drums');
  if (d.includeTrunks) types.push('Trunks');
  if (d.includeOtherItems || d.includeBoxes) types.push('Boxes/Items');
  if (types.length === 0) return m.shipmentType || 'Standard Shipment';
  return types.join(' + ');
}
