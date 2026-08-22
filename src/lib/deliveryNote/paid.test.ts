import { describe, it, expect } from 'vitest';
import { resolvePaidStatus } from './paid';

describe('resolvePaidStatus', () => {
  it('stamps only when the red stamp is on the page and nothing is owed', () => {
    const result = resolvePaidStatus(true, 0);
    expect(result.paid).toBe(true);
    expect(result.unpaidHold).toBe(false);
    expect(result.flags).toHaveLength(0);
  });

  it('does not stamp a zero balance reached without a stamp', () => {
    const result = resolvePaidStatus(false, 0);
    expect(result.paid).toBe(false);
    expect(result.flags[0].id).toBe('zero-balance-no-stamp');
  });

  it('refuses the stamp for any balance, however small, and holds the load', () => {
    const result = resolvePaidStatus(true, 0.7);
    expect(result.paid).toBe(false);
    expect(result.unpaidHold).toBe(true);
    expect(result.flags[0].title).toMatch(/0\.70 still owing/);
  });

  it('treats an overpaid stamped invoice as paid but unusual', () => {
    const result = resolvePaidStatus(true, -15);
    expect(result.paid).toBe(true);
    expect(result.flags[0].id).toBe('overpaid');
  });

  it('does not stamp an overpaid invoice that carries no stamp', () => {
    const result = resolvePaidStatus(false, -15);
    expect(result.paid).toBe(false);
    expect(result.unpaidHold).toBe(true);
  });

  it('holds rather than guesses when the balance could not be read', () => {
    const result = resolvePaidStatus(true, null);
    expect(result.paid).toBe(false);
    expect(result.flags[0].id).toBe('balance-unreadable');
  });
});
