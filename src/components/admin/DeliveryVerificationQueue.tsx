import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck, ShieldAlert, Loader2, RefreshCw, PackageCheck, ChevronDown, ChevronUp,
} from 'lucide-react';

// Delivery notes waiting on an admin.
//
// A delivery driver loads the vehicle at the Zimbabwe depot by matching each
// consignment's customer reference to the code stamped on the metal seal fitted
// at collection. Every consignment they load raises a draft delivery note, and
// the run will not start until an admin has verified each one — so this queue is
// the thing standing between a loaded vehicle and the road.
//
// The tables behind it ship with the delivery-driver migration. Until that is
// deployed the whole panel stays hidden rather than showing a broken card.

const db = supabase as any;

type LoadItem = {
  entered_reference: string | null;
  entered_seal_code: string | null;
  seal_status: 'matched' | 'mismatch' | 'none_on_record' | null;
  recorded_seal_codes: string[] | null;
  discrepancy_note: string | null;
  photo_path: string | null;
};

type PendingNote = {
  id: string;
  note_number: string;
  shipment_id: string;
  stop_id: string;
  driver_id: string;
  recipient_name: string | null;
  delivery_address: string | null;
  seal_codes: string[] | null;
  seal_status: string | null;
  discrepancy_note: string | null;
  loaded_at: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  shipment: {
    id: string;
    customer_reference: string | null;
    tracking_number: string | null;
    status: string | null;
    destination: string | null;
    goods_description: string | null;
    driver_description_correction: string | null;
    metadata: Record<string, any> | null;
  } | null;
  driver?: { full_name: string | null; email: string | null } | null;
  loadItem?: LoadItem | null;
  photoUrl?: string | null;
};

function sealLabel(status: string | null | undefined) {
  if (status === 'matched') return 'Seal matches collection record';
  if (status === 'mismatch') return 'Seal does NOT match collection record';
  return 'No seal recorded at collection';
}

