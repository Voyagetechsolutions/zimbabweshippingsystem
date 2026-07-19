// The owner-approved catalogue — must stay in sync with the website Pricing
// page and Zimmy's knowledge base (see supabase/functions/ai-chat/index.ts).
export type Country = 'United Kingdom' | 'Ireland';

export type CatalogueItem = {
  id: string;
  label: string;
  priceUK: number | null; // null = custom quote
  priceIE: number | null;
  note?: string;
};

export const CATALOGUE: CatalogueItem[] = [
  { id: 'drum', label: 'Drum (200–220L)', priceUK: 280, priceIE: 360 },
  { id: 'trunk', label: 'Trunk / storage box', priceUK: null, priceIE: 220, note: 'UK boxes £180–£280 by size — team confirms' },
  { id: 'seal', label: 'Metal coded seal', priceUK: 5, priceIE: 7 },
  { id: 'stove', label: 'Stove / cooker', priceUK: 260, priceIE: 325 },
  { id: 'washing_machine', label: 'Washing machine', priceUK: 300, priceIE: 328 },
  { id: 'fridge', label: 'Fridge', priceUK: 450, priceIE: null, note: 'Ireland €490–€620 by size — team confirms' },
  { id: 'american_fridge', label: 'American fridge freezer', priceUK: 600, priceIE: null },
  { id: 'sofa', label: 'Sofa / lounge suite', priceUK: 1500, priceIE: 1560 },
  { id: 'suitcase', label: 'Suitcase', priceUK: null, priceIE: null, note: 'UK £180–£200, Ireland €200–€230 by size' },
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
