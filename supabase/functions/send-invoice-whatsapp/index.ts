import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ── Config (set these as Supabase Edge Function secrets) ──────────────────────
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
// WhatsApp sender numbers, in Twilio format e.g. "whatsapp:+14155238886".
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";
const TWILIO_WHATSAPP_FROM_UK = Deno.env.get("TWILIO_WHATSAPP_FROM_UK") || "";
// Optional: Content SID (HX...) of an approved WhatsApp template with a document
// header. When set, messages send via the template (no 24-hour window limit).
const TWILIO_WHATSAPP_INVOICE_CONTENT_SID = Deno.env.get("TWILIO_WHATSAPP_INVOICE_CONTENT_SID") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STORAGE_BUCKET = "images"; // existing public bucket

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Country dialling codes, used to turn a local booking number into E.164.
const DIAL_CODES: Record<string, string> = {
  Ireland: "353",
  "Northern Ireland": "44",
  England: "44",
  UK: "44",
  "United Kingdom": "44",
  Scotland: "44",
  Wales: "44",
  Zimbabwe: "263",
};

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland", "UK", "United Kingdom"]);

// Turn a raw phone + country into Twilio WhatsApp format: "whatsapp:+<E164>".
function toWhatsAppNumber(phone: string, country?: string): string | null {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return `whatsapp:${trimmed.replace(/[^\d+]/g, "")}`;
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  const code = (country && DIAL_CODES[country]) || "";
  if (code) {
    // Already prefixed with the country code?
    if (digits.startsWith(code)) return `whatsapp:+${digits}`;
    digits = digits.replace(/^0+/, ""); // strip local trunk zero
    return `whatsapp:+${code}${digits}`;
  }
  // No country mapping — assume the number is already in full international form.
  return `whatsapp:+${digits}`;
}

interface WhatsAppRequest {
  to: string;            // raw booking phone
  country?: string;      // sender country, for dialling code
  customerName: string;
  invoiceNumber: string;
  pdfBase64: string;
  status?: "paid" | "partial" | "unpaid";
  total?: string;        // formatted, e.g. "€120.00"
  amountDue?: string;
  dueDate?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body: WhatsAppRequest = await req.json();
    const { to, country, customerName, invoiceNumber, pdfBase64, total, amountDue, dueDate } = body;
    const status = body.status || "unpaid";

    if (!to || !customerName || !invoiceNumber || !pdfBase64) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return json({ error: "WhatsApp not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN." }, 500);
    }

    const fromNumber = (country && UK_COUNTRIES.has(country) && TWILIO_WHATSAPP_FROM_UK)
      ? TWILIO_WHATSAPP_FROM_UK
      : TWILIO_WHATSAPP_FROM;
    if (!fromNumber) {
      return json({ error: "No WhatsApp sender number configured (TWILIO_WHATSAPP_FROM)." }, 500);
    }

    const toNumber = toWhatsAppNumber(to, country);
    if (!toNumber) {
      return json({ error: `Could not build a WhatsApp number from "${to}".` }, 400);
    }

    // 1) Upload the PDF to public storage so WhatsApp/Twilio can fetch it by URL.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const path = `invoices/${invoiceNumber.replace(/[^\w.-]/g, "_")}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      return json({ error: `Could not store invoice PDF: ${uploadError.message}` }, 500);
    }
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const mediaUrl = pub.publicUrl;

    // 2) Send via Twilio REST API (form-encoded, Basic auth).
    const params = new URLSearchParams();
    params.set("To", toNumber);
    params.set("From", fromNumber);

    if (TWILIO_WHATSAPP_INVOICE_CONTENT_SID) {
      // Template mode — works outside the 24h window.
      // Variables: {{1}} name, {{2}} invoice #, {{3}} amount due, {{4}} due date.
      params.set("ContentSid", TWILIO_WHATSAPP_INVOICE_CONTENT_SID);
      params.set("ContentVariables", JSON.stringify({
        "1": customerName,
        "2": invoiceNumber,
        "3": amountDue || total || "",
        "4": dueDate || "",
      }));
      // Document header media for the template.
      params.set("MediaUrl", mediaUrl);
    } else {
      // Free-form mode — only delivered if within the 24h customer-service window.
      const dueLine = status === "paid"
        ? "This invoice is paid in full. Thank you!"
        : `Amount due: ${amountDue || total || ""}${dueDate ? ` by ${dueDate}` : ""}.`;
      params.set(
        "Body",
        `Hi ${customerName}, here is your invoice ${invoiceNumber} from Zimbabwe Shipping.\n${dueLine}\nYour invoice PDF is attached.`,
      );
      params.set("MediaUrl", mediaUrl);
    }

    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const result = await twilioResp.json();
    if (!twilioResp.ok) {
      // Twilio error 63016 = message sent outside the allowed window (need a template).
      console.error("Twilio send error:", result);
      const hint = result?.code === 63016
        ? " (The customer hasn't messaged in 24h — an approved WhatsApp template is required to send now.)"
        : "";
      return json({ error: `${result?.message || "WhatsApp send failed"}${hint}`, code: result?.code }, 502);
    }

    console.log("WhatsApp invoice sent:", result.sid, "->", toNumber);
    return json({ success: true, sid: result.sid, to: toNumber });
  } catch (error) {
    console.error("send-invoice-whatsapp error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
