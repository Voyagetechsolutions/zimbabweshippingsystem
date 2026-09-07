import { describe, it, expect, beforeEach, vi } from 'vitest';

// The real modules reach for React Native and expo, neither of which exists in
// a jsdom test run, so they are replaced wholesale. What is under test here is
// the queue's own decision-making: what it keeps, what it drops, and what it
// never retries.
const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
  },
}));

const uploadMock = vi.fn();
const insertMock = vi.fn();
vi.mock('./supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: (...a: unknown[]) => uploadMock(...a) }) },
    from: () => ({ insert: (...a: unknown[]) => insertMock(...a) }),
  },
}));

import { flushPhotoQueue, queuePhoto, queuedPhotoCount } from './photoQueue';

const entry = (overrides: Partial<Parameters<typeof queuePhoto>[0]> = {}) => ({
  uri: 'file:///cache/photo.jpg',
  proofType: 'pickup_departure',
  stopId: 'stop-1',
  shipmentId: 'ship-1',
  driverId: 'driver-1',
  ...overrides,
});

/** Make global fetch behave like a file:// read that succeeds or fails. */
function mockFileRead(ok: boolean, bytes = 32) {
  (globalThis as any).fetch = vi.fn(async () => ok
    ? { ok: true, arrayBuffer: async () => new ArrayBuffer(bytes) }
    : { ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
}

beforeEach(() => {
  store.clear();
  uploadMock.mockReset();
  insertMock.mockReset();
  uploadMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
  mockFileRead(true);
});

describe('queuePhoto', () => {
  it('keeps photos queued per stop', async () => {
    await queuePhoto(entry());
    await queuePhoto(entry({ stopId: 'stop-2' }));
    expect(await queuedPhotoCount()).toBe(2);
    expect(await queuedPhotoCount('stop-1')).toBe(1);
  });

  it('reports an empty queue rather than throwing', async () => {
    expect(await queuedPhotoCount()).toBe(0);
    expect(await flushPhotoQueue()).toEqual({ uploaded: 0, dropped: 0, remaining: 0 });
  });
});

describe('flushPhotoQueue', () => {
  it('uploads a queued photo and clears it', async () => {
    await queuePhoto(entry());
    const result = await flushPhotoQueue();
    expect(result).toEqual({ uploaded: 1, dropped: 0, remaining: 0 });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(await queuedPhotoCount()).toBe(0);
  });

  it('keeps the photo when there is still no signal', async () => {
    await queuePhoto(entry());
    uploadMock.mockResolvedValue({ error: { message: 'Network request failed' } });
    const result = await flushPhotoQueue();
    expect(result.uploaded).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await queuedPhotoCount()).toBe(1);
  });

  it('drops a photo the operating system has already deleted', async () => {
    // The cache directory is not ours to keep. Retrying a file that is gone can
    // only fail forever, so it must leave the queue.
    await queuePhoto(entry());
    mockFileRead(false);
    const result = await flushPhotoQueue();
    expect(result).toEqual({ uploaded: 0, dropped: 1, remaining: 0 });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('drops a photo the server refuses, so one bad file cannot block the queue', async () => {
    await queuePhoto(entry());
    uploadMock.mockResolvedValue({ error: { message: 'mime type not allowed' } });
    const result = await flushPhotoQueue();
    expect(result).toEqual({ uploaded: 0, dropped: 1, remaining: 0 });
  });

  it('holds everything when the database has not caught up yet', async () => {
    // An installed app can be newer than the schema; that is real work waiting,
    // not a bad file.
    await queuePhoto(entry());
    insertMock.mockResolvedValue({
      error: { message: 'Could not find the table in the schema cache', code: 'PGRST205' },
    });
    const result = await flushPhotoQueue();
    expect(result.remaining).toBe(1);
    expect(result.dropped).toBe(0);
  });

  it('uploads each photo under its own path so two never collide', async () => {
    await queuePhoto(entry({ proofType: 'pickup_departure' }));
    await queuePhoto(entry({ proofType: 'seal' }));
    await flushPhotoQueue();
    const paths = uploadMock.mock.calls.map((call) => String(call[0]));
    expect(new Set(paths).size).toBe(2);
    expect(paths.every((p) => p.startsWith('driver-1/ship-1/stop-1-'))).toBe(true);
  });

  it('carries on past a dead file to upload the good ones', async () => {
    await queuePhoto(entry({ uri: 'file:///cache/gone.jpg' }));
    await queuePhoto(entry({ uri: 'file:///cache/here.jpg' }));
    (globalThis as any).fetch = vi.fn(async (uri: string) => (String(uri).includes('gone')
      ? { ok: false, arrayBuffer: async () => new ArrayBuffer(0) }
      : { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }));

    const result = await flushPhotoQueue();
    expect(result).toEqual({ uploaded: 1, dropped: 1, remaining: 0 });
  });
});
