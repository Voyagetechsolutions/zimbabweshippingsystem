import { Alert } from 'react-native';
import { supabase } from './supabase';
import { isMissingBackend, isNetworkError } from './offlineQueue';

/**
 * Deleting things, everywhere, the same way.
 *
 * Every delete in this app is soft. A shipment carries an invoice, a delivery
 * note, a driver's photos and a customer's payment; removing the row would
 * orphan all of it, and "we deleted it" is not an answer when the customer
 * rings. The row is marked instead, and the same call restores it.
 *
 * What may be deleted is decided by the database, not here — `set_records_deleted`
 * checks the table against its own whitelist, because a table name coming from
 * a client is only safe when the set of acceptable answers is fixed server-side.
 * Records of what happened (payments, receipts, audit logs, proof photos) are
 * not on that list by design.
 */

export type DeletableTable =
  | 'shipments'
  | 'custom_quotes'
  | 'finance_expenses'
  | 'pickup_zones'
  | 'collection_schedules'
  | 'collection_periods'
  | 'customers'
  | 'staff_messages'
  | 'collection_runs';

export type DeleteOutcome =
  | { ok: true; changed: number }
  | { ok: false; reason: 'offline' | 'not-deployed' | 'denied' | 'error'; message: string };

export async function setRecordsDeleted(
  table: DeletableTable,
  ids: string[],
  deleted = true,
): Promise<DeleteOutcome> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return { ok: true, changed: 0 };

  const { data, error } = await supabase.rpc('set_records_deleted', {
    p_table: table,
    p_ids: clean,
    p_deleted: deleted,
  });

  if (error) {
    if (isNetworkError(error)) {
      return { ok: false, reason: 'offline', message: 'No signal. Try again when you are back online.' };
    }
    if (isMissingBackend(error)) {
      return {
        ok: false,
        reason: 'not-deployed',
        message: 'This app is newer than the database. Ask the office to run the setup.',
      };
    }
    if (String(error.code) === '42501') {
      return { ok: false, reason: 'denied', message: error.message };
    }
    return { ok: false, reason: 'error', message: error.message };
  }

  return { ok: true, changed: Number((data as any)?.changed || 0) };
}

/**
 * Ask first, then delete, then say what happened.
 *
 * The confirmation names the number and offers Undo on success, because a
 * mistaken bulk delete is the whole reason these are soft — and an undo the
 * user cannot find is no undo at all.
 */
export function confirmDelete(options: {
  table: DeletableTable;
  ids: string[];
  /** Singular noun — "quote", "shipment". Pluralised for you. */
  noun: string;
  onDone?: () => void;
}): void {
  const { table, ids, noun, onDone } = options;
  const count = ids.length;
  if (!count) return;
  const label = count === 1 ? noun : `${count} ${noun}s`;

  Alert.alert(
    `Delete ${label}?`,
    `${count === 1 ? 'It' : 'They'} will be hidden from the app and the customer, and can be restored.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await setRecordsDeleted(table, ids, true);
          if (!result.ok) {
            Alert.alert('Could not delete', result.message);
            return;
          }
          onDone?.();
          Alert.alert(`Deleted ${label}`, undefined, [
            {
              text: 'Undo',
              onPress: async () => {
                const undo = await setRecordsDeleted(table, ids, false);
                if (!undo.ok) Alert.alert('Could not restore', undo.message);
                else onDone?.();
              },
            },
            { text: 'Done', style: 'cancel' },
          ]);
        },
      },
    ],
  );
}

export type BulkUpdate = {
  status?: string | null;
  collectionScheduleId?: string | null;
  collectionPeriodId?: string | null;
};

/**
 * Change the same thing on many shipments.
 *
 * Only stage and which collection they belong to; addresses, prices and
 * contents stay per-shipment on purpose, because a bulk edit of those is a
 * bulk mistake.
 */
export async function bulkUpdateShipments(ids: string[], patch: BulkUpdate): Promise<DeleteOutcome> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return { ok: true, changed: 0 };

  const { data, error } = await supabase.rpc('bulk_update_shipments', {
    p_ids: clean,
    p_status: patch.status ?? null,
    p_collection_schedule_id: patch.collectionScheduleId ?? null,
    p_collection_period_id: patch.collectionPeriodId ?? null,
  });

  if (error) {
    if (isNetworkError(error)) return { ok: false, reason: 'offline', message: 'No signal.' };
    if (isMissingBackend(error)) {
      return { ok: false, reason: 'not-deployed', message: 'This app is newer than the database.' };
    }
    return { ok: false, reason: 'error', message: error.message };
  }
  return { ok: true, changed: Number((data as any)?.changed || 0) };
}
