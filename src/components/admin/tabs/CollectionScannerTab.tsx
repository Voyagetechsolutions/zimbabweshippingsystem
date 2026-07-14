import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Shipment = {
  id: string;
  tracking_number: string;
  customer_reference: string;
  status: string;
  collected_at: string | null;
  metadata: any;
};

export default function CollectionScannerTab() {
  const { toast } = useToast();
  const db = supabase as any;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [token, setToken] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [paymentResult, setPaymentResult] = useState('not_applicable');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => stopCamera, []);

  const lookup = async (value = token) => {
    const clean = value.trim();
    if (!clean) return;
    setBusy(true);
    const { data, error } = await db.from('shipments')
      .select('id,tracking_number,customer_reference,status,collected_at,metadata')
      .eq('qr_token', clean).maybeSingle();
    setBusy(false);
    if (error || !data) return toast({ title: 'Invalid QR code', description: 'No shipment matches this code.', variant: 'destructive' });
    setToken(clean);
    setShipment(data);
    const method = String(data.metadata?.pricing?.paymentMethod || '').toLowerCase();
    setPaymentResult(method.includes('cash') ? 'paid' : 'not_applicable');
  };

  const startCamera = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return toast({ title: 'Camera scanning is unavailable', description: 'Paste or type the QR value instead.' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
      const detector = new Detector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) { stopCamera(); lookup(codes[0].rawValue); return; }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch (error) {
      toast({ title: 'Could not open camera', description: error instanceof Error ? error.message : 'Camera permission was not granted.', variant: 'destructive' });
    }
  };

  const confirm = async () => {
    if (!shipment) return;
    setBusy(true);
    const { data, error } = await db.rpc('process_collection_scan', {
      p_qr_token: token,
      p_payment_result: paymentResult,
      p_amount_received: Number(amount || 0),
      p_notes: notes || null,
    });
    setBusy(false);
    if (error) return toast({ title: 'Collection could not be confirmed', description: error.message, variant: 'destructive' });
    const { error: notificationError } = await supabase.functions.invoke('collection-notification', {
      body: { shipmentId: shipment.id, paymentResult },
    });
    toast({ title: 'Collection confirmed', description: data?.invoiceNumber ? `Paid invoice ${data.invoiceNumber} generated.` : 'The shipment and delivery note were updated.' });
    if (notificationError) toast({ title: 'Collection saved, but WhatsApp failed', description: notificationError.message, variant: 'destructive' });
    setShipment({ ...shipment, status: 'Collected', collected_at: new Date().toISOString() });
  };

  const sender = shipment?.metadata?.sender || {};
  const goods = shipment?.metadata?.shipmentDetails || {};
  const cash = String(shipment?.metadata?.pricing?.paymentMethod || '').toLowerCase().includes('cash');

  return (
    <div className="max-w-2xl space-y-4">
      <div><h2 className="text-xl font-semibold">Collection QR Scanner</h2><p className="text-sm text-muted-foreground">Scan the customer’s booking QR before accepting goods or cash.</p></div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {cameraOn && <div className="relative overflow-hidden rounded-lg bg-black"><video ref={videoRef} className="w-full max-h-80" /><Button size="icon" variant="secondary" className="absolute right-2 top-2" onClick={stopCamera}><X className="h-4 w-4" /></Button></div>}
          <div className="flex gap-2"><Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Scan or paste QR token" /><Button onClick={() => lookup()} disabled={busy}><ScanLine className="h-4 w-4 mr-2" />Find</Button></div>
          <Button variant="outline" className="w-full" onClick={startCamera}><Camera className="h-4 w-4 mr-2" />Use camera</Button>
        </CardContent>
      </Card>

      {shipment && <Card>
        <CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>{shipment.customer_reference}</span><span className="text-sm font-normal text-muted-foreground">{shipment.tracking_number}</span></CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3 text-sm"><div><span className="text-muted-foreground">Customer</span><p className="font-medium">{`${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Not supplied'}</p></div><div><span className="text-muted-foreground">Phone</span><p className="font-medium">{sender.phone || 'Not supplied'}</p></div><div><span className="text-muted-foreground">Goods</span><p className="font-medium">{goods.category || goods.type || 'Shipment goods'}</p></div><div><span className="text-muted-foreground">Status</span><p className="font-medium">{shipment.status}</p></div></div>
          {cash && <div className="space-y-3 rounded-lg border p-4"><Label>Cash on collection</Label><RadioGroup value={paymentResult} onValueChange={setPaymentResult}><div className="flex items-center gap-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid">Cash received in full</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="partial" id="partial" /><Label htmlFor="partial">Partial payment</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="unpaid" id="unpaid" /><Label htmlFor="unpaid">No payment received</Label></div></RadioGroup><div><Label htmlFor="amount">Amount received</Label><Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div></div>}
          <div><Label htmlFor="notes">Collection notes or discrepancies</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button className="w-full" onClick={confirm} disabled={busy || !!shipment.collected_at}><CheckCircle2 className="h-4 w-4 mr-2" />{shipment.collected_at ? 'Already collected' : 'Confirm collection'}</Button>
        </CardContent>
      </Card>}
    </div>
  );
}
