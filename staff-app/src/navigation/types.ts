import type { Shipment } from '../lib/shipment';

export type ShipmentsStackParams = {
  ShipmentsList: undefined;
  ShipmentDetail: { shipment: Shipment };
};

export type DriverStopKind = 'collection' | 'delivery';

export type DriverStopParam = {
  id: string;
  shipmentId: string;
  kind: DriverStopKind;
  customerName: string;
  trackingNumber: string;
};

export type DriverStackParams = {
  TodayRun: undefined;
  StopWorkflow: { stop: DriverStopParam };
};

export type DriverRunStackParams = {
  MyRun: undefined;
  RouteMap: undefined;
  RunSummary: undefined;
  StopDetails: { stop: DriverStopParam };
  ReportIssue: { stop: DriverStopParam };
  StopWorkflow: { stop: DriverStopParam };
};

export type DriverMoreStackParams = {
  More: undefined;
  Vehicle: undefined;
  Settings: undefined;
  Account: undefined;
  Documents: undefined;
  Performance: undefined;
};

// Sections menu — mirrors the website admin sidebar.
export type MenuStackParams = {
  Menu: undefined;
  ManualBooking: undefined;
  Customers: undefined;
  CustomQuotes: undefined;
  Schedule: undefined;
  Delivery: undefined;
  Payments: undefined;
  Invoices: undefined;
  Reports: undefined;
  Feedback: undefined;
  StaffRecords: undefined;
  Account: undefined;
  Placeholder: { title: string };
};