export default function DeliveryVerificationQueue() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from('delivery_notes')
      .select('id,note_number,shipment_id,stop_id,driver_id,recipient_name,delivery_address,seal_codes,seal_status,discrepancy_note,loaded_at,verification_status,shipment:shipments(id,customer_reference,tracking_number,status,destination,goods_description,driver_description_correction,metadata)')
      .eq('verification_status', 'pending')
      .is('delivered_at', null)
      .order('loaded_at', { ascending: true })
      .limit(50);

    if (error) {
      // The verification columns only exist once the delivery-driver migration
      // is applied. Nothing to verify on an un-migrated database.
      setAvailable(!/verification_status|delivery_notes/i.test(error.message || ''));
      setNotes([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as PendingNote[];
    const enriched = await Promise.all(rows.map(async (note) => {
      const [driverResult, loadResult] = await Promise.all([
        db.from('profiles').select('full_name,email').eq('id', note.driver_id).maybeSingle(),
        db.from('delivery_load_items')
          .select('entered_reference,entered_seal_code,seal_status,recorded_seal_codes,discrepancy_note,photo_path')
          .eq('stop_id', note.stop_id).maybeSingle(),
      ]);
      const loadItem = (loadResult?.data || null) as LoadItem | null;
      let photoUrl: string | null = null;
      if (loadItem?.photo_path) {
        const signed = await supabase.storage.from('driver-proofs').createSignedUrl(loadItem.photo_path, 3600);
        photoUrl = signed.data?.signedUrl || null;
      }
      return { ...note, driver: driverResult?.data || null, loadItem, photoUrl };
    }));

    setNotes(enriched);
    setAvailable(true);
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // The driver is standing at the vehicle waiting, so the queue keeps itself
  // current rather than relying on the admin hitting refresh.
  useEffect(() => {
    const channel = supabase
      .channel('admin-delivery-verification')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'delivery_notes' } as any, () => fetchQueue())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue]);

  const decide = async (note: PendingNote, approved: boolean) => {
    const reason = (reasons[note.id] || '').trim();
    if (!approved && !reason) {
      toast({
        title: 'Say what is wrong',
        description: 'The driver sees this message, so tell them what to fix before re-presenting the goods.',
        variant: 'destructive',
      });
      return;
    }
    setDeciding(note.id);
    const { error } = await db.rpc('verify_delivery_note', {
      p_note_id: note.id, p_approved: approved, p_notes: reason || null,
    });
    setDeciding(null);
    if (error) {
      toast({ title: 'Could not update the note', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: approved ? 'Delivery note verified' : 'Delivery note rejected',
      description: approved
        ? `${note.note_number} — the driver can download it and this consignment is cleared to travel.`
        : `${note.note_number} — the driver has been told to take it off the vehicle.`,
    });
    setReasons((current) => ({ ...current, [note.id]: '' }));
    await fetchQueue();
  };

  // Hide entirely on an un-migrated database, and once the queue is clear there
  // is no point taking up the top of the tab with an empty card.
  if (!available) return null;
  if (!loading && notes.length === 0) return null;

  const flagged = notes.filter((note) => note.loadItem?.seal_status === 'mismatch').length;

  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-amber-700" />
              Loaded for delivery — awaiting your verification
              <Badge variant="outline" className="border-amber-400 text-amber-800">{notes.length}</Badge>
              {flagged > 0 && (
                <Badge variant="destructive">{flagged} seal discrepancy</Badge>
              )}
            </CardTitle>
            <CardDescription>
              A delivery driver cannot start their run, or download a delivery note, until you verify it.
              Check the goods, the seal and the recipient against the booking.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={fetchQueue} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading && notes.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the verification queue…
          </div>
        ) : null}

        {notes.map((note) => {
          const mismatch = note.loadItem?.seal_status === 'mismatch';
          const open = expanded === note.id;
          const items: any[] = Array.isArray(note.shipment?.metadata?.invoice?.items)
            ? note.shipment!.metadata!.invoice.items : [];
          return (
            <div key={note.id} className={`rounded-md border bg-background p-3 ${mismatch ? 'border-red-300' : 'border-border'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{note.note_number}</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {note.shipment?.customer_reference || note.shipment?.tracking_number || '—'}
                    </span>
                    {mismatch
                      ? <Badge variant="destructive" className="text-[10px]">Seal mismatch</Badge>
                      : <Badge variant="outline" className="text-[10px]">{sealLabel(note.loadItem?.seal_status)}</Badge>}
                  </div>
                  <p className="text-sm mt-1">{note.recipient_name || 'Recipient not named'}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.delivery_address || note.shipment?.destination || 'Address not recorded'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Loaded by {note.driver?.full_name || note.driver?.email || 'driver'}
                    {note.loaded_at ? ` · ${new Date(note.loaded_at).toLocaleString('en-GB')}` : ''}
                  </p>
                </div>
                <button
                  className="text-xs underline text-muted-foreground shrink-0 flex items-center gap-1"
                  onClick={() => setExpanded(open ? null : note.id)}
                >
                  {open ? <>Hide detail <ChevronUp className="h-3 w-3" /></> : <>Show detail <ChevronDown className="h-3 w-3" /></>}
                </button>
              </div>

              {mismatch && note.loadItem?.discrepancy_note ? (
                <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  <strong>Driver found:</strong> {note.loadItem.discrepancy_note}
                </p>
              ) : note.loadItem?.discrepancy_note ? (
                <p className="mt-2 text-xs text-amber-800">{note.loadItem.discrepancy_note}</p>
              ) : null}

              {open ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="text-xs space-y-1">
                    <p className="font-semibold uppercase tracking-wide text-muted-foreground">What the driver recorded</p>
                    <p>Reference typed: <strong>{note.loadItem?.entered_reference || '—'}</strong></p>
                    <p>Seal code read: <strong>{note.loadItem?.entered_seal_code || 'None entered'}</strong></p>
                    <p>Fitted at collection: <strong>{(note.loadItem?.recorded_seal_codes || []).join(', ') || 'None'}</strong></p>

                    <p className="font-semibold uppercase tracking-wide text-muted-foreground pt-2">What the customer is shipping</p>
                    <p>{note.shipment?.goods_description || 'No description recorded'}</p>
                    {note.shipment?.driver_description_correction ? (
                      <p className="text-amber-800">
                        Collection correction: {note.shipment.driver_description_correction}
                      </p>
                    ) : null}
                    {items.map((item, index) => (
                      <p key={index}>• {item.quantity ?? 1} × {item.description || 'Item'}</p>
                    ))}
                  </div>
                  <div>
                    {note.photoUrl ? (
                      <a href={note.photoUrl} target="_blank" rel="noreferrer">
                        <img
                          src={note.photoUrl}
                          alt={`Goods loaded for ${note.note_number}`}
                          className="rounded border max-h-48 w-full object-cover"
                        />
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">No loading photograph on file.</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Textarea
                  className="min-h-[38px] text-xs"
                  rows={1}
                  placeholder={mismatch
                    ? 'Required to reject — the driver reads this. e.g. Replacement seal not logged, unload it.'
                    : 'Optional note to the driver'}
                  value={reasons[note.id] || ''}
                  onChange={(e) => setReasons((current) => ({ ...current, [note.id]: e.target.value }))}
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                    disabled={deciding === note.id}
                    onClick={() => decide(note, true)}
                  >
                    {deciding === note.id
                      ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs border-red-300 text-red-700 hover:bg-red-50"
                    disabled={deciding === note.id}
                    onClick={() => decide(note, false)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
