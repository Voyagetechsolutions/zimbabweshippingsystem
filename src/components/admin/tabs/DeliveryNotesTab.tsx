import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Download, RefreshCw, FileText, Loader2, Eye, CheckSquare, Square,
} from 'lucide-react';
import DeliveryNoteGenerator, { buildDNNumber, DeliveryNoteTemplate } from '@/components/admin/DeliveryNoteGenerator';

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

  // Hidden render area for bulk PDF generation
  const bulkRenderRef = useRef<HTMLDivElement>(null);

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
      buildDNNumber(s).toLowerCase().includes(q);
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
              pdf.save(`${buildDNNumber(shipment)}.pdf`);
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
                zip.file(`${buildDNNumber(shipment)}.pdf`, blob);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-zim-green" />
            Delivery Notes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-generated office copies for every booking. Not for customer distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchShipments} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={downloadBulk}
            disabled={selected.size === 0 || bulkGenerating}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            {bulkGenerating
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating…</>
              : <><Download className="h-4 w-4 mr-1.5" />Download Selected ({selected.size})</>
            }
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking #, DN #, sender or recipient…"
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
                    <TableHead>DN Number</TableHead>
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
                    const dnNum = buildDNNumber(shipment);
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
                            aria-label={`Select ${dnNum}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{dnNum}</TableCell>
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
                              onClick={() => setPreviewShipment(shipment)}
                              className="h-8 px-2"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadSingle(shipment)}
                              className="h-8 px-2"
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
    </div>
  );
};

export default DeliveryNotesTab;
