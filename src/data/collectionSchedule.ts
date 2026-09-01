import { supabase } from '@/integrations/supabase/client';
import { postalCodeToRouteMap, restrictedPostalCodes } from '@/utils/postalCodeUtils';

export interface RouteSchedule{route:string;date:string;areas:string[];country:string}
// Populated only by syncSchedulesWithDatabase; an empty database produces an
// empty schedule instead of stale dates embedded in a deployment.
export const collectionSchedules:RouteSchedule[]=[];

export function getAreasFromPostalCode(postalCode:string):string[]{const prefix=(postalCode.toUpperCase().match(/^[A-Z]{1,2}/)||[''])[0];if(!prefix||restrictedPostalCodes.includes(prefix))return[];const route=postalCodeToRouteMap[prefix];return route?getAreasByRoute(route):[];}

export async function syncSchedulesWithDatabase(){const{data,error}=await supabase.from('collection_schedules').select('route,pickup_date,areas,country').order('route');if(error)throw error;collectionSchedules.splice(0,collectionSchedules.length,...(data||[]).map((row:any)=>({route:row.route,date:row.pickup_date||'',areas:Array.isArray(row.areas)?row.areas:[],country:row.country||''})));return collectionSchedules;}
export function getRouteNames(){return collectionSchedules.map((row)=>row.route)}
export function getAreasByRoute(routeName:string){return collectionSchedules.find((row)=>row.route===routeName)?.areas||[]}
export function getDateByRoute(routeName:string){return collectionSchedules.find((row)=>row.route===routeName)?.date||''}
export function getDateByRouteAndArea(routeName:string,areaName:string){const row=collectionSchedules.find((item)=>item.route===routeName&&item.areas.includes(areaName));return row?.date||''}

export async function updateRouteDate(routeName:string,newDate:string){const{error}=await supabase.from('collection_schedules').update({pickup_date:newDate,updated_at:new Date().toISOString()}).eq('route',routeName);if(error)return false;const row=collectionSchedules.find((item)=>item.route===routeName);if(row)row.date=newDate;return true;}
export async function addRoute(route:string,date:string,areas:string[],country='England'){if(collectionSchedules.some((row)=>row.route===route))return false;const{error}=await supabase.from('collection_schedules').insert({route,pickup_date:date,areas,country});if(error)return false;collectionSchedules.push({route,date,areas,country});return true;}
export async function removeRoute(routeName:string){const{error}=await supabase.from('collection_schedules').delete().eq('route',routeName);if(error)return false;const index=collectionSchedules.findIndex((row)=>row.route===routeName);if(index>=0)collectionSchedules.splice(index,1);return true;}
export async function addAreaToRoute(routeName:string,area:string){const row=collectionSchedules.find((item)=>item.route===routeName);if(!row||row.areas.includes(area))return false;const areas=[...row.areas,area];const{error}=await supabase.from('collection_schedules').update({areas,updated_at:new Date().toISOString()}).eq('route',routeName);if(error)return false;row.areas=areas;return true;}
export async function removeAreaFromRoute(routeName:string,area:string){const row=collectionSchedules.find((item)=>item.route===routeName);if(!row)return false;const areas=row.areas.filter((item)=>item!==area);const{error}=await supabase.from('collection_schedules').update({areas,updated_at:new Date().toISOString()}).eq('route',routeName);if(error)return false;row.areas=areas;return true;}
export function getRoutesByCountry(country:string){return collectionSchedules.filter((row)=>row.country===country).map((row)=>row.route)}
export function getIrelandCities(){return [...new Set(collectionSchedules.filter((row)=>row.country==='Ireland').flatMap((row)=>row.areas))].sort()}
export function getRouteForIrelandCity(city:string){const wanted=city.trim().toUpperCase();return collectionSchedules.find((row)=>row.country==='Ireland'&&row.areas.some((area)=>area.toUpperCase()===wanted))?.route||null}
export function getDateForIrelandCity(city:string){const route=getRouteForIrelandCity(city);return route?getDateByRoute(route):null}
