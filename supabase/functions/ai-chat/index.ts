import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Zimmy, the friendly website assistant for Zimbabwe Shipping.

You help visitors with shipping from the UK and Ireland to Zimbabwe.

Conversation style:
- If the visitor says hi, greet them warmly and ask how you can help today.
- Sound natural and helpful, not like a menu.
- Keep replies short. Use one or two small paragraphs.
- Ask one question at a time when helping with a booking.
- Do not use emojis.
- Do not invent prices, dates, tracking numbers, or policies.
- If the customer needs a person, tell them to use WhatsApp or the Contact page.

Website actions:
- Booking/quote lead: if the visitor wants to book, proceed, get contacted, or ship something, collect their details in chat so a representative can confirm.
- Required before submitting a lead: customer name, at least one contact method (phone or email), and what they want to ship.
- Useful extra details: shipping from UK or Ireland, collection town/postcode/address, Zimbabwe destination city/address, quantity, size, and timing.
- Ask for only one missing detail at a time. Do not ask for every field in one message.
- Once the required details are present, tell them a representative will contact them to confirm collection, pricing, and next steps.
- Tracking: direct them to the Track page and ask for a tracking number if needed.
- Contact/human: direct them to the Contact page or WhatsApp.
- Custom quote: collect the same lead details in chat and submit them for representative follow-up.

Pricing basics:
All listed shipping prices include free collection, tracking, and professional handling.
Delivery is about 6 weeks for drums and 10-14 days for parcels.
Ask whether they are shipping from the UK or Ireland if the country matters.

Ireland prices in EUR:
- Drum, 200-220L: EUR 360 per drum
- Trunk or storage box: EUR 220
- Metal coded seal: EUR 7 per item
- Stove/cooker: EUR 325
- Washing machine: EUR 328
- Fridge: EUR 490-620 depending on size
- Sofa/lounge suite: EUR 1560
- Suitcase: EUR 200-230 depending on size

UK prices in GBP:
- Drum, 200-220L: GBP 280 per drum
- Boxes: GBP 180-280 depending on size
- Metal coded seal: GBP 5 per drum
- Stove/cooker: GBP 260
- Washing machine: GBP 300
- Fridge: GBP 450
- American fridge freezer: GBP 600
- Sofa/lounge suite: GBP 1500
- Suitcase: GBP 180-200 depending on size

For anything not listed, the team gives a custom quote.

Return only valid JSON, no markdown and no text outside JSON.
Use this shape:
{
  "reply": "short message to show the visitor",
  "lead": {
    "status": "not_started | collecting | ready",
    "name": string | null,
    "phone_number": string | null,
    "email": string | null,
    "origin": string | null,
    "collection_address": string | null,
    "destination": string | null,
    "shipment_items": string | null,
    "notes": string | null,
    "category": string | null
  },
  "should_submit_lead": boolean
}

Set should_submit_lead to true only when:
- The visitor wants to book, wants a quote, or wants a representative to contact them.
- name is known.
- at least phone_number or email is known.
- shipment_items is known.

If a lead was already submitted earlier in the conversation, set should_submit_lead to false.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LeadDetails = {
  status?: "not_started" | "collecting" | "ready";
  name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  origin?: string | null;
  collection_address?: string | null;
  destination?: string | null;
  shipment_items?: string | null;
  notes?: string | null;
  category?: string | null;
};

type AiStructuredResponse = {
  reply?: string;
  lead?: LeadDetails | null;
  should_submit_lead?: boolean;
};

function cleanMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((message) =>
      (message?.role === "user" || message?.role === "assistant") &&
      typeof message?.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000),
    }))
    .filter((message) => message.content)
    .slice(-20);
}

function cleanText(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || null;
}

