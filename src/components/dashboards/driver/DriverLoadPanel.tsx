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
import {
  AlertTriangle, Camera, Loader2, PackageSearch, ShieldAlert, ShieldCheck, Trash2,
} from 'lucide-react';
import {
  addDeliveryLoadItem, loadDeliveryDay, lookupDeliveryShipment, removeDeliveryLoadItem,
  sealStatusLabel, verificationLabel,
  type DeliveryDay, type DeliveryLookup, type SealStatus, type VerificationStatus,
} from '@/lib/driverOps';

// Building the delivery load.
//
// The driver types the customer reference off the label and the code stamped on
// the metal seal. The lookup answers two questions at once: which customer this
// is, and whether the seal in their hand is the seal fitted at collection. What
// the customer declared they are shipping sits right next to it, so the goods can
// be checked before anything goes on the vehicle.

const db = supabase as any;

function sealClasses(status: SealStatus | null | undefined) {
  if (status === 'matched') return 'bg-emerald-50 border-emerald-300 text-emerald-800';
  if (status === 'mismatch') return 'bg-red-50 border-red-300 text-red-800';
  if (status === 'not_entered') return 'bg-amber-50 border-amber-300 text-amber-800';
  return 'bg-gray-50 border-gray-300 text-gray-700';
}

function verificationVariant(status: VerificationStatus) {
  if (status === 'verified') return 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
}

