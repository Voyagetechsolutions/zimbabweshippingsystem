import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("TWILIO_SANDBOX_WEBHOOK_SECRET") || "";

const HANDOFF_PATTERN = /\b(agent|human|person|representative|someone|staff member|real person|speak to staff|talk to staff)\b/i;
const RESUME_PATTERN = /\b(resume ai|zimmy can reply|bot can reply|back to ai)\b/i;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function twiml(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

function departmentFromUrl(url: URL): "general" | "bookings_uk" | "bookings_ie" | "finance" {
  const value = url.searchParams.get("department") || "general";
  return ["bookings_uk", "bookings_ie", "finance"].includes(value)
    ? value as "bookings_uk" | "bookings_ie" | "finance"
    : "general";
}

function cleanPhone(value: FormDataEntryValue | null): string {
  return String(value || "").replace(/^whatsapp:/, "").trim().slice(0, 40);
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  if (!WEBHOOK_SECRET || url.searchParams.get("key") !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const form = await req.formData();
    const from = cleanPhone(form.get("From"));
    const to = cleanPhone(form.get("To"));
    const messageSid = String(form.get("MessageSid") || "").slice(0, 80) || null;
    const customerName = String(form.get("ProfileName") || "").trim().slice(0, 160) || null;
    const message = String(form.get("Body") || "").trim().slice(0, 4000);
    const mediaCount = Math.max(0, Math.min(10, Number(form.get("NumMedia") || 0) || 0));

    if (!from || !to || (!message && mediaCount === 0)) return twiml();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingMessage } = messageSid
      ? await supabase.from("whatsapp_messages").select("id").eq("provider_message_sid", messageSid).maybeSingle()
      : { data: null };
    if (existingMessage) return twiml();

    const department = departmentFromUrl(url);
    const { data: conversation, error: conversationError } = await supabase
      .from("whatsapp_conversations")
      .upsert({
        provider: "twilio",
        external_customer_id: from,
        external_sender_id: to,
        department,
        customer_name: customerName,
        last_message_at: new Date().toISOString(),
      }, { onConflict: "provider,external_customer_id,external_sender_id", ignoreDuplicates: false })
      .select("id,status")
      .single();
    if (conversationError || !conversation) throw conversationError || new Error("Conversation was not created");

    const { error: inboundError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      provider_message_sid: messageSid,
      direction: "inbound",
      role: "user",
      body: message || `[Customer sent ${mediaCount} attachment${mediaCount === 1 ? "" : "s"}]`,
      media_count: mediaCount,
      raw_payload: {
        sms_status: String(form.get("SmsStatus") || ""),
        wa_id: String(form.get("WaId") || ""),
      },
    });
    if (inboundError) {
      if (inboundError.code === "23505") return twiml();
      throw inboundError;
    }

    if (HANDOFF_PATTERN.test(message)) {
      await supabase.from("whatsapp_conversations")
        .update({ status: "human_requested", last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);
      const reply = "Of course — I’ve paused Zimmy and marked this chat for a staff member. The office will reply here as soon as someone is available.";
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id, direction: "outbound", role: "assistant", body: reply,
      });
      return twiml(reply);
    }

    if (conversation.status !== "ai_active" && !RESUME_PATTERN.test(message)) return twiml();
    if (RESUME_PATTERN.test(message)) {
      await supabase.from("whatsapp_conversations").update({ status: "ai_active" }).eq("id", conversation.id);
    }

    const { data: recent } = await supabase.from("whatsapp_messages")
      .select("role,body")
      .eq("conversation_id", conversation.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(18);
    const messages = (recent || []).reverse().map((item: { role: string; body: string }) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.body,
    }));

    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, conversationId: `whatsapp:${conversation.id}` }),
    });
    if (!aiResponse.ok) {
      console.error("WhatsApp AI request failed", aiResponse.status, (await aiResponse.text()).slice(0, 500));
      throw new Error("AI request failed");
    }
    const ai = await aiResponse.json();
    const reply = String(ai?.reply || "Sorry, I couldn’t reply just now. Please try again shortly or ask for a staff member.")
      .trim().slice(0, 1500);

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      role: "assistant",
      body: reply,
      raw_payload: { intent: ai?.intent || null, booking_created: ai?.bookingCreated === true },
    });
    await supabase.from("whatsapp_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return twiml(reply);
  } catch (error) {
    console.error("twilio-whatsapp-webhook error", error);
    return twiml("Sorry, Zimmy is temporarily unavailable. Please try again shortly, or ask for a staff member.");
  }
});
