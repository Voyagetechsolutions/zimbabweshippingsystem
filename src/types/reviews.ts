
export interface Review {
  id: string;
  userId: string;
  shipmentId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  userEmail: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
  shipmentId?: string;
}
