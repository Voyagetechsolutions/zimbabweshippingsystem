import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { CatalogueItem } from './catalogue';
import { configurePostcodeCoverage } from './postcode';
import { configureJourneyStages } from './shipment';

export type PaymentMethod = { id: string; label: string; note?: string; icon?: string };
export type RouteCoverage = { route: string; prefixes: string[]; areas: string[] };
export type BusinessConfig = {
  catalogue: CatalogueItem[];
  fees: { doorDeliveryPerAddress: number; doorCollection: number; referralDiscount: number; payOnArrivalPremiumPercent: number; metalDrumPurchase?: number; plasticDrumPurchase?: number };
  payments: { methods: PaymentMethod[]; otherProviders: Array<{ id: string; label: string }>; otherPaymentInstructions?: { sendTo?: string; reference?: string } };
  company: { name?: string; website?: string; supportEmail?: string; ukPhone?: string; irelandPhone?: string; accountsPhone?: string; whatsappPhone?: string; logoUrl?: string; tagline?: string };
  coveredZimbabwePlaces: string[];
  routeCoverage: { restrictedPrefixes: string[]; routes: RouteCoverage[] };
  journeyStages: Array<{ id: string; label: string; title?: string; description?: string; icon?: string }>;
};

// Empty values are intentional: business data must never silently fall back to
// an old app release. Screens show a retry message until Supabase responds.
export const EMPTY_BUSINESS_CONFIG: BusinessConfig = {
  catalogue: [],
  fees: { doorDeliveryPerAddress: 0, doorCollection: 0, referralDiscount: 0, payOnArrivalPremiumPercent: 0 },
  payments: { methods: [], otherProviders: [] },
  company: {},
  coveredZimbabwePlaces: [],
  routeCoverage: { restrictedPrefixes: [], routes: [] },
  journeyStages: [],
};

let cache: BusinessConfig | null = null;
let inflight: Promise<BusinessConfig> | null = null;

function mapPayload(payload: any): BusinessConfig {
  const c = payload?.configuration || {};
  const mapped = {
    catalogue: Array.isArray(payload?.catalogue) ? payload.catalogue : [],
    fees: { ...EMPTY_BUSINESS_CONFIG.fees, ...(c.booking_fees || {}) },
    payments: { ...EMPTY_BUSINESS_CONFIG.payments, ...(c.payment_methods || {}) },
    company: c.company_profile || {},
    coveredZimbabwePlaces: c.zimbabwe_delivery_places?.places || [],
    routeCoverage: { ...EMPTY_BUSINESS_CONFIG.routeCoverage, ...(c.uk_route_coverage || {}) },
    journeyStages: c.shipment_journey?.stages || [],
  };
  configurePostcodeCoverage(mapped.routeCoverage);
  configureJourneyStages(mapped.journeyStages);
  return mapped;
}

export async function loadBusinessConfig(force = false): Promise<BusinessConfig> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.rpc('get_app_configuration');
    if (error) throw error;
    const mapped = mapPayload(data);
    if (!mapped.catalogue.length) throw new Error('The shipping catalogue is not available.');
    cache = mapped;
    return mapped;
  })();
  try { return await inflight; } finally { inflight = null; }
}

export function getCachedBusinessConfig(): BusinessConfig { return cache || EMPTY_BUSINESS_CONFIG; }

export function useBusinessConfig() {
  const [config, setConfig] = useState<BusinessConfig>(cache || EMPTY_BUSINESS_CONFIG);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    setLoading(true); setError(null);
    try { setConfig(await loadBusinessConfig(true)); }
    catch (e: any) { setError(e?.message || 'Could not load current shipping settings.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!cache) void reload(); }, []);
  return { config, loading, error, reload };
}
