import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarPlus, Loader2, Trash2, Users, EyeOff } from 'lucide-react';

/**
 * Every collection date a route runs, and the controls to add or remove them.
 *
 * The route table holds one row per route with a single `pickup_date`, so the
 * "create a collection period" flow updates that row in place — publishing
 * October's dates overwrote September's, and the booking form could only ever
 * offer whichever month was published last. `route_collection_dates` holds one
 * row per collection instead, and this is where the office fills it in.
 *
 * Nothing here writes to `collection_schedules`. Sixteen live collection runs
 * follow its `pickup_date` through a trigger, so re-pointing that column would
 * move a driver's planned round as a side effect of pencilling in next month.
 */

type CollectionDate = {
  id: string;
  date: string;
  label: string;
  published: boolean;
  periodId: string;
  period: string;
  past: boolean;
  /** Shipments already sold this collection; they block removal. */
  booked: number;
};

type RouteRow = {
  scheduleId: string;
  route: string;
  country: string | null;
  headlineDate: string | null;
  dates: CollectionDate[];
};

type Period = { id: string; name: string };

const isIreland = (country: string | null | undefined) =>
  String(country || '').toLowerCase().includes('ireland');

export const CollectionDatesEditor: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<'UK' | 'Ireland'>('UK');
  const [saving, setSaving] = useState(false);

  const [adding, setAdding] = useState<RouteRow | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newPeriodId, setNewPeriodId] = useState('');

  const [removing, setRemoving] = useState<{ route: string; date: CollectionDate } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: calendar, error }, { data: periodRows }] = await Promise.all([
      (supabase.rpc as any)('route_collection_calendar', { p_country: null }),
      (supabase.from as any)('collection_periods')
        .select('id, name')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);
    if (error) {
      toast({
        title: 'Could not load collection dates',
        description: error.message,
        variant: 'destructive',
      });
    }
    setRows(Array.isArray(calendar) ? (calendar as RouteRow[]) : []);
    setPeriods((periodRows as Period[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => rows.filter((r) => (region === 'Ireland' ? isIreland(r.country) : !isIreland(r.country))),
    [rows, region],
  );

  // How many routes have nothing a customer could book. These are the ones
  // worth acting on, and a list that shows only scheduled routes is a list
  // where a forgotten route is invisible.
  const unscheduled = useMemo(
    () => visible.filter((r) => !r.dates.some((d) => !d.past)).length,
    [visible],
  );

  const openAdd = (row: RouteRow) => {
    setAdding(row);
    setNewDate('');
    // Most recently created period: the one the office is working on now.
    setNewPeriodId(periods[0]?.id || '');
  };

  const saveDate = async () => {
    if (!adding || !newDate || !newPeriodId) return;
    setSaving(true);
    const { error } = await (supabase.rpc as any)('set_route_collection_date', {
      p_schedule_id: adding.scheduleId,
      p_period_id: newPeriodId,
      p_pickup_on: newDate,
      p_published: true,
      p_note: null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not add that date', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Collection date added',
      description: `${adding.route} now collects on ${newDate}. Customers can choose it straight away.`,
    });
    setAdding(null);
    await load();
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setSaving(true);
    const { error } = await (supabase.rpc as any)('remove_route_collection_date', {
      p_id: removing.date.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not remove that date', description: error.message, variant: 'destructive' });
      setRemoving(null);
      return;
    }
    toast({
      title: 'Collection date removed',
      description: `${removing.route} no longer collects on ${removing.date.label}.`,
    });
    setRemoving(null);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" />
          Collection dates customers can choose
        </CardTitle>
        <CardDescription>
          Each route can run in more than one consignment at once. Every future date listed here is
          offered on the booking form, so a customer can take this month&apos;s van or wait for next
          month&apos;s. Adding a month no longer removes the one before it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={region} onValueChange={(v) => setRegion(v as 'UK' | 'Ireland')}>
            <TabsList>
              <TabsTrigger value="UK">UK</TabsTrigger>
              <TabsTrigger value="Ireland">Ireland</TabsTrigger>
            </TabsList>
          </Tabs>
          {unscheduled > 0 ? (
            <Badge variant="destructive">
              {unscheduled} route{unscheduled === 1 ? '' : 's'} with no upcoming date
            </Badge>
          ) : (
            <Badge variant="secondary">Every route has an upcoming date</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No routes in this region yet.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((row) => {
              const upcoming = row.dates.filter((d) => !d.past);
              return (
                <li key={row.scheduleId} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{row.route}</p>
                      <p className="text-xs text-muted-foreground">
                        {upcoming.length === 0
                          ? 'No upcoming collection — customers see no date for this area'
                          : `${upcoming.length} collection${upcoming.length === 1 ? '' : 's'} a customer can choose`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openAdd(row)}>
                      <CalendarPlus className="h-4 w-4 mr-1" />
                      Add a date
                    </Button>
                  </div>

                  {row.dates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.dates.map((d) => (
                        <span
                          key={d.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                            d.past
                              ? 'border-muted bg-muted/40 text-muted-foreground'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
                          }`}
                        >
                          <span className="font-medium">{d.label}</span>
                          <span className="opacity-70">· {d.period}</span>
                          {!d.published && <EyeOff className="h-3 w-3" aria-label="Not offered to customers" />}
                          {d.booked > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5"
                              title={`${d.booked} shipment(s) booked`}
                            >
                              <Users className="h-3 w-3" />{d.booked}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove ${d.label} from ${row.route}`}
                            className="ml-0.5 opacity-60 hover:opacity-100"
                            onClick={() => setRemoving({ route: row.route, date: d })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={Boolean(adding)} onOpenChange={(open) => !open && setAdding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a collection date</DialogTitle>
            <DialogDescription>
              {adding?.route} will collect on this day, and customers booking from this area can
              choose it immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="collection-day">Collection day</Label>
              <Input
                id="collection-day"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="collection-period">Consignment</Label>
              <Select value={newPeriodId} onValueChange={setNewPeriodId}>
                <SelectTrigger id="collection-period">
                  <SelectValue placeholder="Which consignment does it belong to?" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipments booked onto this date are filed under this consignment, which is what the
                reports and the delivery notes group by.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(null)}>Cancel</Button>
            <Button onClick={saveDate} disabled={saving || !newDate || !newPeriodId}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Add date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this collection date?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.route} would no longer collect on {removing?.date.label}, and customers
              could not choose it.
              {removing && removing.date.booked > 0
                ? ` ${removing.date.booked} shipment(s) are already booked for this day — they have to be moved to another date first, so this will be refused.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={saving}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CollectionDatesEditor;
