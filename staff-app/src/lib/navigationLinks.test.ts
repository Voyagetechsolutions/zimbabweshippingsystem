import { describe, it, expect } from 'vitest';
import {
  MAX_WAYPOINTS,
  appleMapsUrl,
  googleMapsUrl,
  multiStopGoogleMapsUrl,
  navigationOptions,
  wazeUrl,
} from './navigationLinks';

const LEEDS = { latitude: 53.8008, longitude: -1.5491 };

describe('single-stop links', () => {
  it('uses coordinates when they are available', () => {
    expect(googleMapsUrl(LEEDS)).toContain('destination=53.8008%2C-1.5491');
    expect(wazeUrl(LEEDS)).toBe('https://waze.com/ul?ll=53.8008,-1.5491&navigate=yes');
    expect(appleMapsUrl(LEEDS)).toContain('daddr=53.8008%2C-1.5491');
  });

  it('falls back to the address when there is no point', () => {
    const target = { address: '41A North street, Rochford' };
    expect(googleMapsUrl(target)).toContain(encodeURIComponent('41A North street, Rochford'));
    expect(wazeUrl(target)).toContain('q=41A%20North%20street%2C%20Rochford');
    expect(appleMapsUrl(target)).toContain(encodeURIComponent('41A North street, Rochford'));
  });

  it('returns null rather than a broken link when there is nothing to navigate to', () => {
    for (const target of [{}, { address: '' }, { address: 'x' }, { latitude: 0, longitude: 0 }]) {
      expect(googleMapsUrl(target)).toBeNull();
      expect(wazeUrl(target)).toBeNull();
      expect(appleMapsUrl(target)).toBeNull();
    }
  });

  it('ignores out-of-range and non-finite coordinates', () => {
    expect(googleMapsUrl({ latitude: 91, longitude: 0 })).toBeNull();
    expect(googleMapsUrl({ latitude: NaN, longitude: 1 })).toBeNull();
    expect(googleMapsUrl({ latitude: 1, longitude: 181 })).toBeNull();
  });

  it('prefers the point over the address when it has both', () => {
    const url = googleMapsUrl({ ...LEEDS, address: 'somewhere vague' });
    expect(url).toContain('53.8008');
    expect(url).not.toContain('vague');
  });
});

describe('navigationOptions', () => {
  it('offers Apple Maps only on iOS', () => {
    expect(navigationOptions(LEEDS, 'ios').map((o) => o.app)).toEqual(['google', 'waze', 'apple']);
    expect(navigationOptions(LEEDS, 'android').map((o) => o.app)).toEqual(['google', 'waze']);
  });

  it('offers nothing when the stop cannot be located', () => {
    expect(navigationOptions({ address: '' }, 'ios')).toEqual([]);
  });
});

describe('multiStopGoogleMapsUrl', () => {
  const stops = [
    { latitude: 53.40, longitude: -2.99 },
    { latitude: 53.41, longitude: -2.98 },
    { latitude: 53.42, longitude: -2.97 },
  ];

  it('makes the last stop the destination and the rest waypoints', () => {
    const result = multiStopGoogleMapsUrl(LEEDS, stops);
    expect(result).not.toBeNull();
    expect(result!.covered).toBe(3);
    const url = new URL(result!.url);
    expect(url.searchParams.get('destination')).toBe('53.42,-2.97');
    expect(url.searchParams.get('waypoints')).toBe('53.4,-2.99|53.41,-2.98');
    expect(url.searchParams.get('origin')).toBe('53.8008,-1.5491');
  });

  it('caps the stops it claims to cover so it never silently skips a collection', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ latitude: 53 + i * 0.01, longitude: -2 }));
    const result = multiStopGoogleMapsUrl(null, many);
    expect(result!.covered).toBe(MAX_WAYPOINTS + 1);
    const url = new URL(result!.url);
    expect(url.searchParams.get('waypoints')!.split('|')).toHaveLength(MAX_WAYPOINTS);
    expect(url.searchParams.get('origin')).toBeNull();
  });

  it('skips stops with no location instead of failing outright', () => {
    const result = multiStopGoogleMapsUrl(null, [{ address: '' }, ...stops]);
    expect(result!.covered).toBe(3);
  });

  it('returns null when no stop can be located', () => {
    expect(multiStopGoogleMapsUrl(LEEDS, [{ address: '' }, {}])).toBeNull();
  });
});
