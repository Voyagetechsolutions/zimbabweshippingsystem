export function money(amount: number, symbol = '£'): string {
  return `${symbol}${(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function longDate(value: Date): string {
  return value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

// Collection dates are stored in mixed formats ("2026-08-04", "04/08/2026",
// "August 4th, 2026") — same parser the web admin and Zimmy use.
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

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
