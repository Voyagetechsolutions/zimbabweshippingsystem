import { describe, it, expect } from 'vitest';
import { parseRecipientText } from './recipient';

describe('parseRecipientText', () => {
  it('reads the shape the office actually pastes', () => {
    const parsed = parseRecipientText(
      'For Nana: NanaPetunia Simangele Mlilo, 12 Dollar Avenue, Sauerstown, Bulawayo',
    );
    expect(parsed).toMatchObject({
      name: 'NanaPetunia Simangele Mlilo',
      address: '12 Dollar Avenue\nSauerstown',
      city: 'Bulawayo',
      phone: '',
    });
    expect(parsed.problems).toEqual([]);
  });

  it('pulls a phone number out of the middle of the text', () => {
    const parsed = parseRecipientText('Thandiwe Sibanda, 0772 123 456, 8 Fife Street, Gweru');
    expect(parsed.phone).toBe('0772 123 456');
    expect(parsed.address).toBe('8 Fife Street');
    expect(parsed.city).toBe('Gweru');
  });

  it('accepts newlines as separators', () => {
    const parsed = parseRecipientText('Petunia Mlilo\n12 Dollar Avenue\nSauerstown\nBulawayo');
    expect(parsed.city).toBe('Bulawayo');
    expect(parsed.address).toBe('12 Dollar Avenue\nSauerstown');
  });

  it('finds the city wherever it sits, not only at the end', () => {
    const parsed = parseRecipientText('Petunia Mlilo, Bulawayo, 12 Dollar Avenue');
    expect(parsed.city).toBe('Bulawayo');
    expect(parsed.address).toBe('12 Dollar Avenue');
    expect(parsed.problems).toEqual([]);
  });

  it('normalises the casing of a city it recognises', () => {
    expect(parseRecipientText('Petunia Mlilo, 12 Dollar Ave, BULAWAYO').city).toBe('Bulawayo');
  });

  it('says so when the city is a guess rather than a match', () => {
    const parsed = parseRecipientText('Petunia Mlilo, 12 Dollar Avenue, Somewhereville');
    expect(parsed.city).toBe('Somewhereville');
    expect(parsed.problems[0]).toMatch(/confirm it/);
  });

  it('reports a missing city rather than leaving the delivery row half written', () => {
    const parsed = parseRecipientText('Petunia Mlilo');
    expect(parsed.city).toBe('');
    expect(parsed.problems.join(' ')).toMatch(/No destination city/);
  });

  it('reports a missing street address', () => {
    expect(parseRecipientText('Petunia Mlilo, Bulawayo').problems.join(' '))
      .toMatch(/No street address/);
  });

  it('handles empty input without throwing', () => {
    expect(parseRecipientText('   ').problems).toEqual(['Nothing to read.']);
  });

  it('strips assorted leading labels', () => {
    for (const label of ['Receiver:', 'To -', 'Consignee:', 'Deliver to:']) {
      expect(parseRecipientText(`${label} Petunia Mlilo, 12 Dollar Ave, Bulawayo`).name)
        .toBe('Petunia Mlilo');
    }
  });
});
