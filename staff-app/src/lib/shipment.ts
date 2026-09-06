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
  collection_schedule_id?: string | null;
  customer_reference?: string | null;
  driver_status?: string | null;
  assigned_driver_id?: string | null;
  user_id?: string | null;
  goods_description?: string | null;
  driver_description_correction?: string | null;
  seals_requested?: number | null;
}

export const STATUS_OPTIONS:string[]=[];
export const STATUS_STEPS:string[]=[];
export function configureShipmentStatuses(options:string[],steps:string[]){STATUS_OPTIONS.splice(0,STATUS_OPTIONS.length,...options);STATUS_STEPS.splice(0,STATUS_STEPS.length,...steps);}

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

/**
 * Customer Ref: three letters of the sender's name, the month and year of the
 * booking, then the last four digits of their phone — MAR09266988.
 *
 * The same shape the database's own `next_customer_reference` produces, so a
 * shipment that has a stored reference and one that does not read alike on the
 * same screen. Where a shipment *does* carry `customer_reference`, that is the
 * one on its invoice and delivery note and callers should prefer it; this is
 * the answer for everything else.
 */
export function customerRef(s: Shipment): string {
  const name = senderName(s); const phone = senderPhone(s);
  const letters = ((name === 'No Name' ? '' : name).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'CUS')
    .padEnd(3, 'X');
  const created = new Date(s.created_at);
  const at = Number.isNaN(created.getTime()) ? new Date() : created;
  const mmyy = `${String(at.getMonth() + 1).padStart(2, '0')}${String(at.getFullYear()).slice(-2)}`;
  const digits = (phone === 'No Phone' ? '' : phone).replace(/\D/g, '').slice(-4);
  // No phone on the booking falls back to the tracking number's own digits,
  // which keeps the reference unique rather than collapsing every such
  // shipment onto "0000".
  const tail = digits.padStart(4, '0') !== '0000' && digits
    ? digits.padStart(4, '0')
    : ((s.tracking_number || '').replace(/\D/g, '').slice(-4) || '0000').padStart(4, '0');
  return `${letters}${mmyy}${tail}`;
}

