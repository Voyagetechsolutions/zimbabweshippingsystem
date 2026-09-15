import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, ChevronRight, Layers, Loader2, MapPin as MapPinIcon, MessageCircle, Navigation, Phone,
  PlusCircle, RefreshCcw, Route, Send, Truck, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import TabHeader from '../TabHeader';
import DispatchMap, { type MapLine, type MapPin } from './DispatchMap';
import { DriverPickerDialog, type PickerDriver } from './DispatchDialogs';
import { StatCard, StatusPill, useLiveReload } from './runsUi';
import {
  assignRoute, loadDispatchBoard, reassignRoute, sendDriverAnnouncement, type DispatchBoardData,
} from '@/lib/dispatch';
import {
  RUN_COLORS, buildRouteGroups, customerName, dayLabel, driverLabel, estimatedFinish, isoDay,
  mergeDriverPositions, runStatusOf, stopStatusOf, telUrl, whatsappUrl, type DispatchDriver, type RouteGroup,
} from '@/lib/dispatchCore';

// Dispatch control: the website's copy of the staff app's Runs tab.
//
// Live drivers, the day's runs on a map, and every route with bookings that
// day. Assigning a route here creates the same driver run the phone app
// creates, so the driver sees it on their dashboard either way.

const time = (value: string | Date) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function DispatchBoard({ date, onDateChange, onOpenRun, onBuild, onOpenGroups }: {
  date: string;
  onDateChange: (date: string) => void;
  onOpenRun: (runId: string) => void;
  onBuild: (date: string) => void;
  onOpenGroups: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DispatchBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRoute, setBusyRoute] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<RouteGroup | null>(null);
  const [pickerType, setPickerType] = useState<'pickup' | 'delivery'>('pickup');
  const [announcement, setAnnouncement] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await loadDispatchBoard(date));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load the dispatch board.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { setData(null); setLoading(true); void load(); }, [load]);
  useLiveReload(`dispatch-board-${date}`, [
    { table: 'driver_runs' }, { table: 'driver_run_stops' }, { table: 'route_collection_claims' },
    { table: 'driver_live_locations' }, { table: 'driver_presence' },
  ], load);

  const drivers = data?.drivers || [];
  const runs = data?.runs || [];
  const stops = data?.stops || [];
  const liveRuns = runs.filter((r) => r.status !== 'cancelled');
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const shipmentById = useMemo(() => new Map((data?.shipments || []).map((s) => [s.id, s])), [data]);
  const positions = useMemo(() => mergeDriverPositions(data?.positions || [], data?.presence || []), [data]);
  const groups = useMemo(() => (data
    ? buildRouteGroups({ date, schedules: data.schedules, shipments: data.shipments, runs, stops })
    : []), [data, date, runs, stops]);

  const nameOf = (id: string | null | undefined) => driverLabel(id ? driverById.get(id) : null);
  const attendanceOf = (id: string) => {
    const row = data?.attendance.find((a) => a.driver_id === id);
    if (!row) return 'Not clocked in';
    return row.clocked_out_at ? 'Clocked out' : 'Clocked in';
  };
  const clockedIn = (id: string) => Boolean(data?.attendance.some((a) => a.driver_id === id && !a.clocked_out_at));
  const hasOpenRun = (id: string) => runs.some((r) => r.driver_id === id && ['planned', 'active'].includes(r.status));

  // Real driver accounts are admins today, so role alone would count nobody:
  // a driver is available if they are a driver or have clocked in, and are not
  // already carrying a run.
  const availableDrivers = drivers.filter((d) => d.staff_active !== false && !d.on_leave
    && (String(d.role || '').toLowerCase() === 'driver' || clockedIn(d.id)) && !hasOpenRun(d.id));
  const activeClaims = (data?.claims || []).filter((c) => ['claimed', 'en_route', 'arrived'].includes(c.status));
  const issues = new Set([
    ...(data?.claims || []).filter((c) => c.status === 'failed').map((c) => c.shipment_id),
    ...stops.filter((s) => s.status === 'failed').map((s) => s.shipment_id),
  ]);
  const onDutyToday = (driver: DispatchDriver) => String(driver.role || '').toLowerCase() === 'driver'
    || runs.some((r) => r.driver_id === driver.id)
    || positions.some((p) => p.driver_id === driver.id)
    || Boolean(data?.attendance.some((a) => a.driver_id === driver.id));

  const pins: MapPin[] = useMemo(() => {
    const stopPins = stops.flatMap((s) => {
      const index = liveRuns.findIndex((r) => r.id === s.run_id);
      if (index < 0 || s.latitude == null || s.longitude == null) return [];
      const shipment = shipmentById.get(s.shipment_id);
      return [{
        id: s.id,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        title: `${s.stop_order}. ${shipment ? customerName(shipment) : s.address || 'Stop'}`,
        subtitle: [s.address, `${nameOf(liveRuns[index].driver_id)} · ${stopStatusOf(s.status).label}`].filter(Boolean).join(' · '),
        color: s.status === 'completed' ? '#94a3b8' : RUN_COLORS[index % RUN_COLORS.length],
        label: String(s.stop_order),
      }];
    });
    const driverPins = positions.map((p) => ({
      id: `driver-${p.driver_id}`,
      latitude: p.latitude,
      longitude: p.longitude,
      title: nameOf(p.driver_id),
      subtitle: `Last seen ${time(p.recorded_at)}${p.accuracy_m ? ` · ±${Math.round(p.accuracy_m)} m` : ''}`,
      color: '#2563eb',
      label: 'D',
    }));
    return [...stopPins, ...driverPins];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, liveRuns.map((r) => r.id).join(), positions, shipmentById, driverById]);

  const lines: MapLine[] = useMemo(() => liveRuns.map((run, index) => ({
    id: run.id,
    color: RUN_COLORS[index % RUN_COLORS.length],
    points: stops
      .filter((s) => s.run_id === run.id && s.latitude != null && s.longitude != null)
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [stops, liveRuns.map((r) => r.id).join()]);

  const pickerDrivers: PickerDriver[] = drivers
    .filter((d) => d.staff_active !== false && !d.on_leave)
    .filter((d) => {
      const type = pickerFor?.run?.run_type || pickerType;
      return !d.driver_type || d.driver_type === 'both' || d.driver_type === type;
    })
    .map((d) => ({
      id: d.id,
      name: driverLabel(d),
      meta: [d.driver_type || 'both', attendanceOf(d.id), d.vehicle_label].filter(Boolean).join(' · '),
      current: pickerFor?.run?.driver_id === d.id,
    }));

  const assign = async (group: RouteGroup, driver: PickerDriver) => {
    setPickerFor(null);
    setBusyRoute(group.route);
    try {
      if (group.run) {
        const result = await reassignRoute(group.run.id, group.route, group.date, driver.id, group.run.run_type);
        toast({
          title: 'Route reassigned',
          description: `${group.route} is now with ${driver.name}${result.merged ? ', merged into the run they already had that day' : ''}.`,
        });
      } else {
        const result = await assignRoute(group.route, group.date, driver.id, pickerType);
        toast({
          title: 'Route assigned',
          description: `${group.route} → ${driver.name}: ${result?.added ?? 0} stop(s) added`
            + `${result?.alreadyAssigned ? `, ${result.alreadyAssigned} already on a run` : ''}.`,
        });
      }
      await load();
    } catch (e: any) {
      toast({ title: group.run ? 'Could not reassign' : 'Could not assign route', description: e?.message, variant: 'destructive' });
    } finally {
      setBusyRoute(null);
    }
  };

  const send = async () => {
    if (!announcement.trim() || !user?.id) return;
    setSending(true);
    try {
      await sendDriverAnnouncement(user.id, announcement);
      setAnnouncement('');
      toast({ title: 'Announcement sent', description: 'Every driver will see it in Messages.' });
    } catch (e: any) {
      toast({ title: 'Could not send announcement', description: e?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const quickDays = [isoDay(0), isoDay(1), isoDay(2)];

  return (
    <div className="space-y-4">
      <TabHeader
        title="Runs & Dispatch"
        description="Live drivers, the day's runs and every route with bookings. Runs made here appear on the driver's dashboard."
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCcw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenGroups}>
              <Layers className="mr-2 h-4 w-4" />Collection groups
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onBuild(date)}>
              <PlusCircle className="mr-2 h-4 w-4" />Create run by hand
            </Button>
          </>
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        {quickDays.map((day) => (
          <Button
            key={day} size="sm" variant={date === day ? 'default' : 'outline'}
            className={cn('h-8 rounded-full', date === day && 'bg-emerald-600 hover:bg-emerald-700')}
            onClick={() => onDateChange(day)}
          >
            {dayLabel(day)}
          </Button>
        ))}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date" aria-label="Run date" className="h-8 w-[160px]" value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <Card className="border-red-300">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dispatch for {dayLabel(date).toLowerCase()}…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active runs" value={runs.filter((r) => r.status === 'active').length} icon={<Navigation className="h-5 w-5" />} tone="text-blue-700" />
            <StatCard label="Available drivers" value={availableDrivers.length} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Active collections" value={activeClaims.length} icon={<Truck className="h-5 w-5" />} tone="text-blue-700" />
            <StatCard label="Collection issues" value={issues.size} icon={<AlertTriangle className="h-5 w-5" />} tone="text-orange-600" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MapPinIcon className="h-4 w-4 text-emerald-700" />{dayLabel(date)}'s routes</CardTitle>
                <CardDescription>Each run in its own colour, in stop order. Blue pins are drivers seen in the last 12 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <DispatchMap pins={pins} lines={lines} height={380} emptyNote="No mapped stops or driver positions for this day yet." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-emerald-700" />Driver live status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {drivers.filter(onDutyToday).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No driver has a run, a clock-in or a position for this day.</p>
                ) : drivers.filter(onDutyToday).map((driver) => {
                  const driverRuns = runs.filter((r) => r.driver_id === driver.id && r.status !== 'cancelled');
                  const driverStops = stops.filter((s) => driverRuns.some((r) => r.id === s.run_id));
                  const collections = driverStops.filter((s) => s.stop_type === 'collection');
                  const deliveries = driverStops.filter((s) => s.stop_type === 'delivery');
                  const position = positions.find((p) => p.driver_id === driver.id);
                  const working = driverRuns.some((r) => r.status === 'active');
                  const call = telUrl(driver.phone_number || '');
                  const whatsapp = whatsappUrl(driver.phone_number || '');
                  return (
                    <div key={driver.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{driverLabel(driver)}</p>
                          <p className="text-xs text-muted-foreground">
                            {collections.filter((s) => s.status === 'completed').length}/{collections.length} collections
                            {' · '}{deliveries.filter((s) => s.status === 'completed').length}/{deliveries.length} deliveries
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {position
                              ? `${position.status ? `${String(position.status).replace(/_/g, ' ')} · ` : ''}seen ${time(position.recorded_at)}`
                              : 'No live location today'}
                          </p>
                        </div>
                        <StatusPill
                          label={working ? 'On route' : attendanceOf(driver.id)}
                          className={working ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}
                        />
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {call ? (
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                            <a href={call}><Phone className="mr-1 h-3 w-3" />Call</a>
                          </Button>
                        ) : null}
                        {whatsapp ? (
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                            <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-3 w-3" />WhatsApp</a>
                          </Button>
                        ) : null}
                        {!call && !whatsapp ? <span className="text-[11px] text-muted-foreground">No phone number on their profile</span> : null}
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-3">
                  <p className="mb-1.5 text-xs font-semibold">Message all drivers</p>
                  <Textarea
                    rows={2} maxLength={2000} value={announcement} onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Route change, depot notice, urgent instruction…"
                  />
                  <Button
                    size="sm" className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={!announcement.trim() || sending} onClick={() => void send()}
                  >
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send to drivers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4 text-emerald-700" />Runs</CardTitle>
                <CardDescription>Open a run to reorder stops, change windows, add collections, reassign or cancel it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {liveRuns.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm font-medium">No runs for this day</p>
                    <p className="mt-1 text-xs text-muted-foreground">Assign a route, or create a run by hand.</p>
                  </div>
                ) : liveRuns.map((run, index) => {
                  const runStops = stops.filter((s) => s.run_id === run.id);
                  const done = runStops.filter((s) => s.status === 'completed').length;
                  const failed = runStops.filter((s) => s.status === 'failed').length;
                  const eta = run.status === 'active' ? estimatedFinish(run, runStops.length - done - failed) : null;
                  const status = runStatusOf(run.status);
                  return (
                    <button
                      key={run.id} type="button" onClick={() => onOpenRun(run.id)}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: RUN_COLORS[index % RUN_COLORS.length] }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{nameOf(run.driver_id)}</p>
                          <StatusPill {...status} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {run.route_name || 'Route'} · {run.run_type === 'delivery' ? 'Delivery' : 'Pickup'} · {run.vehicle_label || 'No vehicle'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {runStops.length} stop{runStops.length === 1 ? '' : 's'} · {done} done
                          {failed ? ` · ${failed} exception${failed === 1 ? '' : 's'}` : ''}
                          {run.scheduled_start ? ` · starts ${String(run.scheduled_start).slice(0, 5)}` : ''}
                          {eta ? ` · est. finish ${time(eta)}` : ''}
                        </p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${runStops.length ? (done / runStops.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
                {runs.some((r) => r.status === 'cancelled') ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none py-1">{runs.filter((r) => r.status === 'cancelled').length} cancelled run(s)</summary>
                    <div className="mt-1 space-y-1">
                      {runs.filter((r) => r.status === 'cancelled').map((run) => (
                        <button key={run.id} type="button" onClick={() => onOpenRun(run.id)} className="block w-full rounded border px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          {nameOf(run.driver_id)} · {run.route_name || 'Route'}
                        </button>
                      ))}
                    </div>
                  </details>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4 text-emerald-700" />Routes for this day</CardTitle>
                <CardDescription>Bookings matched to a collection route for {dayLabel(date).toLowerCase()}. Assigning adds every one to the driver's run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {groups.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm font-medium">No routes with bookings</p>
                    <p className="mt-1 text-xs text-muted-foreground">Bookings matched to a route for this day will appear here.</p>
                  </div>
                ) : groups.map((group) => (
                  <div key={group.route} className={cn('flex items-center gap-3 rounded-lg border p-3', group.run && 'border-blue-200 dark:border-blue-900')}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{group.route}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.shipments.length} open booking{group.shipments.length === 1 ? '' : 's'}
                        {group.run
                          ? ` · ${nameOf(group.run.driver_id)} (${attendanceOf(group.run.driver_id).toLowerCase()}) · ${group.stopDone}/${group.stopTotal} stops done`
                          : ' · needs a driver'}
                      </p>
                    </div>
                    <Button
                      size="sm" variant={group.run ? 'outline' : 'default'}
                      className={cn('h-8 text-xs', !group.run && 'bg-emerald-600 hover:bg-emerald-700')}
                      disabled={busyRoute === group.route}
                      onClick={() => { setPickerType(group.run?.run_type || 'pickup'); setPickerFor(group); }}
                    >
                      {busyRoute === group.route ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : group.run ? 'Reassign' : 'Assign'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <DriverPickerDialog
        open={Boolean(pickerFor)}
        onOpenChange={(open) => { if (!open) setPickerFor(null); }}
        title={`${pickerFor?.run ? 'Reassign' : 'Assign'} ${pickerFor?.route || ''}`}
        description={pickerFor ? `${dayLabel(pickerFor.date)} · choose ${pickerFor.run ? 'the new driver' : 'the run type and driver'}` : undefined}
        drivers={pickerDrivers}
        busy={Boolean(busyRoute)}
        onPick={(driver) => pickerFor && void assign(pickerFor, driver)}
        header={pickerFor && !pickerFor.run ? (
          <div className="grid grid-cols-2 gap-2">
            {(['pickup', 'delivery'] as const).map((type) => (
              <Button
                key={type} size="sm" variant={pickerType === type ? 'default' : 'outline'}
                className={cn('capitalize', pickerType === type && 'bg-emerald-600 hover:bg-emerald-700')}
                onClick={() => setPickerType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        ) : null}
      />
    </div>
  );
}
