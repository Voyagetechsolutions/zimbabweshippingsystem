import { supabase } from '@/integrations/supabase/client';

type UKRoute = { postcodePrefix: string; route: string; pickupDate: string };
type IrelandRoute = { city: string; route: string; pickupDate: string };
let cachedUKRoutes: UKRoute[]=[];let cachedIrelandRoutes:IrelandRoute[]=[];let cacheTimestamp=0;
const CACHE_DURATION=5*60*1000;

// Mutable compatibility exports for older screens. They contain database
// results only; no route, area or restriction is bundled into the website.
export const postalCodeToRouteMap:Record<string,string>={};
export const irelandCityToRouteMap:Record<string,string>={};
export const irelandCities:Array<{city:string;route:string}>=[];
export const restrictedPostalCodes:string[]=[];

export const fetchRoutesFromDatabase=async():Promise<void>=>{
  if(cachedUKRoutes.length&&Date.now()-cacheTimestamp<CACHE_DURATION)return;
  const [{data:schedules,error:scheduleError},{data:payload,error:configError}]=await Promise.all([
    supabase.from('collection_schedules').select('route,pickup_date,country,areas').order('route'),
    supabase.rpc('get_app_configuration' as any),
  ]);
  if(scheduleError)throw scheduleError;if(configError)throw configError;
  const coverage:any=(payload as any)?.configuration?.uk_route_coverage||{};
  cachedUKRoutes=[];cachedIrelandRoutes=[];
  Object.keys(postalCodeToRouteMap).forEach((key)=>delete postalCodeToRouteMap[key]);
  Object.keys(irelandCityToRouteMap).forEach((key)=>delete irelandCityToRouteMap[key]);
  irelandCities.splice(0);restrictedPostalCodes.splice(0,...(coverage.restrictedPrefixes||[]));
  for(const row of coverage.routes||[]){
    const schedule=(schedules||[]).find((s:any)=>String(s.route).toUpperCase()===String(row.route).toUpperCase()||`${String(s.route).toUpperCase()} ROUTE`===String(row.route).toUpperCase());
    for(const prefix of row.prefixes||[]){const key=String(prefix).toUpperCase();postalCodeToRouteMap[key]=row.route;cachedUKRoutes.push({postcodePrefix:key,route:row.route,pickupDate:schedule?.pickup_date||''});}
  }
  for(const schedule of schedules||[]){
    if(!String(schedule.country||'').toLowerCase().includes('ireland'))continue;
    for(const area of Array.isArray(schedule.areas)?schedule.areas:[]){
      if(String(area).startsWith('Postcodes:'))continue;const city=String(area).trim();if(!city)continue;const key=city.toUpperCase();
      irelandCityToRouteMap[key]=schedule.route;irelandCities.push({city,route:schedule.route});cachedIrelandRoutes.push({city:key,route:schedule.route,pickupDate:schedule.pickup_date||''});
    }
  }
  cacheTimestamp=Date.now();
};

export const clearRouteCache=()=>{cachedUKRoutes=[];cachedIrelandRoutes=[];cacheTimestamp=0;};
export const getIrelandCitiesFromDatabase=async()=>{await fetchRoutesFromDatabase();return[...irelandCities];};
export const isValidUKPostcode=(postcode:string)=>/^[A-Z]{1,2}[0-9]/i.test(postcode.trim());
export const formatUKPostcode=(postcode:string)=>postcode.replace(/[^a-z0-9]/gi,'').toUpperCase();
export const getOutwardPostcode=(postcode:string)=>{const code=formatUKPostcode(postcode);return code.slice(0,-3);};
export const getInwardPostcode=(postcode:string)=>formatUKPostcode(postcode).slice(-3);
export const getRouteForPostalCode=(postalCode:string):string|null=>{const formatted=formatUKPostcode(postalCode);const prefix=formatted.match(/^[A-Z]{1,2}/)?.[0]||'';if(!prefix||restrictedPostalCodes.includes(prefix))return null;return[...cachedUKRoutes].sort((a,b)=>b.postcodePrefix.length-a.postcodePrefix.length).find((row)=>formatted.startsWith(row.postcodePrefix))?.route||null;};
export const getIrelandRouteForCity=(city:string):string|null=>{const wanted=city.trim().toUpperCase();if(!wanted)return null;return cachedIrelandRoutes.find((row)=>row.city===wanted||row.city.includes(wanted)||wanted.includes(row.city))?.route||null;};
export const getPickupDateForRoute=async(routeName:string,isIreland:boolean):Promise<string|null>=>{await fetchRoutesFromDatabase();const match=(isIreland?cachedIrelandRoutes:cachedUKRoutes).find((row)=>row.route===routeName||row.route===routeName.replace(' ROUTE',''));if(match?.pickupDate)return match.pickupDate;const{data}=await supabase.from('collection_schedules').select('pickup_date').ilike('route',routeName.replace(' ROUTE','')).limit(1).maybeSingle();return data?.pickup_date||null;};
export const initializeRouteCache=fetchRoutesFromDatabase;
