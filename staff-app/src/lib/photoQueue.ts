import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isMissingBackend, isNetworkError } from './offlineQueue';

/**
 * Proof photos taken in a dead zone, uploaded when there is signal again.
 *
 * The queue holds the *file URI* the camera gave us, not the image bytes.
 * ImagePicker writes the photo into the app's own cache directory and React
 * Native's fetch can read a file:// URI, so a few short strings in
 * AsyncStorage replace what would otherwise be megabytes of base64 — which
 * AsyncStorage is a poor place for and which would need expo-file-system, a
 * native dependency and therefore a new build of the app.
 *
 * The trade is that the OS may clear its cache before we get signal. That is
 * rare over the minutes a dead zone usually lasts, and a lost proof photo is
 * survivable: photos are optional evidence, not a gate on the collection. A
 * dropped entry says so rather than failing silently.
 */

export type QueuedPhoto = {
  id: string;
  uri: string;
  proofType: string;
  stopId: string;
  shipmentId: string;
  driverId: string;
  queuedAt: string;
};

const KEY = 'driver-photo-queue-v1';

async function readQueue(): Promise<QueuedPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedPhoto[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // A full disk is not worth crashing a collection over.
  }
}

export async function queuePhoto(entry: Omit<QueuedPhoto, 'id' | 'queuedAt'>): Promise<void> {
  const queue = await readQueue();
  queue.push({
    ...entry,
    id: `${entry.stopId}-${entry.proofType}-${Date.now()}`,
    queuedAt: new Date().toISOString(),
  });
  await writeQueue(queue);
}

export async function queuedPhotoCount(stopId?: string): Promise<number> {
  const queue = await readQueue();
  return stopId ? queue.filter((p) => p.stopId === stopId).length : queue.length;
}

/** Read a local file:// URI as bytes. */
async function readLocalFile(uri: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return bytes.byteLength ? bytes : null;
  } catch {
    return null;
  }
}

export type FlushResult = { uploaded: number; dropped: number; remaining: number };

/**
 * Try every queued photo once.
 *
 * An entry is kept on a network failure and dropped when the file itself has
 * gone, because retrying a file the OS has deleted can only fail forever.
 */
export async function flushPhotoQueue(): Promise<FlushResult> {
  const queue = await readQueue();
  if (!queue.length) return { uploaded: 0, dropped: 0, remaining: 0 };

  const keep: QueuedPhoto[] = [];
  let uploaded = 0;
  let dropped = 0;

  for (const item of queue) {
    const bytes = await readLocalFile(item.uri);
    if (!bytes) { dropped++; continue; }

    try {
      const path = `${item.driverId}/${item.shipmentId}/${item.stopId}-${item.proofType}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('driver-proofs')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase.from('driver_proofs').insert({
        shipment_id: item.shipmentId,
        stop_id: item.stopId,
        driver_id: item.driverId,
        proof_type: item.proofType,
        storage_path: path,
      });
      if (rowError) throw rowError;

      uploaded++;
    } catch (error) {
      if (isNetworkError(error) || isMissingBackend(error)) {
        keep.push(item);
      } else {
        // A rejected upload (bad type, policy) will be rejected next time too.
        dropped++;
      }
    }
  }

  await writeQueue(keep);
  return { uploaded, dropped, remaining: keep.length };
}
