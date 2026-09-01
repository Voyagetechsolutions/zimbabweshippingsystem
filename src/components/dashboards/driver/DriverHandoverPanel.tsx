import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Camera, CheckCircle2, Loader2, QrCode, ShieldCheck, X,
} from 'lucide-react';

// Completing a stop from the browser.
//
// The server decides what "complete" means (complete_driver_handover): a
// collection needs an invoice, a departure photo, a verified customer QR and the
// customer's six-digit collection code; a delivery needs a drop photo, the QR and
// the delivery code. This panel is the browser's way to satisfy exactly that —
// the same checks the phone app performs, so neither can complete a stop the
// other would refuse.

const db = supabase as any;

export type HandoverStop = {
  stopId: string;
  shipmentId: string;
  kind: 'collection' | 'delivery';
  customerName: string;
  reference: string;
};

type Proof = { id: string; proof_type: string; storage_path: string; url?: string };
type LineItem = { description: string; quantity: string; unitPrice: string };

/** A QR payload may be a bare token or a tracking URL carrying one. */
function qrToken(value: string) {
  const text = value.trim();
  try {
    const url = new URL(text);
    return url.searchParams.get('token') || url.searchParams.get('qr') || url.pathname.split('/').filter(Boolean).pop() || text;
  } catch {
    return text;
  }
}

