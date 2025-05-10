
export interface Driver {
  id: string;
  name: string;
  email: string;
  region: string;
  active: boolean;
  performance?: DriverPerformance;
}

export interface DriverPerformance {
  id: string;
  driver_id: string;
  total_deliveries: number;
  completed_deliveries: number;
  on_time_deliveries: number;
  rating: number;
  region: string;
  created_at: string;
  updated_at: string;
}
