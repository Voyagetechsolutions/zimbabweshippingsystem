import type { Shipment } from '../lib/shipment';

export type ShipmentsStackParams = {
  ShipmentsList: undefined;
  ShipmentDetail: { shipment: Shipment };
  // The invoice and the delivery note, viewable and editable rather than
  // download-only.
  Document: { shipmentId: string; kind: 'invoice' | 'delivery_note' };
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
  StopDetails: { stop: DriverStopParam };
  ReportIssue: { stop: DriverStopParam };
  StopWorkflow: { stop: DriverStopParam };
};

// Delivery drivers work the Zimbabwe half of the journey. They build the load
// themselves at the depot, so "DeliveryLoad" sits alongside the run rather than
// behind it, and "DeliveryNotes" is the driver's own copy of the paperwork.
export type DeliveryStackParams = {
  DeliveryHome: undefined;
  CollectionsAhead: undefined;
  DeliveryLoad: undefined;
  DeliveryNotes: undefined;
  StopDetails: { stop: DriverStopParam };
  ReportIssue: { stop: DriverStopParam };
  StopWorkflow: { stop: DriverStopParam };
};

export type DriverRunStackParams = {
  MyRun: undefined;
  // The forward view that replaced the dispatch board: what is booked onto
  // each published date, so a driver can plan their own route.
  CollectionsAhead: undefined;
  RouteMap: undefined;
  RunSummary: undefined;
  DepotHandover: undefined;
  StopDetails: { stop: DriverStopParam };
  ReportIssue: { stop: DriverStopParam };
  StopWorkflow: { stop: DriverStopParam };
};

// Driver "My Account" tab. Account is the root; Documents and the old More
// landing screen were removed.
export type DriverMoreStackParams = {
  Account: undefined;
  Profile: undefined;
  Vehicle: undefined;
  VehicleCheck: undefined;
  Documents: undefined;
  Performance: undefined;
  Settings: undefined;
};

// Admin Runs tab: dispatch board + run details.
export type RunsStackParams = {
  DriverRuns: undefined;
  RunDetail: { runId: string };
  CollectionGroups: undefined;
  // `runId` narrows the builder to one collection group; without it every open
  // collection is offered, which is how dispatch works an unassigned booking.
  BuildRoute: { date: string; runId?: string; runRoute?: string };
};

// Sections menu — mirrors the website admin sidebar.
export type MenuStackParams = {
  MenuHome: undefined;
  ManualBooking: undefined;
  Customers: undefined;
  CustomerDetail: { record: any; shipmentId?: string };
  CustomQuotes: undefined;
  Delivery: undefined;
  DeliveryNotes: undefined;
  DeliveryNoteDetail: { noteId: string };
  PickupZones: undefined;
  Payments: undefined;
  PaymentDetails: { paymentId: string };
  Reconciliation: undefined;
  PaymentProofs: undefined;
  Invoices: { create?: boolean; open?: string } | undefined;
  Document: { shipmentId: string; kind: 'invoice' | 'delivery_note' };
  Reports: { range?: 'today' | 'week' | 'month' | 'last30' | 'custom' } | undefined;
  Analytics: undefined;
  FinanceOverview: undefined;
  Feedback: undefined;
  StaffRecords: { filter?: 'all' | 'drivers' | 'dispatchers' | 'finance' | 'admins' } | undefined;
  Vehicles: undefined;
  Account: undefined;
  Placeholder: { title: string };
};
