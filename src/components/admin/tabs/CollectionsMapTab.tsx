import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CalendarDays, Loader2, MapPin, Navigation, RefreshCcw, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '../TabHeader';

type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  kind: 'collection' | 'delivery' | 'driver';
  order: string;
  status: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character));

function LiveMap({ points }: { points: MapPoint[] }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: true }).setView([52.3, -1.7], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    points.forEach((point) => {
      const color = point.kind === 'driver' ? '#2563eb' : point.kind === 'delivery' ? '#f59e0b' : '#059669';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font:700 12px system-ui">${esc(point.order)}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 34],
        popupAnchor: [0, -32],
      });
      const destination = encodeURIComponent(`${point.latitude},${point.longitude}`);
      const popup = `<div style="min-width:230px;font-family:system-ui"><strong>${esc(point.title)}</strong><p style="margin:7px 0 12px;color:#475569">${esc(point.address)}</p><a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="display:block;border-radius:8px;background:#059669;color:white;text-decoration:none;text-align:center;font-weight:700;padding:9px 12px">Open navigation</a></div>`;
      L.marker([point.latitude, point.longitude], { icon }).bindPopup(popup).addTo(layer);
      bounds.push([point.latitude, point.longitude]);
    });
    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
  }, [points]);

  return <div ref={elementRef} className="h-[440px] w-full overflow-hidden rounded-xl border" aria-label="Live collections map" />;
}

export default function CollectionsMapTab() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      const { data: runs, error: runError } = await db.from('driver_runs').select('id,driver_id,route_name').eq('run_date', date).neq('status', 'cancelled');
      if (runError) throw runError;
      const runIds = (runs || []).map((run: any) => run.id);
      const stopResult = runIds.length
        ? await db.from('driver_run_stops').select('id,run_id,shipment_id,stop_order,stop_type,status,address,latitude,longitude,shipment:shipments(tracking_number,customer_reference,metadata)').in('run_id', runIds).order('stop_order')
        : { data: [], error: null };
      if (stopResult.error) throw stopResult.error;

      const [{ data: locations }, { data: profiles }] = await Promise.all([
        db.from('driver_live_locations').select('driver_id,latitude,longitude,accuracy_m,recorded_at').gte('recorded_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()),
        db.from('profiles').select('id,full_name,email').eq('role', 'driver'),
      ]);
      const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
      const stopPoints: MapPoint[] = (stopResult.data || []).filter((stop: any) => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude))).map((stop: any) => {
        const sender = stop.shipment?.metadata?.sender || {};
        const customer = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.name || stop.shipment?.tracking_number || 'Collection';
        return { id: stop.id, latitude: Number(stop.latitude), longitude: Number(stop.longitude), title: `${stop.stop_order}. ${customer}`, address: stop.address || 'Address unavailable', kind: stop.stop_type === 'delivery' ? 'delivery' : 'collection', order: String(stop.stop_order), status: stop.status || 'planned' };
      });
      const driverPoints: MapPoint[] = (locations || []).filter((row: any) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))).map((row: any) => {
        const profile: any = profileById.get(row.driver_id);
        const seen = new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { id: `driver-${row.driver_id}`, latitude: Number(row.latitude), longitude: Number(row.longitude), title: profile?.full_name || profile?.email || 'Driver', address: `Latest driver location · ${seen}`, kind: 'driver', order: 'D', status: 'live' };
      });
      setPoints([...stopPoints, ...driverPoints]);
    } catch (error: any) {
      toast({ title: 'Could not load collections map', description: error.message, variant: 'destructive' });
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`website-collections-map-${date}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_run_stops' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_live_locations' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [date, load]);

  const stops = useMemo(() => points.filter((point) => point.kind !== 'driver'), [points]);
  const drivers = points.length - stops.length;

  return (
    <div className="space-y-5">
      <TabHeader title="Collections Map" description="Live route stops and recent driver positions from the same records used by the staff app." actions={<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-5 w-5 text-emerald-700" /><div className="flex-1"><p className="text-xs text-muted-foreground">Route date</p><Input type="date" className="mt-1 h-8" value={date} onChange={(event) => setDate(event.target.value)} /></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><MapPin className="h-5 w-5 text-emerald-700" /><div><p className="text-2xl font-bold">{stops.length}</p><p className="text-xs text-muted-foreground">Mapped stops</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Truck className="h-5 w-5 text-blue-700" /><div><p className="text-2xl font-bold">{drivers}</p><p className="text-xs text-muted-foreground">Drivers seen · 12h</p></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5 text-emerald-700" />Dispatch map</CardTitle><CardDescription>Select any pin to see its actual address and open turn-by-turn navigation. Pins remain anchored while zooming and panning.</CardDescription></CardHeader>
        <CardContent>{loading ? <div className="flex h-[440px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : points.length ? <LiveMap points={points} /> : <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">No mapped route stops or recent driver positions for this date.</div>}</CardContent>
      </Card>
      <div className="flex flex-wrap gap-2 text-xs"><Badge className="bg-emerald-100 text-emerald-800">Collection</Badge><Badge className="bg-amber-100 text-amber-800">Delivery</Badge><Badge className="bg-blue-100 text-blue-800">Driver location</Badge></div>
    </div>
  );
}
