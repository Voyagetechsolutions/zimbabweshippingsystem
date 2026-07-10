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
