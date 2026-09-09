import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * Let a customer correct their own booking from the website.
 *
 * The customer app has had this since bookings could be edited at all; the
 * website never did, so anyone who booked on the site had to message us to fix
 * a postcode they had mistyped seconds earlier. Those messages are the same
 * corrections admin then made by hand.
 *
 * The rules are the database's, not this form's: `update_customer_shipment`
 * refuses once collection has started or once admin has confirmed the booking
 * with the customer, and says which of the two it is. This form shows that
 * message rather than deciding for itself, so the website and the app can never
 * disagree about what is still editable.
 */

type Party = { name?: string; firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; postalCode?: string; postcode?: string; country?: string };

export const EditBookingDialog: React.FC<{
  shipmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}> = ({ shipmentId, open, onOpenChange, onSaved }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [sender, setSender] = useState<Party>({});
  const [recipient, setRecipient] = useState<Party>({});
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    if (!open || !shipmentId) return;
    let cancelled = false;
    setLoading(true);
    setBlocked(null);
    (async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id,origin,destination,metadata,collection_status,driver_status')
        .eq('id', shipmentId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setBlocked('We could not open this booking. Please refresh and try again.');
        setLoading(false);
        return;
      }
      const meta: any = data.metadata || {};
      setSender(meta.sender || meta.senderDetails || {});
      setRecipient(meta.recipient || meta.recipientDetails || {});
      setOrigin(data.origin || '');
      setDestination(data.destination || '');
      if (meta.confirmation?.confirmedAt) {
        setBlocked('This booking has been confirmed with you and is locked. Message us and we will make the change for you.');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, shipmentId]);

  const save = async () => {
    if (!shipmentId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('update_customer_shipment', {
        p_shipment_id: shipmentId,
        p: {
          // The same payload the app sends, so one function validates both.
          sender: { ...sender, postalCode: sender.postalCode ?? sender.postcode ?? '' },
          recipient,
          origin,
          destination,
        } as any,
      });
      if (error) throw error;
      toast({ title: 'Booking updated', description: 'Your collection details have been changed.' });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      // The database owns the "can this still be edited" rule and explains
      // itself; repeating that judgement here would let the two drift.
      toast({ title: 'Could not save', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit your booking</DialogTitle>
          <DialogDescription>
            Correct the collection or delivery details. You can do this until we confirm the booking with you.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : blocked ? (
          <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">{blocked}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Collection from you</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pickup">Collection address</Label>
                  <Textarea
                    id="edit-pickup"
                    value={sender.address || ''}
                    onChange={(e) => setSender({ ...sender, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-pickup-city">Town / city</Label>
                    <Input
                      id="edit-pickup-city"
                      value={sender.city || ''}
                      onChange={(e) => setSender({ ...sender, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-pickup-postcode">Postcode / Eircode</Label>
                    <Input
                      id="edit-pickup-postcode"
                      value={sender.postalCode ?? sender.postcode ?? ''}
                      onChange={(e) => setSender({ ...sender, postalCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pickup-phone">Your phone</Label>
                  <Input
                    id="edit-pickup-phone"
                    value={sender.phone || ''}
                    onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Delivery in Zimbabwe</h4>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-recipient">Receiver's name</Label>
                    <Input
                      id="edit-recipient"
                      value={recipient.name || ''}
                      onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-recipient-phone">Receiver's phone</Label>
                    <Input
                      id="edit-recipient-phone"
                      value={recipient.phone || ''}
                      onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-delivery">Delivery address</Label>
                  <Textarea
                    id="edit-delivery"
                    value={recipient.address || ''}
                    onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-delivery-city">Town / city</Label>
                  <Input
                    id="edit-delivery-city"
                    value={recipient.city || ''}
                    onChange={(e) => setRecipient({ ...recipient, city: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          {!blocked && !loading ? (
            <Button onClick={save} disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingDialog;
