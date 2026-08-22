// Parsing the recipient out of the free text the office supplies.
//
// Most invoices print no consignee. The receiver arrives separately, typically
// pasted from a message: "For Nana: NanaPetunia Simangele Mlilo, 12 Dollar
// Avenue, Sauerstown, Bulawayo". This turns that into the four fields the note
// needs — and says so when it could not, rather than filing half an address.

import type { RecipientInput } from './types';

/** Destination cities we deliver to. Used to find the city, never to invent one. */
const KNOWN_CITIES = [
  'Bulawayo', 'Harare', 'Gweru', 'Mutare', 'Masvingo', 'Kwekwe', 'Kadoma',
  'Chinhoyi', 'Marondera', 'Chitungwiza', 'Victoria Falls', 'Hwange',
  'Beitbridge', 'Gwanda', 'Plumtree', 'Zvishavane', 'Bindura', 'Chegutu',
  'Norton', 'Redcliff', 'Rusape', 'Karoi', 'Chiredzi', 'Shurugwi',
  'Esigodini', 'Filabusi', 'Lupane', 'Nkayi', 'Tsholotsho', 'Kariba',
];

/** A label the sender put in front of the details: "For Nana:", "Receiver -". */
const LEADING_LABEL = /^\s*(?:for|to|receiver|recipient|consignee|deliver to)\b[^:\-–—]{0,30}[:\-–—]\s*/i;

const PHONE = /(\+?\d[\d\s()-]{7,}\d)/;

export interface ParsedRecipient extends RecipientInput {
  /** Why the parse should not be trusted as-is. Empty means it read cleanly. */
  problems: string[];
}

export function parseRecipientText(raw: string): ParsedRecipient {
  const problems: string[] = [];
  const input = (raw || '').trim();
  if (!input) {
    return { name: '', phone: '', address: '', city: '', problems: ['Nothing to read.'] };
  }

  let text = input.replace(LEADING_LABEL, '');

  // Pull the phone out first so it cannot be mistaken for an address line.
  let phone = '';
  const phoneMatch = text.match(PHONE);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
    text = text.replace(phoneMatch[1], ' ').replace(/\s*,\s*,/g, ',');
  }

  const segments = text
    .split(/[,\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    return { name: '', phone, address: '', city: '', problems: ['No name or address could be read.'] };
  }

  const name = segments.shift() as string;
  if (!/\p{L}/u.test(name)) problems.push(`"${name}" does not look like a name.`);

  // The city is whichever segment matches a place we deliver to; falling back to
  // the last segment is a guess, so it is reported as one.
  let city = '';
  const cityIndex = segments.findIndex((segment) =>
    KNOWN_CITIES.some((known) => known.toLowerCase() === segment.toLowerCase()));

  if (cityIndex >= 0) {
    city = KNOWN_CITIES.find((known) => known.toLowerCase() === segments[cityIndex].toLowerCase()) as string;
    segments.splice(cityIndex, 1);
  } else if (segments.length > 1) {
    city = segments.pop() as string;
    problems.push(`"${city}" was taken as the destination city — confirm it.`);
  } else {
    problems.push('No destination city was found. The closing delivery row needs one.');
  }

  if (!segments.length) problems.push('No street address was found.');

  return { name, phone, address: segments.join('\n'), city, problems };
}
