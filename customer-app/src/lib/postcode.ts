export function normalizePostcode(value?:string|null){return(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
export function outwardCode(value?:string|null){const clean=normalizePostcode(value);return clean.length>4?clean.slice(0,-3):clean}

const UK_ROUTE_PREFIXES: Record<string, string[]> = {
  'LONDON ROUTE': ['EC','WC','N','NW','E','SE','SW','W','EN','IG','RM','DA','BR','UB','HA','WD'],
  'BIRMINGHAM ROUTE': ['B','CV','WV','DY','WS','WR','SY','TF'],
  'MANCHESTER ROUTE': ['M','L','WA','OL','SK','ST','BB','PR','FY','BL','WN','CW','CH','LL'],
  'LEEDS ROUTE': ['LS','WF','HX','DN','S','HD','YO','BD','HG'],
  'CARDIFF ROUTE': ['CF','GL','BS','SN','BA','SP','NP','CP','SA'],
  'BOURNEMOUTH ROUTE': ['SO','PO','RG','GU','BH','OX'],
  'NOTTINGHAM ROUTE': ['NG','LE','DE','PE','LN'],
  'BRIGHTON ROUTE': ['BN','RH','SL','TN','CT','CR','TW','KT','ME'],
  'SOUTHEND ROUTE': ['NR','IP','CO','CM','CB','SS','SG'],
  'NORTHAMPTON ROUTE': ['MK','LU','AL','HP','NN'],
};

const RESTRICTED_UK_PREFIXES = new Set(['EX','TQ','DT','LD','HR','HU','TS','DL','SR','CA','NE','TD','EH','ML','KA','DG','G','DH','KY','PA','IV','AB','DD']);

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
export async function lookupUkPostcode(postcode:string):Promise<{city:string;candidates:string[]}|null>{
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
    return{city:r.admin_district||r.region||'',candidates};
  }catch{return null;}
}
