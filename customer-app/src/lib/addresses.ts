import { supabase } from './supabase';

// Saved addresses (customer_addresses), of two kinds.
//
// `delivery` is a Zimbabwe address we deliver to; each one chosen on a booking
// adds the database-configured door-delivery fee, priced server-side.
// `pickup` is a UK or Ireland address we collect from — free, and only ever
// one per booking. They share a table because the columns fit both and a
// second table would have meant duplicating the RLS and the default handling.

export type AddressType = 'delivery' | 'pickup';

export type CustomerAddress = {
  id: string;
  user_id: string;
  address_type: AddressType;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string | null;
  country: string;
  postal_code: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
};

export type AddressInput = {
  address_type?: AddressType;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province?: string;
  country?: string;
  postal_code?: string;
  delivery_instructions?: string;
  is_default?: boolean;
};

/**
 * Whether the database has the `address_type` column yet.
 *
 * The app ships as a native build with no over-the-air updates, so a release
 * can reach customers before its migration reaches the database. Rather than
 * break saved addresses entirely in that window, the two kinds collapse back
 * into the one kind that has always existed. Probed once, then remembered.
 */
let addressTypeSupported: boolean | null = null;
const isMissingColumn = (error: unknown) =>
  (error as { code?: string })?.code === '42703'
  || /address_type.*does not exist/i.test((error as { message?: string })?.message || '');

export function pickupAddressesAvailable(): boolean {
  return addressTypeSupported !== false;
}

export async function listAddresses(userId: string, type: AddressType = 'delivery'): Promise<CustomerAddress[]> {
  const base = () => supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (addressTypeSupported !== false) {
    const { data, error } = await base().eq('address_type', type);
    if (!error) {
      addressTypeSupported = true;
      return (data || []) as CustomerAddress[];
    }
    if (!isMissingColumn(error)) throw error;
    addressTypeSupported = false;
  }

  // Without the column every stored address is a Zimbabwe delivery address,
  // which is exactly what they were before pickup addresses existed.
  if (type === 'pickup') return [];
  const { data, error } = await base();
  if (error) throw error;
  return ((data || []) as CustomerAddress[]).map((a) => ({ ...a, address_type: 'delivery' }));
}

export async function saveAddress(userId: string, input: AddressInput, id?: string): Promise<CustomerAddress> {
  const type: AddressType = input.address_type || 'delivery';
  const record = {
    ...input,
    address_type: type,
    user_id: userId,
    // A pickup address is in the country we collect from, so it must not
    // inherit the delivery default.
    country: input.country || (type === 'pickup' ? 'United Kingdom' : 'Zimbabwe'),
  };

  const write = (row: Record<string, unknown>) => (id
    ? supabase.from('customer_addresses').update(row).eq('id', id).eq('user_id', userId)
    : supabase.from('customer_addresses').insert(row)).select('*').single();

  if (addressTypeSupported !== false) {
    const { data, error } = await write(record);
    if (!error) {
      addressTypeSupported = true;
      return data as CustomerAddress;
    }
    if (!isMissingColumn(error)) throw error;
    addressTypeSupported = false;
  }

  // Saving a delivery address must keep working on an older database; saving a
  // pickup address genuinely cannot, and says so rather than silently filing it
  // as a Zimbabwe delivery address.
  if (type === 'pickup') {
    throw new Error('Saved pickup addresses are not switched on yet — your booking address still works as normal.');
  }
  const { address_type: _ignored, ...withoutType } = record;
  const { data, error } = await write(withoutType);
  if (error) throw error;
  return { ...(data as CustomerAddress), address_type: 'delivery' };
}

export async function deleteAddress(userId: string, id: string) {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export function addressSummary(a: CustomerAddress): string {
  return [a.address_line1, a.address_line2, a.city, a.province].filter(Boolean).join(', ');
}

/** A pickup address reads better with its postcode, which is what routes it. */
export function pickupSummary(a: CustomerAddress): string {
  return [a.address_line1, a.address_line2, a.city, a.postal_code].filter(Boolean).join(', ');
}
