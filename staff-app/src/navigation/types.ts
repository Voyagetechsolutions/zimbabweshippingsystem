import type { Shipment } from '../lib/shipment';

export type ShipmentsStackParams = {
  ShipmentsList: undefined;
  ShipmentDetail: { shipment: Shipment };
};

// Sections menu — mirrors the website admin sidebar.
export type MenuStackParams = {
  Menu: undefined;
  ManualBooking: undefined;
  Customers: undefined;
  CustomQuotes: undefined;
  Schedule: undefined;
  Payments: undefined;
  Reports: undefined;
  Feedback: undefined;
  Placeholder: { title: string };
};
