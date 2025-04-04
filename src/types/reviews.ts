
export interface Review {
  id: string;
  user_id: string;
  shipment_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
  shipment_id?: string | null;
}
