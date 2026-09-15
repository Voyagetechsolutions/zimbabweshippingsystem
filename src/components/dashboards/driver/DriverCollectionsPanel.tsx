import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, Navigation, Phone, PackageCheck,
} from 'lucide-react';
import {
  claimRouteCollection, currentPosition, distanceKm, failStop, loadMyRunStops, loadRouteDay,
  navigationUrl, releaseRouteCollection, sortByProximity, startRun, transitionStop,
  type RouteCollection, type RouteDay,
} from '@/lib/driverOps';
import { mergeRunWithRoute, type RunSummary } from '@/lib/driverRunMerge';
import DriverHandoverPanel, { type HandoverStop } from './DriverHandoverPanel';
import { useBusinessConfiguration } from '@/hooks/useBusinessConfiguration';

// Today's collections.
//
// Two sources, shown as one list. First the driver's own run for the day —
// stops dispatch put there from the Runs screen (by hand, by route or by
// collection group) and anything the driver has already claimed. Then the
// rest of today's shared route, which any clocked-in driver can claim; a claim
// is atomic server-side, so two drivers cannot take the same consignment.

const windowTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

const routeLabel = (name: string) => name.trim().toUpperCase().replace(/\s+ROUTE$/, '');

export default function DriverCollectionsPanel({ onDuty }: { onDuty: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { config: business } = useBusinessConfiguration(true);
  const failReasons = business.operations.failedStopReasons.map((item) => ({ key: item.id, label: item.label }));
  const [day, setDay] = useState<RouteDay | null>(null);
  const [myRun, setMyRun] = useState<{ runs: RunSummary[]; stops: Array<RouteCollection & { failureReason: string | null }> } | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [handover, setHandover] = useState<HandoverStop | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [feed, run] = await Promise.allSettled([loadRouteDay(), loadMyRunStops(user.id)]);
    const failed: string[] = [];
    if (feed.status === 'fulfilled') setDay(feed.value);
    else { setDay(null); failed.push(`Today’s route: ${feed.reason?.message || 'could not load'}`); }
    if (run.status === 'fulfilled') setMyRun(run.value);
    else { setMyRun(null); failed.push(`Your run: ${run.reason?.message || 'could not load'}`); }
    setProblems(failed);
  }, [user?.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  useEffect(() => { currentPosition().then(setPoint); }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let timer: number | undefined;
    const refresh = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { void load(); }, 400); };
    const stamp = Date.now();
    // One channel per table, so a table missing from realtime cannot silence the rest.
    const channels = [
      supabase.channel(`web-driver-claims-${user.id}-${stamp}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'route_collection_claims' } as any, refresh),
      supabase.channel(`web-driver-runs-${user.id}-${stamp}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'driver_runs', filter: `driver_id=eq.${user.id}` } as any, refresh),
      supabase.channel(`web-driver-stops-${user.id}-${stamp}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'driver_run_stops' } as any, refresh),
    ].map((channel) => channel.subscribe());
    return () => { window.clearTimeout(timer); channels.forEach((channel) => { supabase.removeChannel(channel); }); };
  }, [load, user?.id]);

  const { mine, others } = useMemo(
    () => mergeRunWithRoute(myRun?.stops || [], day?.collections || [], user?.id || ''),
    [day, myRun, user?.id],
  );
  const myStops = useMemo(() => mine.map((c) => ({
    ...c,
    distanceKm: point && c.latitude != null && c.longitude != null
      ? distanceKm(point, { latitude: c.latitude, longitude: c.longitude }) : null,
  })), [mine, point]);
  const routeStops = useMemo(() => sortByProximity(others, point), [others, point]);
  const everything = [...myStops, ...routeStops];
  const collected = everything.filter((c) => c.collectionStatus === 'Collected').length;
  const routeNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const name of [
      ...(myRun?.runs || []).map((r) => r.route_name),
      ...(day?.routes || []).map((r) => r.route),
      ...everything.map((c) => c.route),
    ]) {
      if (name && name.trim()) names.set(routeLabel(name), name.trim());
    }
    return [...names.keys()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, myRun, mine, others]);

  const claim = async (collection: RouteCollection) => {
    setBusy(collection.shipmentId);
    try {
      if (!(collection.claimedBy === user?.id && collection.stopId)) {
        await claimRouteCollection(collection.shipmentId);
      }
      await load();
    } catch (e: any) {
      toast({ title: 'Could not claim this collection', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const advance = async (collection: RouteCollection, next: 'en_route' | 'arrived') => {
    if (!collection.stopId) return;
    setBusy(collection.shipmentId);
    try {
      // A run dispatch built is still planned until its driver sets off, and
      // the server only moves stops on an active run.
      if (next === 'en_route' && collection.runId && collection.runStatus && collection.runStatus !== 'active') {
        await startRun(collection.runId);
      }
      await transitionStop(collection.stopId, next);
      await load();
    } catch (e: any) { toast({ title: 'Status update failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const release = async (collection: RouteCollection) => {
    setBusy(collection.shipmentId);
    try { await releaseRouteCollection(collection.shipmentId, 'Released by driver'); await load(); }
    catch (e: any) { toast({ title: 'Could not release', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const reportIssue = async (collection: RouteCollection, reason: string) => {
    if (!collection.stopId) return;
    setBusy(collection.shipmentId);
    try {
      await failStop(collection.stopId, reason);
      toast({ title: 'Issue reported', description: 'Dispatch can replan this stop.' });
      await load();
    } catch (e: any) { toast({ title: 'Report failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (handover) {
    return (
      <DriverHandoverPanel
        stop={handover}
        onCancel={() => setHandover(null)}
        onDone={() => { setHandover(null); load(); }}
      />
    );
  }

  if (!onDuty) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-9 w-9 mx-auto text-emerald-600 mb-3" />
          <p className="font-semibold">Clock in to start</p>
          <p className="text-sm text-muted-foreground mt-1">
            Once you are on duty, today’s run and collection route appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today’s collections…
      </div>
    );
  }

  // A failed load must never read as "nothing to collect" — a driver would
  // sit still believing the day was empty.
  if (problems.length === 2) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Couldn’t load today’s collections
          </CardTitle>
          <CardDescription>{problems.join(' ')}</CardDescription>
        </CardHeader>
        <CardContent><Button size="sm" variant="outline" onClick={load}>Try again</Button></CardContent>
      </Card>
    );
  }

  const renderStop = (c: RouteCollection, number: number) => {
    const done = c.collectionStatus === 'Collected';
    const issue = c.stopStatus === 'failed';
    const mineNow = c.claimedBy === user?.id && ['claimed', 'en_route', 'arrived'].includes(c.claimStatus);
    // Someone else's claim, or a booking dispatch assigned to another driver.
    const taken = Boolean(c.claimedBy && c.claimedBy !== user?.id);
    const address = [c.address, c.city, c.postcode].filter(Boolean).join(', ');
    return (
      <Card key={c.shipmentId} className={done ? 'opacity-60' : undefined}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold shrink-0">
              {number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-sm">{c.customerName || 'Collection'}</p>
                {done && <Badge className="bg-emerald-600 text-[10px]">Collected</Badge>}
                {issue && !done && <Badge variant="destructive" className="text-[10px]">Issue reported</Badge>}
                {c.dispatched && !done && !issue && <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">From dispatch</Badge>}
                {mineNow && !done && <Badge variant="outline" className="text-[10px] capitalize">Yours · {c.claimStatus === 'claimed' ? 'to do' : c.claimStatus.replace('_', ' ')}</Badge>}
                {taken && !done && <Badge variant="secondary" className="text-[10px]">{c.claimedByName || 'Another driver'}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {address || 'Address not recorded'}
                {c.distanceKm != null
                  ? ` · ${c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)} m` : `${c.distanceKm.toFixed(1)} km`}`
                  : ''}
              </p>
              {c.windowStart && (
                <p className="text-xs font-medium text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Customer available {windowTime(c.windowStart)}{c.windowEnd ? `–${windowTime(c.windowEnd)}` : ''}
                </p>
              )}
              {c.goodsDescription && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.goodsDescription}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                  <a href={navigationUrl({ latitude: c.latitude, longitude: c.longitude, address })} target="_blank" rel="noreferrer">
                    <Navigation className="h-3 w-3 mr-1" /> Navigate
                  </a>
                </Button>
                {c.phone && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                  </Button>
                )}

                {!done && !issue && !mineNow && !taken && (
                  <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy === c.shipmentId} onClick={() => claim(c)}>
                    {busy === c.shipmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Claim'}
                  </Button>
                )}

                {mineNow && c.claimStatus === 'claimed' && (
                  <Button size="sm" className="h-7 text-[11px]" disabled={busy === c.shipmentId} onClick={() => advance(c, 'en_route')}>
                    {busy === c.shipmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start journey'}
                  </Button>
                )}
                {mineNow && c.claimStatus === 'en_route' && (
                  <Button size="sm" className="h-7 text-[11px]" disabled={busy === c.shipmentId} onClick={() => advance(c, 'arrived')}>
                    {busy === c.shipmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark arrived'}
                  </Button>
                )}
                {mineNow && c.claimStatus === 'arrived' && c.stopId && (
                  <Button
                    size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setHandover({
                      stopId: c.stopId!, shipmentId: c.shipmentId, kind: 'collection',
                      customerName: c.customerName || 'Collection',
                      reference: c.trackingNumber || c.customerReference || 'Collection',
                    })}
                  >
                    <PackageCheck className="h-3 w-3 mr-1" /> Complete collection
                  </Button>
                )}

                {/* Only a claim can be released; a stop dispatch assigned is
                    handed back by reporting an issue, so dispatch hears of it. */}
                {mineNow && c.claimId && ['claimed', 'en_route'].includes(c.claimStatus) && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground"
                    disabled={busy === c.shipmentId} onClick={() => release(c)}>
                    Release
                  </Button>
                )}

                {mineNow && c.stopId && (
                  <Select onValueChange={(reason) => reportIssue(c, reason)}>
                    <SelectTrigger className="h-7 w-[130px] text-[11px] border-red-200 text-red-700">
                      <SelectValue placeholder="Report issue" />
                    </SelectTrigger>
                    <SelectContent>
                      {failReasons.map((reason) => (
                        <SelectItem key={reason.key} value={reason.key} className="text-xs">{reason.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {problems.length ? (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900 dark:text-amber-100">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Part of today did not load — {problems.join(' ')}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {everything.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-semibold">No collections today</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dispatch puts runs on your dashboard from the Runs screen, and published collection routes appear here on their day.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-emerald-600 text-white border-emerald-700">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
                {routeNames.length ? routeNames.join(', ') : 'Today’s collections'}
              </p>
              <div className="flex flex-wrap gap-6 mt-2">
                <div>
                  <p className="text-2xl font-bold">{everything.length - collected}</p>
                  <p className="text-xs text-emerald-100">Left to collect</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{collected}</p>
                  <p className="text-xs text-emerald-100">Collected</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{myStops.length}</p>
                  <p className="text-xs text-emerald-100">On your run</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{routeStops.length}</p>
                  <p className="text-xs text-emerald-100">Open on the route</p>
                </div>
              </div>
              <p className="text-xs text-emerald-100 mt-3">
                {point ? 'Your run in dispatch order, then the route nearest first' : 'Allow location access to sort the route by distance'}
              </p>
            </CardContent>
          </Card>

          {myStops.length ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                Your run{myRun?.runs.length ? ` · ${myRun.runs.map((r) => r.route_name || 'Route').join(', ')}` : ''}
              </p>
              {myStops.map((c, index) => renderStop(c, c.stopOrder ?? index + 1))}
            </>
          ) : null}

          {routeStops.length ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">On today’s route</p>
              {routeStops.map((c, index) => renderStop(c, myStops.length + index + 1))}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
