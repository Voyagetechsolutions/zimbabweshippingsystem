import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileImage, ExternalLink } from 'lucide-react';

/**
 * Proof of payment, from the customer's own browser.
 *
 * The customer app has let customers send in a bank screenshot since the
 * offline-payments flow was built; the website never had it. Anyone who books
 * on the site — which is most people — had no way to show they had paid, so
 * finance chased customers who had already sent the money by WhatsApp and
 * matched the payment by hand.
 *
 * Deliberately the same shape the app writes: the `payment-proofs` bucket for
 * the image, a `payment_proofs` row for finance to review. One reviewer queue,
 * whichever device the proof came from.
 */

type ShipmentOption = {
  id: string;
  tracking_number: string | null;
  customer_reference: string | null;
  metadata: any;
};

type Proof = {
  id: string;
  billing_month: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  storage_path: string;
  customer_notes: string | null;
  created_at: string;
};

/**
 * Exactly what the `payment-proofs` bucket accepts.
 *
 * Storage rejects anything else, and it does so with a message no customer can
 * act on. HEIC is the trap: it is what an iPhone camera produces by default, it
 * satisfies a naive `image/*` check, and it is not on this list — so the most
 * likely file a customer picks would have failed at the last step.
 */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPT_ATTR = ACCEPTED.join(',');
/** The bucket's own ceiling; refusing earlier just wastes the customer's time. */
const MAX_BYTES = 10 * 1024 * 1024;

/** The last twelve months, newest first — the app offers the same list. */
const recentMonths = () =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

const statusTone: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
};

export const PaymentProofUpload: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [shipmentId, setShipmentId] = useState<string>('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const months = useMemo(recentMonths, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase
        .from('shipments')
        .select('id,tracking_number,customer_reference,metadata')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_proofs')
        .select('id,billing_month,amount,currency,status,storage_path,customer_notes,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setShipments((s as ShipmentOption[]) || []);
    setProofs((p as Proof[]) || []);
    setShipmentId((current) => current || (s as any[])?.[0]?.id || '');
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Object URLs are revoked on replacement so a long session does not hold on
  // to every image the customer previewed.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (chosen: File | null) => {
    if (!chosen) return;
    if (!ACCEPTED.includes(chosen.type)) {
      toast({
        title: 'That file type will not upload',
        description: 'Please use a JPEG, PNG, WebP or PDF. On an iPhone, Settings › Camera › Formats › Most Compatible saves photos as JPEG.',
        variant: 'destructive',
      });
      return;
    }
    if (chosen.size > MAX_BYTES) {
      toast({ title: 'That file is too large', description: 'Please keep it under 10MB.', variant: 'destructive' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(chosen.type.startsWith('image/') ? URL.createObjectURL(chosen) : null);
  };

  const currencyFor = (id: string) => {
    const found = shipments.find((s) => s.id === id);
    const meta = found?.metadata || {};
    const priced = String(meta.pricing?.currency || meta.invoice?.currency || '').toUpperCase();
    if (priced === 'EUR' || priced === 'GBP') return priced;
    const country = String(meta.sender?.country || '').toLowerCase();
    return country.includes('ireland') ? 'EUR' : 'GBP';
  };

  const submit = async () => {
    if (!user?.id) return;
    if (!file) {
      toast({ title: 'Choose your proof first', description: 'A screenshot or photo of the payment.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const extension = file.type === 'application/pdf' ? 'pdf' : (file.name.split('.').pop() || 'jpg');
      // Namespaced by user id — the storage policy scopes a customer to their
      // own folder, and finance reads it through a signed URL.
      const path = `${user.id}/${month}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('payment_proofs').insert({
        user_id: user.id,
        shipment_id: shipmentId || null,
        billing_month: `${month}-01`,
        amount: amount ? Number(amount) : null,
        currency: currencyFor(shipmentId),
        storage_path: path,
        file_name: file.name,
        customer_notes: notes.trim() || null,
      });
      if (error) throw error;

      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setAmount('');
      setNotes('');
      if (fileInput.current) fileInput.current.value = '';
      await load();
      toast({ title: 'Proof sent', description: 'Finance will review it and update your balance.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const view = async (proof: Proof) => {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(proof.storage_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: 'Could not open it', description: error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" /> Send proof of payment
          </CardTitle>
          <CardDescription>
            Paid by bank transfer? Send the screenshot here and finance will match it to your balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proof-month">Month you paid</Label>
              <select
                id="proof-month"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {new Date(`${m}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof-shipment">Which shipment</Label>
              <select
                id="proof-shipment"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
              >
                <option value="">Not linked to one shipment</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.customer_reference || s.tracking_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof-amount">Amount paid (optional)</Label>
              <Input
                id="proof-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof-notes">Bank reference or note</Label>
              <Input
                id="proof-notes"
                placeholder="e.g. the reference on the transfer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof-file">Screenshot, photo or PDF</Label>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or PDF, up to 10MB.</p>
            <Input
              id="proof-file"
              ref={fileInput}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => choose(e.target.files?.[0] || null)}
            />
            {preview ? (
              <img src={preview} alt="Your payment proof" className="mt-2 max-h-56 rounded-md border" />
            ) : file ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4" /> {file.name}
              </p>
            ) : null}
          </div>

          <Button onClick={submit} disabled={busy || !file} className="w-full sm:w-auto">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : 'Send for review'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What you have sent</CardTitle>
        </CardHeader>
        <CardContent>
          {proofs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
          ) : (
            <ul className="divide-y">
              {proofs.map((proof) => (
                <li key={proof.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {proof.billing_month
                        ? new Date(proof.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                        : 'No month given'}
                      {proof.amount != null ? ` · ${proof.currency || ''} ${Number(proof.amount).toFixed(2)}` : ''}
                    </p>
                    {proof.customer_notes ? (
                      <p className="truncate text-xs text-muted-foreground">{proof.customer_notes}</p>
                    ) : null}
                  </div>
                  <Badge className={statusTone[proof.status] || statusTone.pending}>
                    {proof.status === 'approved' ? 'Accepted'
                      : proof.status === 'rejected' ? 'Not accepted'
                      : 'Awaiting review'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => view(proof)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProofUpload;
