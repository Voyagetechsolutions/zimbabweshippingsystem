// The owner-approved catalogue — must stay in sync with the website Pricing
// page and Zimmy's knowledge base (see supabase/functions/ai-chat/index.ts).
export type Country = 'United Kingdom' | 'Ireland';

export type CatalogueItem = {
  id: string;
  label: string;
  priceUK: number | null; // null = custom quote
  priceIE: number | null;
  note?: string;
  description: string;
};

export const CATALOGUE: CatalogueItem[] = [
  { id: 'plastic_drum', label: 'Plastic shipping drum (200–220L)', priceUK: 280, priceIE: 360, description: 'Heavy-duty plastic barrel for securely packed clothes, groceries and household goods. The declared contents are checked at collection.' },
  { id: 'metal_drum', label: 'Metal shipping drum (200–220L)', priceUK: 280, priceIE: 360, description: 'Strong metal drum for securely packed household goods. The lid must be suitable for a coded security seal.' },
  { id: 'trunk', label: 'Trunk / storage box', priceUK: null, priceIE: 220, note: 'UK £180–£280 depending on size — team confirms item by item', description: 'Rigid lockable trunk or storage box for personal and household goods. UK pricing depends on its dimensions; Ireland pricing is €220.' },
  { id: 'seal', label: 'Metal coded seal', priceUK: 5, priceIE: 6, description: 'Tamper-evident numbered metal seal fitted to a drum or trunk. Its unique code is recorded at collection and checked at delivery.' },
];

export const DELIVERY_FEE = 25; // per Zimbabwe delivery address (£ UK / € Ireland)
export const DOOR_COLLECTION_FEE = 25; // door-to-door collection (£ UK / € Ireland)
export const REFERRAL_DISCOUNT = 20;

export function currencyFor(country: Country): { code: 'GBP' | 'EUR'; symbol: string } {
  return country === 'Ireland' ? { code: 'EUR', symbol: '€' } : { code: 'GBP', symbol: '£' };
}

export function priceFor(item: CatalogueItem, country: Country): number | null {
  return country === 'Ireland' ? item.priceIE : item.priceUK;
}

// Major cities and towns Zimbabwe Shipping delivers to (no rural areas).
export const COVERED_ZIM_PLACES = [
  'Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Epworth', 'Gweru', 'Kwekwe',
  'Kadoma', 'Masvingo', 'Chinhoyi', 'Victoria Falls', 'Hwange', 'Zvishavane',
  'Bindura', 'Marondera', 'Chegutu', 'Beitbridge', 'Kariba', 'Chiredzi',
  'Rusape', 'Plumtree', 'Ruwa', 'Norton', 'Redcliff', 'Gwanda', 'Lupane',
  'Gokwe', 'Shurugwi', 'Mvuma', 'Chipinge', 'Karoi', 'Mashava', 'Triangle', 'Shamva',
];
