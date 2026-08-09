import { describe, it, expect, vi } from 'vitest';

// postalCodeUtils imports the Supabase client at module load, which would try to
// read Vite env vars. The route lookup under test only needs the static maps.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }) },
}));

const { coverageForPostcode, outwardCode, postcodePrefix, prettyPostcode, normalisePostcode } =
  await import('@/utils/addressLookup');
const { getRouteForPostalCode } = await import('@/utils/postalCodeUtils');

describe('postcode parsing', () => {
  it('strips spaces and punctuation and upper-cases', () => {
    expect(normalisePostcode('lu1 3xx')).toBe('LU13XX');
    expect(normalisePostcode('  b1-2aa ')).toBe('B12AA');
  });

  it('takes the outward code off a full postcode', () => {
    expect(outwardCode('LU1 1AA')).toBe('LU1');
    expect(outwardCode('SW1A 1AA')).toBe('SW1A');
    // Partial entry is returned as-is rather than being truncated to nothing.
    expect(outwardCode('LU1')).toBe('LU1');
  });

  it('reads the postcode area as whole letters', () => {
    expect(postcodePrefix('LU1 1AA')).toBe('LU');
    expect(postcodePrefix('G1 1AA')).toBe('G');
    expect(postcodePrefix('GL1 1AA')).toBe('GL');
    expect(postcodePrefix('N1 1AA')).toBe('N');
  });

  it('formats for display', () => {
    expect(prettyPostcode('lu11aa')).toBe('LU1 1AA');
    expect(prettyPostcode('sw1a1aa')).toBe('SW1A 1AA');
  });
});

describe('coverageForPostcode', () => {
  it('accepts a postcode on a published route', () => {
    const luton = coverageForPostcode('LU1 1AA');
    expect(luton.status).toBe('covered');
    expect(luton.route).toBe('NORTHAMPTON');
  });

  it('rejects an area we do not service', () => {
    // Glasgow, Newcastle and Edinburgh are on the restricted list.
    expect(coverageForPostcode('G1 1AA').status).toBe('not_covered');
    expect(coverageForPostcode('NE1 1AA').status).toBe('not_covered');
    expect(coverageForPostcode('EH1 1AA').status).toBe('not_covered');
  });

  it('does not let the single-letter restricted area G reject GL or GU', () => {
    // Regression: a `startsWith` check made restricted "G" (Glasgow) also match
    // GL (Gloucester, Cardiff route) and GU (Guildford, Bournemouth route), so
    // real customers in those areas were told we do not collect from them.
    const gloucester = coverageForPostcode('GL1 1AA');
    expect(gloucester.status).toBe('covered');
    expect(gloucester.route).toBe('CARDIFF');

    const guildford = coverageForPostcode('GU1 1AA');
    expect(guildford.status).toBe('covered');
    expect(guildford.route).toBe('BOURNEMOUTH');

    expect(getRouteForPostalCode('GL1 1AA')).toBe('CARDIFF');
    expect(getRouteForPostalCode('GU1 1AA')).toBe('BOURNEMOUTH');
  });

  it('keeps London areas working where a short area could shadow a longer one', () => {
    expect(coverageForPostcode('N1 1AA').route).toBe('LONDON');
    expect(coverageForPostcode('NW1 1AA').route).toBe('LONDON');
    expect(coverageForPostcode('SE1 1AA').route).toBe('LONDON');
    // Sheffield is on the Leeds route; Sunderland is restricted.
    expect(coverageForPostcode('S1 1AA').route).toBe('LEEDS');
    expect(coverageForPostcode('SR1 1AA').status).toBe('not_covered');
  });

  it('asks for confirmation on an unrecognised area rather than refusing', () => {
    // ZZ is not on any route and not on the restricted list.
    const unknown = coverageForPostcode('ZZ1 1AA');
    expect(unknown.status).toBe('needs_confirmation');
    expect(unknown.route).toBeNull();
  });

  it('stays silent until enough has been typed to judge', () => {
    expect(coverageForPostcode('').status).toBe('unknown');
    expect(coverageForPostcode('L').status).toBe('unknown');
  });
});
