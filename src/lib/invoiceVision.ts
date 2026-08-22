import { supabase } from '@/integrations/supabase/client';
import type { InvoiceExtraction } from '@/lib/deliveryNote/types';

// Client side of the read-invoice edge function.
//
// This returns a raw transcription of the invoice and nothing else — the
// delivery note is computed from it by the rules engine in
// src/lib/deliveryNote. Keeping the model call this thin is what lets a wrong
// note be traced to either a misread page or a mishandled rule.

export type { InvoiceExtraction };

const MAX_FILES = 6;

async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Chunked so a multi-megabyte scan doesn't blow the argument limit of apply().
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    data: btoa(binary),
    mediaType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
  };
}

export interface ExtractionResult {
  extraction: InvoiceExtraction;
  /** Which vision model read the page, shown in review for traceability. */
  model: string;
}

/** Transcribes an invoice photo or PDF. Applies no business rules. */
export async function extractInvoice(files: File[]): Promise<ExtractionResult> {
  if (!files.length) throw new Error('Choose an invoice photo or PDF first.');
  if (files.length > MAX_FILES) throw new Error(`Upload at most ${MAX_FILES} pages at a time.`);

  const encoded = await Promise.all(files.map(fileToBase64));

  const { data, error } = await supabase.functions.invoke('read-invoice', {
    body: { files: encoded },
  });

  if (error) {
    // The function returns a useful message in the body; surface it over the
    // generic "Edge Function returned a non-2xx status code".
    let detail = '';
    try {
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        detail = (await context.json())?.error || '';
      }
    } catch {
      detail = '';
    }
    throw new Error(detail || error.message || 'Could not read the invoice.');
  }
  if (!data?.extraction) throw new Error(data?.error || 'Could not read the invoice.');

  return { extraction: data.extraction as InvoiceExtraction, model: data.model || 'unknown' };
}
