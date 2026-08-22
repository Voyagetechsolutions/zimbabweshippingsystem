import { describe, it, expect } from 'vitest';
import { checkInvoiceAgainstPhone, digitsOnly, lastFour, normalisePhone } from './phone';

describe('checkInvoiceAgainstPhone', () => {
  it('passes when the last four digits agree', () => {
    const check = checkInvoiceAgainstPhone('04265328', '+44 7700 905328');
    expect(check.matches).toBe(true);
    expect(check.invoiceLastFour).toBe('5328');
  });

  it('reports a mismatch without touching either value', () => {
    const check = checkInvoiceAgainstPhone('04265328', '07700 901234');
    expect(check.matches).toBe(false);
    expect(check.invoiceLastFour).toBe('5328');
    expect(check.phoneLastFour).toBe('1234');
  });

  it('runs on digits only, so formatting cannot cause a false mismatch', () => {
    expect(checkInvoiceAgainstPhone('0426-5328', '+44 (0) 7700-905328').matches).toBe(true);
  });

  it('does not claim a mismatch when one side is too short to compare', () => {
    const check = checkInvoiceAgainstPhone('04265328', '077');
    expect(check.comparable).toBe(false);
    expect(check.matches).toBe(true);
  });

  it('ignores a printed letter suffix when reading the invoice digits', () => {
    expect(checkInvoiceAgainstPhone('05261180B', '07700 901180').matches).toBe(true);
  });
});

describe('normalisePhone', () => {
  it('formats a UK national number as +44, grouped for reading off paper', () => {
    expect(normalisePhone('07700 905328', 'UK').value).toBe('+44 7700 905328');
  });

  it('formats a Zimbabwean national number as +263, grouped', () => {
    expect(normalisePhone('0772 123 456', 'ZW').value).toBe('+263 772 123 456');
  });

  it('turns an 00263 international prefix into +263', () => {
    expect(normalisePhone('00263772123456', 'ZW').value).toBe('+263 772 123 456');
  });

  it('reads 0027 as Zimbabwe but says so rather than rewriting silently', () => {
    const result = normalisePhone('0027772123456', 'ZW');
    expect(result.value).toBe('+263 772 123 456');
    expect(result.note).toMatch(/0027/);
  });

  it('leaves an already international number alone apart from spacing', () => {
    expect(normalisePhone('+263 77 212 3456', 'ZW').value).toBe('+263 772 123 456');
    expect(normalisePhone('+44 7700 905328', 'UK').note).toBeNull();
  });

  it('leaves an unrecognised length ungrouped rather than inventing a shape', () => {
    expect(normalisePhone('+44 12345', 'UK').value).toBe('+44 12345');
    expect(normalisePhone('+1 5551234567', 'UK').value).toBe('+15551234567');
  });

  it('groups without changing any digit, so the last-4 check still holds', () => {
    const formatted = normalisePhone('07700 905328', 'UK').value;
    expect(checkInvoiceAgainstPhone('04265328', formatted).matches).toBe(true);
  });

  it('returns empty for empty input rather than a bare dial code', () => {
    expect(normalisePhone('', 'UK').value).toBe('');
    expect(normalisePhone('   ', 'ZW').value).toBe('');
  });
});

describe('digit helpers', () => {
  it('strips everything that is not a digit', () => {
    expect(digitsOnly('+44 (0) 7700-905328')).toBe('4407700905328');
  });

  it('returns nothing when there are fewer than four digits', () => {
    expect(lastFour('12')).toBe('');
  });
});
