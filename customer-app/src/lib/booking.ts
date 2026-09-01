import { supabase } from './supabase';
import { Country, currencyFor, priceFor } from './catalogue';
import type { BusinessConfig } from './businessConfig';
import type { CustomerAddress } from './addresses';

// The booking is priced and created server-side (create_customer_booking):
// catalogue prices, configured delivery-address fees, seals and any approved
// custom-quote amount are all validated in the database. The totals shown in
// the UI are computed with the same rules purely for display.

export type QuoteItem = { description: string; amount?: number | null };
export type QuoteCarry = { id: string; amount: number; currency: 'GBP' | 'EUR'; description: string; items?: QuoteItem[] };

export type BookingDraft = {
  country: Country;
  collectionAddress: string;
  collectionCity: string;
  collectionPostcode: string;
  sender: { firstName: string; lastName: string; email: string; phone: string };
  recipient: { name: string; phone: string; address: string; city: string };
  deliveryAddressIds: string[];
  items: Record<string, number>; // catalogue id -> quantity
  otherItems: string;
  goodsDescription: string;
  sealsRequested: number;
  returningResident: boolean;
  referredBy: string;
  scheduleId: string | null;
  route: string | null;
  collectionDate: string | null;
  paymentMethod: string;
  quote: QuoteCarry | null;
};

export const EMPTY_DRAFT: BookingDraft = {
  country: 'United Kingdom',
  collectionAddress: '',
  collectionCity: '',
  collectionPostcode: '',
  sender: { firstName: '', lastName: '', email: '', phone: '' },
  recipient: { name: '', phone: '', address: '', city: '' },
  deliveryAddressIds: [],
  items: {},
  otherItems: '',
  goodsDescription: '',
  sealsRequested: 0,
  returningResident: false,
  referredBy: '',
  scheduleId: null,
  route: null,
  collectionDate: null,
  paymentMethod: 'Bank Transfer',
  quote: null,
};

export function draftLines(draft: BookingDraft, business: BusinessConfig, deliveryMethod: 'door' | 'self_collection' = 'door') {
  const { symbol } = currencyFor(draft.country);
  const lines: Array<{ label: string; qty: number; unit: number | null }> = [];
  for (const item of business.catalogue) {
    if (item.id === 'seal') continue; // seals have their own selector
    const qty = draft.items[item.id] || 0;
    if (qty > 0) lines.push({ label: item.label, qty, unit: priceFor(item, draft.country) });
  }
  if (draft.otherItems.trim()) lines.push({ label: draft.otherItems.trim(), qty: 1, unit: null });
  if (draft.quote) {
    const itemized = (draft.quote.items || []).filter((item) => item.description.trim());
    if (itemized.length) itemized.forEach((item, index) => lines.push({ label: `Quote item ${index + 1}: ${item.description}`, qty: 1, unit: Number(item.amount) || 0 }));
    else lines.push({ label: `Approved quote: ${draft.quote.description.slice(0, 60)}`, qty: 1, unit: draft.quote.amount });
  }
  if (draft.sealsRequested > 0) {
    const seal = business.catalogue.find((c) => c.id === 'seal');
    lines.push({ label: 'Metal coded seal', qty: draft.sealsRequested, unit: seal ? priceFor(seal, draft.country) : null });
  }
  const directReceiver = deliveryMethod === 'door' && draft.deliveryAddressIds.length === 0
    && Boolean(draft.recipient.name.trim() && draft.recipient.address.trim() && draft.recipient.city.trim());
  const addressCount = deliveryMethod === 'door' ? draft.deliveryAddressIds.length + (directReceiver ? 1 : 0) : 0;
  if (addressCount > 0) {
    lines.push({ label: `Zimbabwe door delivery (${addressCount} address${addressCount > 1 ? 'es' : ''})`, qty: addressCount, unit: business.fees.doorDeliveryPerAddress });
  }
  const priced = lines.filter((l) => l.unit != null);
  const hasCustom = lines.some((l) => l.unit == null);
  const estimate = priced.reduce((sum, l) => sum + l.qty * (l.unit as number), 0);
  return { lines, estimate, hasCustom, symbol };
}

// Guidance shown wherever the customer describes their goods.
export const DESCRIPTION_GUIDANCE =
  'Include: what the goods are, materials, brand/model where relevant, condition, sizes or approximate dimensions, colours, identifying marks, the contents of any boxes, drums or trunks, and anything fragile, restricted or high-value.';

export async function createBooking(draft: BookingDraft, userId: string | null, business: BusinessConfig, deliveryMethod: 'door' | 'self_collection' = 'door') {
  if (!userId) throw new Error('Sign in to book a shipment.');
  const physicalLines = draftLines(draft, business, deliveryMethod).lines.filter((line) => !line.label.startsWith('Zimbabwe door delivery'));
  const generatedDescription = physicalLines.map((line, index) => `Item ${index + 1}: ${line.qty} × ${line.label}`).join('; ');
  const payload = {
    country: draft.country,
    collectionAddress: draft.collectionAddress,
    collectionCity: draft.collectionCity,
    collectionPostcode: draft.collectionPostcode,
    sender: draft.sender,
    recipient: draft.recipient,
    deliveryAddressIds: draft.deliveryAddressIds,
    items: draft.items,
    otherItems: draft.otherItems,
    goodsDescription: generatedDescription || draft.goodsDescription || 'Booked shipment items',
    sealsRequested: draft.sealsRequested,
    returningResident: draft.returningResident,
    referredBy: draft.referredBy,
    scheduleId: draft.scheduleId,
    route: draft.route,
    collectionDate: draft.collectionDate,
    paymentMethod: draft.paymentMethod,
    quoteId: draft.quote?.id ?? null,
    deliveryMethod,
  };
  const { data, error } = await supabase.rpc('create_customer_booking', { p: payload });
  if (error) throw error;
  return { id: data.id as string, tracking_number: data.trackingNumber as string, customer_reference: data.customerReference as string };
}

export type { CustomerAddress };
