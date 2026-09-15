import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Clock, ListPlus, Loader2, MessageCircle, Pencil, Phone,
  RotateCcw, Trash2, UserRoundCog, XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import DispatchMap from './DispatchMap';
import { ConfirmDialog, DriverPickerDialog } from './DispatchDialogs';
import { StatusPill, WindowFields, useLiveReload } from './runsUi';
import {
  cancelRun, loadRunDetail, markCustomerInformed, reassignRunDriver, reinstateRun, removeStop, reorderStop,
  updateRunDetails, updateStopWindow, type RunDetailStop,
} from '@/lib/dispatch';
import {
  countryOf, customerName, customerPhone, driverLabel, hhmm, longDayLabel, normaliseTime, owesContact,
  requestedLabel, runStatusOf, shipmentReference, slotState, stampToTime, stopStatusOf, telUrl, whatsappUrl,
  windowLabel, windowProblem, windowStamp, type RunRow, type WindowPick,
} from '@/lib/dispatchCore';

// One run: its stops in order, the customers still owed a call, and every
// change dispatch can make to it. The staff app's RunDetailScreen, plus
// editing the run's details and windows from the browser.

type Detail = Awaited<ReturnType<typeof loadRunDetail>>;

const clock = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

export default function RunDetailView({ runId, onBack, onEditStops, onOpenRun }: {
  runId: string;
  onBack: () => void;
  onEditStops: (run: RunRow) => void;
  onOpenRun: (runId: string) => void;
}) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ route_name: '', vehicle_label: '', scheduled_start: '', scheduled_end: '' });
  const [windowStop, setWindowStop] = useState<RunDetailStop | null>(null);
  const [windowValue, setWindowValue] = useState<WindowPick>({ from: '', to: '' });
  const [windowReason, setWindowReason] = useState('');
  const [removing, setRemoving] = useState<RunDetailStop | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [contact, setContact] = useState<{ stop: RunDetailStop; via: 'whatsapp' | 'call' } | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await loadRunDetail(runId));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load the run.');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useLiveReload(`run-detail-${runId}`, [
    { table: 'driver_run_stops', filter: `run_id=eq.${runId}` },
    { table: 'driver_runs', filter: `id=eq.${runId}` },
  ], load);

  const pins = useMemo(() => (detail?.stops || [])
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      title: `${s.stop_order}. ${s.recipient_name || customerName(s.shipment)}`,
      subtitle: [s.address, stopStatusOf(s.status).label].filter(Boolean).join(' · '),
      color: s.status === 'completed' ? '#94a3b8' : s.status === 'failed' ? '#dc2626' : '#009B68',
      label: String(s.stop_order),
    })), [detail]);

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the run…
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to dispatch</Button>
        <Card className="border-red-300">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-700">{error || 'Run not found.'}</p>
            <Button size="sm" variant="outline" onClick={() => { setLoading(true); void load(); }}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { run, driver, stops, drivers, slots } = detail;
  const closedRun = run.status === 'completed' || run.status === 'cancelled';
  const openStop = (s: RunDetailStop) => !['completed', 'failed'].includes(s.status);
  const done = stops.filter((s) => s.status === 'completed').length;
  const failed = stops.filter((s) => s.status === 'failed').length;
  const untold = stops.filter((s) => s.stop_type === 'collection' && openStop(s) && owesContact(slots[s.shipment_id]));
  const status = runStatusOf(run.status);
  const driverCall = telUrl(driver?.phone_number || '');
  const driverWhatsapp = whatsappUrl(driver?.phone_number || '');

  const act = async (key: string, work: () => Promise<void>) => {
    setBusy(key);
    try { await work(); } finally { setBusy(null); }
  };

  const move = (stop: RunDetailStop, direction: 'up' | 'down') => act(`move-${stop.id}`, async () => {
    try {
      if (await reorderStop(stop.id, direction)) await load();
    } catch (e: any) {
      toast({ title: 'Could not reorder', description: e?.message, variant: 'destructive' });
    }
  });

  const confirmRemove = () => removing && act('remove', async () => {
    try {
      await removeStop(removing.id);
      toast({ title: 'Stop removed', description: `${removing.recipient_name || customerName(removing.shipment)} is back in the pool for replanning.` });
      setRemoving(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Could not remove stop', description: e?.message, variant: 'destructive' });
    }
  });

  const confirmCancel = () => act('cancel', async () => {
    try {
      const result = await cancelRun(run.id, stops);
      toast({
        title: 'Run cancelled',
        description: `${result.released} open stop(s) are back in the pool.${result.kept ? ` ${result.kept} could not be released.` : ''}`,
      });
      setCancelOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: 'Could not cancel run', description: e?.message, variant: 'destructive' });
    }
  });

  const reinstate = () => act('reinstate', async () => {
    try {
      await reinstateRun(run.id);
      toast({ title: 'Run reinstated', description: 'It is planned again. Add collections back to it if they were released.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not reinstate run', description: e?.message, variant: 'destructive' });
    }
  });

  const reassign = (driverId: string, name: string) => act('reassign', async () => {
    try {
      const result = await reassignRunDriver(run.id, driverId);
      setPickerOpen(false);
      if (result?.merged && result.runId && result.runId !== run.id) {
        toast({ title: 'Run merged', description: `${name} already had a run that day, so these stops were added to it.` });
        onOpenRun(result.runId);
        return;
      }
      toast({ title: 'Run reassigned', description: `${name} can now see this run.` });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not reassign', description: e?.message, variant: 'destructive' });
    }
  });

  const openEdit = () => {
    setForm({
      route_name: run.route_name || '',
      vehicle_label: run.vehicle_label || '',
      scheduled_start: hhmm(run.scheduled_start),
      scheduled_end: hhmm(run.scheduled_end),
    });
    setEditOpen(true);
  };

  const saveEdit = () => act('edit', async () => {
    if (!form.route_name.trim()) {
      toast({ title: 'Name the route', description: 'Drivers and the board identify a run by its route name.', variant: 'destructive' });
      return;
    }
    if (form.scheduled_start && form.scheduled_end && form.scheduled_end <= form.scheduled_start) {
      toast({ title: 'Check the times', description: 'The run must end after it starts.', variant: 'destructive' });
      return;
    }
    try {
      await updateRunDetails(run.id, {
        route_name: form.route_name.trim(),
        vehicle_label: form.vehicle_label.trim() || null,
        scheduled_start: form.scheduled_start || null,
        scheduled_end: form.scheduled_end || null,
      });
      setEditOpen(false);
      toast({ title: 'Run updated' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not save the run', description: e?.message, variant: 'destructive' });
    }
  });

  const openWindow = (stop: RunDetailStop) => {
    const slot = slots[stop.shipment_id];
    setWindowValue({
      from: hhmm(slot?.dispatch_start) || stampToTime(stop.time_window_start),
      to: hhmm(slot?.dispatch_end) || stampToTime(stop.time_window_end),
    });
    setWindowReason('');
    setWindowStop(stop);
  };

  const saveWindow = () => windowStop && act('window', async () => {
    const problem = windowProblem(windowValue.from, windowValue.to);
    if (problem) {
      toast({ title: 'Check the window', description: problem, variant: 'destructive' });
      return;
    }
    const both = Boolean(windowValue.from.trim() && windowValue.to.trim());
    const from = normaliseTime(windowValue.from);
    const to = normaliseTime(windowValue.to);
    const slot = slots[windowStop.shipment_id];
    // Re-writing an unchanged slot would re-stamp it and re-open "still to be
    // told" for a customer who has already been rung.
    const slotChanged = both && windowStop.stop_type === 'collection'
      && (hhmm(slot?.dispatch_start) !== from || hhmm(slot?.dispatch_end) !== to);
    try {
      const result = await updateStopWindow({
        stopId: windowStop.id,
        shipmentId: windowStop.shipment_id,
        start: both ? windowStamp(run.run_date, windowValue.from) : null,
        end: both ? windowStamp(run.run_date, windowValue.to) : null,
        slotWindow: slotChanged ? { from: from!, to: to! } : null,
        reason: windowReason,
      });
      setWindowStop(null);
      toast(result.moved
        ? { title: 'Window changed — the customer was moved', description: 'They have been notified in the app. WhatsApp or ring them, then mark it done on the stop.' }
        : { title: 'Window saved' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not save the window', description: e?.message, variant: 'destructive' });
    }
  });

  const confirmContact = () => contact && act('contact', async () => {
    try {
      await markCustomerInformed(contact.stop.shipment_id, contact.via);
      setContact(null);
      toast({ title: 'Recorded', description: 'The customer knows about the new time.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not record that', description: e?.message, variant: 'destructive' });
    }
  });

  const contactLinks = (stop: RunDetailStop) => {
    const slot = slots[stop.shipment_id];
    const phone = customerPhone(stop.shipment);
    const name = stop.recipient_name || customerName(stop.shipment);
    const message = [
      `Hi ${name}, it is Zimbabwe Shipping about ${shipmentReference(stop.shipment)}.`,
      `We have had to move your collection to ${windowLabel(slot?.dispatch_start, slot?.dispatch_end)} on ${longDayLabel(run.run_date)}.`,
      slot?.change_reason || '',
      'Does that still work for you?',
    ].filter(Boolean).join(' ');
    return {
      whatsapp: whatsappUrl(phone, stop.shipment ? countryOf(stop.shipment) : undefined, message),
      call: telUrl(phone),
    };
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Run</p>
              <h2 className="text-lg font-bold">{run.route_name || 'Route'}</h2>
              <p className="text-sm text-muted-foreground">
                {driverLabel(driver)} · {run.run_type === 'delivery' ? 'Delivery' : 'Pickup'} run · {longDayLabel(run.run_date)}
              </p>
              <p className="text-xs text-muted-foreground">
                {run.vehicle_label || driver?.vehicle_label || 'No vehicle assigned'}
                {run.scheduled_start ? ` · ${hhmm(run.scheduled_start)}${run.scheduled_end ? `–${hhmm(run.scheduled_end)}` : ''}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {driverCall ? (
                <Button asChild size="sm" variant="outline" className="h-8"><a href={driverCall}><Phone className="mr-1.5 h-3.5 w-3.5" />Call driver</a></Button>
              ) : null}
              {driverWhatsapp ? (
                <Button asChild size="sm" variant="outline" className="h-8"><a href={driverWhatsapp} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</a></Button>
              ) : null}
              <StatusPill {...status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit details</Button>
            <Button
              size="sm" variant="outline" disabled={run.run_type === 'delivery'}
              title={run.run_type === 'delivery' ? 'Delivery runs are loaded by the driver at the depot' : undefined}
              onClick={() => onEditStops(run)}
            >
              <ListPlus className="mr-1.5 h-3.5 w-3.5" />Add or remove collections
            </Button>
            {!closedRun ? (
              <>
                <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => setPickerOpen(true)}>
                  <UserRoundCog className="mr-1.5 h-3.5 w-3.5" />Reassign driver
                </Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" disabled={Boolean(busy)} onClick={() => setCancelOpen(true)}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />Cancel run
                </Button>
              </>
            ) : run.status === 'cancelled' ? (
              <Button size="sm" variant="outline" disabled={busy === 'reinstate'} onClick={() => void reinstate()}>
                {busy === 'reinstate' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}Reinstate run
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {untold.length ? (
        <div className="flex items-start gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-bold">{untold.length} customer{untold.length === 1 ? '' : 's'} still to be told</p>
            <p className="text-xs">
              {untold.length === 1 ? 'This collection was' : 'These collections were'} moved off the time the customer chose.
              The app has told them, but a message or a call is what stops a wasted doorstep — use the buttons on the stop, then mark it done.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-3">
          <p className="text-sm font-semibold">
            Stops ({done}/{stops.length} completed{failed ? `, ${failed} exception${failed === 1 ? '' : 's'}` : ''})
          </p>
          {stops.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No stops on this run</p>
              <p className="mt-1 text-xs text-muted-foreground">Use “Add or remove collections” to put bookings on it.</p>
            </div>
          ) : stops.map((stop, index) => {
            const stopStatus = stopStatusOf(stop.status);
            const slot = slots[stop.shipment_id];
            const state = slot ? slotState(slot) : null;
            const agreed = windowLabel(slot?.dispatch_start, slot?.dispatch_end)
              || (stop.time_window_start && stop.time_window_end ? `${stampToTime(stop.time_window_start)}–${stampToTime(stop.time_window_end)}` : '');
            const goods = stop.shipment?.goods_description || stop.shipment?.metadata?.shipment?.description;
            const editable = openStop(stop) && run.status !== 'completed';
            const links = owesContact(slot) ? contactLinks(stop) : null;
            return (
              <div key={stop.id} className="flex gap-3 rounded-lg border p-3">
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  stop.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
                )}>
                  {stop.stop_order}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-emerald-700">{shipmentReference(stop.shipment)}</p>
                    <StatusPill {...stopStatus} />
                  </div>
                  <p className="text-sm font-semibold">{stop.recipient_name || customerName(stop.shipment)}</p>
                  <p className="text-xs text-muted-foreground">{stop.address || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {stop.stop_type === 'delivery' ? 'Delivery' : 'Collection'}
                    {stop.completed_at ? ` · done ${clock(stop.completed_at)}` : ''}
                  </p>
                  {goods ? <p className="mt-1.5 line-clamp-3 rounded bg-gray-50 p-2 text-xs dark:bg-gray-800/60">{goods}</p> : null}
                  {stop.status === 'failed' ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Exception: {String(stop.failure_reason || 'other').replace(/_/g, ' ')}{stop.failure_note ? ` — ${stop.failure_note}` : ''}
                    </p>
                  ) : null}
                  {stop.stop_type === 'collection' ? (
                    <div className="mt-2 border-t pt-2 text-xs">
                      <p className="font-semibold">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {agreed ? `Collecting ${agreed}` : 'No window set'}
                        {slot?.requested_at && !slot.requested_flexible && hhmm(slot.requested_start) !== hhmm(slot.dispatch_start)
                          ? ` · customer asked for ${requestedLabel(slot)}`
                          : slot?.requested_flexible ? ' · customer is flexible' : ''}
                      </p>
                      {state === 'awaiting_customer' ? <p className="text-muted-foreground">Customer has not chosen a time yet.</p> : null}
                      {state === 'customer_moved' ? (
                        <p className="font-semibold text-amber-700">Customer changed to {requestedLabel(slot)} after you planned — re-check this stop.</p>
                      ) : null}
                      {state === 'dispatch_moved_told' ? (
                        <p className="font-semibold text-emerald-700">
                          Told by {slot?.customer_informed_via === 'call' ? 'phone' : slot?.customer_informed_via}
                          {slot?.customer_informed_at ? ` on ${new Date(slot.customer_informed_at).toLocaleDateString('en-GB')}` : ''}
                        </p>
                      ) : null}
                      {links ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {links.whatsapp ? (
                            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                              <a href={links.whatsapp} target="_blank" rel="noreferrer" onClick={() => setContact({ stop, via: 'whatsapp' })}>
                                <MessageCircle className="mr-1 h-3 w-3" />WhatsApp customer
                              </a>
                            </Button>
                          ) : null}
                          {links.call ? (
                            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                              <a href={links.call} onClick={() => setContact({ stop, via: 'call' })}><Phone className="mr-1 h-3 w-3" />Call customer</a>
                            </Button>
                          ) : null}
                          {!links.whatsapp && !links.call ? <span className="text-red-600">No phone number on this booking.</span> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {editable ? (
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Move up" disabled={index === 0 || Boolean(busy)} onClick={() => void move(stop, 'up')}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Move down" disabled={index === stops.length - 1 || Boolean(busy)} onClick={() => void move(stop, 'down')}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Change window" disabled={Boolean(busy)} onClick={() => openWindow(stop)}>
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" title="Remove from run" disabled={Boolean(busy)} onClick={() => setRemoving(stop)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="p-3">
              <DispatchMap pins={pins} lines={[{ id: run.id, color: '#009B68', points: pins.map((p) => [p.latitude, p.longitude] as [number, number]) }]} height={260} emptyNote="None of these stops has map coordinates yet." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Run summary</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {[
                ['Total stops', String(stops.length)],
                ['Completed', String(done)],
                ['Exceptions', String(failed)],
                ['Remaining', String(stops.length - done - failed)],
                ['Started', clock(run.started_at) || 'Not started'],
                ['Completed at', clock(run.completed_at) || '—'],
              ].map(([key, value]) => (
                <div key={key} className="flex justify-between"><span className="text-muted-foreground">{key}</span><span className="font-semibold">{value}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <DriverPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Reassign run"
        description={`${run.route_name || 'Route'} · ${longDayLabel(run.run_date)}. A driver who already has a run that day gets these stops added to it.`}
        drivers={drivers.filter((d) => d.staff_active !== false && !d.on_leave).map((d) => ({
          id: d.id, name: driverLabel(d), meta: [d.driver_type || 'both', d.vehicle_label].filter(Boolean).join(' · '), current: d.id === run.driver_id,
        }))}
        busy={busy === 'reassign'}
        onPick={(d) => { if (d.id !== run.driver_id) void reassign(d.id, d.name); }}
      />

      <Dialog open={editOpen} onOpenChange={(open) => busy !== 'edit' && setEditOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit run details</DialogTitle>
            <DialogDescription>{driverLabel(driver)} · {longDayLabel(run.run_date)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="run-route">Route name</Label>
              <Input id="run-route" value={form.route_name} onChange={(e) => setForm({ ...form, route_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-vehicle">Vehicle</Label>
              <Input id="run-vehicle" value={form.vehicle_label} placeholder="e.g. Van 2 · AB12 CDE" onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="run-start">Starts</Label>
                <Input id="run-start" type="time" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="run-end">Ends</Label>
                <Input id="run-end" type="time" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={busy === 'edit'} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === 'edit'} onClick={() => void saveEdit()}>
              {busy === 'edit' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(windowStop)} onOpenChange={(open) => { if (!open && busy !== 'window') setWindowStop(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Collection window</DialogTitle>
            <DialogDescription>
              {windowStop ? `${windowStop.recipient_name || customerName(windowStop.shipment)} · ${requestedLabel(slots[windowStop.shipment_id])}` : ''}
            </DialogDescription>
          </DialogHeader>
          <WindowFields value={windowValue} onChange={setWindowValue} slot={windowStop ? slots[windowStop.shipment_id] : null} />
          <div className="space-y-1.5">
            <Label htmlFor="window-reason">Reason for a change (sent to the customer)</Label>
            <Input id="window-reason" value={windowReason} placeholder="e.g. van is coming from Luton first" onChange={(e) => setWindowReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={busy === 'window'} onClick={() => setWindowStop(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === 'window'} onClick={() => void saveWindow()}>
              {busy === 'window' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title="Remove stop"
        description={`Take ${removing ? removing.recipient_name || customerName(removing.shipment) : ''} off this run? The booking goes back into the pool for replanning.`}
        confirmLabel="Remove"
        destructive
        busy={busy === 'remove'}
        onConfirm={confirmRemove}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel run"
        description={(
          <span className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            This cancels the whole run and releases its open stops for replanning. Completed stops stay on record.
          </span>
        )}
        confirmLabel="Cancel run"
        cancelLabel="Keep run"
        destructive
        busy={busy === 'cancel'}
        onConfirm={confirmCancel}
      />

      <ConfirmDialog
        open={Boolean(contact)}
        onOpenChange={(open) => { if (!open) setContact(null); }}
        title="Did you reach them?"
        description={`Only mark this done once ${contact ? contact.stop.recipient_name || customerName(contact.stop.shipment) : 'the customer'} actually knows about the new time.`}
        confirmLabel="Yes, they know"
        cancelLabel="Not yet"
        busy={busy === 'contact'}
        onConfirm={confirmContact}
      />
    </div>
  );
}
