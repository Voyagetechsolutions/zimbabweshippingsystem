import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Vans lose signal constantly. Status changes that fail with a network error
// are queued here and replayed next time the run screen loads or refreshes,
// so a driver can keep working through a dead zone.

export type QueuedCall = {
  id: string;
  fn:
    | 'transition_driver_stop'
    | 'fail_driver_stop'
    | 'arrive_driver_stop'
    | 'scan_driver_package'
    | 'scan_driver_package_for_country'
    | 'set_driver_presence'
    | 'set_driver_break'
    | 'request_driver_reschedule';
  args: Record<string, unknown>;
  stopId: string | null;
  queuedAt: string;
};

const KEY = 'driver-offline-queue-v1';

export function isNetworkError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('network') || message.includes('fetch') || message.includes('timeout') ||
    message.includes('failed to connect') || message.includes('abort');
}

/**
 * True when the database object this call needs is not deployed yet.
 *
 * An installed app outlives any single schema version: a driver on an older
 * build can call a function a later migration removed, and a driver on a newer
 * build can call one that has not been applied to the database yet. Both look
 * identical from here — PostgREST answers "not in the schema cache" (PGRST202
 * for a function, PGRST205 for a table) and Postgres answers 42883 / 42P01.
 *
 * It is deliberately not treated as a normal failure: the work is real, so
 * queued calls are kept rather than dropped, and optional telemetry stays quiet
 * instead of telling a driver their connection is broken when it is not.
 */
export function isMissingBackend(error: unknown): boolean {
  const code = String((error as any)?.code || '').toUpperCase();
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01') return true;
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('schema cache') || message.includes('does not exist');
}

/**
 * What a driver is told when a feature's backend has not reached this database.
 *
 * Never "check your connection": the phone is online, the signal is fine, and
 * sending a driver to look for one wastes their time and a dispatch call.
 */
export const BACKEND_PENDING_MESSAGE =
  'This part of the driver app is not switched on for your account yet. Dispatch can enable it — carry on with the rest of your route.';

export async function readQueue(): Promise<QueuedCall[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedCall[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue)).catch(() => {});
}

export async function enqueue(call: Omit<QueuedCall, 'id' | 'queuedAt'>) {
  const queue = await readQueue();
  queue.push({ ...call, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
}

export async function queueCount() {
  return (await readQueue()).length;
}

// Replays queued calls in order. Network failures keep the item (and stop the
// flush — later items usually depend on earlier ones for the same stop).
// Server-side rejections (invalid transition etc.) drop the item so one bad
// update can't block the queue forever.
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const queue = await readQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };
  const remaining: QueuedCall[] = [];
  let flushed = 0;
  for (let i = 0; i < queue.length; i += 1) {
    const call = queue[i];
    try {
      const { error } = await supabase.rpc(call.fn, call.args as any);
      if (error) {
        // Missing backend is held, not dropped: the call is valid work that the
        // database cannot accept yet, and it will replay once the schema ships.
        if (isNetworkError(error) || isMissingBackend(error)) {
          remaining.push(...queue.slice(i));
          break;
        }
        // Rejected by the server — drop it and continue.
        console.warn('Dropping queued driver update:', call.fn, error.message);
      } else {
        flushed += 1;
      }
    } catch (e) {
      if (isNetworkError(e) || isMissingBackend(e)) {
        remaining.push(...queue.slice(i));
        break;
      }
      console.warn('Dropping queued driver update:', call.fn, e);
    }
  }
  await writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
