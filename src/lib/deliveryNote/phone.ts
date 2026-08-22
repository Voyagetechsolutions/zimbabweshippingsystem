// Phone handling for delivery notes.
//
// Two separate jobs that must not be conflated:
//   - the sanity check runs on digits only, against what is printed;
//   - normalisation is a presentation step applied to the printed note.
// Normalising before checking would let a reformat paper over a real mismatch.

export type PhoneRegion = 'UK' | 'ZW';

const DIAL_CODE: Record<PhoneRegion, string> = { UK: '+44', ZW: '+263' };

/**
 * How the national part is grouped for print, by country code and length.
 * Only the shapes we actually carry are listed: an unrecognised length is left
 * ungrouped rather than chopped into a grouping that country does not use.
 */
const GROUPINGS: Record<string, Record<number, number[]>> = {
  '44': { 10: [4, 6], 9: [3, 6] },   // 7700 905328 / 121 234567
  '263': { 9: [3, 3, 3] },           // 772 123 456
};

/** Splits a digit run into the given group sizes, e.g. 7700905328 -> "7700 905328". */
function group(national: string, countryCode: string): string {
  const sizes = GROUPINGS[countryCode]?.[national.length];
  if (!sizes) return national;
  const parts: string[] = [];
  let at = 0;
  for (const size of sizes) {
    parts.push(national.slice(at, at + size));
    at += size;
  }
  return parts.join(' ');
}

/**
 * Formats an already-international number for print: "+44 7700 905328".
 * A delivery note is read off paper at a doorstep, so the spacing is not
 * cosmetic. The digits are never changed, only spaced.
 */
function present(digits: string): string {
  for (const code of ['263', '44']) {
    if (digits.startsWith(code)) {
      return `+${code} ${group(digits.slice(code.length), code)}`.trim();
    }
  }
  return `+${digits}`;
}

export function digitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function lastFour(value: string): string {
  const digits = digitsOnly(value);
  return digits.length >= 4 ? digits.slice(-4) : '';
}

export interface PhoneCheck {
  /** false only when both last-4s are known and differ. */
  matches: boolean;
  /** true when one side had too few digits to compare at all. */
  comparable: boolean;
  invoiceLastFour: string;
  phoneLastFour: string;
}

/**
 * The last 4 digits of the invoice number normally equal the last 4 of the
 * shipper's phone. This reports; it never edits either value. The printed
 * invoice number is the invoice number even when the phone disagrees.
 */
export function checkInvoiceAgainstPhone(invoiceNumber: string, phoneRaw: string): PhoneCheck {
  const invoiceLastFour = lastFour(invoiceNumber);
  const phoneLastFour = lastFour(phoneRaw);
  const comparable = Boolean(invoiceLastFour && phoneLastFour);
  return {
    comparable,
    matches: comparable ? invoiceLastFour === phoneLastFour : true,
    invoiceLastFour,
    phoneLastFour,
  };
}

export interface NormalisedPhone {
  value: string;
  /**
   * Set when normalising had to make a non-obvious call — currently only the
   * 0027 prefix, which is a South African code written where a Zimbabwean one
   * was meant. Worth a human glance rather than a silent rewrite.
   */
  note: string | null;
}

/**
 * Formats a printed phone number for the note. `region` decides what a bare
 * leading 0 means: on this invoice the shipper is in the UK and the consignee
 * is in Zimbabwe, and 0... is a valid national prefix in both.
 */
export function normalisePhone(raw: string, region: PhoneRegion): NormalisedPhone {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { value: '', note: null };

  // Already international: keep the country code the invoice printed.
  if (trimmed.startsWith('+')) {
    const digits = digitsOnly(trimmed);
    return digits ? { value: present(digits), note: null } : { value: '', note: null };
  }

  const digits = digitsOnly(trimmed);
  if (!digits) return { value: '', note: null };

  // 00 is an international access prefix. 0027 is treated as Zimbabwean per the
  // office rule — it shows up as a mistyped 00263 — but is always reported.
  if (digits.startsWith('0027')) {
    return {
      value: present(`263${digits.slice(4).replace(/^0+/, '')}`),
      note: '0027 read as Zimbabwe (+263) — confirm the number',
    };
  }
  if (digits.startsWith('00')) return { value: present(digits.slice(2)), note: null };
  if (digits.startsWith('263')) return { value: present(digits), note: null };
  if (digits.startsWith('44')) return { value: present(digits), note: null };

  // National format: drop the trunk 0 and prefix the region's code.
  const national = digits.replace(/^0+/, '');
  return { value: present(`${DIAL_CODE[region].slice(1)}${national}`), note: null };
}
