import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Download, RefreshCw, FileText, Loader2, Eye, Pencil,
} from 'lucide-react';
import DeliveryNoteGenerator, { buildRefNumber, DeliveryNoteTemplate } from '@/components/admin/DeliveryNoteGenerator';

// ── helpers ──────────────────────────────────────────────────────────────────

function getSenderName(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.name || m.senderDetails?.name ||
    (m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim() : '') ||
    (m.senderDetails?.firstName ? `${m.senderDetails.firstName} ${m.senderDetails.lastName || ''}`.trim() : '') ||
    'Unknown';
}

function getRecipientName(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.name || m.recipientDetails?.name ||
    (m.recipient?.firstName ? `${m.recipient.firstName} ${m.recipient.lastName || ''}`.trim() : '') ||
    'Unknown';
}

// ── Component ─────────────────────────────────────────────────────────────────

const DeliveryNotesTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewShipment, setPreviewShipment] = useState<Shipment | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setShipments((data || []) as unknown as Shipment[]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.tracking_number?.toLowerCase().includes(q) ||
      getSenderName(s).toLowerCase().includes(q) ||
      getRecipientName(s).toLowerCase().includes(q) ||
      buildRefNumber(s).toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  // ── Selection helpers ──
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  // ── Edit delivery note (free-text instruction collected during booking) ──
  const openEditNote = (shipment: Shipment) => {
    const current = (shipment.metadata as Record<string, unknown> | undefined)?.deliveryNote;
    setEditNoteText(typeof current === 'string' ? current : '');
    setEditingShipment(shipment);
  };

  const saveDeliveryNote = async () => {
    if (!editingShipment) return;
    const trimmed = editNoteText.trim();
    const normalised = trimmed === '' ? null : trimmed.slice(0, 500);
    const newMetadata = { ...(editingShipment.metadata || {}), deliveryNote: normalised };

    setSavingNote(true);
    const previous = editingShipment;

    // Optimistic update
    setShipments(prev => prev.map(s =>
      s.id === editingShipment.id ? { ...s, metadata: newMetadata } : s,
    ));

    const { error } = await supabase
      .from('shipments')
      .update({ metadata: newMetadata })
      .eq('id', editingShipment.id);

    setSavingNote(false);

    if (error) {
      setShipments(prev => prev.map(s => s.id === previous.id ? previous : s));
      toast({ title: 'Could not save note', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Delivery note updated', description: buildRefNumber(editingShipment) });
    setEditingShipment(null);
  };

  // ── Single PDF download ──
  const downloadSingle = async (shipment: Shipment) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Render into a hidden off-screen div
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      document.body.appendChild(container);

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(container);

      await new Promise<void>(resolve => {
        root.render(
          React.createElement(DeliveryNoteTemplate, {
            shipment,
            ref: async (el: HTMLDivElement | null) => {
              if (!el) return;
              await new Promise(r => setTimeout(r, 100)); // let fonts render
              const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
              const imgW = 210;
              const imgH = (canvas.height * imgW) / canvas.width;
              const pdf = new jsPDF('p', 'mm', 'a4');
              pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
              pdf.save(`${buildRefNumber(shipment)}.pdf`);
              root.unmount();
              document.body.removeChild(container);
              resolve();
            }
          })
        );
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    }
  };

  // ── Bulk PDF download (one PDF per note, zipped) ──
  const downloadBulk = async () => {
    if (selected.size === 0) {
      toast({ title: 'Nothing selected', description: 'Select at least one shipment.', variant: 'destructive' });
      return;
    }
    setBulkGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const JSZip = (await import('jszip')).default;

      const zip = new JSZip();
      const selectedShipments = shipments.filter(s => selected.has(s.id));

      for (const shipment of selectedShipments) {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        document.body.appendChild(container);

        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);

        await new Promise<void>(resolve => {
          root.render(
            React.createElement(DeliveryNoteTemplate, {
              shipment,
              ref: async (el: HTMLDivElement | null) => {
                if (!el) return;
                await new Promise(r => setTimeout(r, 100));
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
                const imgW = 210;
                const imgH = (canvas.height * imgW) / canvas.width;
                const pdf = new jsPDF('p', 'mm', 'a4');
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
                const blob = pdf.output('blob');
                zip.file(`${buildRefNumber(shipment)}.pdf`, blob);
                root.unmount();
                document.body.removeChild(container);
                resolve();
              }
            })
          );
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeliveryNotes-${format(new Date(), 'yyyyMMdd-HHmm')}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Downloaded', description: `${selected.size} delivery note(s) zipped and downloaded.` });
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Bulk download failed.', variant: 'destructive' });
    } finally {
      setBulkGenerating(false);
    }
  };

  const STATUS_OPTIONS = [
    'Pending', 'Booking Confirmed', 'Ready for Pickup',
    'InTransit to Zimbabwe', 'Goods Arrived in Zimbabwe',
    'Processing in ZW Warehouse', 'Delivered', 'Cancelled',
  ];

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      <TabHeader
        title="Delivery Notes"
        description="Auto-generated office copies for every booking. Not for customer distribution."
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchShipments} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={downloadBulk}
              disabled={selected.size === 0 || bulkGenerating}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkGenerating
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
                : <><Download className="h-3.5 w-3.5 mr-1.5" />Download ({selected.size})</>
              }
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking #, ref #, sender or recipient…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{filtered.length}</strong> notes</span>
        {selected.size > 0 && (
          <span className="text-zim-green font-medium">{selected.size} selected</span>
        )}
        {selected.size > 0 && (
          <button className="text-xs underline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FileText className="h-10 w-10" />
              <p>No delivery notes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                        className={someSelected ? 'opacity-70' : ''}
                      />
                    </TableHead>
                    <TableHead>Ref #</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shipper</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(shipment => {
                    const refNum = buildRefNumber(shipment);
                    const isChecked = selected.has(shipment.id);
                    const collectionRoute = shipment.metadata?.collectionRoute ||
                      shipment.metadata?.collection?.route ||
                      shipment.metadata?.sender?.city ||
                      '—';

                    return (
                      <TableRow key={shipment.id} className={isChecked ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOne(shipment.id)}
                            aria-label={`Select ${refNum}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{refNum}</TableCell>
                        <TableCell className="font-mono text-sm">{shipment.tracking_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(shipment.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getSenderName(shipment)}</div>
                          <div className="text-xs text-muted-foreground">{shipment.origin}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getRecipientName(shipment)}</div>
                          <div className="text-xs text-muted-foreground">{shipment.destination}</div>
                        </TableCell>
                        <TableCell className="text-sm">{collectionRoute}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              shipment.status === 'Delivered' ? 'secondary' :
                              shipment.status === 'Cancelled' ? 'destructive' : 'outline'
                            }
                            className="text-xs whitespace-nowrap"
                          >
                            {shipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditNote(shipment)}
                              className="h-8 px-2"
                              title="Edit delivery note text"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Note
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewShipment(shipment)}
                              className="h-8 px-2"
                              title="Preview delivery note"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadSingle(shipment)}
                              className="h-8 px-2"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview dialog */}
      {previewShipment && (
        <DeliveryNoteGenerator
          isOpen={!!previewShipment}
          onClose={() => setPreviewShipment(null)}
          shipment={previewShipment}
        />
      )}

      {/* Edit delivery note dialog */}
      <Dialog open={!!editingShipment} onOpenChange={(open) => !open && setEditingShipment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Note</DialogTitle>
            <DialogDescription>
              {editingShipment && (
                <>
                  Customer instruction for <span className="font-mono">{buildRefNumber(editingShipment)}</span>
                  {' '}({editingShipment.tracking_number}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              rows={5}
              maxLength={500}
              placeholder="Landmarks, gate codes, preferred drop-off times, etc. Leave blank to remove."
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
            />
            <div className="text-xs text-muted-foreground text-right">
              {editNoteText.length}/500
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShipment(null)} disabled={savingNote}>
              Cancel
            </Button>
            <Button onClick={saveDeliveryNote} disabled={savingNote}>
              {savingNote ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryNotesTab;
