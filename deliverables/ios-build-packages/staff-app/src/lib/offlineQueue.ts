import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Vans lose signal constantly. Status changes that fail with a network error
// are queued here and replayed next time the run screen loads or refreshes,
// so a driver can keep working through a dead zone.

export type QueuedCall = {
  id: string;
  fn: 'transition_driver_stop' | 'fail_driver_stop';
  args: Record<string, unknown>;
  stopId: string;
  queuedAt: string;
};

const KEY = 'driver-offline-queue-v1';

export function isNetworkError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('network') || message.includes('fetch') || message.includes('timeout') ||
    message.includes('failed to connect') || message.includes('abort');
}

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
        if (isNetworkError(error)) {
          remaining.push(...queue.slice(i));
          break;
        }
        // Rejected by the server — drop it and continue.
        console.warn('Dropping queued driver update:', call.fn, error.message);
      } else {
        flushed += 1;
      }
    } catch (e) {
      if (isNetworkError(e)) {
        remaining.push(...queue.slice(i));
        break;
      }
      console.warn('Dropping queued driver update:', call.fn, e);
    }
  }
  await writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
