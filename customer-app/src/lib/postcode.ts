export function normalizePostcode(value?:string|null){return(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
export function outwardCode(value?:string|null){const clean=normalizePostcode(value);return clean.length>4?clean.slice(0,-3):clean}

let UK_ROUTE_PREFIXES: Record<string, string[]> = {};
let RESTRICTED_UK_PREFIXES = new Set<string>();

export function configurePostcodeCoverage(config: { restrictedPrefixes?: string[]; routes?: Array<{ route: string; prefixes: string[] }> }) {
  UK_ROUTE_PREFIXES = Object.fromEntries((config.routes || []).map((row) => [row.route, row.prefixes || []]));
  RESTRICTED_UK_PREFIXES = new Set(config.restrictedPrefixes || []);
}

function postcodePrefix(value?: string | null) {
  return (outwardCode(value).match(/^[A-Z]+/) || [''])[0];
}

export function routeForUkPostcode(postcode?: string | null): { route: string | null; restricted: boolean } {
  const prefix = postcodePrefix(postcode);
  if (!prefix) return { route: null, restricted: false };
  const restricted = RESTRICTED_UK_PREFIXES.has(prefix);
  const route = Object.entries(UK_ROUTE_PREFIXES).find(([, prefixes]) => prefixes.includes(prefix))?.[0] || null;
  return { route, restricted };
}

export function routeForIrelandCity(city: string, schedules: Array<{ route: string; country?: string | null; areas?: any }>) {
  if (city.trim().length < 3) return null;
  return schedules.find((schedule) =>
    String(schedule.country || '').toLowerCase().includes('ireland') &&
    scheduleMatchesPostcode(schedule.areas, '', city, 'Ireland')
  )?.route || null;
}
// UK schedule areas are town names (LUTON, BEDFORD, CENTRAL LONDON…), so a
// raw outward-code comparison alone never matches — the town/city (typed or
// resolved from the postcode via postcodes.io) is matched as well.
export function scheduleMatchesPostcode(areas:any,postcode?:string|null,city?:string|null,country?:string|null){
  const values=Array.isArray(areas)?areas:[areas];
  if(String(country||'').toLowerCase().includes('ireland')){
    const wanted=normalizePostcode(city);
    return !wanted||values.some((value)=>{const area=normalizePostcode(String(value||''));return area.includes(wanted)||wanted.includes(area)});
  }
  const code=outwardCode(postcode);
  const town=normalizePostcode(city);
  if(!code&&town.length<3)return true;
  return values.some((value)=>{
    const area=normalizePostcode(String(value||''));
    if(!area)return false;
    if(code&&(area.includes(code)||code.includes(area)))return true;
    return town.length>=3&&(area.includes(town)||town.includes(area));
  });
}

// Resolve a full UK postcode to its town/district names via postcodes.io
// (free, no key). Returns candidate names to match against schedule areas.
export async function lookupUkPostcode(postcode:string):Promise<{city:string;candidates:string[];latitude:number|null;longitude:number|null}|null>{
  const clean=normalizePostcode(postcode);
  if(clean.length<5)return null;
  try{
    const res=await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    if(!res.ok)return null;
    const json=await res.json();
    const r=json?.result;
    if(!r)return null;
    const candidates=[r.admin_district,r.admin_ward,r.region,r.admin_county,r.parish]
      .filter((v:unknown):v is string=>typeof v==='string'&&v.length>2);
    return{
      city:r.admin_district||r.region||'',
      candidates,
      latitude:typeof r.latitude==='number'?r.latitude:null,
      longitude:typeof r.longitude==='number'?r.longitude:null,
    };
  }catch{return null;}
}

/** Format for display: LU11AA -> LU1 1AA. */
export function prettyPostcode(value?:string|null){
  const clean=normalizePostcode(value);
  if(clean.length<5)return clean;
  return `${clean.slice(0,-3)} ${clean.slice(-3)}`;
}

/** Valid completions for a partial postcode (postcodes.io, free, no key). */
export async function autocompletePostcode(partial:string,limit=6):Promise<string[]>{
  const clean=normalizePostcode(partial);
  if(clean.length<2)return[];
  try{
    const res=await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}/autocomplete?limit=${limit}`);
    if(!res.ok)return[];
    const json=await res.json();
    return Array.isArray(json?.result)?json.result:[];
  }catch{return[];}
}

export type Coverage={status:'covered'|'needs_confirmation'|'not_covered'|'unknown';route:string|null;message:string};

/**
 * Whether we collect from a postcode. `routeForUkPostcode` reports "restricted"
 * and "no route" separately; booking needs to treat those differently — the
 * first is a no, the second just needs the office to confirm.
 */
export function coverageForUkPostcode(postcode?:string|null):Coverage{
  const clean=normalizePostcode(postcode);
  if(clean.length<2)return{status:'unknown',route:null,message:''};
  const {route,restricted}=routeForUkPostcode(clean);
  if(restricted){
    return{
      status:'not_covered',
      route:null,
      message:'We don’t run a collection route to this postcode. Message us on WhatsApp and we’ll point you at the nearest area we cover.',
    };
  }
  if(route){
    return{status:'covered',route,message:`On our ${route.replace(' ROUTE','')} collection route.`};
  }
  return{
    status:'needs_confirmation',
    route:null,
    message:'No published route covers this postcode yet — you can still book and our team will confirm your collection.',
  };
}

export type AddressSuggestion={label:string;line1:string;town:string;postcode:string};

/**
 * Street-level address suggestions across GB and Ireland from Photon (OSM,
 * free, no key). Biased to the resolved postcode so "24 King" finds the King
 * Street in the customer's own town. Suggestions are a shortcut only — typing
 * the address by hand always works.
 */
export async function searchAddresses(
  query:string,
  near?:{latitude:number;longitude:number}|null,
  limit=6,
):Promise<AddressSuggestion[]>{
  const trimmed=query.trim();
  if(trimmed.length<3)return[];
  const params=new URLSearchParams({q:trimmed,limit:String(limit),lang:'en'});
  if(near){params.set('lat',String(near.latitude));params.set('lon',String(near.longitude));}
  try{
    const res=await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if(!res.ok)return[];
    const json=await res.json();
    const features=Array.isArray(json?.features)?json.features:[];
    const out:AddressSuggestion[]=[];
    for(const f of features){
      const p=f?.properties||{};
      // Only GB and Ireland are serviceable collection origins.
      if(p.countrycode&&!['GB','IE'].includes(String(p.countrycode).toUpperCase()))continue;
      const line1=[p.housenumber,p.street||p.name].filter(Boolean).join(' ').trim();
      if(!line1)continue;
      const town=p.city||p.town||p.village||p.district||p.county||'';
      const label=[line1,town,p.postcode].filter(Boolean).join(', ');
      if(out.some((s)=>s.label===label))continue;
      out.push({label,line1,town,postcode:p.postcode?prettyPostcode(p.postcode):''});
    }
    return out;
  }catch{return[];}
}
