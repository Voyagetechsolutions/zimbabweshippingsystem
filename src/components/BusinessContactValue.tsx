import { useBusinessConfiguration } from '@/hooks/useBusinessConfiguration';
import type { ReactNode } from 'react';
export default function BusinessContactValue({field='ukPhone'}:{field?:'ukPhone'|'irelandPhone'|'accountsPhone'|'supportEmail'|'address'|'name'}){const{config}=useBusinessConfiguration();return <>{config.company[field]||''}</>;}

export function BusinessContactLink({field='supportEmail',subject,children}:{field?:'ukPhone'|'irelandPhone'|'accountsPhone'|'supportEmail';subject?:string;children?:ReactNode}){
  const {config}=useBusinessConfiguration();
  const value=config.company[field]||'';
  const href=field==='supportEmail'?`mailto:${value}${subject?`?subject=${encodeURIComponent(subject)}`:''}`:`tel:${value}`;
  return <a href={value?href:undefined}>{children||value}</a>;
}