export default function DriverLoadPanel({ onDuty }: { onDuty: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [reference, setReference] = useState('');
  const [sealCode, setSealCode] = useState('');
  const [found, setFound] = useState<DeliveryLookup | null>(null);
  const [discrepancy, setDiscrepancy] = useState('');
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  const [day, setDay] = useState<DeliveryDay | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setDay(await loadDeliveryDay()); setError(null); }
    catch (e: any) { setDay(null); setError(e?.message || 'Could not load your vehicle.'); }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const reset = () => { setFound(null); setDiscrepancy(''); setPhoto(null); setSealCode(''); setReference(''); };

  const find = async () => {
    if (reference.trim().length < 3) {
      toast({ title: 'Customer reference needed', description: 'Type the reference on the label or delivery note.', variant: 'destructive' });
      return;
    }
    setBusy('find');
    try {
      setFound(await lookupDeliveryShipment(reference, sealCode));
      setDiscrepancy('');
      setPhoto(null);
    } catch (e: any) {
      setFound(null);
      toast({ title: 'Consignment not found', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  // The photo is taken before the item joins the load, so it goes to storage
  // first and is attached to the stop once the stop exists.
  const uploadPhoto = async (file: File) => {
    if (!user?.id) return;
    setBusy('photo');
    try {
      const path = `${user.id}/${found?.shipmentId || 'load'}/load-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('driver-proofs')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = await supabase.storage.from('driver-proofs').createSignedUrl(path, 3600);
      setPhoto({ path, url: data?.signedUrl || '' });
    } catch (e: any) {
      toast({ title: 'Photo upload failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const addToLoad = async () => {
    if (!found) return;
    if (!photo) {
      toast({ title: 'Photograph the goods', description: 'A photo of the consignment being loaded is required.', variant: 'destructive' });
      return;
    }
    if (found.sealStatus === 'mismatch' && !discrepancy.trim()) {
      toast({
        title: 'Record what you found',
        description: 'The seal does not match the collection record. Check the goods against what this customer is shipping, then write down what you found.',
        variant: 'destructive',
      });
      return;
    }
    setBusy('add');
    try {
      const result = await addDeliveryLoadItem({
        shipmentId: found.shipmentId,
        enteredReference: reference || found.customerReference || '',
        sealCode,
        discrepancyNote: discrepancy,
        photoPath: photo.path,
      });
      await db.from('driver_proofs').insert({
        shipment_id: found.shipmentId, stop_id: result.stopId, driver_id: user?.id,
        proof_type: 'delivery_load', storage_path: photo.path,
      });
      reset();
      await load();
      toast({
        title: 'Added to the load',
        description: `${result.deliveryNote.noteNumber} is with admin for verification.`,
      });
    } catch (e: any) {
      toast({ title: 'Could not load this consignment', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const remove = async (stopId: string) => {
    setBusy(stopId);
    try { await removeDeliveryLoadItem(stopId, 'Unloaded by driver'); await load(); }
    catch (e: any) { toast({ title: 'Could not unload', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (!onDuty) {
    return (
      <Card><CardContent className="py-12 text-center">
        <PackageSearch className="h-9 w-9 mx-auto text-emerald-600 mb-3" />
        <p className="font-semibold">Clock in to load the vehicle</p>
        <p className="text-sm text-muted-foreground mt-1">Loading is recorded against your shift.</p>
      </CardContent></Card>
    );
  }

  const items = day?.items || [];
  const verified = items.filter((i) => i.verificationStatus === 'verified').length;

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-300"><CardContent className="p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </CardContent></Card>
      )}

      {/* 1 — identify */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Find the consignment</CardTitle>
          <CardDescription>
            Type the customer reference from the label, and the code stamped on the metal seal. The seal is checked
            against the one fitted when the goods were collected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Customer reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="e.g. JOH-4567" />
            </div>
            <div>
              <Label className="text-xs">Metal seal code (if sealed)</Label>
              <Input value={sealCode} onChange={(e) => setSealCode(e.target.value.toUpperCase())} placeholder="e.g. ZS-04521" />
            </div>
          </div>
          <Button onClick={find} disabled={busy === 'find'} className="bg-emerald-600 hover:bg-emerald-700">
            {busy === 'find' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackageSearch className="h-4 w-4 mr-2" />}
            Find consignment
          </Button>
        </CardContent>
      </Card>

      {/* 2 — verify */}
      {found && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verify before loading</CardTitle>
            <CardDescription>{found.customerReference || '—'} · {found.trackingNumber || 'No tracking'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">{found.receiverName || 'Recipient not named'}</p>
              <p className="text-sm text-muted-foreground">{found.deliveryAddress || 'Delivery address not recorded'}</p>
              {found.receiverPhone && <p className="text-sm text-muted-foreground">{found.receiverPhone}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                From {found.senderName || 'sender'} · {found.status || 'status unknown'}
              </p>
            </div>

            <div className={`rounded-md border p-3 flex items-start gap-2 ${sealClasses(found.sealStatus)}`}>
              {found.sealStatus === 'matched'
                ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                : <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">{sealStatusLabel(found.sealStatus)}</p>
                <p className="text-xs mt-0.5">
                  {found.recordedSealCodes.length
                    ? `Recorded at collection: ${found.recordedSealCodes.join(', ')}${found.sealCondition ? ` · ${found.sealCondition}` : ''}`
                    : found.sealsRequested > 0
                      ? `${found.sealsRequested} seal(s) were paid for but no codes were recorded at collection.`
                      : 'This customer did not buy metal seals — the reference alone identifies the goods.'}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs">What this customer is shipping</Label>
              <div className="mt-1 rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p>{found.goodsDescription || 'No description was recorded for this consignment.'}</p>
                {found.driverCorrection && (
                  <p className="text-amber-800 text-xs">Collection driver’s correction: {found.driverCorrection}</p>
                )}
                {found.items.map((item, index) => (
                  <p key={index} className="text-xs">• {item.quantity ?? 1} × {item.description || 'Item'}</p>
                ))}
              </div>
            </div>

            {found.sealStatus === 'mismatch' && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-xs text-red-800">
                  This seal is not the one recorded at collection. Compare the goods in front of you with the list
                  above before loading, and write down exactly what you found — admin reads this before verifying
                  the delivery note.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">
                {found.sealStatus === 'mismatch' ? 'What did you find? (required)' : 'Loading note (optional)'}
              </Label>
              <Textarea
                value={discrepancy} onChange={(e) => setDiscrepancy(e.target.value)} rows={2}
                placeholder={found.sealStatus === 'mismatch'
                  ? 'e.g. Seal ZS-04600 fitted, original cut. 2 drums and 1 trunk present, matches the booking.'
                  : 'Anything worth recording about the condition of the goods'}
              />
            </div>

            <div>
              <Label className="text-xs">Photograph of the goods (required)</Label>
              <button
                type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'photo'}
                className={`mt-1 w-full rounded-md border border-dashed p-3 text-center max-w-sm ${
                  photo ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {busy === 'photo'
                  ? <Loader2 className="h-5 w-5 mx-auto animate-spin text-emerald-600" />
                  : photo?.url
                    ? <img src={photo.url} alt="Goods being loaded" className="w-full h-32 object-cover rounded mb-2" />
                    : <Camera className="h-6 w-6 mx-auto text-gray-400 mb-1" />}
                <span className="text-xs font-medium text-gray-600">
                  {photo ? 'Retake photo of the goods' : 'Photograph the goods being loaded'}
                </span>
              </button>
              <input
                ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file); e.target.value = ''; }}
              />
            </div>

            {found.alreadyLoaded && !found.loadedByMe && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {found.loadedByName || 'Another driver'} already has this consignment on their vehicle.
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={addToLoad} disabled={busy === 'add'} className="bg-emerald-600 hover:bg-emerald-700">
                {busy === 'add' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {found.loadedByMe ? 'Update this load entry' : 'Add to the load'}
              </Button>
              <Button variant="outline" onClick={reset}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3 — what is on the vehicle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">On the vehicle</CardTitle>
          <CardDescription>
            {loading ? 'Loading…'
              : items.length === 0 ? 'Nothing loaded yet.'
                : `${verified} of ${items.length} delivery note(s) verified.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.stopId} className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700">
                  {item.customerReference || item.trackingNumber || '—'}
                </p>
                <p className="text-sm font-medium">{item.receiverName || 'Recipient not named'}</p>
                <p className="text-xs text-muted-foreground">{item.address || 'Address not recorded'}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Badge variant="outline" className={`text-[10px] ${sealClasses(item.sealStatus)}`}>
                    {item.sealStatus === 'matched' ? `Seal ${item.enteredSealCode}`
                      : item.sealStatus === 'mismatch' ? `Seal mismatch: ${item.enteredSealCode}`
                        : 'No seal'}
                  </Badge>
                  <Badge className={`text-[10px] ${verificationVariant(item.verificationStatus)}`}>
                    {verificationLabel(item.verificationStatus)}
                  </Badge>
                </div>
                {item.discrepancyNote && <p className="text-xs text-amber-800 mt-1">{item.discrepancyNote}</p>}
                {item.verificationStatus === 'rejected' && item.verificationNotes && (
                  <p className="text-xs text-red-700 font-medium mt-1">Admin: {item.verificationNotes}</p>
                )}
              </div>
              {item.stopStatus === 'planned' && (
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-red-600 shrink-0"
                  disabled={busy === item.stopId} onClick={() => remove(item.stopId)} title="Take off the vehicle"
                >
                  {busy === item.stopId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
