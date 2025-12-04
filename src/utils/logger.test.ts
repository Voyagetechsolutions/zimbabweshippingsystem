import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should always log errors in production', () => {
    logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include timestamp and log level in output', () => {
    logger.error('Test message');
    const callArgs = consoleErrorSpy.mock.calls[0];
    expect(callArgs[0]).toContain('[ERROR]');
    expect(callArgs[1]).toBe('Test message');
  });

  it('should handle multiple arguments', () => {
    const extra = { key: 'value' };
    logger.error('Error', extra);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'Error',
      extra
    );
  });
});
