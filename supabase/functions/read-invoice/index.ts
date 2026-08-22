import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { enforceAiRateLimit } from "../_shared/rateLimit.ts";

// Stage 1 of the invoice -> delivery note pipeline: TRANSCRIPTION ONLY.
//
// This function reads a photographed or scanned invoice and returns what is
// printed on it. It applies no business rules — no reference number, no item
// mapping, no paid decision. Those live in src/lib/deliveryNote as plain
// deterministic functions with unit tests, so they can be debugged against a
// fixed transcription instead of against a model.
//
// The split matters for a practical reason: when a delivery note comes out
// wrong, this boundary tells you whether the model misread the page or the
// rules mishandled a correct read.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const ANTHROPIC_MODEL = Deno.env.get("INVOICE_VISION_MODEL") || "claude-opus-5";
// Fallback so the feature works on the OpenAI key this project already has set.
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_VISION_MODEL = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILES = 6;
const MAX_BYTES = 8 * 1024 * 1024; // per file, before base64 expansion
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SPEC = `You transcribe shipping invoices (Tshakmo Removals / Zimbabwe Shipping) for
Zimbabwe Shipping's delivery-note system. You are given photographs or PDF pages of one
invoice.

Your ONLY job is to read what is printed and write it down. You are not producing a
delivery note and you must not apply any business rule:

- Do NOT compute a reference number.
- Do NOT decide which rows are goods and which are charges. Transcribe every priced row.
- Do NOT consolidate, split, merge, deduplicate or reorder rows. If the page shows the
  same row twice, return it twice.
- Do NOT reformat phone numbers or dates beyond copying what is printed.
- Do NOT correct an invoice number, a phone number, or a total to make them agree.
- Do NOT drop a row because it looks like a fee, a discount or an artefact.

Copy every line of each row's description cell, in the order printed, as separate
strings — a row whose description wraps onto three lines has three entries.

Numbers: return the numeric value only, without a currency symbol. Use null when a
figure is absent or unreadable — never 0 as a stand-in for "could not read".

deliver_to_raw: most of these invoices name no receiver at all, and an empty string is
the correct, expected answer. Fill it in ONLY when the page actually prints a consignee
— a "Deliver to", "Receiver", "Consignee" or "Ship to" block, or a delivery line that
names a person as well as a place. Copy it verbatim, including whatever address and
phone it carries. The Bill To party is the person PAYING and is not the receiver: never
copy it into this field, and never infer a receiver from a city on a delivery line. An
invented receiver sends goods to the wrong door, so leave it empty when in doubt and say
so in extraction_confidence_notes.

red_paid_stamp_visible: true only if a red PAID graphic is actually visible on the page.

extraction_confidence_notes is the most important field on a bad scan. Fill it in
whenever anything was hard to read, ambiguous, cut off, overlapping, handwritten,
duplicated by a rendering artefact, or unusual about the layout. Name the specific
field. Leave it as an empty string only when the whole page read cleanly — an empty
note on a page you struggled with is a silent failure, and downstream every non-empty
note goes to a human.

Return JSON only, matching the schema.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "invoice_number",
    "invoice_date",
    "due_date",
    "bill_to_raw",
    "shipper_phone_raw",
    "deliver_to_raw",
    "line_items",
    "subtotal",
    "discount",
    "total",
    "paid_amount",
    "balance_due",
    "red_paid_stamp_visible",
    "extraction_confidence_notes",
  ],
  properties: {
    invoice_number: {
      type: "string",
      description: "Exactly as printed, including any letter suffix such as B or OVERSPILL",
    },
    invoice_date: { type: "string", description: "As printed" },
    due_date: { type: "string", description: "As printed" },
    bill_to_raw: {
      type: "string",
      description: "The whole Bill To block verbatim, all lines, newline separated",
    },
    shipper_phone_raw: { type: "string", description: "As printed" },
    deliver_to_raw: {
      type: "string",
      description:
        "Any consignee / deliver-to / receiver block printed on the invoice, verbatim. " +
        "Empty string when the invoice names no receiver, which is the common case. " +
        "Never repeat the Bill To party here.",
    },
    line_items: {
      type: "array",
      description: "Every priced row on the page, in printed order, none omitted or merged",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description_lines", "quantity", "rate", "amount"],
        properties: {
          description_lines: {
            type: "array",
            description: "All lines of this row's description cell, in order",
            items: { type: "string" },
          },
          quantity: { type: ["number", "null"] },
          rate: { type: ["number", "null"] },
          amount: { type: ["number", "null"] },
        },
      },
    },
    subtotal: { type: ["number", "null"] },
    discount: { type: ["number", "null"] },
    total: { type: ["number", "null"] },
    paid_amount: { type: ["number", "null"] },
    balance_due: { type: ["number", "null"] },
    red_paid_stamp_visible: {
      type: "boolean",
      description: "Is a red PAID graphic visible on the page",
    },
    extraction_confidence_notes: {
      type: "string",
      description: "Anything ambiguous, hard to read or unusual. Empty only for a clean read.",
    },
  },
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type IncomingFile = { data: string; mediaType: string };

// Strips a data: URL prefix if the browser sent one, and rejects anything that
// is not plausible base64 so we never ship junk to the model.
function normaliseFile(raw: unknown, index: number): IncomingFile {
  const file = raw as { data?: unknown; mediaType?: unknown } | null;
  const rawData = typeof file?.data === "string" ? file.data : "";
  const data = rawData.includes(",") && rawData.startsWith("data:")
    ? rawData.slice(rawData.indexOf(",") + 1)
    : rawData;
  const mediaType = typeof file?.mediaType === "string" ? file.mediaType.toLowerCase().trim() : "";

  if (!data) throw new Error(`File ${index + 1} is empty.`);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new Error(`File ${index + 1} is not base64.`);
  // 4 base64 chars per 3 bytes.
  if ((data.length * 3) / 4 > MAX_BYTES) {
    throw new Error(`File ${index + 1} is larger than ${MAX_BYTES / (1024 * 1024)}MB.`);
  }
  if (mediaType !== "application/pdf" && !IMAGE_TYPES.has(mediaType)) {
    throw new Error(
      `File ${index + 1} is a ${mediaType || "unknown"} — upload a JPEG, PNG, WebP or PDF.`,
    );
  }
  return { data: data.replace(/\s+/g, ""), mediaType };
}

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** null rather than 0, so "could not read" never masquerades as a real figure. */
function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (value.trim() && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

// Shapes whatever the model returned into the transcription contract, so a
// missing or oddly-typed field degrades predictably instead of throwing.
function normaliseExtraction(parsed: Record<string, unknown>) {
  const rawItems = Array.isArray(parsed.line_items) ? parsed.line_items : [];
  const line_items = rawItems.slice(0, 80).map((row) => {
    const r = (row || {}) as Record<string, unknown>;
    const lines = Array.isArray(r.description_lines) ? r.description_lines : [];
    return {
      description_lines: lines.slice(0, 12).map((line) => cleanString(line, 300)).filter(Boolean),
      quantity: cleanNumber(r.quantity),
      rate: cleanNumber(r.rate),
      amount: cleanNumber(r.amount),
    };
  }).filter((row) => row.description_lines.length > 0);

  return {
    invoice_number: cleanString(parsed.invoice_number, 60),
    invoice_date: cleanString(parsed.invoice_date, 40),
    due_date: cleanString(parsed.due_date, 40),
    bill_to_raw: cleanString(parsed.bill_to_raw, 800),
    shipper_phone_raw: cleanString(parsed.shipper_phone_raw, 60),
    deliver_to_raw: cleanString(parsed.deliver_to_raw, 500),
    line_items,
    subtotal: cleanNumber(parsed.subtotal),
    discount: cleanNumber(parsed.discount),
    total: cleanNumber(parsed.total),
    paid_amount: cleanNumber(parsed.paid_amount),
    balance_due: cleanNumber(parsed.balance_due),
    red_paid_stamp_visible: parsed.red_paid_stamp_visible === true,
    extraction_confidence_notes: cleanString(parsed.extraction_confidence_notes, 2000),
  };
}

const USER_PROMPT = "Transcribe this invoice into the schema. Copy what is printed; apply no rules.";

async function readWithClaude(files: IncomingFile[]) {
  // Imported on demand so the OpenAI path never pays to load the SDK at boot.
  const { default: Anthropic } = await import("npm:@anthropic-ai/sdk@0.117.1");
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const content = [
    ...files.map((file) =>
      file.mediaType === "application/pdf"
        ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: file.data,
          },
        }
        : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.mediaType as "image/jpeg",
            data: file.data,
          },
        }
    ),
    { type: "text" as const, text: USER_PROMPT },
  ];

  const params = {
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    system: SPEC,
    output_config: { format: { type: "json_schema" as const, schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user" as const, content }],
  };

  // Server-side fallback keeps a classifier refusal from failing the read; if the
  // beta is not enabled for this org we just run the plain request instead.
  let message;
  try {
    message = await client.beta.messages.create({
      ...params,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as never);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/fallback|beta/i.test(msg)) throw err;
    console.warn("read-invoice: server-side fallback unavailable, retrying without it");
    message = await client.messages.create(params as never);
  }

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to read this document. Try a clearer photo of the invoice.");
  }

  const text = (message.content as Array<{ type: string; text?: string }>)
    .filter((block) => block.type === "text")
    .map((block) => block.text || "")
    .join("");
  if (!text.trim()) throw new Error("The model returned no transcription.");
  return JSON.parse(text) as Record<string, unknown>;
}

async function readWithOpenAI(files: IncomingFile[]) {
  // gpt-4o reads PDFs directly as a file part, and photos as an image part.
  const parts = files.map((file) =>
    file.mediaType === "application/pdf"
      ? {
        type: "file",
        file: { filename: "invoice.pdf", file_data: `data:application/pdf;base64,${file.data}` },
      }
      : {
        type: "image_url",
        image_url: { url: `data:${file.mediaType};base64,${file.data}`, detail: "high" },
      }
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      max_tokens: 4000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "invoice_transcription", strict: true, schema: OUTPUT_SCHEMA },
      },
      messages: [
        { role: "system", content: SPEC },
        { role: "user", content: [...parts, { type: "text", text: USER_PROMPT }] },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("read-invoice: OpenAI error", response.status, detail.slice(0, 500));
    throw new Error("The vision model could not be reached.");
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("The model returned no transcription.");
  return JSON.parse(text) as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Invoice reading is not configured" }, 500);
    }
    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return jsonResponse(
        { error: "No vision model key is set. Add ANTHROPIC_API_KEY to the Supabase function secrets." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin.from("profiles").select("is_admin,role").eq("id", user.id)
      .single();
    if (!profile || (!profile.is_admin && !["admin", "staff"].includes(profile.role))) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const limited = await enforceAiRateLimit(req, "admin-read-invoice", corsHeaders);
    if (limited) return limited;

    const body = await req.json();
    const rawFiles = Array.isArray(body?.files) ? body.files : [];
    if (rawFiles.length === 0) return jsonResponse({ error: "No invoice image was uploaded." }, 400);
    if (rawFiles.length > MAX_FILES) {
      return jsonResponse({ error: `Upload at most ${MAX_FILES} pages at a time.` }, 400);
    }

    let files: IncomingFile[];
    try {
      files = rawFiles.map(normaliseFile);
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : "Unreadable upload." }, 400);
    }

    const parsed = ANTHROPIC_API_KEY ? await readWithClaude(files) : await readWithOpenAI(files);

    return jsonResponse({
      extraction: normaliseExtraction(parsed),
      model: ANTHROPIC_API_KEY ? ANTHROPIC_MODEL : OPENAI_VISION_MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the invoice.";
    console.error("read-invoice failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
