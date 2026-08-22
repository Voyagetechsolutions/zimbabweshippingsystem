import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, Route, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadDriverPerformance, type DriverPerformance } from '@/lib/driverPerformance';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '../TabHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function DriverPerformanceTab() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDrivers(await loadDriverPerformance(30));
    } catch (error: any) {
      toast({ title: 'Could not load driver performance', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`website-driver-performance-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_collection_claims' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_attendance' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const completed = drivers.reduce((total, driver) => total + driver.completed, 0);
  const issues = drivers.reduce((total, driver) => total + driver.issues, 0);
  const active = drivers.reduce((total, driver) => total + driver.activeCollections, 0);

  return (
    <div className="space-y-5">
      <TabHeader title="Driver Performance" description="The same live collection metrics shown in Delivery Management and each driver’s app." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Drivers', value: drivers.length, icon: Users },
          { label: 'Completed · 30 days', value: completed, icon: CheckCircle2 },
          { label: 'Active now', value: active, icon: Route },
          { label: 'Issues · 30 days', value: issues, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardTitle>Last 30 days</CardTitle><CardDescription>Completed and failed collection claims, attendance and elapsed collection time.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : drivers.length === 0 ? (
            <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">No driver staff accounts found.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {drivers.map((driver) => (
                <div key={driver.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">{driver.name}</h3><p className="text-xs text-muted-foreground">{driver.phone || driver.email || 'No contact number'}</p></div>
                    <Badge variant={driver.active && !driver.onLeave ? 'default' : 'secondary'}>{driver.onLeave ? 'On leave' : driver.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <Metric value={driver.completed} label="Done" />
                    <Metric value={driver.activeCollections} label="Active" />
                    <Metric value={driver.issues} label="Issues" />
                    <Metric value={driver.daysWorked} label="Days" />
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs"><span>Collection success</span><strong>{driver.successRate}%</strong></div>
                    <Progress value={driver.successRate} className="h-2" />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Average completed collection: {driver.averageMinutes ? `${driver.averageMinutes} min` : 'not enough data'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2"><p className="font-bold text-slate-900">{value}</p><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p></div>;
}
