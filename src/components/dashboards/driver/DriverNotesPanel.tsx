import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { DeliveryNoteTemplate } from '@/components/admin/DeliveryNoteGenerator';
import { verificationLabel, type VerificationStatus } from '@/lib/driverOps';
import type { Shipment } from '@/types/shipment';

// The driver's own delivery notes.
//
// A note is a document the office stands behind, so download stays locked until
// an admin has verified it. Until then the row says what it is waiting for.

const db = supabase as any;

type NoteRow = {
  id: string;
  note_number: string;
  recipient_name: string | null;
  delivery_address: string | null;
  delivered_at: string | null;
  proof_count: number;
  status: string;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  seal_codes: string[] | null;
  discrepancy_note: string | null;
  created_at: string;
  shipment: Shipment | null;
};

function tone(status: VerificationStatus) {
  if (status === 'verified') return { className: 'bg-emerald-100 text-emerald-800', Icon: ShieldCheck };
  if (status === 'rejected') return { className: 'bg-red-100 text-red-800', Icon: XCircle };
  return { className: 'bg-amber-100 text-amber-800', Icon: Loader2 };
}

export default function DriverNotesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: loadError } = await db
      .from('delivery_notes')
      .select('id,note_number,recipient_name,delivery_address,delivered_at,proof_count,status,verification_status,verification_notes,seal_codes,discrepancy_note,created_at,shipment:shipments(*)')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (loadError) {
      setError(/verification_status/i.test(loadError.message)
        ? 'The delivery workflow has not been deployed to the database yet. Ask an admin to run the staff-ops setup.'
        : loadError.message);
      return;
    }
    setError(null);
    setNotes(((data || []) as any[]).map((row) => ({
      ...row,
      verification_status: (row.verification_status || 'pending') as VerificationStatus,
      shipment: row.shipment as Shipment | null,
    })));
  }, [user?.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`web-driver-notes-${user?.id || 'anon'}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'delivery_notes' } as any, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user?.id]);

  // Renders the same template the office prints, off-screen, then captures it.
  const download = async (note: NoteRow) => {
    if (note.verification_status !== 'verified') {
      toast({
        title: 'Not verified yet',
        description: note.verification_status === 'rejected'
          ? `Admin rejected this note. ${note.verification_notes || 'Check the goods and seal against the booking.'}`
          : 'Admin has to verify this delivery note before it can be downloaded or used.',
        variant: 'destructive',
      });
      return;
    }
    if (!note.shipment) {
      toast({ title: 'Missing consignment', description: 'This note has no linked shipment record.', variant: 'destructive' });
      return;
    }
    setDownloading(note.id);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const { createRoot } = await import('react-dom/client');

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      document.body.appendChild(container);
      const root = createRoot(container);

      await new Promise<void>((resolve, reject) => {
        root.render(
          React.createElement(DeliveryNoteTemplate, {
            shipment: note.shipment as Shipment,
            ref: async (el: HTMLDivElement | null) => {
              if (!el) return;
              try {
                await new Promise((r) => setTimeout(r, 100)); // let fonts settle
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
                const width = 210;
                const height = (canvas.height * width) / canvas.width;
                const pdf = new jsPDF('p', 'mm', 'a4');
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
                pdf.save(`${note.note_number}.pdf`);
                resolve();
              } catch (err) {
                reject(err);
              } finally {
                root.unmount();
                container.remove();
              }
            },
          } as any),
        );
      });
    } catch (e: any) {
      toast({ title: 'Could not create the PDF', description: e?.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your delivery notes…
      </div>
    );
  }

  const verified = notes.filter((n) => n.verification_status === 'verified').length;
  const pending = notes.filter((n) => n.verification_status === 'pending').length;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery notes</CardTitle>
          <CardDescription>{verified} verified · {pending} waiting on admin</CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-red-300"><CardContent className="p-4 text-sm text-red-800">{error}</CardContent></Card>
      )}

      {!error && notes.length === 0 && (
        <Card><CardContent className="py-12 text-center">
          <FileText className="h-9 w-9 mx-auto text-emerald-600 mb-3" />
          <p className="font-semibold">No delivery notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            A note is raised for every consignment you load, then goes to admin to be verified.
          </p>
        </CardContent></Card>
      )}

      {notes.map((note) => {
        const badge = tone(note.verification_status);
        const canDownload = note.verification_status === 'verified';
        return (
          <Card key={note.id}>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{note.note_number}</p>
                    <Badge className={`text-[10px] ${badge.className}`}>
                      {verificationLabel(note.verification_status)}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                    {note.shipment?.customer_reference || '—'} · {note.shipment?.tracking_number || 'No tracking'}
                  </p>
                  <p className="text-sm mt-0.5">{note.recipient_name || 'Recipient'}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.delivery_address || note.shipment?.destination || 'Address not recorded'}
                  </p>
                  {note.seal_codes?.filter(Boolean).length ? (
                    <p className="text-xs text-muted-foreground">Seal: {note.seal_codes.filter(Boolean).join(', ')}</p>
                  ) : null}
                  {note.discrepancy_note && <p className="text-xs text-amber-800 mt-1">{note.discrepancy_note}</p>}
                  {note.verification_status === 'rejected' && note.verification_notes && (
                    <p className="text-xs text-red-700 font-medium mt-1">Admin: {note.verification_notes}</p>
                  )}
                  {note.delivered_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Delivered {new Date(note.delivered_at).toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm" variant={canDownload ? 'default' : 'outline'}
                  className={`h-8 text-xs shrink-0 ${canDownload ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-muted-foreground'}`}
                  disabled={downloading === note.id}
                  onClick={() => download(note)}
                >
                  {downloading === note.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : canDownload ? <Download className="h-3.5 w-3.5 mr-1.5" />
                      : <Lock className="h-3.5 w-3.5 mr-1.5" />}
                  {canDownload ? 'Download PDF' : 'Locked until verified'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
