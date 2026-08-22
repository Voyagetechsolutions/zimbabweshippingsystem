// Bill To parsing and delivery-note reference derivation.
//
// REF = first 3 letters of the shipper's given name + the invoice number
// exactly as printed. Simple when the Bill To block is clean; the value of
// this module is everything it refuses to guess at when it is not.

export const NAME_TITLES = new Set([
  'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss', 'mx', 'dr', 'dr.',
  'lady', 'sir', 'madam', 'mister', 'prof', 'prof.',
]);

/**
 * Titles that are themselves the ambiguity. "Lady Sibanda" may be a courtesy
 * title on a surname or may be the given name the customer goes by, and the
 * two produce different references (SIB vs LAD).
 */
const AMBIGUOUS_TITLES = new Set(['lady', 'sir', 'madam']);

/** Destination cities that routinely share a line with the name. */
const KNOWN_CITIES = [
  'bulawayo', 'harare', 'gweru', 'mutare', 'masvingo', 'kwekwe', 'kadoma',
  'chinhoyi', 'marondera', 'chitungwiza', 'victoria falls', 'hwange',
  'beitbridge', 'gwanda', 'plumtree', 'zvishavane', 'bindura', 'chegutu',
  'norton', 'redcliff', 'rusape', 'karoi', 'chiredzi', 'shurugwi',
  'esigodini', 'filabusi', 'lupane', 'nkayi', 'tsholotsho', 'kariba',
];

/** Phrases that mean the block names more than one person. */
const SPLIT_MARKERS = /\b(from|c\/o|care of|on behalf of)\b|[&/]|\band\b/i;

export interface BillToParse {
  /** The digit run the block leads with, usually the invoice's last 4. */
  leadingDigits: string;
  /** The name portion, titles and city removed. */
  name: string;
  /** The token the reference prefix is taken from. */
  givenName: string;
  /** A city found on the name line, if any. */
  cityOnNameLine: string;
  /** Remaining lines of the block: address, and sometimes more of the name. */
  addressLines: string[];
  /**
   * Why this parse must not be trusted without a human. Empty means clean.
   * Each entry is written to be shown to the operator as-is.
   */
  ambiguities: string[];
}

function stripPunctuation(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.]+$/gu, '');
}

/** "M.M", "SN", "J" — a set of initials rather than a name to take 3 letters from. */
export function looksLikeInitials(token: string): boolean {
  const t = stripPunctuation(token);
  if (!t) return false;
  if (/^(?:\p{L}\.){1,4}$/u.test(t)) return true;          // M.M. / J.K.
  if (/^\p{L}\.\p{L}$/u.test(t)) return true;              // M.M
  const letters = t.replace(/\./g, '');
  if (letters.length <= 2) return true;                    // SN, J
  // Three or more letters with no vowel reads as initials, not a name.
  return letters.length <= 3 && !/[aeiouAEIOU]/.test(letters);
}

/**
 * Splits the printed Bill To block into its parts without inventing any of
 * them. Anything that does not parse into a single clear name is reported in
 * `ambiguities` instead of being resolved by a tie-break heuristic.
 */
export function parseBillTo(billToRaw: string): BillToParse {
  const lines = (billToRaw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ambiguities: string[] = [];
  if (lines.length === 0) {
    return {
      leadingDigits: '', name: '', givenName: '', cityOnNameLine: '',
      addressLines: [],
      ambiguities: ['The Bill To block is empty — the shipper has to be entered by hand.'],
    };
  }

  const first = lines[0];
  // The block usually leads with digits matching the invoice's last 4. They are
  // an index, not part of the name, so they come off before any letters are read.
  const digitMatch = first.match(/^[\d\s-]*\d/);
  const leadingDigits = digitMatch ? digitMatch[0].replace(/\D/g, '') : '';
  let remainder = first.slice(digitMatch ? digitMatch[0].length : 0).trim();
  remainder = remainder.replace(/^[-–—,:.]+\s*/, '').trim();

  if (SPLIT_MARKERS.test(remainder)) {
    ambiguities.push(
      `"${remainder}" names more than one person — pick which is the paying customer before generating.`,
    );
  }

  // A city sharing the name line must not be absorbed into the name.
  let cityOnNameLine = '';
  const lowered = remainder.toLowerCase();
  for (const city of KNOWN_CITIES) {
    const at = lowered.lastIndexOf(city);
    if (at > 0 && at + city.length >= lowered.length - 1) {
      cityOnNameLine = remainder.slice(at, at + city.length);
      remainder = remainder.slice(0, at).replace(/[,\s]+$/, '').trim();
      break;
    }
  }

  const tokens = remainder.split(/\s+/).map(stripPunctuation).filter(Boolean);
  const titles = tokens.filter((t) => NAME_TITLES.has(t.toLowerCase()));
  const nameTokens = tokens.filter((t) => !NAME_TITLES.has(t.toLowerCase()));

  for (const title of titles) {
    if (AMBIGUOUS_TITLES.has(title.toLowerCase())) {
      ambiguities.push(
        `"${title}" may be a courtesy title or part of the name — confirm which name the reference should use.`,
      );
    }
  }

  const name = nameTokens.join(' ');
  const givenName = nameTokens[0] || '';

  if (!givenName) {
    ambiguities.push('No name could be read from the Bill To block.');
  } else if (looksLikeInitials(givenName)) {
    ambiguities.push(
      `"${givenName}" reads as initials rather than a given name — enter the full first name for the reference.`,
    );
  } else if (givenName.replace(/[^\p{L}]/gu, '').length < 3) {
    ambiguities.push(`"${givenName}" is shorter than the 3 letters the reference needs.`);
  }

  // A lone token on line 1 with more letters on line 2 is the signature of a
  // name OCR'd across two lines.
  const rest = lines.slice(1);
  if (nameTokens.length === 1 && rest[0] && /^[\p{L}\s'-]+$/u.test(rest[0]) && !/\d/.test(rest[0])) {
    ambiguities.push(
      `The name may continue on the next line ("${rest[0]}") — confirm the full shipper name.`,
    );
  }

  return { leadingDigits, name, givenName, cityOnNameLine, addressLines: rest, ambiguities };
}

/**
 * REF = 3 letters of the given name + the invoice number exactly as printed.
 * A printed suffix (B, OVERSPILL) is part of the invoice number and is kept.
 */
export function deriveReference(givenName: string, invoiceNumber: string, loadSuffix = ''): string {
  const letters = (givenName || '').replace(/[^\p{L}]/gu, '').toUpperCase().slice(0, 3);
  const invoice = (invoiceNumber || '').trim();
  if (!letters || !invoice) return '';
  return `${letters}${invoice}${(loadSuffix || '').trim().toUpperCase()}`;
}
