import { supabase } from './supabase';
import { applyCompanyConfiguration } from '../config/company';
import { configureShipmentStatuses } from './shipment';

export type StaffBusinessConfig = {
  catalogue: Array<{ id: string; label: string; priceUK: number | null; priceIE: number | null; note?: string; description?: string }>;
  fees: { doorDeliveryPerAddress: number; doorCollection: number; referralDiscount: number; payOnArrivalPremiumPercent: number };
  payments: { methods: Array<{ id: string; label: string; note?: string }>; otherProviders: Array<{ id: string; label: string }> };
  operations: { vehicleChecklist: Array<{ key: string; label: string }>; sealConditions: string[]; failedStopReasons: Array<{ id: string; label: string }>; shipmentStatusOptions:string[]; shipmentStatusSteps:string[] };
  company: Record<string, string>;
};
let cached:StaffBusinessConfig|null=null;
export function getStaffBusinessConfig(){return cached;}

export async function loadStaffBusinessConfig(): Promise<StaffBusinessConfig> {
  const { data, error } = await supabase.rpc('get_app_configuration');
  if (error) throw error;
  const configuration: any = (data as any)?.configuration || {};
  const catalogue = Array.isArray((data as any)?.catalogue) ? (data as any).catalogue : [];
  if (!catalogue.length) throw new Error('Current catalogue is unavailable.');
  const mapped = {
    catalogue,
    fees: configuration.booking_fees || {},
    payments: configuration.payment_methods || { methods: [], otherProviders: [] },
    operations: configuration.operations || { vehicleChecklist: [], sealConditions: [], failedStopReasons: [] },
    company: configuration.company_profile || {},
  } as StaffBusinessConfig;
  applyCompanyConfiguration(mapped.company);
  configureShipmentStatuses(mapped.operations.shipmentStatusOptions||[],mapped.operations.shipmentStatusSteps||[]);
  cached=mapped;
  return mapped;
}
