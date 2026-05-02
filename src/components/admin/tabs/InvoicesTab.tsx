import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Search, Download, RefreshCw, Loader2, Eye, Pencil, Plus, Trash2, Receipt, Printer,
} from 'lucide-react';
import { buildRefNumber } from '@/components/admin/DeliveryNoteGenerator';
import BillingInvoiceGenerator, {
  InvoiceData, InvoiceLineItem, getInvoiceData, calculateTotals, BillingInvoiceTemplate,
} from '@/components/admin/BillingInvoiceGenerator';

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };

function getSenderName(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.name || m.senderDetails?.name ||
    (m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim() : '') ||
    'Unknown';
}

function getRecipientName(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.name || m.recipientDetails?.name ||
    (m.recipient?.firstName ? `${m.recipient.firstName} ${m.recipient.lastName || ''}`.trim() : '') ||
    'Unknown';
}

function fmtMoney(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || `${currency} `;
  return `${sym}${(Number(amount) || 0).toFixed(2)}`;
}

const InvoicesTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewShipment, setPreviewShipment] = useState<Shipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [draft, setDraft] = useState<InvoiceData | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load shipments';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = shipments.filter(s => {
    const inv = getInvoiceData(s);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.tracking_number?.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      getSenderName(s).toLowerCase().includes(q) ||
      getRecipientName(s).toLowerCase().includes(q) ||
      buildRefNumber(s).toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'paid' && inv.paid)
      || (statusFilter === 'unpaid' && !inv.paid);
    return matchSearch && matchStatus;
  });

  // ── Edit dialog ─────────────────────────────────────────────────────────────
  const openEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setDraft(getInvoiceData(shipment));
  };

  const updateDraft = (patch: Partial<InvoiceData>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updateItem = (idx: number, patch: Partial<InvoiceLineItem>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => i === idx ? { ...it, ...patch } : it);
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setDraft(prev => prev ? { ...prev, items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }] } : prev);
  };

  const removeItem = (idx: number) => {
    setDraft(prev => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev);
  };

  const saveInvoice = async () => {
    if (!editingShipment || !draft) return;
    setSavingInvoice(true);
    const newMetadata = { ...(editingShipment.metadata || {}), invoice: draft };
    const previous = editingShipment;
    setShipments(prev => prev.map(s => s.id === editingShipment.id ? { ...s, metadata: newMetadata } : s));

    const { error } = await supabase
      .from('shipments')
      .update({ metadata: newMetadata as never })
      .eq('id', editingShipment.id);

    setSavingInvoice(false);
    if (error) {
      setShipments(prev => prev.map(s => s.id === previous.id ? previous : s));
      toast({ title: 'Could not save invoice', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice saved', description: draft.invoiceNumber });
    setEditingShipment(null);
    setDraft(null);
  };

  // ── Download single PDF without opening preview ─────────────────────────────
  const downloadPdf = async (shipment: Shipment) => {
    const invoice = getInvoiceData(shipment);
    setDownloadingId(shipment.id);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const { createRoot } = await import('react-dom/client');

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      document.body.appendChild(container);
      const root = createRoot(container);

      await new Promise<void>(resolve => {
        root.render(
          React.createElement(BillingInvoiceTemplate, {
            shipment,
            invoice,
            ref: async (el: HTMLDivElement | null) => {
              if (!el) return;
              await new Promise(r => setTimeout(r, 100));
              const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
              const imgW = 210;
              const imgH = (canvas.height * imgW) / canvas.width;
              const pdf = new jsPDF('p', 'mm', 'a4');
              pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
              pdf.save(`${invoice.invoiceNumber}.pdf`);
              root.unmount();
              document.body.removeChild(container);
              resolve();
            },
          })
        );
      });
      toast({ title: 'Downloaded', description: `${invoice.invoiceNumber}.pdf saved.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const STATUS_OPTIONS = ['all', 'paid', 'unpaid'];

  const draftTotals = draft ? calculateTotals(draft) : null;

  return (
    <div className="space-y-4">
      <TabHeader
        title="Invoices"
        description="Customer invoices for every shipment. Edit, preview, print or download as PDF."
        actions={
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchShipments} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, tracking #, customer or recipient…"
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
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Invoices' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        <strong className="text-foreground">{filtered.length}</strong> invoice{filtered.length !== 1 ? 's' : ''}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Receipt className="h-10 w-10" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(shipment => {
                    const inv = getInvoiceData(shipment);
                    const totals = calculateTotals(inv);
                    return (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{shipment.tracking_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {inv.issueDate}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getSenderName(shipment)}</div>
                          <div className="text-xs text-muted-foreground">{shipment.origin}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getRecipientName(shipment)}</div>
                          <div className="text-xs text-muted-foreground">{shipment.destination}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(totals.total, inv.currency)}</TableCell>
                        <TableCell>
                          {inv.paid
                            ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Paid</Badge>
                            : <Badge variant="outline" className="text-xs">Unpaid</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(shipment)} className="h-8 px-2" title="Edit invoice">
                              <Pencil className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setPreviewShipment(shipment)} className="h-8 px-2" title="Preview invoice">
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadPdf(shipment)}
                              disabled={downloadingId === shipment.id}
                              className="h-8 px-2"
                              title="Download PDF"
                            >
                              {downloadingId === shipment.id
                                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                : <Download className="h-4 w-4 mr-1" />}
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

      {/* Preview / Print / Download dialog */}
      {previewShipment && (
        <BillingInvoiceGenerator
          isOpen={!!previewShipment}
          onClose={() => setPreviewShipment(null)}
          shipment={previewShipment}
          invoice={getInvoiceData(previewShipment)}
        />
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editingShipment}
        onOpenChange={(open) => { if (!open) { setEditingShipment(null); setDraft(null); } }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              {editingShipment && (
                <>For shipment <span className="font-mono">{editingShipment.tracking_number}</span> — customer: {getSenderName(editingShipment)}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Invoice number</Label>
                  <Input value={draft.invoiceNumber} onChange={e => updateDraft({ invoiceNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issue date</Label>
                  <Input type="date" value={draft.issueDate} onChange={e => updateDraft({ issueDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Due date</Label>
                  <Input type="date" value={draft.dueDate} onChange={e => updateDraft({ dueDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Currency</Label>
                  <Select value={draft.currency} onValueChange={v => updateDraft({ currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discount</Label>
                  <Input
                    type="number" min={0} step={0.01}
                    value={draft.discount}
                    onChange={e => updateDraft({ discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax rate (%)</Label>
                  <Input
                    type="number" min={0} max={100} step={0.1}
                    value={draft.taxRate}
                    onChange={e => updateDraft({ taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Line items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  {draft.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-7">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={e => updateItem(i, { description: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number" min={0} step={1}
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number" min={0} step={0.01}
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={e => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="sm" onClick={() => removeItem(i)} title="Remove">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment terms</Label>
                <Input
                  value={draft.paymentTerms}
                  onChange={e => updateDraft({ paymentTerms: e.target.value })}
                  placeholder="e.g. Payment due within 14 days"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={e => updateDraft({ notes: e.target.value })}
                  placeholder="Optional notes shown on the invoice"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="invoice-paid"
                  type="checkbox"
                  checked={draft.paid}
                  onChange={e => updateDraft({ paid: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="invoice-paid" className="text-sm cursor-pointer">Mark as paid (stamps PAID on the invoice)</Label>
              </div>

              {draftTotals && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(draftTotals.subtotal, draft.currency)}</span></div>
                  {draftTotals.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>− {fmtMoney(draftTotals.discount, draft.currency)}</span></div>}
                  {draft.taxRate > 0 && <div className="flex justify-between"><span>Tax ({draft.taxRate}%)</span><span>{fmtMoney(draftTotals.tax, draft.currency)}</span></div>}
                  <div className="flex justify-between font-semibold border-t mt-1 pt-1"><span>Total</span><span>{fmtMoney(draftTotals.total, draft.currency)}</span></div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingShipment(null); setDraft(null); }} disabled={savingInvoice}>
              Cancel
            </Button>
            <Button onClick={saveInvoice} disabled={savingInvoice || !draft}>
              {savingInvoice ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesTab;
