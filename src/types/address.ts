
export interface Address {
  id: string;
  user_id: string;
  address_name: string;
  recipient_name: string;
  street_address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone_number: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  address_name: string;
  recipient_name: string;
  street_address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone_number: string | null;
  is_default: boolean;
}
