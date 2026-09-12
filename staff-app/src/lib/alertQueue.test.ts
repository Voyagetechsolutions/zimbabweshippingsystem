import { describe, expect, it, vi } from 'vitest';
import { alertSurface, createAlertQueue } from './alertQueue';

describe('staff alert queue', () => {
  it('keeps every dialog in order rather than losing a confirmation', () => {
    const queue = createAlertQueue();
    const first = { title: 'Confirm', buttons: [{ text: 'Cancel' }, { text: 'Approve' }] };
    const second = { title: 'Result', buttons: [{ text: 'OK' }] };
    queue.push(first); queue.push(second);
    expect(queue.current()).toBe(first);
    expect(queue.take(first)).toBe(true);
    expect(queue.current()).toBe(second);
    expect(queue.take(first)).toBe(false);
    expect(queue.current()).toBe(second);
  });
  it('preserves long menus and cancellation callbacks', () => {
    const queue = createAlertQueue();
    const onDismiss = vi.fn();
    const dialog = { title: 'Routes', buttons: Array.from({ length: 9 }, (_, i) => ({ text: String(i) })), onDismiss };
    queue.push(dialog);
    expect(queue.current()?.buttons).toHaveLength(9);
    expect(onDismiss).not.toHaveBeenCalled();
  });
  it('notifies mounted hosts and cleans up subscribers', () => {
    const queue = createAlertQueue(); const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    const dialog = { title: 'Error', buttons: [] };
    queue.push(dialog); queue.take(dialog);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(queue.current()).toBeNull();
    unsubscribe(); queue.push(dialog);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('alertSurface', () => {
  // The web no-op is the whole reason this shim exists: a confirmation that
  // never renders reads to the user as a dead button.
  it('never uses the native dialog on web', () => {
    expect(alertSurface('web', 1)).toBe('sheet');
    expect(alertSurface('web', 2)).toBe('sheet');
  });

  // Android caps a native alert at three buttons and drops the rest without
  // saying so. Twelve failed-stop reasons plus Cancel left two reachable.
  it('moves an Android menu to a sheet once it passes three buttons', () => {
    expect(alertSurface('android', 3)).toBe('native');
    expect(alertSurface('android', 4)).toBe('sheet');
    expect(alertSurface('android', 13)).toBe('sheet');
  });

  // iOS stacks buttons and has no cap, so a long menu stays native there.
  it('leaves iOS alone however long the menu', () => {
    expect(alertSurface('ios', 3)).toBe('native');
    expect(alertSurface('ios', 13)).toBe('native');
  });

  it('keeps ordinary confirmations native on a phone', () => {
    expect(alertSurface('android', 2)).toBe('native');
    expect(alertSurface('ios', 2)).toBe('native');
  });
});
