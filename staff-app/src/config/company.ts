// Populated during authenticated app bootstrap from app_configuration.
export const COMPANY={name:'',websiteLabel:'',websiteUrl:'',supportEmail:'',supportPhone:'',irelandPhone:'',logoUrl:''};
export let COMPANY_WHATSAPP_URL='';
export function applyCompanyConfiguration(value:Record<string,string>){COMPANY.name=value.name||'';COMPANY.websiteUrl=value.website||'';COMPANY.websiteLabel=String(value.website||'').replace(/^https?:\/\//,'');COMPANY.supportEmail=value.supportEmail||'';COMPANY.supportPhone=value.ukPhone||'';COMPANY.irelandPhone=value.irelandPhone||'';COMPANY.logoUrl=value.logoUrl||'';COMPANY_WHATSAPP_URL=`https://wa.me/${value.whatsappPhone||''}`;}
