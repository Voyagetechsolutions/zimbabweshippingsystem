import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, CheckSquare, Clock, Infinity as Flexible, Loader2, Save, Search, Square,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './DispatchDialogs';
import { StatusPill, WindowFields } from './runsUi';
import { loadBuilderData, saveRoute, type BuilderData } from '@/lib/dispatch';
import {
  addressOf, countryOf, customerName, dayLabel, driverLabel, hhmm, longDayLabel, overridesCustomer,
  planRouteStops, requestedLabel, routeOf, runStatusOf, shipmentReference, stampToTime, stopStatusOf,
  windowProblem, type WindowPick,
} from '@/lib/dispatchCore';

// Build a run by hand, or change one.
//
// Assigning a route can only hand a driver what the schedule already matched.
// This is the other half: dispatch picks the collections, sets the window each
// customer will be in, and names the driver. Opened from a run, it edits that
// run — its collections are ticked, unticking a planned one takes it off, and
// windows can be changed in place. The customer's own chosen window is shown
// on every booking and adopted when one is ticked.

const COUNTRIES = ['All', 'United Kingdom', 'Ireland'] as const;
type Country = typeof COUNTRIES[number];
const LIST_LIMIT = 150;

export default function RouteBuilder({ date, runId, collectionRunId, routeName: initialRoute, onBack, onSaved }: {
  date: string;
  runId?: string | null;
  collectionRunId?: string | null;
  routeName?: string | null;
  onBack: () => void;
  onSaved: (runId: string, editing: boolean) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const editing = Boolean(runId);
  const [runDate, setRunDate] = useState(date);
  const [data, setData] = useState<BuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [routeName, setRouteName] = useState(initialRoute || '');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [country, setCountry] = useState<Country>('All');
  const [query, setQuery] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [picks, setPicks] = useState<Record<string, WindowPick>>({});
  const [reason, setReason] = useState('');
  const seeded = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadBuilderData({ date: runDate, runId, collectionRunId });
      setData(next);
      setError(null);
      if (next.run && !seeded.current) {
        seeded.current = true;
        setDriverId(next.run.driver_id);
        setRouteName((current) => current || next.run!.route_name || '');
        // The customer's slot is the source of truth for the window; the stop
        // copy is only used when no slot window was ever set.
        const own = next.openStops.filter((s) => s.runId === next.run!.id);
        setPicks(Object.fromEntries(own.map((s) => {
          const slot = next.slots[s.shipmentId];
          return [s.shipmentId, {
            from: hhmm(slot?.dispatch_start) || stampToTime(s.windowStart),
            to: hhmm(slot?.dispatch_end) || stampToTime(s.windowEnd),
          }];
        })));
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load open collections.');
    } finally {
      setLoading(false);
    }
  }, [runDate, runId, collectionRunId]);

  useEffect(() => { void load(); }, [load]);

  const byId = useMemo(() => new Map((data?.shipments || []).map((s) => [s.id, s])), [data]);
  const runsById = useMemo(() => new Map((data?.runs || []).map((r) => [r.id, r])), [data]);
  const driverById = useMemo(() => new Map((data?.drivers || []).map((d) => [d.id, d])), [data]);
  const openByShipment = useMemo(() => new Map((data?.openStops || []).map((s) => [s.shipmentId, s])), [data]);
  const targetRun = data?.run || (data?.runs || []).find((r) => r.driver_id === driverId && r.run_date === runDate) || null;

  const routeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of data?.schedules || []) if (s.route) names.add(s.route.trim());
    for (const s of data?.shipments || []) { const r = routeOf(s); if (r && r !== 'To be assigned') names.add(r); }
    return [...names].sort();
  }, [data]);

  const pickIds = Object.keys(picks);
  const matching = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (data?.shipments || [])
      .filter((s) => !selectedOnly || picks[s.id])
      .filter((s) => country === 'All' || countryOf(s) === country)
      .filter((s) => !text || [customerName(s), addressOf(s), s.customer_reference, s.tracking_number, routeOf(s)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(text)))
      .sort((a, b) => customerName(a).localeCompare(customerName(b)));
  }, [country, data, picks, query, selectedOnly]);

  const plan = useMemo(() => (data ? planRouteStops({
    runId: targetRun?.id ?? null, runDate, runMaxOrder: 0, picks,
    openStops: data.openStops, slots: data.slots, removeUnpicked: editing,
  }) : null), [data, editing, picks, runDate, targetRun?.id]);
  const overriding = pickIds.filter((id) => overridesCustomer(data?.slots[id], picks[id].from, picks[id].to));

  const toggle = (id: string) => setPicks((current) => {
    if (current[id]) {
      const next = { ...current };
      delete next[id];
      return next;
    }
    // Start from what dispatch already agreed, else what the customer asked
    // for. A flexible customer starts blank: any window suits them.
    const slot = data?.slots[id];
    const agreed = slot?.dispatch_start && slot?.dispatch_end;
    const asked = slot?.requested_at && !slot.requested_flexible;
    return {
      ...current,
      [id]: agreed
        ? { from: hhmm(slot!.dispatch_start), to: hhmm(slot!.dispatch_end) }
        : asked ? { from: hhmm(slot!.requested_start), to: hhmm(slot!.requested_end) } : { from: '', to: '' },
    };
  });

  const selectShown = () => setPicks((current) => {
    const next = { ...current };
    for (const s of matching.slice(0, LIST_LIMIT)) {
      const open = openByShipment.get(s.id);
      const underWay = open && open.runId !== targetRun?.id && open.status !== 'planned';
      if (!next[s.id] && !underWay) {
        const slot = data?.slots[s.id];
        next[s.id] = slot?.dispatch_start && slot?.dispatch_end
          ? { from: hhmm(slot.dispatch_start), to: hhmm(slot.dispatch_end) }
          : slot?.requested_at && !slot.requested_flexible
            ? { from: hhmm(slot.requested_start), to: hhmm(slot.requested_end) } : { from: '', to: '' };
      }
    }
    return next;
  });

  const save = () => {
    if (!data || !plan) return;
    if (!routeName.trim()) {
      toast({ title: 'Name the route', description: 'Drivers and the board identify a run by its route name.', variant: 'destructive' });
      return;
    }
    if (!driverId) {
      toast({ title: 'Choose a driver', description: 'A run needs the driver who will work it.', variant: 'destructive' });
      return;
    }
    const changes = plan.inserts.length + plan.transfers.length + plan.removals.length + plan.windowUpdates.length + plan.slotWrites.length;
    if (!pickIds.length && !plan.removals.length) {
      toast({ title: 'Add collections', description: 'Tick at least one collection to put on the run.', variant: 'destructive' });
      return;
    }
    for (const id of pickIds) {
      const problem = windowProblem(picks[id].from, picks[id].to);
      if (problem) {
        toast({ title: `Check ${customerName(byId.get(id))}'s window`, description: problem, variant: 'destructive' });
        return;
      }
    }
    if (editing && !changes && routeName.trim() === (data.run?.route_name || '')) {
      toast({ title: 'Nothing to save', description: 'The run already matches this selection.' });
      return;
    }
    if (plan.transfers.length || plan.removals.length) { setConfirmOpen(true); return; }
    void commit();
  };

  const commit = async () => {
    if (!data || !driverId) return;
    setSaving(true);
    try {
      const result = await saveRoute({
        date: runDate, driverId, routeName, picks, reason, createdBy: user?.id ?? null, collectionRunId, data,
      });
      const summary = [
        result.added ? `${result.added} added` : '',
        result.transferred ? `${result.transferred} moved from other runs` : '',
        result.removed ? `${result.removed} taken off` : '',
        result.windowsChanged ? `${result.windowsChanged} window${result.windowsChanged === 1 ? '' : 's'} changed` : '',
      ].filter(Boolean).join(', ') || 'Details saved';
      const notes = [
        result.movedCustomers.length
          ? `${result.movedCustomers.length} customer${result.movedCustomers.length === 1 ? ' was' : 's were'} moved off their chosen time (${result.movedCustomers.join(', ')}) and notified in the app — WhatsApp or ring them from the run.`
          : '',
        result.blocked.length ? `Left where they are: ${result.blocked.join('; ')}.` : '',
        ...result.warnings,
      ].filter(Boolean);
      toast({
        title: editing ? 'Run updated' : 'Run saved',
        description: `${routeName.trim()} · ${driverLabel(driverById.get(driverId))}: ${summary}.${notes.length ? ` ${notes.join(' ')}` : ''}`,
        variant: result.warnings.length || result.blocked.length ? 'destructive' : undefined,
      });
      setConfirmOpen(false);
      onSaved(result.runId, editing);
    } catch (e: any) {
      toast({ title: editing ? 'Run not updated' : 'Run not saved', description: e?.message, variant: 'destructive' });
      setConfirmOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? `Edit ${data?.run?.route_name || 'run'}` : initialRoute || 'Create a run by hand';

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Dispatch</p>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {longDayLabel(runDate)} · {editing ? 'tick to add, untick a planned stop to take it off' : collectionRunId ? 'this collection group only' : 'all open collections'}
        </p>
      </div>

      {error ? (
        <Card className="border-red-300">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 space-y-3 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer, reference, address or route" />
            </div>
            <div className="flex rounded-md border p-0.5">
              {COUNTRIES.map((option) => (
                <button
                  key={option} type="button" onClick={() => setCountry(option)}
                  className={cn('rounded px-2.5 py-1 text-xs font-semibold', country === option ? 'bg-emerald-700 text-white' : 'text-muted-foreground')}
                >
                  {option === 'United Kingdom' ? 'UK' : option}
                </button>
              ))}
            </div>
            <Button size="sm" variant={selectedOnly ? 'default' : 'outline'} className={cn('h-8', selectedOnly && 'bg-emerald-700 hover:bg-emerald-800')} onClick={() => setSelectedOnly((v) => !v)}>
              Ticked only ({pickIds.length})
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={selectShown} disabled={!matching.length}>Tick all shown</Button>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading open collections…
            </div>
          ) : matching.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No open collections</p>
              <p className="mt-1 text-xs text-muted-foreground">Nothing matching this filter is waiting to be collected.</p>
            </div>
          ) : (
            <>
              {matching.slice(0, LIST_LIMIT).map((s) => {
                const pick = picks[s.id];
                const slot = data?.slots[s.id];
                const open = openByShipment.get(s.id);
                const onTarget = Boolean(open && targetRun && open.runId === targetRun.id);
                const otherRun = open && !onTarget ? runsById.get(open.runId) : null;
                const underWayElsewhere = Boolean(open && !onTarget && open.status !== 'planned');
                const lockedOnRun = onTarget && open!.status !== 'planned';
                const asked = Boolean(slot?.requested_at && !slot.requested_flexible);
                return (
                  <div
                    key={s.id}
                    className={cn('rounded-lg border p-3 transition-colors', pick && 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20', underWayElsewhere && 'opacity-60')}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed"
                      disabled={underWayElsewhere || lockedOnRun}
                      onClick={() => toggle(s.id)}
                    >
                      {pick
                        ? <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        : <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{customerName(s)}</p>
                          {onTarget ? <StatusPill label={open!.status === 'planned' ? 'On this run' : `On this run · ${stopStatusOf(open!.status).label}`} className="bg-emerald-100 text-emerald-800" /> : null}
                          {otherRun ? (
                            <StatusPill
                              label={`${driverLabel(driverById.get(otherRun.driver_id))} · ${dayLabel(otherRun.run_date)}${otherRun.status === 'cancelled' ? ' (cancelled run)' : ''}`}
                              className={underWayElsewhere ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}
                            />
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {shipmentReference(s)} · {countryOf(s)}{routeOf(s) ? ` · ${routeOf(s)}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">{addressOf(s) || 'No address recorded'}</p>
                        <p className={cn('mt-1 flex items-center gap-1 text-xs font-semibold', asked || slot?.requested_flexible ? 'text-emerald-700' : 'text-muted-foreground')}>
                          {slot?.requested_flexible ? <Flexible className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {slot?.requested_at ? `Customer asked for ${requestedLabel(slot)}` : 'No time chosen yet'}
                        </p>
                        {otherRun && !underWayElsewhere && pick ? (
                          <p className="mt-1 text-xs font-medium text-blue-700">Saving moves this stop off {driverLabel(driverById.get(otherRun.driver_id))}'s run.</p>
                        ) : null}
                        {underWayElsewhere ? (
                          <p className="mt-1 text-xs font-medium text-red-700">
                            {driverLabel(driverById.get(otherRun?.driver_id))} is already {open!.status === 'arrived' ? 'there' : 'on the way'} — it cannot be moved.
                          </p>
                        ) : null}
                      </div>
                    </button>
                    {pick ? (
                      <div className="mt-3 border-t pt-3 pl-8">
                        <WindowFields value={pick} slot={slot} onChange={(value) => setPicks((current) => ({ ...current, [s.id]: value }))} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {matching.length > LIST_LIMIT ? (
                <p className="text-center text-xs text-muted-foreground">Showing {LIST_LIMIT} of {matching.length}. Search to narrow the list.</p>
              ) : null}
            </>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <div className="space-y-3 lg:sticky lg:top-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Run</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {!editing ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="builder-date">Date</Label>
                    <Input id="builder-date" type="date" value={runDate} onChange={(e) => e.target.value && setRunDate(e.target.value)} />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="builder-route">Route name</Label>
                  <Input
                    id="builder-route" list="builder-route-options" value={routeName} placeholder="e.g. DUBLIN CITY"
                    onChange={(e) => setRouteName(e.target.value.toUpperCase())}
                  />
                  <datalist id="builder-route-options">
                    {routeOptions.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Driver</Label>
                  {editing ? (
                    <p className="rounded-md border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60">
                      {driverLabel(driverById.get(driverId || ''))}
                      <span className="block text-xs text-muted-foreground">Use “Reassign driver” on the run to change who works it.</span>
                    </p>
                  ) : (
                    <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                      {(data?.drivers || []).filter((d) => d.staff_active !== false).length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">No driver accounts found.</p>
                      ) : (data?.drivers || []).filter((d) => d.staff_active !== false).map((d) => {
                        const existing = (data?.runs || []).find((r) => r.driver_id === d.id && r.run_date === runDate);
                        return (
                          <button
                            key={d.id} type="button" onClick={() => setDriverId(d.id)}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left', driverId === d.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60')}
                          >
                            <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full border-2', driverId === d.id ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300')} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{driverLabel(d)}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {d.on_leave ? 'On leave · ' : ''}
                                {(d.driver_type || 'both') === 'delivery' ? 'Delivery driver' : 'Collection driver'}
                                {existing ? ` · has a run: ${existing.route_name || 'route'} (${runStatusOf(existing.status).label.toLowerCase()})` : ''}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!editing && targetRun ? (
                    <p className="text-xs text-blue-700">
                      One run per driver per day: these collections will be added to their existing {targetRun.route_name || ''} run
                      {['cancelled', 'completed'].includes(targetRun.status) ? `, which is ${targetRun.status} and will be reopened` : ''}.
                    </p>
                  ) : null}
                </div>
                {overriding.length ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="builder-reason">Why the change?</Label>
                    <Textarea id="builder-reason" rows={2} value={reason} placeholder="e.g. van is coming from Luton first" onChange={(e) => setReason(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Sent to every customer moved off their chosen time. A reason turns a broken promise into a heads-up.</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-semibold">{pickIds.length} collection{pickIds.length === 1 ? '' : 's'} ticked</p>
                {plan ? (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {plan.inserts.length ? <li>{plan.inserts.length} to add</li> : null}
                    {plan.transfers.length ? <li className="text-blue-700">{plan.transfers.length} to move from another run</li> : null}
                    {plan.removals.length ? <li className="text-red-700">{plan.removals.length} to take off this run</li> : null}
                    {plan.windowUpdates.length ? <li>{plan.windowUpdates.length} window change{plan.windowUpdates.length === 1 ? '' : 's'}</li> : null}
                    {plan.blocked.length ? <li className="text-red-700">{plan.blocked.length} already under way with another driver (skipped)</li> : null}
                    {overriding.length ? (
                      <li className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />{overriding.length} customer{overriding.length === 1 ? '' : 's'} moved off their chosen time</li>
                    ) : null}
                  </ul>
                ) : null}
                {data?.closedStops.length ? (
                  <p className="text-xs text-muted-foreground">{data.closedStops.length} completed or failed stop(s) stay on the run and are not listed.</p>
                ) : null}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving || loading} onClick={save}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {editing ? 'Save changes' : 'Create run'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm the changes"
        description={(
          <span className="block space-y-1">
            {plan?.transfers.length ? <span className="block">{plan.transfers.length} collection(s) will move off another driver's run onto this one.</span> : null}
            {plan?.removals.length ? <span className="block">{plan.removals.length} planned stop(s) will be taken off this run and go back into the pool.</span> : null}
          </span>
        )}
        confirmLabel={editing ? 'Save changes' : 'Create run'}
        busy={saving}
        onConfirm={commit}
      />
    </div>
  );
}
