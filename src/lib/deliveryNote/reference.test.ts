import { describe, it, expect } from 'vitest';
import { parseBillTo, deriveReference, looksLikeInitials } from './reference';

describe('parseBillTo', () => {
  it('strips the leading digit run before reading the name', () => {
    const parsed = parseBillTo('5328 Sithokozile Ncube\n14 Marsh Lane\nLeeds');
    expect(parsed.leadingDigits).toBe('5328');
    expect(parsed.givenName).toBe('Sithokozile');
    expect(parsed.ambiguities).toEqual([]);
  });

  it('skips a title when identifying the name', () => {
    const parsed = parseBillTo('4471 Mrs Patience Moyo\n8 Rose Court');
    expect(parsed.givenName).toBe('Patience');
    expect(parsed.name).toBe('Patience Moyo');
    expect(parsed.ambiguities).toEqual([]);
  });

  it('keeps a city off the name when both share the first line', () => {
    const parsed = parseBillTo('1180 Nomsa Dube Bulawayo\n22 Fife Street');
    expect(parsed.name).toBe('Nomsa Dube');
    expect(parsed.cityOnNameLine).toBe('Bulawayo');
  });

  it('flags an initials-only name rather than taking three letters of it', () => {
    expect(parseBillTo('9021 SN Ndebele').ambiguities).toHaveLength(1);
    expect(parseBillTo('9021 SN Ndebele').ambiguities[0]).toMatch(/initials/i);
    expect(parseBillTo('9021 M.M').ambiguities[0]).toMatch(/initials/i);
  });

  it('flags a Lady name as a title-versus-name ambiguity', () => {
    const parsed = parseBillTo('7788 Lady Sibanda\n3 High Road');
    expect(parsed.ambiguities.some((a) => /courtesy title/i.test(a))).toBe(true);
  });

  it('flags a block naming two plausible people', () => {
    const parsed = parseBillTo('4102 Nana Leeds From Mrs Walker');
    expect(parsed.ambiguities.some((a) => /more than one person/i.test(a))).toBe(true);
  });

  it('flags a name that may have been OCR split across two lines', () => {
    const parsed = parseBillTo('4102 Sithokozile\nNcube');
    expect(parsed.ambiguities.some((a) => /continue on the next line/i.test(a))).toBe(true);
  });

  it('reports an empty block instead of returning a blank name silently', () => {
    expect(parseBillTo('').ambiguities).toHaveLength(1);
    expect(parseBillTo('   \n  ').ambiguities[0]).toMatch(/empty/i);
  });
});

describe('looksLikeInitials', () => {
  it.each(['M.M', 'M.M.', 'SN', 'J', 'J.K.L'])('treats %s as initials', (token) => {
    expect(looksLikeInitials(token)).toBe(true);
  });

  it.each(['Sithokozile', 'Nana', 'Ann', 'Moyo'])('treats %s as a name', (token) => {
    expect(looksLikeInitials(token)).toBe(false);
  });
});

describe('deriveReference', () => {
  it('is three letters of the given name plus the invoice number as printed', () => {
    expect(deriveReference('Sithokozile', '04265328')).toBe('SIT04265328');
  });

  it('keeps a printed letter suffix as part of the invoice number', () => {
    expect(deriveReference('Patience', '05261180B')).toBe('PAT05261180B');
    expect(deriveReference('Nomsa', '0326444 OVERSPILL')).toBe('NOM0326444 OVERSPILL');
  });

  it('appends an explicitly assigned load suffix', () => {
    expect(deriveReference('Nomsa', '04265328', 'b')).toBe('NOM04265328B');
  });

  it('returns nothing rather than a partial reference when a half is missing', () => {
    expect(deriveReference('', '04265328')).toBe('');
    expect(deriveReference('Nomsa', '')).toBe('');
  });
});
