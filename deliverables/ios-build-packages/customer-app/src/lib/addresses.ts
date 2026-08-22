import { supabase } from './supabase';

// Saved Zimbabwe delivery addresses (customer_addresses). Each address chosen
// on a booking adds the £25/€25 door-delivery fee, priced server-side.

export type CustomerAddress = {
  id: string;
  user_id: string;
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

export async function listAddresses(userId: string): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CustomerAddress[];
}

export async function saveAddress(userId: string, input: AddressInput, id?: string): Promise<CustomerAddress> {
  const record = { ...input, user_id: userId, country: input.country || 'Zimbabwe' };
  const query = id
    ? supabase.from('customer_addresses').update(record).eq('id', id).eq('user_id', userId)
    : supabase.from('customer_addresses').insert(record);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return data as CustomerAddress;
}

export async function deleteAddress(userId: string, id: string) {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export function addressSummary(a: CustomerAddress): string {
  return [a.address_line1, a.address_line2, a.city, a.province].filter(Boolean).join(', ');
}
