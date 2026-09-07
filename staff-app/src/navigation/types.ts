import type { Shipment } from '../lib/shipment';

export type ShipmentsStackParams = {
  // Shipments are entered through their collection period — bookings open,
  // they fill, the container goes — rather than as one endless list.
  Periods: { mode?: 'shipments' | 'invoices' | 'payments' } | undefined;
  PeriodShipments: { periodId: string; name?: string };
  PeriodInvoices: { periodId: string; name?: string };
  PeriodPayments: { periodId: string; name?: string };
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
  // One route in driving order: plan it, reorder it, start it, navigate it.
  RoutePlan: { routeName?: string | null; date?: string | null } | undefined;
  // Any shipment by reference or name, whatever day it was booked for.
  FindShipment: undefined;
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
  // Optionally opened for a customer already on file, with their
  // details, addresses and last consignment carried over.
  ManualBooking: { prefill?: Record<string, unknown> } | undefined;
  Customers: undefined;
  CustomerDetail: { record: any; shipmentId?: string };
  // Registered here as well as in ShipmentsStack so that opening a shipment
  // from More stays inside More, and Back returns where it was opened from.
  AllShipments: undefined;
  // The same period cards front both shipments and invoices; `mode` decides
  // the title and where a tap goes.
  Periods: { mode?: 'shipments' | 'invoices' | 'payments' } | undefined;
  PeriodShipments: { periodId: string; name?: string };
  PeriodInvoices: { periodId: string; name?: string };
  PeriodPayments: { periodId: string; name?: string };
  ShipmentDetail: { shipment: any };
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
  // Coverage of pickup coordinates, and the bulk geocode that fills them.
  MapLocations: undefined;
  Vehicles: undefined;
  Account: undefined;
  Placeholder: { title: string };
};
