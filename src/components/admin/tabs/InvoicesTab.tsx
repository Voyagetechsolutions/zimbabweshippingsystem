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
  Search, Download, RefreshCw, Loader2, Eye, Pencil, Plus, Trash2, Receipt, Printer,
  Wallet, Send, CircleDollarSign, AlertTriangle, CheckCircle2, Smartphone, Mail,
} from 'lucide-react';
import { buildRefNumber } from '@/components/admin/DeliveryNoteGenerator';
import BillingInvoiceGenerator, {
  InvoiceData, InvoiceLineItem, PaymentEntry, InvoiceStatus, PAYMENT_METHOD_LABELS,
  getInvoiceData, calculateTotals, getPaymentSummary, getInvoiceStatus, BillingInvoiceTemplate,
} from '@/components/admin/BillingInvoiceGenerator';
import { hasStoredInvoice } from '@/utils/invoiceTotals';

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };

// ── Status presentation (Invoice2go-style pills) ──────────────────────────────
const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:   { label: 'Draft',   className: 'bg-gray-100 text-gray-700 border-gray-300' },
  sent:    { label: 'Sent',    className: 'bg-blue-100 text-blue-800 border-blue-300' },
  partial: { label: 'Partial', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  paid:    { label: 'Paid',    className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800 border-red-300' },
};

function StatusPill({ status }: { status: InvoiceStatus }) {
  const m = STATUS_META[status];
  return <Badge variant="outline" className={`text-xs whitespace-nowrap ${m.className}`}>{m.label}</Badge>;
}

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

function getSenderEmail(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.email || m.senderDetails?.email || '';
}

function getSenderPhone(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.phone || m.senderDetails?.phone || '';
}

function getSenderCountry(s: Shipment): string | undefined {
  const m = s.metadata || {};
  return m.sender?.country || m.senderDetails?.country || undefined;
}

function fmtMoney(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || `${currency} `;
  return `${sym}${(Number(amount) || 0).toFixed(2)}`;
}

const NEW_INVOICE_PREFIX = 'new-invoice-';

function makeBlankInvoice(): { shipment: Shipment; invoice: InvoiceData } {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 14);
  const token = `${format(now, 'yyyyMMdd-HHmm')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    shipment: {
      id: `${NEW_INVOICE_PREFIX}${token}`,
      tracking_number: `INVOICE-${token}`,
      status: 'Invoice Only',
      origin: '',
      destination: '',
      user_id: '',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: {
        recordType: 'invoice_only',
        sender: { name: '', email: '', phone: '', address: '', city: '', country: '' },
        recipient: { name: '', phone: '', address: '', city: '', country: 'Zimbabwe' },
      },
      can_cancel: false,
      can_modify: false,
    },
    invoice: {
      invoiceNumber: '',
      issueDate: format(now, 'yyyy-MM-dd'),
      dueDate: format(due, 'yyyy-MM-dd'),
      items: [{ item: '', description: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      taxRate: 0,
      paymentTerms: 'Payment due within 14 days of invoice date.',
      notes: '',
      currency: 'GBP',
      paid: false,
      payments: [],
      sentAt: null,
    },
  };
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
  const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Record-payment dialog
  const [payingShipment, setPayingShipment] = useState<Shipment | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<{ amount: number; date: string; method: string; reference: string; note: string } | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

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
    const raised = hasStoredInvoice(s);
    const deleted = Boolean(inv.deletedAt);
    const matchStatus =
      statusFilter === 'all' ? !deleted
      : statusFilter === 'deleted' ? raised && deleted
      : statusFilter === 'not_raised' ? !raised && !deleted
      : statusFilter === 'raised' ? raised && !deleted
      // A shipment with no invoice must not answer to a real invoice status.
      : raised && !deleted && getInvoiceStatus(inv) === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Top-of-page summary (Invoice2go-style) ──────────────────────────────────
  // Counts ONLY invoices that have actually been raised. getInvoiceData
  // synthesises a draft for any shipment without one, so totalling every
  // shipment reported money that was never billed — and called unissued drafts
  // "overdue" once the booking date passed.
  const summary = (() => {
    let outstanding = 0, overdue = 0, paid = 0, raised = 0;
    const currencyCount: Record<string, number> = {};
    for (const s of shipments) {
      if (!hasStoredInvoice(s)) continue;
      const inv = getInvoiceData(s);
      if (inv.deletedAt) continue;
      raised++;
      const { paidAmount, balance } = getPaymentSummary(inv);
      const status = getInvoiceStatus(inv);
      currencyCount[inv.currency] = (currencyCount[inv.currency] || 0) + 1;
      paid += paidAmount;
      if (status !== 'paid') outstanding += balance;
      if (status === 'overdue') overdue += balance;
    }
    const currency = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'EUR';
    const deleted = shipments.filter(s => hasStoredInvoice(s) && Boolean(getInvoiceData(s).deletedAt)).length;
    const notRaised = shipments.filter(s => !hasStoredInvoice(s)).length;
    return { outstanding, overdue, paid, currency, raised, deleted, notRaised };
  })();

  // ── Selection (for bulk actions) ────────────────────────────────────────────
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  // Only real, saved invoices can participate in invoice actions. Bookings with
  // generated defaults remain available through the Create Invoice flow.
  const selectableFiltered = filtered.filter(s => hasStoredInvoice(s) && !getInvoiceData(s).deletedAt);
  const allSelected = selectableFiltered.length > 0 && selectableFiltered.every(s => selected.has(s.id));
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableFiltered.map(s => s.id)));
  };

  // ── Edit dialog ─────────────────────────────────────────────────────────────
  const openEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setDraft({ ...getInvoiceData(shipment), discount: 0, taxRate: 0 });
  };

  const startBlankInvoice = () => {
    const blank = makeBlankInvoice();
    setEditingShipment(blank.shipment);
    setDraft(blank.invoice);
  };

  const updateScratchParty = (party: 'sender' | 'recipient', patch: Record<string, string>) => {
    setEditingShipment(prev => {
      if (!prev) return prev;
      const metadata = prev.metadata || {};
      const nextParty = { ...(metadata[party] || {}), ...patch };
      return {
        ...prev,
        origin: party === 'sender' && patch.country !== undefined ? patch.country : prev.origin,
        destination: party === 'recipient' && patch.country !== undefined ? patch.country : prev.destination,
        metadata: { ...metadata, [party]: nextParty },
      };
    });
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
    setDraft(prev => prev ? { ...prev, items: [...prev.items, { item: '', description: '', quantity: 1, unitPrice: 0 }] } : prev);
  };

  const removeItem = (idx: number) => {
    setDraft(prev => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev);
  };

  // Keep Amount Paid backed by a normal payment entry so every existing total,
  // status, PDF and customer view uses the same source of truth.
  const setAmountPaid = (amount: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const editorPaymentId = 'invoice-editor-amount-paid';
      const otherPayments = (prev.payments || []).filter(payment => payment.id !== editorPaymentId);
      const alreadyRecorded = otherPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const adjustment = Math.max(0, (Number(amount) || 0) - alreadyRecorded);
      const payments = adjustment > 0
        ? [...otherPayments, {
            id: editorPaymentId,
            date: prev.issueDate || format(new Date(), 'yyyy-MM-dd'),
            amount: adjustment,
            method: 'other',
            note: 'Amount paid entered on invoice',
          }]
        : otherPayments;
      return { ...prev, payments };
    });
  };

  // Persist an invoice onto a shipment's metadata, with optimistic update + rollback.
  // `paid` is kept in sync with the balance so legacy reads stay correct.
  const persistInvoice = async (shipment: Shipment, invoice: InvoiceData): Promise<boolean> => {
    const synced: InvoiceData = { ...invoice, paid: getPaymentSummary(invoice).balance <= 0.005 && calculateTotals(invoice).total > 0 };
    const newMetadata = { ...(shipment.metadata || {}), invoice: synced };
    const isNewStandalone = shipment.id.startsWith(NEW_INVOICE_PREFIX);

    if (isNewStandalone) {
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          tracking_number: shipment.tracking_number,
          status: shipment.status,
          origin: shipment.origin || 'Not specified',
          destination: shipment.destination || 'Not specified',
          metadata: newMetadata as never,
          user_id: null,
          can_cancel: false,
          can_modify: false,
        })
        .select('*')
        .single();

      if (error) {
        toast({ title: 'Could not create invoice', description: error.message, variant: 'destructive' });
        return false;
      }
      setShipments(prev => [data as unknown as Shipment, ...prev]);
      return true;
    }

    const previous = shipment;
    setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, metadata: newMetadata } : s));

    const { error } = await supabase
      .from('shipments')
      .update({ metadata: newMetadata as never })
      .eq('id', shipment.id);

    if (error) {
      setShipments(prev => prev.map(s => s.id === previous.id ? previous : s));
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const saveInvoice = async () => {
    if (!editingShipment || !draft) return;
    const isScratch = editingShipment.id.startsWith(NEW_INVOICE_PREFIX);
    if (isScratch && !getSenderName(editingShipment).trim().replace('Unknown', '')) {
      toast({ title: 'Customer name required', description: 'Enter the customer or business name before creating the invoice.', variant: 'destructive' });
      return;
    }
    if (!draft.invoiceNumber.trim()) {
      toast({ title: 'Customer reference required', description: 'Enter the customer reference before saving.', variant: 'destructive' });
      return;
    }
    if (!draft.items.length || draft.items.some(item => !item.item?.trim() || !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast({
        title: 'Check the invoice lines',
        description: 'Every line needs an item, description, quantity above zero, and amount above zero.',
        variant: 'destructive',
      });
      return;
    }
    const wasRaised = !isScratch && hasStoredInvoice(editingShipment);
    setSavingInvoice(true);
    const invoiceToSave = { ...draft, discount: 0, taxRate: 0 };
    const ok = await persistInvoice(editingShipment, invoiceToSave);
    setSavingInvoice(false);
    if (!ok) return;
    toast({ title: wasRaised ? 'Invoice updated' : 'Invoice created', description: draft.invoiceNumber });
    setEditingShipment(null);
    setDraft(null);
  };

  // Render the invoice template off-screen and return the PDF as both base64
  // (for emailing) and a Blob (for zipping/downloading).
  const renderInvoicePdf = async (shipment: Shipment, invoice: InvoiceData): Promise<{ base64: string; blob: Blob }> => {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const { createRoot } = await import('react-dom/client');

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
    document.body.appendChild(container);
    const root = createRoot(container);

    return await new Promise<{ base64: string; blob: Blob }>((resolve, reject) => {
      root.render(
        React.createElement(BillingInvoiceTemplate, {
          shipment,
          invoice,
          ref: async (el: HTMLDivElement | null) => {
            if (!el) return;
            try {
              await new Promise(r => setTimeout(r, 100));
              const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
              const imgW = 210;
              const imgH = (canvas.height * imgW) / canvas.width;
              const pdf = new jsPDF('p', 'mm', 'a4');
              pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
              const base64 = (pdf.output('datauristring').split(',')[1]) || '';
              const blob = pdf.output('blob');
              resolve({ base64, blob });
            } catch (e) {
              reject(e);
            } finally {
              root.unmount();
              document.body.removeChild(container);
            }
          },
        })
      );
    });
  };

  // Email one invoice; returns true on success. Used by single + bulk send.
  // `silent` suppresses per-invoice toasts (the bulk caller shows a summary).
  const emailInvoice = async (shipment: Shipment, silent = false): Promise<boolean> => {
    const invoice = getInvoiceData(shipment);
    // Same guard as publishing: never email a figure that was only synthesised
    // from the booking. Bulk send silently skips these rather than billing them.
    if (!hasStoredInvoice(shipment)) {
      if (!silent) toast({
        title: 'No invoice raised yet',
        description: 'Review and save the invoice for this booking before emailing it.',
        variant: 'destructive',
      });
      return false;
    }
    const email = getSenderEmail(shipment);
    if (!email) {
      if (!silent) toast({ title: 'No customer email', description: 'This shipment has no sender email on file.', variant: 'destructive' });
      return false;
    }
    try {
      const { base64 } = await renderInvoicePdf(shipment, invoice);
      const { total, paidAmount, balance } = getPaymentSummary(invoice);
      const status = getInvoiceStatus(invoice);
      const emailStatus = status === 'paid' ? 'paid' : status === 'partial' ? 'partial' : 'unpaid';

      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          to: email,
          customerName: getSenderName(shipment),
          invoiceNumber: invoice.invoiceNumber,
          pdfBase64: base64,
          status: emailStatus,
          total: fmtMoney(total, invoice.currency),
          amount: fmtMoney(paidAmount, invoice.currency),
          amountDue: fmtMoney(balance, invoice.currency),
          dueDate: invoice.dueDate,
        },
      });

      if (error) {
        let detail = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          const j = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
          if (j?.error) detail = j.error;
        } catch { /* ignore */ }
        throw new Error(detail);
      }

      await persistInvoice(shipment, { ...invoice, sentAt: new Date().toISOString() });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send the invoice email.';
      if (!silent) toast({ title: 'Send failed', description: msg, variant: 'destructive' });
      return false;
    }
  };

  // ── Send invoice to the customer by email (and mark it sent) ─────────────────
  const sendInvoice = async (shipment: Shipment) => {
    setSendingId(shipment.id);
    const ok = await emailInvoice(shipment);
    setSendingId(null);
    if (ok) toast({ title: 'Invoice sent', description: `Emailed to ${getSenderEmail(shipment)}` });
  };

  // ── Publish the invoice to the customer's app + web dashboard ────────────────
  // Replaces the old WhatsApp send, which depended on Twilio secrets on the
  // send-invoice-whatsapp edge function and failed whenever they were absent.
  //
  // Nothing has to be transmitted: the customer app's Billing screen and the web
  // dashboard both read `metadata.invoice` off the shipment, so persisting it
  // *is* delivery. This marks it published and notifies the customer in-app.
  //
  // The one hard requirement is that the shipment belongs to an account —
  // a shipment with user_id = null has no one to show it to.
  const publishInvoiceToCustomer = async (shipment: Shipment) => {
    const invoice = getInvoiceData(shipment);

    // Without a raised invoice this would publish a figure synthesised from the
    // booking — the customer would receive a bill nobody agreed.
    if (!hasStoredInvoice(shipment)) {
      toast({
        title: 'No invoice raised yet',
        description: 'Open this booking, review the lines and save the invoice first. Only then can it be published to the customer.',
        variant: 'destructive',
      });
      return;
    }

    if (!shipment.user_id) {
      toast({
        title: 'Booking is not linked to an account',
        description: 'This was booked as a guest, so there is no customer app to publish to. It links automatically when they sign in with the same email — until then, use Email.',
        variant: 'destructive',
      });
      return;
    }

    setPublishingId(shipment.id);
    try {
      const now = new Date().toISOString();
      const ok = await persistInvoice(shipment, {
        ...invoice,
        sentAt: invoice.sentAt || now,
        publishedToCustomerAt: now,
      } as InvoiceData);
      if (!ok) throw new Error('Could not save the invoice.');

      const { total, balance } = getPaymentSummary(invoice);
      const settled = balance <= 0.005 && total > 0;

      // Best effort: the invoice is already visible without this, so a failed
      // notification must not read as a failed publish.
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: shipment.user_id,
        title: settled ? 'Invoice receipt available' : 'New invoice available',
        message: `${invoice.invoiceNumber} for ${fmtMoney(total, invoice.currency)}${
          settled ? ' is paid in full.' : ` — ${fmtMoney(balance, invoice.currency)} due by ${invoice.dueDate}.`
        }`,
        type: 'finance',
        related_id: shipment.id,
      } as never);

      toast({
        title: 'Published to the customer',
        description: notifyError
          ? 'Visible in their app and dashboard now (in-app alert could not be created).'
          : 'It is in their app and web dashboard, and they have been notified.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not publish the invoice.';
      toast({ title: 'Publish failed', description: msg, variant: 'destructive' });
    } finally {
      setPublishingId(null);
    }
  };

  // ── Bulk: email every selected invoice ──────────────────────────────────────
  const bulkSend = async () => {
    const targets = filtered.filter(s => selected.has(s.id));
    if (targets.length === 0) return;
    setBulkSending(true);
    let sent = 0, failed = 0;
    for (const s of targets) {
      const ok = await emailInvoice(s, true);
      ok ? sent++ : failed++;
    }
    setBulkSending(false);
    setSelected(new Set());
    toast({
      title: 'Bulk send complete',
      description: `${sent} sent${failed ? `, ${failed} failed (missing email or send error)` : ''}.`,
      variant: failed && !sent ? 'destructive' : undefined,
    });
  };

  // ── Bulk: zip the selected invoices' PDFs ───────────────────────────────────
  const bulkDownload = async () => {
    const targets = filtered.filter(s => selected.has(s.id));
    if (targets.length === 0) return;
    setBulkDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const s of targets) {
        const invoice = getInvoiceData(s);
        const { blob } = await renderInvoicePdf(s, invoice);
        zip.file(`${invoice.invoiceNumber}.pdf`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoices-${format(new Date(), 'yyyyMMdd-HHmm')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: `${targets.length} invoice(s) zipped.` });
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Bulk download failed.', variant: 'destructive' });
    } finally {
      setBulkDownloading(false);
    }
  };

  // ── Record offline payment ──────────────────────────────────────────────────
  const openRecordPayment = (shipment: Shipment) => {
    const invoice = getInvoiceData(shipment);
    const { balance } = getPaymentSummary(invoice);
    setPayingShipment(shipment);
    setPaymentDraft({
      amount: Number(balance.toFixed(2)),
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'bank_transfer',
      reference: '',
      note: '',
    });
  };

  const savePayment = async () => {
    if (!payingShipment || !paymentDraft) return;
    if (!paymentDraft.amount || paymentDraft.amount <= 0) {
      toast({ title: 'Enter an amount', description: 'Payment amount must be greater than zero.', variant: 'destructive' });
      return;
    }
    setSavingPayment(true);
    const invoice = getInvoiceData(payingShipment);
    const entry: PaymentEntry = {
      id: (globalThis.crypto?.randomUUID?.() ?? `pay-${Date.now()}`),
      date: paymentDraft.date,
      amount: Number(paymentDraft.amount),
      method: paymentDraft.method,
      reference: paymentDraft.reference.trim() || undefined,
      note: paymentDraft.note.trim() || undefined,
    };
    const updated: InvoiceData = { ...invoice, payments: [...(invoice.payments || []), entry] };
    const ok = await persistInvoice(payingShipment, updated);
    setSavingPayment(false);
    if (!ok) return;
    const summary = getPaymentSummary(updated);
    toast({
      title: 'Payment recorded',
      description: summary.balance <= 0.005
        ? `${invoice.invoiceNumber} fully paid.`
        : `${fmtMoney(summary.balance, invoice.currency)} balance remaining.`,
    });
    setPayingShipment(null);
    setPaymentDraft(null);
  };

  const removePayment = async (shipment: Shipment, paymentId: string) => {
    const invoice = getInvoiceData(shipment);
    const updated: InvoiceData = { ...invoice, payments: (invoice.payments || []).filter(p => p.id !== paymentId) };
    setBusyId(shipment.id);
    const ok = await persistInvoice(shipment, updated);
    setBusyId(null);
    if (ok) toast({ title: 'Payment removed' });
  };

  const softDeleteInvoice = async () => {
    if (!deletingShipment) return;
    setDeletingInvoice(true);
    const invoice = getInvoiceData(deletingShipment);
    const ok = await persistInvoice(deletingShipment, { ...invoice, deletedAt: new Date().toISOString() });
    setDeletingInvoice(false);
    if (!ok) return;
    toast({ title: 'Invoice deleted', description: `${invoice.invoiceNumber} can be restored from the Deleted filter.` });
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(deletingShipment.id);
      return next;
    });
    setDeletingShipment(null);
  };

  const restoreInvoice = async (shipment: Shipment) => {
    setBusyId(shipment.id);
    const invoice = getInvoiceData(shipment);
    const ok = await persistInvoice(shipment, { ...invoice, deletedAt: null });
    setBusyId(null);
    if (ok) toast({ title: 'Invoice restored', description: invoice.invoiceNumber });
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

  const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Invoices' },
    // Bookings with no invoice raised yet. They are listed so an admin can
    // raise one, but they are not counted as invoices anywhere.
    { value: 'not_raised', label: 'Not raised yet' },
    { value: 'raised', label: 'Raised' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'partial', label: 'Partial' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paid', label: 'Paid' },
    { value: 'deleted', label: 'Deleted' },
  ];

  const draftTotals = draft ? calculateTotals(draft) : null;
  const draftPaymentSummary = draft ? getPaymentSummary(draft) : null;
  const paymentSummaryForPaying = payingShipment ? getPaymentSummary(getInvoiceData(payingShipment)) : null;

  return (
    <div className="space-y-4">
      <TabHeader
        title="Invoices"
        description="Customer invoices for every shipment. Edit, preview, print or download as PDF."
        actions={
          <>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={startBlankInvoice}
              disabled={loading}
              title="Create a completely new invoice"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchShipments} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer ref, tracking #, customer or recipient…"
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
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2"><CircleDollarSign className="h-5 w-5 text-blue-700" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="text-xl font-semibold">{fmtMoney(summary.outstanding, summary.currency)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2"><AlertTriangle className="h-5 w-5 text-red-700" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Overdue</div>
              <div className="text-xl font-semibold">{fmtMoney(summary.overdue, summary.currency)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Paid (all time)</div>
              <div className="text-xl font-semibold">{fmtMoney(summary.paid, summary.currency)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{summary.raised}</strong> invoice{summary.raised !== 1 ? 's' : ''} raised</span>
        {summary.notRaised > 0 && (
          <span className="text-amber-700 dark:text-amber-500">
            {summary.notRaised} booking{summary.notRaised !== 1 ? 's' : ''} with no invoice yet
          </span>
        )}
        {summary.deleted > 0 && <span>{summary.deleted} deleted</span>}
        <span>· {filtered.length} shown</span>
        {selected.size > 0 && (
          <>
            <span className="text-emerald-700 font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={bulkSend} disabled={bulkSending || bulkDownloading}>
              {bulkSending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={bulkDownload} disabled={bulkSending || bulkDownloading}>
              {bulkDownloading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Download ({selected.size})
            </Button>
            <button className="text-xs underline" onClick={() => setSelected(new Set())}>Clear</button>
          </>
        )}
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                        className={someSelected ? 'opacity-70' : ''}
                      />
                    </TableHead>
                    <TableHead>Customer Ref</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(shipment => {
                    const inv = getInvoiceData(shipment);
                    const { total, paidAmount, balance } = getPaymentSummary(inv);
                    const status = getInvoiceStatus(inv);
                    const raised = hasStoredInvoice(shipment);
                    const deleted = Boolean(inv.deletedAt);
                    const rowBusy = busyId === shipment.id;
                    const isChecked = selected.has(shipment.id);
                    return (
                      <TableRow key={shipment.id} className={isChecked ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOne(shipment.id)}
                            aria-label={`Select ${inv.invoiceNumber}`}
                            disabled={!raised || deleted}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{shipment.tracking_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {inv.issueDate}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getSenderName(shipment)}</div>
                          <div className="text-xs text-muted-foreground">{shipment.origin}</div>
                        </TableCell>
                        {/* An unraised booking shows a proposed figure, not a
                            billed one, so it must not be presented as money owed. */}
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {raised ? fmtMoney(total, inv.currency) : (
                            <span className="text-muted-foreground font-normal" title="Proposed from the booking — not yet billed">
                              ({fmtMoney(total, inv.currency)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-emerald-700 whitespace-nowrap">{raised && paidAmount > 0 ? fmtMoney(paidAmount, inv.currency) : '—'}</TableCell>
                        <TableCell className={`text-right font-medium whitespace-nowrap ${raised && balance > 0.005 ? 'text-red-700' : 'text-muted-foreground'}`}>
                          {raised ? fmtMoney(balance, inv.currency) : '—'}
                        </TableCell>
                        <TableCell>
                          {deleted
                            ? <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Deleted</Badge>
                            : raised
                            ? <StatusPill status={status} />
                            : <Badge variant="outline" className="text-muted-foreground">Not raised</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {deleted ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreInvoice(shipment)}
                                disabled={rowBusy}
                                className="h-8 px-2"
                              >
                                {rowBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                                Restore
                              </Button>
                            ) : <>
                            {raised && status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRecordPayment(shipment)}
                                disabled={rowBusy}
                                className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                title="Record a payment"
                              >
                                <Wallet className="h-4 w-4 mr-1" /> Pay
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => publishInvoiceToCustomer(shipment)}
                              disabled={!raised || publishingId === shipment.id}
                              className="h-8 px-2 text-green-700 hover:text-green-800 hover:bg-green-50 disabled:opacity-60"
                              title={shipment.user_id
                                ? 'Publish to the customer’s app and web dashboard'
                                : 'Guest booking — no account to publish to yet'}
                            >
                              {publishingId === shipment.id
                                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                : <Smartphone className="h-4 w-4 mr-1" />} To app
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvoice(shipment)}
                              disabled={!raised || sendingId === shipment.id}
                              className="h-8 px-2"
                              title="Email invoice to customer"
                            >
                              {sendingId === shipment.id
                                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                : <Mail className="h-4 w-4 mr-1" />} Email
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(shipment)} className="h-8 px-2" title={raised ? 'Edit invoice' : 'Create invoice'}>
                              {raised ? <Pencil className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                              {raised ? 'Edit' : 'Create'}
                            </Button>
                            {raised && (
                              <>
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
                              </>
                            )}
                            {raised && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingShipment(shipment)}
                                className="h-8 px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                                title="Soft delete invoice"
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            )}
                            </>}
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
            <DialogTitle>{editingShipment && !editingShipment.id.startsWith(NEW_INVOICE_PREFIX) && hasStoredInvoice(editingShipment) ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
            <DialogDescription>
              {editingShipment && (
                <>
                  {editingShipment.id.startsWith(NEW_INVOICE_PREFIX)
                    ? 'Enter the customer, recipient and billing details for this new invoice.'
                    : <>For shipment <span className="font-mono">{editingShipment.tracking_number}</span> — customer: {getSenderName(editingShipment)}.{!hasStoredInvoice(editingShipment) && ' Details have been filled from the booking; review them before creating the invoice.'}</>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              {editingShipment?.id.startsWith(NEW_INVOICE_PREFIX) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4 bg-muted/20">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Bill to</h3>
                    <Input placeholder="Customer or business name *" value={editingShipment.metadata?.sender?.name || ''} onChange={e => updateScratchParty('sender', { name: e.target.value })} />
                    <Input type="email" placeholder="Email address" value={editingShipment.metadata?.sender?.email || ''} onChange={e => updateScratchParty('sender', { email: e.target.value })} />
                    <Input placeholder="Phone number" value={editingShipment.metadata?.sender?.phone || ''} onChange={e => updateScratchParty('sender', { phone: e.target.value })} />
                    <Input placeholder="Billing address" value={editingShipment.metadata?.sender?.address || ''} onChange={e => updateScratchParty('sender', { address: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" value={editingShipment.metadata?.sender?.city || ''} onChange={e => updateScratchParty('sender', { city: e.target.value })} />
                      <Input placeholder="Country" value={editingShipment.metadata?.sender?.country || ''} onChange={e => updateScratchParty('sender', { country: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Ship to / recipient</h3>
                    <Input placeholder="Recipient name" value={editingShipment.metadata?.recipient?.name || ''} onChange={e => updateScratchParty('recipient', { name: e.target.value })} />
                    <Input placeholder="Phone number" value={editingShipment.metadata?.recipient?.phone || ''} onChange={e => updateScratchParty('recipient', { phone: e.target.value })} />
                    <Input placeholder="Delivery address" value={editingShipment.metadata?.recipient?.address || ''} onChange={e => updateScratchParty('recipient', { address: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" value={editingShipment.metadata?.recipient?.city || ''} onChange={e => updateScratchParty('recipient', { city: e.target.value })} />
                      <Input placeholder="Country" value={editingShipment.metadata?.recipient?.country || ''} onChange={e => updateScratchParty('recipient', { country: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Customer Ref</Label>
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

              <div className="grid grid-cols-1 gap-3">
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Line items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                    <span className="col-span-3">Item</span>
                    <span className="col-span-4">Description</span>
                    <span className="col-span-2">Quantity *</span>
                    <span className="col-span-2">Amount *</span>
                  </div>
                  {draft.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-12 sm:col-span-3">
                        <Label className="mb-1 block text-xs sm:hidden">Item</Label>
                        <Input
                          placeholder="Item"
                          value={item.item || ''}
                          onChange={e => updateItem(i, { item: e.target.value })}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <Label className="mb-1 block text-xs sm:hidden">Description</Label>
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={e => updateItem(i, { description: e.target.value })}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="mb-1 block text-xs sm:hidden">Quantity *</Label>
                        <Input
                          type="number" min={0} step={1}
                          placeholder="Quantity *"
                          required
                          value={item.quantity}
                          onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="mb-1 block text-xs sm:hidden">Amount *</Label>
                        <Input
                          type="number" min={0.01} step={0.01}
                          placeholder="Amount *"
                          required
                          value={item.unitPrice}
                          onChange={e => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 pt-5 sm:pt-0">
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

              {draftTotals && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border bg-muted/40 px-3 py-3 text-sm">
                  <div className="space-y-1">
                    <Label htmlFor="invoice-amount-paid" className="text-xs">Amount Paid</Label>
                    <Input
                      id="invoice-amount-paid"
                      type="number"
                      min={0}
                      step={0.01}
                      value={draftPaymentSummary?.paidAmount || 0}
                      onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Used to calculate the balance due and payment status.</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(draftTotals.subtotal, draft.currency)}</span></div>
                    <div className="flex justify-between font-semibold border-t mt-1 pt-1"><span>Total</span><span>{fmtMoney(draftTotals.total, draft.currency)}</span></div>
                    <div className="flex justify-between text-emerald-700"><span>Amount Paid</span><span>− {fmtMoney(draftPaymentSummary?.paidAmount || 0, draft.currency)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Balance Due</span><span>{fmtMoney(draftPaymentSummary?.balance || 0, draft.currency)}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingShipment(null); setDraft(null); }} disabled={savingInvoice}>
              Cancel
            </Button>
            <Button onClick={saveInvoice} disabled={savingInvoice || !draft}>
              {savingInvoice
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                : editingShipment && !editingShipment.id.startsWith(NEW_INVOICE_PREFIX) && hasStoredInvoice(editingShipment) ? 'Save changes' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft-delete confirmation. The invoice remains in metadata and can be restored. */}
      <Dialog open={!!deletingShipment} onOpenChange={(open) => { if (!open && !deletingInvoice) setDeletingShipment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice?</DialogTitle>
            <DialogDescription>
              {deletingShipment && <>Customer Ref <span className="font-mono">{getInvoiceData(deletingShipment).invoiceNumber}</span> will be hidden from active and customer invoice views. You can restore it later from the Deleted filter.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingShipment(null)} disabled={deletingInvoice}>Cancel</Button>
            <Button variant="destructive" onClick={softDeleteInvoice} disabled={deletingInvoice}>
              {deletingInvoice ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog
        open={!!payingShipment}
        onOpenChange={(open) => { if (!open) { setPayingShipment(null); setPaymentDraft(null); } }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {payingShipment && (
                <>Offline payment for invoice <span className="font-mono">{getInvoiceData(payingShipment).invoiceNumber}</span> — {getSenderName(payingShipment)}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {paymentDraft && payingShipment && (() => {
            const inv = getInvoiceData(payingShipment);
            const existing = inv.payments || [];
            return (
              <div className="space-y-4">
                {paymentSummaryForPaying && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex justify-between">
                    <span>Balance due</span>
                    <span className="font-semibold">{fmtMoney(paymentSummaryForPaying.balance, inv.currency)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount ({inv.currency})</Label>
                    <Input
                      type="number" min={0} step={0.01}
                      value={paymentDraft.amount}
                      onChange={e => setPaymentDraft({ ...paymentDraft, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date received</Label>
                    <Input
                      type="date"
                      value={paymentDraft.date}
                      onChange={e => setPaymentDraft({ ...paymentDraft, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Method</Label>
                    <Select value={paymentDraft.method} onValueChange={v => setPaymentDraft({ ...paymentDraft, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([v, label]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reference (optional)</Label>
                    <Input
                      placeholder="Bank ref, receipt #…"
                      value={paymentDraft.reference}
                      onChange={e => setPaymentDraft({ ...paymentDraft, reference: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Note (optional)</Label>
                  <Input
                    value={paymentDraft.note}
                    onChange={e => setPaymentDraft({ ...paymentDraft, note: e.target.value })}
                  />
                </div>

                {existing.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Payments so far</Label>
                    <div className="rounded-md border divide-y">
                      {existing.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{fmtMoney(Number(p.amount) || 0, inv.currency)}</span>
                            <span className="text-muted-foreground"> · {PAYMENT_METHOD_LABELS[p.method] || p.method} · {p.date}</span>
                            {p.reference && <span className="text-muted-foreground"> · {p.reference}</span>}
                          </div>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => removePayment(payingShipment, p.id)}
                            title="Remove payment"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayingShipment(null); setPaymentDraft(null); }} disabled={savingPayment}>
              Cancel
            </Button>
            <Button onClick={savePayment} disabled={savingPayment || !paymentDraft} className="bg-emerald-600 hover:bg-emerald-700">
              {savingPayment ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Wallet className="h-4 w-4 mr-2" />Record payment</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesTab;