export function collectionInfo(s: Shipment) {
  const m = s?.metadata || {};
  const c = m.collection || {};
  // Placeholders are stripped here rather than passed on. Screens resolve the
  // real route and date from the published schedule — see resolveCollection —
  // and a null is what tells them to.
  const real = (value: unknown) => {
    const text = String(value ?? '').trim();
    return !text || /^(to be (confirmed|assigned)|not (set|assigned)|tbc|n\/?a|none|unknown)$/i.test(text) ? null : text;
  };
  return {
    route: real(c.route) || real(m.collectionRoute) || real(m.route),
    date: real(c.date) || real(m.collectionDate) || real(m.date),
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

export type ShippedItem = {
  label: string;
  quantity: number | null;
  /** Free text the customer wrote about this line, when there is any. */
  detail: string | null;
  /** Priced total for the line, already formatted, or null when not priced. */
  amount: string | null;
};

/**
 * Everything the customer says they are shipping, from whichever booking wrote it.
 *
 * Three shapes reach this app and they do not agree. The customer app prices
 * the booking server-side and stores the result as invoice lines. The website
 * writes a structured `items` object (drums / trunks / boxes / add-ons /
 * purchased drums) plus a flatter `shipmentDetails` summary. A manual booking
 * writes only invoice lines.
 *
 * Admin has to confirm the contents on the phone, so all three are read and
 * merged rather than one being picked. Invoice lines win where they exist,
 * because they are what the customer was actually quoted; the structured
 * object then contributes anything the pricing did not name — the descriptions
 * of what is in the drums, the seal codes, the delivery add-ons.
 */
export function shippedItems(s: Shipment): ShippedItem[] {
  const m = s?.metadata || {};
  const symbol = m.pricing?.currency === 'EUR' || m.invoice?.currency === 'EUR' ? '€' : '£';
  const price = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `${symbol}${amount.toFixed(2)}` : null;
  };
  const out: ShippedItem[] = [];
  const seen = new Set<string>();
  const push = (item: ShippedItem) => {
    const key = `${item.label.toLowerCase()}|${item.quantity ?? ''}`;
    if (seen.has(key) || !item.label.trim()) return;
    seen.add(key);
    out.push(item);
  };

  for (const line of (m.invoice?.items || []) as any[]) {
    const quantity = Number(line?.quantity);
    push({
      label: String(line?.item || line?.description || '').trim() || 'Item',
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      detail: line?.item && line?.description && line.item !== line.description ? String(line.description) : null,
      amount: price((Number(line?.unitPrice) || 0) * (Number(line?.quantity) || 0)),
    });
  }

  const items = m.items || {};
  const d = m.shipmentDetails || {};
  if (items.drums || d.includeDrums) {
    push({
      label: 'Drums',
      quantity: Number(items.drums?.quantity ?? d.drumQuantity) || null,
      detail: items.drums?.description || d.drumsDescription || null,
      amount: price(items.drums?.totalPrice),
    });
  }
  if (items.trunks || d.includeTrunks) {
    push({
      label: 'Trunks',
      quantity: Number(items.trunks?.quantity ?? d.trunkQuantity) || null,
      detail: items.trunks?.description || d.trunksDescription || null,
      amount: price(items.trunks?.totalPrice),
    });
  }
  if (items.boxes || d.includeOtherItems || d.includeBoxes) {
    push({
      label: 'Boxes and other items',
      quantity: null,
      detail: items.boxes?.description || d.boxesDescription || null,
      amount: null,
    });
  }
  if (items.purchasedDrums?.quantity) {
    push({
      label: `${String(items.purchasedDrums.type || '').trim() || 'Drums'} purchased from us`.replace(/^./, (c: string) => c.toUpperCase()),
      quantity: Number(items.purchasedDrums.quantity) || null,
      detail: null,
      amount: price(items.purchasedDrums.totalPrice),
    });
  }

  const addOns = items.addOns || {};
  const sealCount = Number(addOns.metalSealQuantity ?? s.seals_requested ?? 0);
  if (addOns.metalSeal || sealCount > 0) {
    const codes = (addOns.metalSealCodes || []) as string[];
    push({
      label: 'Metal coded seals',
      quantity: sealCount || null,
      detail: codes.length ? `Customer's own codes: ${codes.join(', ')}` : addOns.metalSealOption === 'have' ? "Customer's own seals" : 'Supplied by us',
      amount: null,
    });
  }
  if (addOns.doorToDoor) {
    push({
      label: 'Zimbabwe door delivery',
      quantity: Number(addOns.doorToDoorAddressCount) || null,
      detail: null,
      amount: price(addOns.doorToDoorPrice),
    });
  }
  if (addOns.deliveryMethod === 'self_collection' || m.recipient?.selfCollection) {
    push({
      label: 'Self-collection from depot',
      quantity: null,
      detail: m.recipient?.depot?.name ? `${m.recipient.depot.name}, ${m.recipient.depot.city || ''}`.trim().replace(/,$/, '') : 'Depot to be confirmed with the customer',
      amount: null,
    });
  }
  return out;
}

/**
 * Has this shipment actually been picked up?
 *
 * The obvious source — a completed `driver_run_stops` row, which is what the
 * `admin_reports` routine counts — is only written when dispatch built a run
 * and the driver worked it through the app. Live data has thirty shipments
 * sitting in transit and one marked collected, so counting stops would report
 * almost nothing collected while most of the container is already at sea.
 *
 * Status is the field that is actually maintained, so it is the one trusted
 * here: a shipment that has reached transit, a warehouse, customs or delivery
 * was self-evidently collected first. Matched on keywords because the status
 * list is configurable per deployment ("Processing in UK Warehouse", "Zim
 * Warehouse"), and cancelled is excluded outright.
 */
const COLLECTED_KEYWORDS = [
  'collected', 'in transit', 'intransit', 'transit', 'warehouse',
  'customs', 'loading', 'at sea', 'out for delivery', 'delivered',
];

export function hasBeenCollected(s: { status?: string | null; collection_status?: string | null }): boolean {
  if (String(s?.collection_status || '').toLowerCase() === 'collected') return true;
  const status = String(s?.status || '').toLowerCase();
  if (!status || status.includes('cancel')) return false;
  return COLLECTED_KEYWORDS.some((word) => status.includes(word));
}
