import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, Printer, Plus, Trash2, X, CalendarPlus, ScanLine, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseInvoiceText } from '@/components/admin/DeliveryNoteGenerator';

interface StandaloneDeliveryNoteCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  // Called after a new note is saved to the Delivery Notes list.
  onCreated?: () => void;
}

interface DeliveryAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
}

interface FormData {
  refNumber: string;
  date: string;
  deliveryDate: string;
  senderName: string;
  senderPhone: string;
  senderPhone2: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2: string;
  recipientAddress: string;
  deliveryAddresses: DeliveryAddress[];
  doorToDoor: boolean;
  sealed: boolean;
  sealCodes: string;
  itemsSummary: string;
  items: Array<{ name: string; description: string }>;
  tracking: string;
}

// Prepend Zimbabwe dialling code if needed
function withDialCode(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const local = trimmed.replace(/^0+/, '');
  return `+263 ${local}`;
}

const StandaloneDeliveryNoteCreator: React.FC<StandaloneDeliveryNoteCreatorProps> = ({ isOpen, onClose, onCreated }) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanText, setScanText] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    refNumber: `EXT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: '',
    senderName: '',
    senderPhone: '',
    senderPhone2: '',
    senderAddress: '',
    recipientName: '',
    recipientPhone: '',
    recipientPhone2: '',
    recipientAddress: '',
    deliveryAddresses: [],
    doorToDoor: false,
    sealed: false,
    sealCodes: '',
    itemsSummary: '',
    items: [{ name: 'Item #1', description: '' }],
    tracking: `EXT-${Date.now()}`,
  });

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: 'name' | 'description', value: string) => {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    updateField('items', items);
  };

  const addItem = () => {
    updateField('items', [...formData.items, { name: `Item #${formData.items.length + 1}`, description: '' }]);
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) {
      toast({ title: 'Cannot remove', description: 'At least one item is required.', variant: 'destructive' });
      return;
    }
    updateField('items', formData.items.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!noteRef.current) throw new Error('Element not found');

      const canvas = await html2canvas(noteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${formData.refNumber}.pdf`);

      toast({ title: 'Downloaded', description: `${formData.refNumber}.pdf saved.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!noteRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${formData.refNumber}</title>
      <style>body{margin:0;padding:0;}@media print{body{margin:0;}}</style>
      </head><body>${noteRef.current.outerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleReset = () => {
    setScanText('');
    setFormData({
      refNumber: `EXT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: '',
      senderName: '',
      senderPhone: '',
      senderPhone2: '',
      senderAddress: '',
      recipientName: '',
      recipientPhone: '',
      recipientPhone2: '',
      recipientAddress: '',
      deliveryAddresses: [],
      doorToDoor: false,
      sealed: false,
      sealCodes: '',
      itemsSummary: '',
      items: [{ name: 'Item #1', description: '' }],
      tracking: `EXT-${Date.now()}`,
    });
  };

  // Scan an external invoice photo on-device (OCR) and pre-fill the form.
  const handleScanFile = async (file: File | undefined) => {
    if (!file) return;
    setIsScanning(true);
    setScanText('');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(file, 'eng');
      const text = (data.text || '').trim();
      setScanText(text);
      const p = parseInvoiceText(text);
      const count = Object.keys(p).length;
      setFormData(prev => ({
        ...prev,
        refNumber: p.refNumber || prev.refNumber,
        date: p.date || prev.date,
        senderName: p.senderName ?? prev.senderName,
        senderPhone: p.senderPhone ?? prev.senderPhone,
        senderAddress: p.senderAddress ?? prev.senderAddress,
        recipientName: p.recipientName ?? prev.recipientName,
        recipientPhone: p.recipientPhone ?? prev.recipientPhone,
        recipientAddress: p.recipientAddress ?? prev.recipientAddress,
      }));
      toast({
        title: count ? 'Scan complete' : 'Scan finished',
        description: count
          ? `Pre-filled ${count} field(s) — please review and complete the items.`
          : 'No fields detected — use the scanned text below to fill the form.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read the image.';
      toast({ title: 'Scan failed', description: msg, variant: 'destructive' });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  // Persist the note as a shipment so it appears in the Delivery Notes list.
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const overrides = {
        refNumber: formData.refNumber,
        date: formData.date,
        deliveryDate: formData.deliveryDate || undefined,
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        senderPhone2: formData.senderPhone2,
        senderAddress: formData.senderAddress,
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
        recipientPhone2: formData.recipientPhone2,
        recipientAddress: formData.recipientAddress,
        deliveryAddresses: formData.deliveryAddresses,
        doorToDoor: formData.doorToDoor,
        sealed: formData.sealed,
        sealCodes: formData.sealCodes,
        itemsSummary: formData.itemsSummary,
        items: formData.items.map(it => ({ item: it.name, description: it.description })),
        tracking: formData.tracking,
      };
      const metadata = {
        source: 'external-scan',
        sender: { name: formData.senderName, phone: formData.senderPhone, address: formData.senderAddress },
        recipient: {
          name: formData.recipientName,
          phone: formData.recipientPhone,
          address: formData.recipientAddress,
          country: 'Zimbabwe',
          additionalAddresses: formData.deliveryAddresses,
        },
        deliveryNoteOverrides: overrides,
      };

      const { error } = await supabase.from('shipments').insert({
        tracking_number: formData.tracking || `EXT-${Date.now()}`,
        user_id: null,
        origin: 'External Invoice',
        destination: formData.recipientName || 'Zimbabwe',
        status: 'pending',
        metadata: metadata as never,
        can_modify: true,
        can_cancel: true,
      });

      if (error) throw error;

      toast({ title: 'Delivery note created', description: `${formData.refNumber} added to the list.` });
      onCreated?.();
      handleReset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save the delivery note.';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Standalone Delivery Note</DialogTitle>
          <DialogDescription>
            For external deliveries not tied to a shipment booking.
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="border rounded-lg p-4 bg-muted/40 space-y-4">
          {/* Scan-to-fill */}
          <div className="rounded-md border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium flex items-center gap-1.5"><ScanLine className="h-4 w-4" /> Scan an external invoice to auto-fill</div>
                <div className="text-xs text-muted-foreground">Photograph or upload the invoice. Detected fields pre-fill below — review, complete the items, then Save.</div>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={isScanning} onClick={() => scanInputRef.current?.click()}>
                {isScanning
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading…</>
                  : <><ScanLine className="h-4 w-4 mr-2" />Scan invoice</>}
              </Button>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleScanFile(e.target.files?.[0])}
              />
            </div>
            {scanText && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">View scanned text (copy anything not auto-filled)</summary>
                <Textarea readOnly rows={6} value={scanText} className="mt-2 font-mono text-xs" />
              </details>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ref #</label>
              <Input value={formData.refNumber} onChange={(e) => updateField('refNumber', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Delivery Date (optional)</label>
              {formData.deliveryDate ? (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => updateField('deliveryDate', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updateField('deliveryDate', '')}
                    title="Remove delivery date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => updateField('deliveryDate', format(new Date(), 'yyyy-MM-dd'))}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" /> Add delivery date
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shipper */}
            <div className="space-y-2 rounded-md border p-3 bg-background">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipper</div>
              <Input placeholder="Name" value={formData.senderName} onChange={(e) => updateField('senderName', e.target.value)} />
              <Input placeholder="Phone" value={formData.senderPhone} onChange={(e) => updateField('senderPhone', e.target.value)} />
              <Input placeholder="Phone 2 (optional)" value={formData.senderPhone2} onChange={(e) => updateField('senderPhone2', e.target.value)} />
              <Textarea rows={3} placeholder="Address (one line per row)" value={formData.senderAddress} onChange={(e) => updateField('senderAddress', e.target.value)} />
            </div>
            {/* Recipient */}
            <div className="space-y-2 rounded-md border p-3 bg-background">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient</div>
              <Input placeholder="Name" value={formData.recipientName} onChange={(e) => updateField('recipientName', e.target.value)} />
              <Input placeholder="Phone" value={formData.recipientPhone} onChange={(e) => updateField('recipientPhone', e.target.value)} />
              <Input placeholder="Phone 2 (optional)" value={formData.recipientPhone2} onChange={(e) => updateField('recipientPhone2', e.target.value)} />
              <Textarea rows={3} placeholder="Address (one line per row)" value={formData.recipientAddress} onChange={(e) => updateField('recipientAddress', e.target.value)} />
            </div>
          </div>

          {/* Additional Delivery Addresses */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Additional Delivery Addresses</label>
            {formData.deliveryAddresses.map((addr, i) => (
              <div key={i} className="rounded-md border-2 border-dashed p-3 bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600">Address #{i + 2}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => updateField('deliveryAddresses', formData.deliveryAddresses.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Recipient name"
                  value={addr.name}
                  onChange={(e) => {
                    const next = [...formData.deliveryAddresses];
                    next[i] = { ...next[i], name: e.target.value };
                    updateField('deliveryAddresses', next);
                  }}
                />
                <Input
                  placeholder="Phone"
                  value={addr.phone}
                  onChange={(e) => {
                    const next = [...formData.deliveryAddresses];
                    next[i] = { ...next[i], phone: e.target.value };
                    updateField('deliveryAddresses', next);
                  }}
                />
                <Input
                  placeholder="Street address"
                  value={addr.address}
                  onChange={(e) => {
                    const next = [...formData.deliveryAddresses];
                    next[i] = { ...next[i], address: e.target.value };
                    updateField('deliveryAddresses', next);
                  }}
                />
                <Input
                  placeholder="City"
                  value={addr.city}
                  onChange={(e) => {
                    const next = [...formData.deliveryAddresses];
                    next[i] = { ...next[i], city: e.target.value };
                    updateField('deliveryAddresses', next);
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => updateField('deliveryAddresses', [...formData.deliveryAddresses, { name: '', phone: '', address: '', city: '' }])}
            >
              <Plus className="h-4 w-4 mr-2" /> Add another delivery address
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tracking # (optional)</label>
            <Input value={formData.tracking} onChange={(e) => updateField('tracking', e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Delivery method</label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 bg-background">
              <input
                type="checkbox"
                checked={formData.doorToDoor}
                onChange={(e) => updateField('doorToDoor', e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">
                Door-to-Door Delivery
                <span className="text-muted-foreground"> — {formData.doorToDoor ? 'deliver to recipient address' : 'depot collection (off)'}</span>
              </span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Metal coded seal</label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 bg-background">
              <input
                type="checkbox"
                checked={formData.sealed}
                onChange={(e) => updateField('sealed', e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Shipment has a metal coded seal</span>
            </label>
            {formData.sealed && (
              <Input
                placeholder="Seal code(s) — comma separated, e.g. ABC123, DEF456"
                value={formData.sealCodes}
                onChange={(e) => updateField('sealCodes', e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Items summary line</label>
            <Input
              placeholder="e.g., 2 × Drum, 1 × Trunk"
              value={formData.itemsSummary}
              onChange={(e) => updateField('itemsSummary', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Items (name & description)</label>
            {formData.items.map((item, i) => (
              <div key={i} className="space-y-1 rounded-md border p-2 bg-background">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder={`Item ${i + 1} name`}
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                  />
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <Textarea
                  rows={2}
                  placeholder="Description / item details"
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                />
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" /> Add another item
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg overflow-auto bg-white">
          <div
            ref={noteRef}
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '13px',
              color: '#111',
              backgroundColor: '#fff',
              padding: '40px 48px',
              width: '794px',
              minHeight: '600px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <img src="/logo.png" alt="Zimbabwe Shipping" crossOrigin="anonymous" style={{ height: '80px', width: 'auto' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>DELIVERY NOTE</div>
                <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.6' }}>
                  <div>Ref #: <strong style={{ fontSize: '16px', color: '#111' }}>{formData.refNumber}</strong></div>
                  <div>Date: <strong>{formData.date}</strong></div>
                  {formData.deliveryDate && <div>Delivery Date: <strong>{formData.deliveryDate}</strong></div>}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #111', marginBottom: '24px' }} />

            {/* Shipper / Recipient */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '32px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SHIPPER:</div>
                <div style={{ lineHeight: '1.7', color: '#222' }}>
                  <div style={{ fontWeight: '600' }}>{formData.senderName || 'Unknown Sender'}</div>
                  {formData.senderPhone && <div>{withDialCode(formData.senderPhone)}</div>}
                  {formData.senderPhone2 && <div>{withDialCode(formData.senderPhone2)}</div>}
                  {formData.senderAddress.split('\n').filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RECIPIENT:</div>
                <div style={{ lineHeight: '1.7', color: '#222' }}>
                  <div style={{ fontWeight: '600' }}>{formData.recipientName || 'Unknown Recipient'}</div>
                  {formData.recipientPhone && <div>{withDialCode(formData.recipientPhone)}</div>}
                  {formData.recipientPhone2 && <div>{withDialCode(formData.recipientPhone2)}</div>}
                  {formData.recipientAddress.split('\n').filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            </div>

            {/* Additional Addresses */}
            {formData.deliveryAddresses.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563eb' }}>ADDITIONAL DELIVERY ADDRESSES:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {formData.deliveryAddresses.map((addr, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc', lineHeight: '1.6', fontSize: '12px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#2563eb' }}>Address #{i + 2}</div>
                      {addr.name && <div style={{ fontWeight: '500' }}>{addr.name}</div>}
                      {addr.phone && <div>{withDialCode(addr.phone)}</div>}
                      {addr.address && <div>{addr.address}</div>}
                      {addr.city && <div>{addr.city}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Method */}
            <div style={{ marginBottom: '20px', padding: '10px 14px', borderRadius: '4px', border: `2px solid ${formData.doorToDoor ? '#16a34a' : '#94a3b8'}`, backgroundColor: formData.doorToDoor ? '#f0fdf4' : '#f8fafc', fontSize: '13px' }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: formData.doorToDoor ? '#15803d' : '#475569' }}>
                Delivery Method: {formData.doorToDoor ? 'Door-to-Door' : 'Depot Collection'}
              </strong>
              <div style={{ color: '#444', marginTop: '2px' }}>
                {formData.doorToDoor
                  ? `Deliver to ${1 + formData.deliveryAddresses.length} address${1 + formData.deliveryAddresses.length > 1 ? 'es' : ''} listed above. Contact recipient(s) to arrange delivery.`
                  : 'Recipient collects from the local depot. No door delivery included.'}
              </div>
            </div>

            {/* Metal Seal */}
            <div style={{ marginBottom: '20px', padding: '10px 14px', borderRadius: '4px', border: `2px solid ${formData.sealed ? '#2563eb' : '#94a3b8'}`, backgroundColor: formData.sealed ? '#eff6ff' : '#f8fafc', fontSize: '13px' }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: formData.sealed ? '#1d4ed8' : '#475569' }}>
                Metal Coded Seal: {formData.sealed ? 'Yes' : 'None'}
              </strong>
              {formData.sealed && formData.sealCodes && (
                <div style={{ color: '#444', marginTop: '2px' }}>
                  Seal code(s): <strong style={{ color: '#111' }}>{formData.sealCodes}</strong>
                </div>
              )}
            </div>

            {/* Items Summary */}
            {formData.itemsSummary && (
              <div style={{ marginBottom: '12px', fontSize: '12px', color: '#444' }}>
                <strong>Items in this shipment:</strong> {formData.itemsSummary}
              </div>
            )}

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '32px' }}>✓</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: '170px' }}>Item</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description / Item Details</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '14px' }}>☐</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: '600', verticalAlign: 'top' }}>{item.name}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: '1.7' }}>{item.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ marginTop: '48px', borderTop: '1px solid #ddd', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
              <span>Zimbabwe Shipping — Ireland Branch</span>
              <span>Tracking: {formData.tracking}</span>
              <span>Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4 mr-2" /> Clear Form
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : <><Download className="h-4 w-4 mr-2" />Download PDF</>
            }
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
            {isSaving
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              : <><Save className="h-4 w-4 mr-2" />Save to list</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StandaloneDeliveryNoteCreator;
