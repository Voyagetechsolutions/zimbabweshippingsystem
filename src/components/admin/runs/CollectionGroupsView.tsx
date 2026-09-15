import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ChevronRight, HelpCircle, List, Loader2, Map as MapIcon, RefreshCcw, UserMinus, UserPlus, Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { DriverPickerDialog } from './DispatchDialogs';
import { StatusPill } from './runsUi';
import {
  assignCollectionRunDriver, loadCollectionDrivers, loadCollectionRuns,
} from '@/lib/dispatch';
import {
  STALE_ROUTE, UNASSIGNED_ROUTE, daysAway, isSyntheticRun, isoDay, runDateLabel,
  type CollectionDriver, type CollectionRunRow,
} from '@/lib/dispatchCore';

// Every collection grouped by route and date — the unit dispatch actually
// works in. Putting a driver on a group builds their run in one call, ordered
// by the windows customers asked for. The staff app's CollectionGroupsScreen.

export default function CollectionGroupsView({ onBack, onOpenRun, onOpenGroup, onBuild }: {
  onBack: () => void;
  onOpenRun: (driverRunId: string) => void;
  onOpenGroup: (group: { date: string; collectionRunId: string; route: string }) => void;
  onBuild: (date: string) => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<CollectionRunRow[]>([]);
  const [includeDone, setIncludeDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<CollectionRunRow | null>(null);
  const [drivers, setDrivers] = useState<CollectionDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await loadCollectionRuns(includeDone));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load collection groups.');
    } finally {
      setLoading(false);
    }
  }, [includeDone]);

  useEffect(() => { void load(); }, [load]);

  const runs = rows.filter((r) => !isSyntheticRun(r));
  const unassigned = rows.find((r) => isSyntheticRun(r) && r.route === UNASSIGNED_ROUTE);
  const stale = rows.find((r) => isSyntheticRun(r) && r.route === STALE_ROUTE);
  const waiting = runs.reduce((sum, r) => sum + (r.shipment_count || 0), 0);

  const openPicker = async (row: CollectionRunRow) => {
    if (!row.run_id) return;
    if (!row.collection_date) {
      toast({ title: 'No date yet', description: `Publish a collection date for ${row.route} before putting a driver on it.`, variant: 'destructive' });
      return;
    }
    setAssigning(row);
    setDriversLoading(true);
    try {
      setDrivers(await loadCollectionDrivers(row.collection_date));
    } catch (e: any) {
      toast({ title: 'Could not load drivers', description: e?.message, variant: 'destructive' });
    } finally {
      setDriversLoading(false);
    }
  };

  const assign = async (driverId: string | null, name?: string) => {
    if (!assigning?.run_id) return;
    setBusy(true);
    try {
      const result = await assignCollectionRunDriver(assigning.run_id, driverId);
      toast(result.assigned
        ? {
          title: 'Driver assigned',
          description: `${name || 'The driver'} is on ${result.route}. ${result.stopsAdded ?? 0} collection${result.stopsAdded === 1 ? '' : 's'} added to their run, ordered by the times customers asked for.`,
        }
        : { title: 'Driver removed', description: `${assigning.route} is back in the pool.` });
      setAssigning(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Could not assign', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to dispatch</Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Dispatch</p>
          <h2 className="text-lg font-bold">Collection groups</h2>
          <p className="text-sm text-muted-foreground">
            {runs.length} route{runs.length === 1 ? '' : 's'} · {waiting} collection{waiting === 1 ? '' : 's'} waiting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={includeDone} onCheckedChange={setIncludeDone} /> Include finished groups
          </label>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCcw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-300">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !rows.length ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading collection groups…
        </div>
      ) : (
        <>
          {runs.length === 0 && !error ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No collection groups yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Groups appear as bookings come in. Publish a date for a route and its bookings gather here.</p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {runs.map((row) => {
              const days = daysAway(row.collection_date);
              const overdue = days != null && days < 0;
              const soon = days != null && days >= 0 && days <= 2;
              return (
                <Card key={row.run_id!}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{row.route}</p>
                        <p className={cn('text-xs text-muted-foreground', overdue && 'text-red-600', soon && 'font-semibold text-emerald-700')}>
                          {runDateLabel(row.collection_date)}
                          {days == null ? '' : overdue ? ` · ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                            : days === 0 ? ' · today' : days === 1 ? ' · tomorrow' : ` · in ${days} days`}
                        </p>
                      </div>
                      <StatusPill
                        label={row.driver_run_id ? (row.driver_name?.split(' ')[0] || 'Assigned') : 'No driver'}
                        className={row.driver_run_id ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}
                      />
                    </div>
                    <div className="flex gap-5 border-t pt-2">
                      <div><p className="text-lg font-bold leading-none">{row.shipment_count}</p><p className="text-[11px] text-muted-foreground">{row.shipment_count === 1 ? 'collection' : 'collections'}</p></div>
                      <div><p className="text-lg font-bold leading-none">{row.slots_chosen}</p><p className="text-[11px] text-muted-foreground">times chosen</p></div>
                      {row.needs_contact > 0 ? (
                        <div><p className="text-lg font-bold leading-none text-red-600">{row.needs_contact}</p><p className="text-[11px] text-muted-foreground">to be told</p></div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm" variant={row.driver_run_id ? 'outline' : 'default'}
                        className={cn('h-8 text-xs', !row.driver_run_id && 'bg-emerald-600 hover:bg-emerald-700')}
                        onClick={() => void openPicker(row)}
                      >
                        {row.driver_run_id ? <Users className="mr-1.5 h-3.5 w-3.5" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                        {row.driver_run_id ? 'Change driver' : 'Assign driver'}
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => (row.driver_run_id
                          ? onOpenRun(row.driver_run_id)
                          : onOpenGroup({ date: row.collection_date || isoDay(), collectionRunId: row.run_id!, route: row.route }))}
                      >
                        {row.driver_run_id ? <MapIcon className="mr-1.5 h-3.5 w-3.5" /> : <List className="mr-1.5 h-3.5 w-3.5" />}
                        {row.driver_run_id ? 'Open run' : 'Open group'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {(unassigned?.shipment_count || 0) > 0 ? (
            <button
              type="button" onClick={() => onBuild(isoDay())}
              className="flex w-full items-center gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-left text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <HelpCircle className="h-5 w-5 shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-bold">{unassigned!.shipment_count} unassigned</span>
                <span className="block text-xs">Booked recently, but the collection postcode matched no published route. Open the builder to place them on a run.</span>
              </span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}

          {(stale?.shipment_count || 0) > 0 ? (
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-muted-foreground dark:bg-gray-800/60">
              {stale!.shipment_count} older pending bookings are more than 60 days old and are kept out of the working set.
              They are still in All Shipments if you need them.
            </p>
          ) : null}
        </>
      )}

      <DriverPickerDialog
        open={Boolean(assigning)}
        onOpenChange={(open) => { if (!open) setAssigning(null); }}
        title={assigning?.route || ''}
        description={assigning ? `${runDateLabel(assigning.collection_date)} · ${assigning.shipment_count} collection${assigning.shipment_count === 1 ? '' : 's'}` : undefined}
        loading={driversLoading}
        busy={busy}
        drivers={drivers.map((d) => ({
          id: d.id,
          name: d.full_name || d.email || 'Driver',
          meta: `${d.on_leave ? 'On leave · ' : ''}${d.stops_that_day > 0
            ? `already ${d.stops_that_day} stop${d.stops_that_day === 1 ? '' : 's'} that day${d.run_route ? ` on ${d.run_route}` : ''}`
            : 'free that day'}`,
        }))}
        onPick={(d) => void assign(d.id, d.name)}
        footer={assigning?.driver_run_id ? (
          <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => void assign(null)}>
            <UserMinus className="mr-2 h-4 w-4" />Take the driver off this group
          </Button>
        ) : null}
      />
    </div>
  );
}
