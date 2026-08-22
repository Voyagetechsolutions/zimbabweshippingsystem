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
  AlertTriangle, CheckCircle2, Loader2, MapPin, Navigation, Phone, PackageCheck,
} from 'lucide-react';
import {
  FAIL_REASONS, claimRouteCollection, currentPosition, failStop, loadRouteDay,
  navigationUrl, releaseRouteCollection, sortByProximity, transitionStop,
  type RouteCollection, type RouteDay,
} from '@/lib/driverOps';
import DriverHandoverPanel, { type HandoverStop } from './DriverHandoverPanel';

// Today's collection route.
//
// Only one collection route runs per day, so drivers are not assigned individual
// stops — whoever is clocked in sees the whole route and claims the nearest
// address. A claim is atomic server-side, so two drivers cannot take the same
// consignment.

export default function DriverCollectionsPanel({ onDuty }: { onDuty: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [day, setDay] = useState<RouteDay | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [handover, setHandover] = useState<HandoverStop | null>(null);

  const load = useCallback(async () => {
    try {
      setDay(await loadRouteDay());
      setError(null);
    } catch (e: any) {
      // A failed load must never read as "nothing to collect" — a driver would
      // sit still believing the day was empty.
      setDay(null);
      setError(e?.message || 'Could not load today’s collections.');
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  useEffect(() => { currentPosition().then(setPoint); }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`web-driver-route-${user?.id || 'anon'}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'route_collection_claims' } as any, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user?.id]);

  const stops = useMemo(() => day ? sortByProximity(day.collections, point) : [], [day, point]);
  const collected = stops.filter((c) => c.collectionStatus === 'Collected').length;

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
    try { await transitionStop(collection.stopId, next); await load(); }
    catch (e: any) { toast({ title: 'Status update failed', description: e?.message, variant: 'destructive' }); }
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
            Once you are on duty, today’s collection route appears here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today’s route…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Couldn’t load today’s collections
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent><Button size="sm" variant="outline" onClick={load}>Try again</Button></CardContent>
      </Card>
    );
  }

  if (!day?.routes?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-semibold">No collection route today</p>
          <p className="text-sm text-muted-foreground mt-1">
            Admin publishes routes from the collection schedule.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="bg-emerald-600 text-white border-emerald-700">
        <CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
            {day.routes.map((r) => r.route).join(', ')}
          </p>
          <div className="flex gap-6 mt-2">
            <div>
              <p className="text-2xl font-bold">{stops.length - collected}</p>
              <p className="text-xs text-emerald-100">Left to collect</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{collected}</p>
              <p className="text-xs text-emerald-100">Collected</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stops.length}</p>
              <p className="text-xs text-emerald-100">On route</p>
            </div>
          </div>
          <p className="text-xs text-emerald-100 mt-3">
            {point ? 'Nearest collection first' : 'Allow location access to sort by distance'}
          </p>
        </CardContent>
      </Card>

      {stops.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Today’s route has no bookings awaiting collection.
        </CardContent></Card>
      ) : stops.map((c, index) => {
        const done = c.collectionStatus === 'Collected';
        const mine = c.claimedBy === user?.id && ['claimed', 'en_route', 'arrived'].includes(c.claimStatus);
        const taken = Boolean(c.claimedBy && c.claimedBy !== user?.id && ['claimed', 'en_route', 'arrived'].includes(c.claimStatus));
        return (
          <Card key={c.shipmentId} className={done ? 'opacity-60' : undefined}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{c.customerName || 'Collection'}</p>
                    {done && <Badge className="bg-emerald-600 text-[10px]">Collected</Badge>}
                    {mine && !done && <Badge variant="outline" className="text-[10px] capitalize">Yours · {c.claimStatus.replace('_', ' ')}</Badge>}
                    {taken && <Badge variant="secondary" className="text-[10px]">{c.claimedByName || 'Another driver'}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[c.address, c.city, c.postcode].filter(Boolean).join(', ') || 'Address not recorded'}
                    {c.distanceKm != null
                      ? ` · ${c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)} m` : `${c.distanceKm.toFixed(1)} km`}`
                      : ''}
                  </p>
                  {c.goodsDescription && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.goodsDescription}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                      <a href={navigationUrl({ latitude: c.latitude, longitude: c.longitude, address: [c.address, c.city, c.postcode].filter(Boolean).join(', ') })} target="_blank" rel="noreferrer">
                        <Navigation className="h-3 w-3 mr-1" /> Navigate
                      </a>
                    </Button>
                    {c.phone && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                        <a href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                      </Button>
                    )}

                    {!done && !mine && !taken && (
                      <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                        disabled={busy === c.shipmentId} onClick={() => claim(c)}>
                        {busy === c.shipmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Claim'}
                      </Button>
                    )}

                    {mine && c.claimStatus === 'claimed' && (
                      <Button size="sm" className="h-7 text-[11px]" disabled={busy === c.shipmentId} onClick={() => advance(c, 'en_route')}>
                        Start journey
                      </Button>
                    )}
                    {mine && c.claimStatus === 'en_route' && (
                      <Button size="sm" className="h-7 text-[11px]" disabled={busy === c.shipmentId} onClick={() => advance(c, 'arrived')}>
                        Mark arrived
                      </Button>
                    )}
                    {mine && c.claimStatus === 'arrived' && c.stopId && (
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

                    {mine && ['claimed', 'en_route'].includes(c.claimStatus) && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground"
                        disabled={busy === c.shipmentId} onClick={() => release(c)}>
                        Release
                      </Button>
                    )}

                    {mine && c.stopId && (
                      <Select onValueChange={(reason) => reportIssue(c, reason)}>
                        <SelectTrigger className="h-7 w-[130px] text-[11px] border-red-200 text-red-700">
                          <SelectValue placeholder="Report issue" />
                        </SelectTrigger>
                        <SelectContent>
                          {FAIL_REASONS.map((reason) => (
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
      })}
    </div>
  );
}
