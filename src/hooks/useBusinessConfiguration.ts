import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WebBusinessConfiguration = {
  catalogue: Array<{ id: string; label: string; priceUK: number | null; priceIE: number | null; note?: string; description?: string }>;
  fees: { doorDeliveryPerAddress: number; doorCollection: number; referralDiscount: number; payOnArrivalPremiumPercent: number; metalDrumPurchase?: number; plasticDrumPurchase?: number; quoteValidityDays?: number };
  payments: { methods: Array<{ id: string; label: string; note?: string }>; otherProviders: Array<{ id: string; label: string }>; otherPaymentInstructions?: { sendTo?: string; reference?: string } };
  company: Record<string, string>;
  routeCoverage: { restrictedPrefixes: string[]; routes: Array<{ route: string; prefixes: string[]; areas: string[] }> };
  coveredZimbabwePlaces: string[];
  routeTemplates: { england: Array<{ route: string; cities: string[]; postcodes: string[] }>; ireland: Array<{ route: string; cities: string[]; postcodes: string[] }> };
  operations: { failedStopReasons: Array<{ id: string; label: string }> };
};

const EMPTY: WebBusinessConfiguration = {
  catalogue: [], fees: { doorDeliveryPerAddress: 0, doorCollection: 0, referralDiscount: 0, payOnArrivalPremiumPercent: 0, metalDrumPurchase: 0, plasticDrumPurchase: 0 },
  payments: { methods: [], otherProviders: [] }, company: {}, routeCoverage: { restrictedPrefixes: [], routes: [] }, coveredZimbabwePlaces: [], routeTemplates: { england: [], ireland: [] }, operations: { failedStopReasons: [] },
};

let cachedPublic: WebBusinessConfiguration | null = null;
let cachedStaff: WebBusinessConfiguration | null = null;

export function useBusinessConfiguration(includeStaff=false) {
  const initial=includeStaff?cachedStaff:cachedPublic;
  const [config,setConfig]=useState(initial||EMPTY); const [loading,setLoading]=useState(!initial); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{const existing=includeStaff?cachedStaff:cachedPublic;if(existing){setConfig(existing);setLoading(false);return;}let active=true;setLoading(true);(async()=>{const {data,error}=await supabase.rpc('get_app_configuration' as any);if(error)throw error;const c:any=(data as any)?.configuration||{};const next:WebBusinessConfiguration={catalogue:(data as any)?.catalogue||[],fees:{...EMPTY.fees,...(c.booking_fees||{})},payments:{...EMPTY.payments,...(c.payment_methods||{})},company:c.company_profile||{},routeCoverage:{...EMPTY.routeCoverage,...(c.uk_route_coverage||{})},coveredZimbabwePlaces:c.zimbabwe_delivery_places?.places||[],routeTemplates:{...EMPTY.routeTemplates,...(c.route_templates||{})},operations:{...EMPTY.operations,...(c.operations||{})}};if(!next.catalogue.length)throw new Error('Current catalogue is unavailable.');if(includeStaff)cachedStaff=next;else cachedPublic=next;if(active)setConfig(next);})().catch((e)=>{if(active)setError(e?.message||'Could not load current shipping settings.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[includeStaff]);
  return {config,loading,error};
}
