import { supabase } from './supabase';
import { CATALOGUE, Country, currencyFor, priceFor, DELIVERY_FEE } from './catalogue';
import type { CustomerAddress } from './addresses';

// The booking is priced and created server-side (create_customer_booking):
// catalogue prices, £25/€25 per delivery address, seals and any approved
// custom-quote amount are all validated in the database. The totals shown in
// the UI are computed with the same rules purely for display.

export type QuoteCarry = { id: string; amount: number; currency: 'GBP' | 'EUR'; description: string };

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

export function draftLines(draft: BookingDraft) {
  const { symbol } = currencyFor(draft.country);
  const lines: Array<{ label: string; qty: number; unit: number | null }> = [];
  for (const item of CATALOGUE) {
    if (item.id === 'seal') continue; // seals have their own selector
    const qty = draft.items[item.id] || 0;
    if (qty > 0) lines.push({ label: item.label, qty, unit: priceFor(item, draft.country) });
  }
  if (draft.otherItems.trim()) lines.push({ label: draft.otherItems.trim(), qty: 1, unit: null });
  if (draft.quote) lines.push({ label: `Approved quote: ${draft.quote.description.slice(0, 60)}`, qty: 1, unit: draft.quote.amount });
  if (draft.sealsRequested > 0) {
    const seal = CATALOGUE.find((c) => c.id === 'seal');
    lines.push({ label: 'Metal coded seal', qty: draft.sealsRequested, unit: seal ? priceFor(seal, draft.country) : null });
  }
  const addressCount = draft.deliveryAddressIds.length;
  if (addressCount > 0) {
    lines.push({ label: `Zimbabwe door delivery (${addressCount} address${addressCount > 1 ? 'es' : ''})`, qty: addressCount, unit: DELIVERY_FEE });
  }
  const priced = lines.filter((l) => l.unit != null);
  const hasCustom = lines.some((l) => l.unit == null);
  const estimate = priced.reduce((sum, l) => sum + l.qty * (l.unit as number), 0);
  return { lines, estimate, hasCustom, symbol };
}

// Guidance shown wherever the customer describes their goods.
export const DESCRIPTION_GUIDANCE =
  'Include: what the goods are, materials, brand/model where relevant, condition, sizes or approximate dimensions, colours, identifying marks, the contents of any boxes, drums or trunks, and anything fragile, restricted or high-value.';

export async function createBooking(draft: BookingDraft, userId: string | null) {
  if (!userId) throw new Error('Sign in to book a shipment.');
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
    goodsDescription: draft.goodsDescription,
    sealsRequested: draft.sealsRequested,
    returningResident: draft.returningResident,
    referredBy: draft.referredBy,
    scheduleId: draft.scheduleId,
    route: draft.route,
    collectionDate: draft.collectionDate,
    paymentMethod: draft.paymentMethod,
    quoteId: draft.quote?.id ?? null,
  };
  const { data, error } = await supabase.rpc('create_customer_booking', { p: payload });
  if (error) throw error;
  return { id: data.id as string, tracking_number: data.trackingNumber as string, customer_reference: data.customerReference as string };
}

export type { CustomerAddress };
