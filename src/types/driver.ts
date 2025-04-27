
export interface DriverCollection {
  id: string;
  shipment_id: string;
  origin_address: string;
  pickup_date: string;
  customer_name: string;
  status: 'pending' | 'collecting' | 'collected' | 'delivered';
  contact_number: string;
  shipment_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverDelivery {
  id: string;
  shipment_id: string;
  destination_address: string;
  delivery_date: string;
  recipient_name: string;
  status: 'in_transit' | 'out_for_delivery' | 'delivered';
  contact_number: string;
  shipment_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverSchedule {
  id: string;
  route_name: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  assigned_driver: string;
  locations: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}