export default function DriverHandoverPanel({ stop, onDone, onCancel }: {
  stop: HandoverStop;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const pickup = stop.kind === 'collection';

  const [busy, setBusy] = useState<string | null>(null);
  const [qrVerified, setQrVerified] = useState(false);
  const [manualQr, setManualQr] = useState('');
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');

  const [goodsDescription, setGoodsDescription] = useState('');
  const [savedCorrection, setSavedCorrection] = useState('');
  const [correction, setCorrection] = useState('');

  const [items, setItems] = useState<LineItem[]>([{ description: 'Shipping and collection service', quantity: '1', unitPrice: '' }]);
  const [currency, setCurrency] = useState('GBP');
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [serverPriced, setServerPriced] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const [sealsRequested, setSealsRequested] = useState(0);
  const [sealsUsed, setSealsUsed] = useState(false);
  const [sealCodes, setSealCodes] = useState<string[]>([]);
  const [sealConditions,setSealConditions]=useState<string[]>([]);
  const [sealCondition, setSealCondition] = useState<string>('');
  const [sealNotes, setSealNotes] = useState('');
  const [sealsSaved, setSealsSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const load = useCallback(async () => {
    const [invoiceResult, proofResult, stopResult, shipmentResult, sealResult, operationsResult] = await Promise.all([
      db.from('driver_invoices').select('id,currency,line_items,discount,tax,notes').eq('stop_id', stop.stopId).maybeSingle(),
      db.from('driver_proofs').select('id,proof_type,storage_path').eq('stop_id', stop.stopId).is('deleted_at', null).order('captured_at'),
      db.from('driver_run_stops').select('qr_verified_at').eq('id', stop.stopId).maybeSingle(),
      db.from('shipments').select('goods_description,driver_description_correction,seals_requested,metadata').eq('id', stop.shipmentId).maybeSingle(),
      db.from('shipment_seals').select('*').eq('shipment_id', stop.shipmentId).maybeSingle(),
      db.from('app_configuration').select('value').eq('key','operations').maybeSingle(),
    ]);
    const configuredConditions=operationsResult.data?.value?.sealConditions||[];setSealConditions(configuredConditions);setSealCondition((current)=>current||configuredConditions[0]||'');

    const shipment: any = shipmentResult.data || {};
    const metaInvoice = shipment.metadata?.invoice;
    const metaItems = Array.isArray(metaInvoice?.items) ? metaInvoice.items : [];
    setGoodsDescription(shipment.goods_description || shipment.metadata?.shipment?.description || '');
    setSavedCorrection(shipment.driver_description_correction || '');
    setSealsRequested(Number(shipment.seals_requested || 0));

    if (invoiceResult.data) {
      const inv: any = invoiceResult.data;
      setInvoiceId(inv.id);
      const saved = Array.isArray(inv.line_items) ? inv.line_items : [];
      if (saved.length) {
        setItems(saved.map((i: any) => ({ description: i.description || '', quantity: String(i.quantity || 1), unitPrice: String(i.unitPrice ?? '') })));
      }
      setCurrency(inv.currency || 'GBP');
      setDiscount(String(inv.discount || 0));
      setServerPriced(metaItems.length > 0);
    } else if (metaItems.length > 0) {
      setServerPriced(true);
      setItems(metaItems.map((i: any) => ({ description: i.description || '', quantity: String(i.quantity || 1), unitPrice: String(i.unitPrice ?? 0) })));
      setDiscount(String(metaInvoice.discount || 0));
      setTaxRate(String(metaInvoice.taxRate || 0));
      setCurrency(metaInvoice.currency || 'GBP');
    }

    if (sealResult.data) {
      const seal: any = sealResult.data;
      setSealsUsed(Boolean(seal.seals_used));
      setSealCodes(Array.isArray(seal.seal_codes) ? seal.seal_codes : []);
      setSealCondition(configuredConditions.includes(seal.condition) ? seal.condition : (configuredConditions[0]||''));
      setSealNotes(seal.notes || '');
      setSealsSaved(true);
    } else if (Number(shipment.seals_requested || 0) > 0) {
      setSealsUsed(true);
      setSealCodes((current) => current.length ? current : Array(Number(shipment.seals_requested)).fill(''));
    }

    const rows = (proofResult.data || []) as Proof[];
    const withUrls = await Promise.all(rows.map(async (proof) => {
      const { data } = await supabase.storage.from('driver-proofs').createSignedUrl(proof.storage_path, 3600);
      return { ...proof, url: data?.signedUrl };
    }));
    setProofs(withUrls);
    setQrVerified(Boolean((stopResult.data as any)?.qr_verified_at));
  }, [stop.stopId, stop.shipmentId]);

  useEffect(() => { load(); }, [load]);

  // ── QR ────────────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const verifyQr = async (value: string) => {
    if (!value.trim()) return;
    setBusy('qr');
    const { error } = await db.rpc('verify_driver_stop_qr', { p_stop_id: stop.stopId, p_qr_token: qrToken(value) });
    setBusy(null);
    if (error) { toast({ title: 'QR verification failed', description: error.message, variant: 'destructive' }); return; }
    setQrVerified(true);
    stopCamera();
    toast({ title: 'Customer signature verified', description: 'The shipment QR matches this stop.' });
  };

  const startCamera = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      toast({ title: 'Camera scanning unavailable', description: 'This browser cannot scan codes — type the QR token instead.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const detector = new Detector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.[0]?.rawValue) { await verifyQr(codes[0].rawValue); return; }
        } catch { /* a frame that will not decode is not an error worth showing */ }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      toast({ title: 'Could not open the camera', description: 'Grant camera access, or type the QR token.', variant: 'destructive' });
    }
  };

  // ── Photos ────────────────────────────────────────────────────────────────
  const uploadPhoto = async (proofType: string, file: File) => {
    if (!user?.id) return;
    setBusy(proofType);
    try {
      const path = `${user.id}/${stop.shipmentId}/${stop.stopId}-${proofType}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('driver-proofs')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await db.from('driver_proofs').insert({
        shipment_id: stop.shipmentId, stop_id: stop.stopId, driver_id: user.id,
        proof_type: proofType, storage_path: path,
      });
      if (rowError) throw rowError;
      await load();
    } catch (e: any) {
      toast({ title: 'Photo upload failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  // ── Saves ─────────────────────────────────────────────────────────────────
  const saveCorrection = async () => {
    if (!correction.trim()) return;
    setBusy('correction');
    const { error } = await db.rpc('driver_correct_goods_description', {
      p_stop_id: stop.stopId, p_correction: correction.trim(),
    });
    setBusy(null);
    if (error) { toast({ title: 'Could not save correction', description: error.message, variant: 'destructive' }); return; }
    setSavedCorrection(correction.trim());
    setCorrection('');
    toast({ title: 'Correction saved', description: "The customer's original description is kept alongside it." });
  };

  const saveSeals = async () => {
    const codes = sealCodes.map((c) => c.trim()).filter(Boolean);
    if (sealsUsed && codes.length === 0) {
      toast({ title: 'Seal codes required', description: 'Enter the code stamped on every seal you fitted.', variant: 'destructive' });
      return;
    }
    setBusy('seals');
    const { error } = await db.rpc('record_shipment_seals', {
      p_stop_id: stop.stopId, p_seals_used: sealsUsed, p_seal_count: codes.length,
      p_seal_codes: codes, p_condition: sealCondition, p_notes: sealNotes.trim() || null,
      p_photo_path: proofs.find((p) => p.proof_type === 'seal')?.storage_path || null,
    });
    setBusy(null);
    if (error) { toast({ title: 'Could not record seals', description: error.message, variant: 'destructive' }); return; }
    setSealsSaved(true);
    toast({ title: 'Seals recorded' });
  };

  const saveInvoice = async () => {
    const lineItems = items.map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }));
    if (lineItems.some((i) => !i.description)) {
      toast({ title: 'Invoice details required', description: 'Every line needs a description.', variant: 'destructive' });
      return;
    }
    if (!serverPriced && lineItems.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) {
      toast({ title: 'Invoice details required', description: 'Every line needs a quantity and a valid unit price.', variant: 'destructive' });
      return;
    }
    setBusy('invoice');
    const { data, error } = await db.rpc('create_driver_invoice', {
      p_stop_id: stop.stopId, p_line_items: lineItems, p_discount: Number(discount || 0),
      p_tax_rate: Number(taxRate || 0), p_currency: currency, p_notes: notes.trim() || null,
    });
    setBusy(null);
    if (error) { toast({ title: 'Invoice failed', description: error.message, variant: 'destructive' }); return; }
    setInvoiceId((data as any)?.id || 'saved');
    toast({ title: 'Invoice saved', description: 'Admin and Finance can see it now.' });
  };

  const complete = async () => {
    if (code.trim().length !== 6) {
      toast({ title: 'Customer code required', description: 'Ask the customer for the six-digit code in their app.', variant: 'destructive' });
      return;
    }
    if (pickup && sealsRequested > 0 && !sealsSaved) {
      toast({
        title: 'Record the seals first',
        description: `The customer paid for ${sealsRequested} metal coded seal(s) — fit them and record every code.`,
        variant: 'destructive',
      });
      return;
    }
    setBusy('complete');
    const { error } = await db.rpc('complete_driver_handover', {
      p_stop_id: stop.stopId, p_customer_code: code.trim(), p_notes: notes.trim() || null,
    });
    setBusy(null);
    if (error) { toast({ title: 'Could not complete the stop', description: error.message, variant: 'destructive' }); return; }
    toast({
      title: pickup ? 'Collection complete' : 'Delivery complete',
      description: `${stop.reference} is done.`,
    });
    onDone();
  };

  const photoSlots: Array<[string, string]> = pickup
    ? [['pickup_departure', 'Goods leaving the pickup address'], ['depot_arrival', 'Goods arriving at the depot']]
    : [['depot_departure', 'Goods leaving the depot'], ['delivery_arrival', 'Goods at the drop-off']];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {pickup ? 'Proof of collection' : 'Proof of delivery'} — {stop.customerName}
              </CardTitle>
              <CardDescription>{stop.reference}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCancel} title="Back">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Goods description — collections only */}
      {pickup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Customer's goods description</CardTitle>
            <CardDescription>Check the goods against what was declared. The original is never overwritten.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm bg-muted rounded p-3">{goodsDescription || 'No description was provided.'}</p>
            {savedCorrection && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                <strong>Your correction on record:</strong> {savedCorrection}
              </p>
            )}
            <Textarea
              value={correction} onChange={(e) => setCorrection(e.target.value)} rows={2}
              placeholder="e.g. Actually 3 drums not 2; TV box already dented on arrival…"
            />
            <Button size="sm" variant="outline" onClick={saveCorrection} disabled={busy === 'correction' || !correction.trim()}>
              {busy === 'correction' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Save correction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-4 w-4" /> Customer QR signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {qrVerified ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <ShieldCheck className="h-4 w-4" /> Shipment identity verified
            </p>
          ) : (
            <>
              {cameraOn && (
                <div className="relative rounded overflow-hidden bg-black max-w-sm">
                  <video ref={videoRef} className="w-full" muted playsInline />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={cameraOn ? stopCamera : startCamera}>
                  <Camera className="h-3.5 w-3.5 mr-1.5" /> {cameraOn ? 'Stop camera' : 'Scan with camera'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={manualQr} onChange={(e) => setManualQr(e.target.value)} placeholder="Or paste the QR token" />
                <Button size="sm" onClick={() => verifyQr(manualQr)} disabled={busy === 'qr'}>
                  {busy === 'qr' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice — collections only */}
      {pickup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collection invoice</CardTitle>
            <CardDescription>
              {serverPriced
                ? "Prices come from the customer's booking and are locked. You can correct the wording only."
                : 'Manual booking — build the invoice with the office-confirmed prices.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_80px_100px] items-end">
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => setItems((c) => c.map((row, i) => i === index ? { ...row, description: e.target.value } : row))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    value={item.quantity} disabled={serverPriced} inputMode="decimal"
                    onChange={(e) => setItems((c) => c.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit price</Label>
                  <Input
                    value={item.unitPrice} disabled={serverPriced} inputMode="decimal"
                    onChange={(e) => setItems((c) => c.map((row, i) => i === index ? { ...row, unitPrice: e.target.value } : row))}
                  />
                </div>
              </div>
            ))}
            {!serverPriced && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setItems((c) => [...c, { description: '', quantity: '1', unitPrice: '' }])}>
                  Add item
                </Button>
                <Input className="w-24" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" />
                <Input className="w-20" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax %" />
                <Input className="w-20" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="GBP" />
              </div>
            )}
            <Button size="sm" onClick={saveInvoice} disabled={busy === 'invoice'}>
              {busy === 'invoice' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {invoiceId ? 'Update invoice' : serverPriced ? 'Confirm invoice' : 'Save invoice'}
            </Button>
            {invoiceId && <span className="text-xs text-emerald-700 ml-2">Invoice saved</span>}
          </CardContent>
        </Card>
      )}

      {/* Seals — collections only */}
      {pickup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metal coded seals</CardTitle>
            <CardDescription>
              {sealsRequested > 0
                ? `The customer paid for ${sealsRequested} seal(s) — fit them and record every code.`
                : 'Record any metal coded seals fitted to drums, trunks or boxes.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={sealsUsed}
                onCheckedChange={(v) => { setSealsUsed(v); setSealsSaved(false); if (v && sealCodes.length === 0) setSealCodes(['']); }}
              />
              <span className="text-sm">Seals used on this shipment</span>
            </div>
            {sealsUsed && (
              <>
                {sealCodes.map((value, index) => (
                  <Input
                    key={index} value={value} placeholder={`Seal code ${index + 1}`}
                    onChange={(e) => { setSealsSaved(false); setSealCodes((c) => c.map((v, i) => i === index ? e.target.value.toUpperCase() : v)); }}
                  />
                ))}
                <Button size="sm" variant="ghost" onClick={() => setSealCodes((c) => [...c, ''])}>Add another seal code</Button>
                <div className="flex flex-wrap gap-1.5">
                  {sealConditions.map((condition) => (
                    <Button
                      key={condition} size="sm"
                      variant={sealCondition === condition ? 'default' : 'outline'}
                      className="h-7 text-xs capitalize"
                      onClick={() => { setSealCondition(condition); setSealsSaved(false); }}
                    >
                      {condition}
                    </Button>
                  ))}
                </div>
                <Input value={sealNotes} onChange={(e) => { setSealNotes(e.target.value); setSealsSaved(false); }} placeholder="Seal notes (optional)" />
                <PhotoSlot
                  label="Photograph the fitted seals" proofType="seal" proofs={proofs}
                  busy={busy} onUpload={uploadPhoto}
                />
              </>
            )}
            <Button size="sm" onClick={saveSeals} disabled={busy === 'seals'}>
              {busy === 'seals' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {sealsSaved ? 'Update seal record' : 'Record seals'}
            </Button>
            {sealsSaved && <span className="text-xs text-emerald-700 ml-2">Seal record saved</span>}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proof of goods</CardTitle>
          <CardDescription>
            Timestamped, linked to this stop, visible to admins, and deleted automatically 48 hours after a verified delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {photoSlots.map(([type, label]) => (
            <PhotoSlot key={type} label={label} proofType={type} proofs={proofs} busy={busy} onUpload={uploadPhoto} />
          ))}
        </CardContent>
      </Card>

      {/* Complete */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Customer verification</CardTitle>
          <CardDescription>
            Ask the customer for the six-digit {pickup ? 'collection' : 'delivery'} code shown in their app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={code} inputMode="numeric" maxLength={6} placeholder="000000"
            className="text-2xl font-bold tracking-[0.5em] text-center max-w-[220px]"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Driver notes (optional)" />
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={complete} disabled={busy === 'complete'}>
            {busy === 'complete'
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {pickup ? 'Verify code & mark collected' : 'Verify code & mark delivered'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoSlot({ label, proofType, proofs, busy, onUpload }: {
  label: string;
  proofType: string;
  proofs: Proof[];
  busy: string | null;
  onUpload: (proofType: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const proof = proofs.find((p) => p.proof_type === proofType);
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy === proofType}
        className={`w-full rounded-md border border-dashed p-3 text-center transition-colors ${
          proof ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        {busy === proofType ? (
          <Loader2 className="h-5 w-5 mx-auto animate-spin text-emerald-600" />
        ) : proof?.url ? (
          <img src={proof.url} alt={label} className="w-full h-28 object-cover rounded mb-2" />
        ) : (
          <Camera className="h-6 w-6 mx-auto text-gray-400 mb-1" />
        )}
        <span className="text-xs font-medium text-gray-600">{proof ? `Retake: ${label}` : label}</span>
        {proof && <Badge variant="outline" className="ml-1.5 text-[10px] border-emerald-400 text-emerald-700">On file</Badge>}
      </button>
      <input
        ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(proofType, file); e.target.value = ''; }}
      />
    </div>
  );
}
