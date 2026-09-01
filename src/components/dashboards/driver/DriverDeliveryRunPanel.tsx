import React, { useCallback, useEffect, useState } from 'react';
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
  CheckCircle2, ClipboardCheck, Clock, Loader2, Navigation, PackageCheck, Phone, ShieldCheck, XCircle,
} from 'lucide-react';
import {
  completeRun, failStop, loadDeliveryDay, navigationUrl, startRun,
  transitionStop, verificationLabel, type DeliveryDay, type DeliveryLoadItem,
} from '@/lib/driverOps';
import DriverHandoverPanel, { type HandoverStop } from './DriverHandoverPanel';
import { useBusinessConfiguration } from '@/hooks/useBusinessConfiguration';

// The delivery run.
//
// The gate at the top is the point of the screen: a loaded vehicle cannot move
// until an admin has verified every delivery note on it. Everything below only
// becomes actionable once that gate is green.

function stopTone(status: DeliveryLoadItem['stopStatus']) {
  if (status === 'completed') return { className: 'bg-emerald-100 text-emerald-800', label: 'Delivered' };
  if (status === 'failed') return { className: 'bg-red-100 text-red-800', label: 'Exception' };
  if (status === 'en_route') return { className: 'bg-blue-100 text-blue-800', label: 'En route' };
  if (status === 'arrived') return { className: 'bg-amber-100 text-amber-800', label: 'Arrived' };
  return { className: 'bg-gray-100 text-gray-700', label: 'Ready' };
}

