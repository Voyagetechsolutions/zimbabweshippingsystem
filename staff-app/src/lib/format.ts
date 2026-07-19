// Country toggle for the UK/Ireland split, mirroring the web admin.
export type CountryFilter = 'all' | 'UK' | 'Ireland';

export function money(amount: number, symbol = '£'): string {
  return `${symbol}${(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

// A shipment's country is inferred from its booking metadata.
export function shipmentCountry(metadata: any): 'UK' | 'Ireland' | 'Other' {
  const c = (metadata?.sender?.country || metadata?.collection?.country || '').toString().toLowerCase();
  if (c.includes('ireland')) return 'Ireland';
  if (c.includes('united kingdom') || c.includes('england') || c === 'uk' || c.includes('britain')) return 'UK';
  return 'Other';
}

export function matchesCountry(metadata: any, filter: CountryFilter): boolean {
  if (filter === 'all') return true;
  return shipmentCountry(metadata) === filter;
}

// Customer name best-effort from varied metadata shapes.
export function customerName(metadata: any): string {
  return (
    metadata?.sender?.firstName
      ? `${metadata.sender.firstName} ${metadata?.sender?.lastName || ''}`.trim()
      : metadata?.sender_name || metadata?.customer_name || metadata?.recipient_name || metadata?.recipient?.name || '—'
  );
}

// Sum amounts per currency and render like "£1,200 · €340" — never add
// pounds and euros together into one meaningless number.
export function addToMoneyMap(map: Record<string, number>, amount: number | null | undefined, currency?: string | null) {
  const key = currency || 'GBP';
  map[key] = (map[key] || 0) + (Number(amount) || 0);
  return map;
}

// Collection dates are stored in mixed formats ("2026-08-04", "04/08/2026",
// "August 4th, 2026") — same parser the web admin, Zimmy and customer app use.
export function parseCollectionDate(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const ukDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalised = raw.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1');
  const parsed = isoDate
    ? new Date(`${isoDate}T12:00:00Z`)
    : ukDate
      ? new Date(`${ukDate[3]}-${ukDate[2].padStart(2, '0')}-${ukDate[1].padStart(2, '0')}T12:00:00Z`)
      : new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function moneyMap(map: Record<string, number>): string {
  const entries = Object.entries(map).filter(([, value]) => value !== 0);
  if (!entries.length) return '£0.00';
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => money(value, currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `))
    .join(' · ');
}