function getSafeLead(input: unknown): LeadDetails {
  if (!input || typeof input !== "object") return {};

  const lead = input as LeadDetails;
  return {
    status: lead.status === "ready" || lead.status === "collecting" || lead.status === "not_started"
      ? lead.status
      : "not_started",
    name: cleanText(lead.name, 120),
    phone_number: cleanText(lead.phone_number, 80),
    email: cleanText(lead.email, 160),
    origin: cleanText(lead.origin, 160),
    collection_address: cleanText(lead.collection_address, 300),
    destination: cleanText(lead.destination, 220),
    shipment_items: cleanText(lead.shipment_items, 500),
    notes: cleanText(lead.notes, 700),
    category: cleanText(lead.category, 120),
  };
}

function hasRequiredLeadFields(lead: LeadDetails): boolean {
  return Boolean(lead.name && (lead.phone_number || lead.email) && lead.shipment_items);
}

function conversationAlreadySubmitted(history: ChatMessage[]): boolean {
  return history.some((message) =>
    message.role === "assistant" &&
    /representative will contact|details have been sent|booking request has been sent|request has been submitted/i
      .test(message.content)
  );
}

function parseAiResponse(text: string): AiStructuredResponse {
  try {
    return JSON.parse(text) as AiStructuredResponse;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { reply: text };

    try {
      return JSON.parse(jsonMatch[0]) as AiStructuredResponse;
    } catch {
      return { reply: text };
    }
  }
}

async function saveLead(lead: LeadDetails) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const contactLine = [
    lead.phone_number ? `Phone: ${lead.phone_number}` : null,
    lead.email ? `Email: ${lead.email}` : null,
  ].filter(Boolean).join(" | ");

  const details = [
    lead.shipment_items ? `Items: ${lead.shipment_items}` : null,
    lead.origin ? `From: ${lead.origin}` : null,
    lead.collection_address ? `Collection: ${lead.collection_address}` : null,
    lead.destination ? `Zimbabwe destination: ${lead.destination}` : null,
    contactLine || null,
    lead.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean).join("\n");

  const { data, error } = await supabase
    .from("custom_quotes")
    .insert({
      name: lead.name,
      email: lead.email,
      phone_number: lead.phone_number || `Email only: ${lead.email}`,
      description: details || lead.shipment_items || "AI booking lead",
      category: lead.category || "AI booking lead",
      specific_item: lead.shipment_items,
      status: "pending",
      sender_details: {
        source: "website_ai_chat",
        origin: lead.origin,
        collection_address: lead.collection_address,
      },
      recipient_details: {
        destination: lead.destination,
      },
      admin_notes: "Captured by Zimmy, the website AI assistant. A representative should contact the customer to confirm collection, pricing, and next steps.",
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: SYSTEM_USER_ID,
      title: "New AI Booking Lead",
      message: `${lead.name} wants to ship: ${lead.shipment_items}`,
      type: "custom_quote",
      related_id: data.id,
      is_read: false,
    });

  if (notificationError) {
    console.error("Failed to create AI lead notification:", notificationError.message);
  }

  return data.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const history = cleanMessages(body?.messages);

    if (!history.length) {
      return new Response(JSON.stringify({
        reply: "Hi! I'm Zimmy, the Zimbabwe Shipping assistant. How can I help you today?",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.45,
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawReply = data.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I did not catch that. Could you rephrase?";
    const structured = parseAiResponse(rawReply);
    const lead = getSafeLead(structured.lead);
    let reply = cleanText(structured.reply, 1200) ||
      "Sorry, I did not catch that. Could you rephrase?";
    let leadSubmitted = false;
    let leadId: string | null = null;

    if (
      structured.should_submit_lead === true &&
      !conversationAlreadySubmitted(history) &&
      hasRequiredLeadFields(lead)
    ) {
      try {
        leadId = await saveLead(lead);
        leadSubmitted = true;
        reply = "Thanks, I have the details I need. Your request has been submitted and a Zimbabwe Shipping representative will contact you to confirm collection, pricing, and next steps.";
      } catch (leadError) {
        console.error("Failed to save AI booking lead:", leadError);
        reply = "Thanks, I have the details I need. I could not submit them automatically right now, so please contact us on WhatsApp or the Contact page and a representative will confirm your booking.";
      }
    }

    return new Response(JSON.stringify({ reply, leadSubmitted, leadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
