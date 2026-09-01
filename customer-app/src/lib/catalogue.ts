export type Country = 'United Kingdom' | 'Ireland';

export type CatalogueItem = {
  id: string;
  label: string;
  priceUK: number | null; // null = custom quote
  priceIE: number | null;
  note?: string;
  description: string;
};

export function currencyFor(country: Country): { code: 'GBP' | 'EUR'; symbol: string } {
  return country === 'Ireland' ? { code: 'EUR', symbol: '€' } : { code: 'GBP', symbol: '£' };
}

export function priceFor(item: CatalogueItem, country: Country): number | null {
  return country === 'Ireland' ? item.priceIE : item.priceUK;
}
