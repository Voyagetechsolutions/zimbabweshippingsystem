import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  amendRegisterEntry, listRegister, voidRegisterEntry,
  type AmendRegisterInput, type RegisterEntry,
} from '@/lib/deliveryNote/ledger';
import type { NoteRow } from '@/lib/deliveryNote';

// The register of issued delivery notes.
//
// It exists first as the duplicate check the generator runs before writing a
// file, but it is also the queryable record the business never had — what went
// out, to whom, under which invoice, and whether it left unpaid.

interface Props {
  /** Changing this reloads the list, e.g. after a note is issued. */
  refreshKey?: number;
}

const DeliveryNoteRegister: React.FC<Props> = ({ refreshKey = 0 }) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showVoided, setShowVoided] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<(AmendRegisterInput & { id: string }) | null>(null);
  const [deleting, setDeleting] = useState<RegisterEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError('');
    try {
      setEntries(await listRegister(term, 100, showVoided));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the register.');
    } finally {
      setLoading(false);
    }
  }, [showVoided]);

  useEffect(() => { load(''); }, [load, refreshKey]);

  // Typing filters server-side, debounced so a search does not fire per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => load(search), 350);
    return () => window.clearTimeout(timer);
  }, [search, load]);

  const startEdit = (entry: RegisterEntry) => {
    const rows: NoteRow[] = Array.isArray(entry.items)
      ? entry.items.filter((row): row is NoteRow => Boolean(
        row && typeof row === 'object' && 'item' in row && 'description' in row && 'qty' in row && 'uom' in row,
      )).map((row) => ({ ...row }))
      : [];
    setEditing({
      id: entry.id,
      reference: entry.reference,
      invoiceNumber: entry.invoice_number,
      loadSuffix: entry.load_suffix || '',
      shipperName: entry.shipper_name || '',
      shipperPhone: entry.shipper_phone || '',
      shipperAddress: entry.shipper_address || '',
      recipientName: entry.recipient_name || '',
      recipientPhone: entry.recipient_phone || '',
      recipientAddress: entry.recipient_address || '',
      recipientCity: entry.recipient_city || '',
      deliveryMode: entry.delivery_mode === 'self_collection' ? 'self_collection' : 'door_to_door',
      paid: entry.paid,
      balanceDue: entry.balance_due,
      noteDate: entry.note_date || '',
      rows,
      reason: '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const { id, ...input } = editing;
      await amendRegisterEntry(id, input);
      setEditing(null);
      toast({ title: 'Delivery note updated', description: 'The previous revision was retained in the audit history.' });
      await load(search);
    } catch (err) {
      toast({
        title: 'Could not update delivery note',
        description: err instanceof Error ? err.message : 'The correction could not be saved.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmVoid = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await voidRegisterEntry(deleting.id, deleteReason);
      setDeleting(null);
      setDeleteReason('');
      toast({ title: 'Delivery note deleted', description: 'It was voided and retained in the audit and duplicate history.' });
      await load(search);
    } catch (err) {
      toast({
        title: 'Could not delete delivery note',
        description: err instanceof Error ? err.message : 'The note could not be voided.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">Delivery note register</CardTitle>
            <CardDescription className="text-xs">
              Every note issued from a source invoice. Checked automatically before a new note is generated.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} />
              Show deleted
            </label>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => load(search)} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by reference, invoice #, shipper or recipient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {search ? 'Nothing matches that search.' : 'No notes issued yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Shipper</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                      {entry.reference}
                      {entry.load_suffix && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">load {entry.load_suffix}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{entry.invoice_number}</TableCell>
                    <TableCell className="text-xs">{entry.shipper_name || '—'}</TableCell>
                    <TableCell className="text-xs">{entry.recipient_name || '—'}</TableCell>
                    <TableCell className="text-xs">{entry.recipient_city || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {entry.voided_at ? (
                        <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200">Deleted</Badge>
                      ) : entry.unpaid_hold ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid — hold</Badge>
                      ) : entry.paid ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>
                      ) : (
                        <Badge variant="outline">Unstamped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {format(new Date(entry.created_at), 'dd MMM yyyy')}
                      {entry.revision > 1 && <span className="ml-1 text-[10px]">rev {entry.revision}</span>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {!entry.voided_at && (
                        <div className="inline-flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(entry)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => { setDeleting(entry); setDeleteReason(''); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit delivery note</DialogTitle>
          <DialogDescription>The previous version is retained. Enter a reason before saving.</DialogDescription>
        </DialogHeader>
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder="Reference" value={editing.reference} onChange={(e) => setEditing({ ...editing, reference: e.target.value.toUpperCase() })} />
              <Input placeholder="Invoice number" value={editing.invoiceNumber} onChange={(e) => setEditing({ ...editing, invoiceNumber: e.target.value })} />
              <Input placeholder="Load suffix" maxLength={2} value={editing.loadSuffix} onChange={(e) => setEditing({ ...editing, loadSuffix: e.target.value.toUpperCase() })} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Shipper</h4>
                <Input placeholder="Name" value={editing.shipperName} onChange={(e) => setEditing({ ...editing, shipperName: e.target.value })} />
                <Input placeholder="Phone" value={editing.shipperPhone} onChange={(e) => setEditing({ ...editing, shipperPhone: e.target.value })} />
                <Textarea rows={3} placeholder="Address" value={editing.shipperAddress} onChange={(e) => setEditing({ ...editing, shipperAddress: e.target.value })} />
              </section>
              <section className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Recipient</h4>
                <Input placeholder="Name" value={editing.recipientName} onChange={(e) => setEditing({ ...editing, recipientName: e.target.value })} />
                <Input placeholder="Phone" value={editing.recipientPhone} onChange={(e) => setEditing({ ...editing, recipientPhone: e.target.value })} />
                <Textarea rows={2} placeholder="Address" value={editing.recipientAddress} onChange={(e) => setEditing({ ...editing, recipientAddress: e.target.value })} />
                <Input placeholder="City" value={editing.recipientCity} onChange={(e) => setEditing({ ...editing, recipientCity: e.target.value })} />
              </section>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted-foreground">Note date
                <Input type="date" value={editing.noteDate} onChange={(e) => setEditing({ ...editing, noteDate: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">Balance due
                <Input type="number" step="0.01" value={editing.balanceDue ?? ''} onChange={(e) => setEditing({ ...editing, balanceDue: e.target.value === '' ? null : Number(e.target.value) })} />
              </label>
              <div className="space-y-2 pt-5 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.paid} onChange={(e) => setEditing({ ...editing, paid: e.target.checked })} /> PAID stamp</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.deliveryMode === 'self_collection'} onChange={(e) => setEditing({ ...editing, deliveryMode: e.target.checked ? 'self_collection' : 'door_to_door' })} /> Self collection</label>
              </div>
            </div>

            <section className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Manifest</h4>
              {editing.rows.map((row, index) => (
                <div key={index} className="rounded-md border p-2 space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    <Input className="flex-1 min-w-[120px]" placeholder="ITEM" value={row.item} onChange={(e) => setEditing({ ...editing, rows: editing.rows.map((r, i) => i === index ? { ...r, item: e.target.value.toUpperCase() } : r) })} />
                    <Input className="w-20" placeholder="Qty" value={row.qty} onChange={(e) => setEditing({ ...editing, rows: editing.rows.map((r, i) => i === index ? { ...r, qty: e.target.value } : r) })} />
                    <Input className="w-24" placeholder="UOM" value={row.uom} onChange={(e) => setEditing({ ...editing, rows: editing.rows.map((r, i) => i === index ? { ...r, uom: e.target.value } : r) })} />
                    <Button variant="ghost" size="icon" title="Remove row" onClick={() => setEditing({ ...editing, rows: editing.rows.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                  <Textarea rows={2} placeholder="Description" value={row.description} onChange={(e) => setEditing({ ...editing, rows: editing.rows.map((r, i) => i === index ? { ...r, description: e.target.value } : r) })} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing, rows: [...editing.rows, { item: '', description: '', qty: '', uom: '' }] })}>
                <Plus className="h-4 w-4 mr-1" /> Add row
              </Button>
            </section>

            <label className="space-y-1 block">
              <span className="text-xs font-medium">Reason for correction</span>
              <Textarea placeholder="What changed and why?" value={editing.reason} onChange={(e) => setEditing({ ...editing, reason: e.target.value })} />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
          <Button onClick={saveEdit} disabled={busy || !editing?.reason.trim()}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete delivery note {deleting?.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            It will disappear from the active register but remain in audit and duplicate history. This cannot be used to bypass a duplicate warning.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea placeholder="Reason for deletion (required)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={busy || !deleteReason.trim()} onClick={confirmVoid}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Delete note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default DeliveryNoteRegister;