export default function DriverDeliveryRunPanel({ onDuty, onGoToLoad }: {
  onDuty: boolean;
  onGoToLoad: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { config: business } = useBusinessConfiguration(true);
  const failReasons=business.operations.failedStopReasons.map((item)=>({key:item.id,label:item.label}));
  const [day, setDay] = useState<DeliveryDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [handover, setHandover] = useState<HandoverStop | null>(null);

  const load = useCallback(async () => {
    try { setDay(await loadDeliveryDay()); setError(null); }
    catch (e: any) { setDay(null); setError(e?.message || 'Could not load today’s deliveries.'); }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  // Verification lands while the driver is standing at the vehicle.
  useEffect(() => {
    const channel = supabase
      .channel(`web-driver-delivery-${user?.id || 'anon'}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'delivery_notes' } as any, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user?.id]);

  const run = day?.run || null;
  const items = day?.items || [];
  const verified = items.filter((i) => i.verificationStatus === 'verified').length;
  const rejected = items.filter((i) => i.verificationStatus === 'rejected').length;
  const pending = items.length - verified - rejected;
  const delivered = items.filter((i) => i.stopStatus === 'completed').length;
  const open = items.filter((i) => !['completed', 'failed'].includes(i.stopStatus));

  const act = async (key: string, action: () => Promise<void>, failTitle: string) => {
    setBusy(key);
    try { await action(); await load(); }
    catch (e: any) { toast({ title: failTitle, description: e?.message, variant: 'destructive' }); }
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
      <Card><CardContent className="py-12 text-center">
        <Clock className="h-9 w-9 mx-auto text-emerald-600 mb-3" />
        <p className="font-semibold">Clock in to start</p>
        <p className="text-sm text-muted-foreground mt-1">Once on duty you can load the vehicle and run today’s drops.</p>
      </CardContent></Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today’s deliveries…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-base">Deliveries unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent><Button size="sm" variant="outline" onClick={load}>Try again</Button></CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center">
        <PackageCheck className="h-9 w-9 mx-auto text-emerald-600 mb-3" />
        <p className="font-semibold">Vehicle is empty</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Add the consignments going out today. Each one is found by customer reference and checked against the
          metal seal fitted at collection.
        </p>
        <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={onGoToLoad}>Load the vehicle</Button>
      </CardContent></Card>
    );
  }

  const gateBlocked = pending > 0 || rejected > 0;

  return (
    <div className="space-y-3">
      {/* Verification gate */}
      <Card className={rejected > 0 ? 'border-red-300 bg-red-50/40' : pending > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-emerald-300 bg-emerald-50/40'}>
        <CardContent className="p-4 flex items-start gap-3">
          {rejected > 0 ? <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            : pending > 0 ? <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              : <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              {rejected > 0 ? `${rejected} delivery note${rejected === 1 ? '' : 's'} rejected`
                : pending > 0 ? `${pending} delivery note${pending === 1 ? '' : 's'} awaiting admin`
                  : 'All delivery notes verified'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rejected > 0
                ? 'Take the rejected consignments off the vehicle, or fix what admin flagged, before starting the run.'
                : pending > 0
                  ? `${verified} of ${items.length} verified. Admin verifies each note before it can travel — this updates itself.`
                  : 'Every note on this vehicle has been checked by the office. You can download them and start the run.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Run summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today’s deliveries</p>
              <p className="text-xl font-bold mt-0.5">{delivered} / {items.length} delivered</p>
              <p className="text-xs text-muted-foreground capitalize">
                {run?.route_name || 'Delivery route'} · {run?.status || 'planned'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onGoToLoad}>Load</Button>
              {run?.status === 'planned' && (
                <Button
                  size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                  disabled={gateBlocked || busy === run.id}
                  onClick={() => act(run.id, () => startRun(run.id), 'Could not start the delivery run')}
                >
                  {busy === run.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Start run'}
                </Button>
              )}
              {run?.status === 'active' && open.length === 0 && (
                <Button
                  size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                  disabled={busy === run.id}
                  onClick={() => act(run.id, () => completeRun(run.id), 'Could not complete run')}
                >
                  Complete run
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drops */}
      {items.map((item, index) => {
        const tone = stopTone(item.stopStatus);
        const blocked = item.verificationStatus !== 'verified';
        return (
          <Card key={item.stopId} className={item.stopStatus === 'completed' ? 'opacity-60' : undefined}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{item.receiverName || 'Recipient not named'}</p>
                    <Badge className={`text-[10px] ${tone.className}`}>{tone.label}</Badge>
                  </div>
                  <p className="text-xs font-semibold text-emerald-700">
                    {item.customerReference || item.trackingNumber || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.address || 'Address not recorded'}</p>
                  {blocked && (
                    <p className="text-xs text-amber-800 font-medium mt-1">
                      {verificationLabel(item.verificationStatus)} — this drop cannot be completed yet.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                      <a href={navigationUrl(item)} target="_blank" rel="noreferrer">
                        <Navigation className="h-3 w-3 mr-1" /> Navigate
                      </a>
                    </Button>
                    {item.receiverPhone && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                        <a href={`tel:${item.receiverPhone.replace(/\s/g, '')}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                      </Button>
                    )}

                    {run?.status === 'active' && !blocked && item.stopStatus === 'planned' && (
                      <Button size="sm" className="h-7 text-[11px]" disabled={busy === item.stopId}
                        onClick={() => act(item.stopId, () => transitionStop(item.stopId, 'en_route'), 'Status update failed')}>
                        En route
                      </Button>
                    )}
                    {run?.status === 'active' && !blocked && item.stopStatus === 'en_route' && (
                      <Button size="sm" className="h-7 text-[11px]" disabled={busy === item.stopId}
                        onClick={() => act(item.stopId, () => transitionStop(item.stopId, 'arrived'), 'Status update failed')}>
                        Arrived
                      </Button>
                    )}
                    {run?.status === 'active' && !blocked && item.stopStatus === 'arrived' && (
                      <Button
                        size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setHandover({
                          stopId: item.stopId, shipmentId: item.shipmentId, kind: 'delivery',
                          customerName: item.receiverName || 'Recipient',
                          reference: item.trackingNumber || item.customerReference || 'Delivery',
                        })}
                      >
                        <ClipboardCheck className="h-3 w-3 mr-1" /> Complete delivery
                      </Button>
                    )}

                    {!['completed', 'failed'].includes(item.stopStatus) && (
                      <Select onValueChange={(reason) => act(item.stopId, () => failStop(item.stopId, reason), 'Report failed')}>
                        <SelectTrigger className="h-7 w-[130px] text-[11px] border-red-200 text-red-700">
                          <SelectValue placeholder="Can't deliver" />
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
                {item.stopStatus === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
