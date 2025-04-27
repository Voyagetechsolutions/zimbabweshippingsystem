
export interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  estimated_delivery?: string;
  weight?: number;
  dimensions?: string;
  carrier?: string;
  can_cancel?: boolean;
  can_modify?: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
  user_id?: string;
}

export interface ShipmentMetadata {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  pickupAddress?: string;
  pickupPostcode?: string;
  pickupCity?: string;
  pickupCountry?: string;
  recipientName?: string;
  recipientPhone?: string;
  additionalPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  shipmentType?: 'drum' | 'other';
  drumQuantity?: string;
  needMetalSeals?: boolean;
  itemCategory?: string;
  itemDescription?: string;
  doorToDoor?: boolean;
  deliveryAddresses?: Array<{
    address: string;
    city: string;
  }>;
  paymentOption?: 'standard' | 'cashOnCollection' | 'payOnArrival';
  paymentMethod?: 'card' | 'paypal';
  amountPaid?: number;
  delivery_image?: string;
  shipment_id?: string;
  customer_name?: string;
  contact_number?: string;
  shipment_type?: string;
  notes?: string;
  pickup_date?: string;
  collection_type?: string;
}

export interface ShipmentWithRelations extends Shipment {
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
  }>;
}
