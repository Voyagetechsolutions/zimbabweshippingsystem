import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { enforceAiRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type ToolPlan = {
  reply?: string;
  intent?: string;
  tool?: string;
  parameters?: Record<string, unknown>;
};

const READ_TOOLS = new Set([
  "business_overview",
  "collection_plan",
  "tracking_lookup",
  "invoice_lookup",
  "delivery_note_lookup",
  "popular_requests",
]);

const WRITE_TOOLS = new Set([
  "create_collection_schedule",
  "update_collection_schedule",
  "update_invoice",
  "update_delivery_note",
]);

const PLANNER_PROMPT = `You are Admin Zimmy, the private operations assistant for Zimbabwe Shipping.
You help authorised staff analyse the business and operate schedules, pickups, invoices and delivery notes.

Choose exactly one allowlisted tool when data or an action is needed.
Read tools:
- business_overview: overall shipments, revenue, requests and statuses.
- collection_plan: schedules and booked pickups for a month, year, route or country. Use this for questions such as "May collections on the London route".
- tracking_lookup: a shipment by tracking number or customer reference.
- invoice_lookup: invoice summaries, outstanding, overdue or paid invoices.
- delivery_note_lookup: delivery-note status and notes.
- popular_requests: what customers ask Zimmy most often.

Write tools (always require confirmation; never claim they already happened):
- create_collection_schedule: route, pickup_date (YYYY-MM-DD), areas[], country.
- update_collection_schedule: schedule_id if known, otherwise route, plus pickup_date/areas/country.
- update_invoice: tracking_number or customer_reference, plus due_date, notes, payment_terms, currency or mark_paid.
- update_delivery_note: tracking_number or customer_reference, plus note and/or status.

Rules:
- Extract month and year from the request. The current date is supplied below.
- For any write request, state what will change and tell the user confirmation is required.
- Do not invent identifiers, totals, schedules, customers or actions.
- Keep replies concise and operational.

Return only JSON:
{"reply":"short response","intent":"snake_case","tool":"tool_name_or_none","parameters":{}}
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((message) =>
      (message?.role === "user" || message?.role === "assistant") &&
      typeof message?.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.replace(/\s+/g, " ").trim().slice(0, 2500),
    }))
    .filter((message) => message.content)
    .slice(-16);
}

function cleanString(value: unknown, maxLength = 300): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || null;
}

function parseJson(text: string): ToolPlan {
  try {
    return JSON.parse(text) as ToolPlan;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { reply: text, tool: "none", parameters: {} };
    try {
      return JSON.parse(match[0]) as ToolPlan;
    } catch {
      return { reply: text, tool: "none", parameters: {} };
    }
  }
}

async function planTool(history: ChatMessage[]): Promise<ToolPlan> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${PLANNER_PROMPT}\nCurrent date: ${new Date().toISOString()}` },
        ...history,
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI planner failed (${response.status})`);
  const data = await response.json();
  return parseJson(data.choices?.[0]?.message?.content || "{}");
}

async function summariseResult(question: string, tool: string, result: unknown): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 650,
      messages: [
        {
          role: "system",
          content: "You are Admin Zimmy. Answer the staff question from the supplied tool result only. Be concise, use bullets for operational lists, include references/tracking numbers when useful, and never invent missing data.",
        },
        { role: "user", content: `Question: ${question}\nTool: ${tool}\nResult: ${JSON.stringify(result)}` },
      ],
    }),
  });
  if (!response.ok) return `I found this data: ${JSON.stringify(result)}`;
  const data = await response.json();
  return cleanString(data.choices?.[0]?.message?.content, 4000) || "The requested data was found.";
}

function monthNumber(value: unknown): number | null {
  if (typeof value === "number" && value >= 1 && value <= 12) return value;
  const text = String(value || "").trim().toLowerCase();
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const index = months.findIndex((month) => month === text || month.startsWith(text.slice(0, 3)));
  return index >= 0 ? index + 1 : null;
}

function dateRange(parameters: Record<string, unknown>) {
  const month = monthNumber(parameters.month);
  const year = Number(parameters.year) || new Date().getFullYear();
  if (!month) return null;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 1));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

function parseCollectionDate(value: unknown): Date | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const ukDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalised = raw.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1");
  const parsed = isoDate
    ? new Date(`${isoDate}T12:00:00Z`)
    : ukDate
    ? new Date(`${ukDate[3]}-${ukDate[2].padStart(2, "0")}-${ukDate[1].padStart(2, "0")}T12:00:00Z`)
    : new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function metadataOf(shipment: any): Record<string, any> {
  return shipment?.metadata && typeof shipment.metadata === "object" ? shipment.metadata : {};
}

function senderOf(shipment: any) {
  const metadata = metadataOf(shipment);
  return metadata.sender || metadata.senderDetails || {};
}

function recipientOf(shipment: any) {
  const metadata = metadataOf(shipment);
  return metadata.recipient || metadata.recipientDetails || {};
}

function shipmentRoute(shipment: any): string {
  const metadata = metadataOf(shipment);
  return String(metadata.collection?.route || metadata.collectionRoute || senderOf(shipment).city || "Unassigned");
}

function shipmentItems(shipment: any): string {
  const metadata = metadataOf(shipment);
  const details = metadata.shipment || metadata.shipmentDetails || {};
  return String(details.description || details.category || details.specificItem || "Not specified");
}

function invoiceTotal(invoice: any): number {
  const subtotal = Array.isArray(invoice?.items)
    ? invoice.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
    : 0;
  const discounted = Math.max(0, subtotal - Number(invoice?.discount || 0));
  return discounted + discounted * (Number(invoice?.taxRate || 0) / 100);
}

function invoiceSummary(shipment: any) {
  const invoice = metadataOf(shipment).invoice || {};
  const total = invoiceTotal(invoice);
  const paidAmount = Array.isArray(invoice.payments)
    ? invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    : 0;
  const balance = Math.max(0, total - paidAmount);
  const overdue = Boolean(invoice.dueDate && new Date(invoice.dueDate) < new Date() && balance > 0);
  return {
    tracking_number: shipment.tracking_number,
    customer_reference: shipment.customer_reference,
    customer: senderOf(shipment).name || `${senderOf(shipment).firstName || ""} ${senderOf(shipment).lastName || ""}`.trim(),
    invoice_number: invoice.invoiceNumber || `INV-${shipment.customer_reference || shipment.tracking_number}`,
    currency: invoice.currency || "GBP",
    total,
    paid: paidAmount,
    balance,
    due_date: invoice.dueDate || null,
    status: balance <= 0 && total > 0 ? "paid" : paidAmount > 0 ? "partial" : overdue ? "overdue" : invoice.sentAt ? "sent" : "draft",
  };
}

async function executeReadTool(admin: any, tool: string, parameters: Record<string, unknown>) {
  if (tool === "business_overview") {
    const [shipmentsResult, paymentsResult, requestsResult, chatsResult] = await Promise.all([
      admin.from("shipments").select("id,status,created_at,metadata,tracking_number,customer_reference"),
      admin.from("payments").select("amount,currency,payment_status,created_at"),
      admin.from("customer_requests").select("id,status,request_type,created_at"),
      admin.from("zimmy_chat_events").select("id,intent,channel,created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);
    const shipments = shipmentsResult.data || [];
    const payments = paymentsResult.data || [];
    return {
      shipments: {
        total: shipments.length,
        by_status: shipments.reduce((acc: Record<string, number>, shipment: any) => {
          acc[shipment.status || "Unknown"] = (acc[shipment.status || "Unknown"] || 0) + 1;
          return acc;
        }, {}),
      },
      revenue_by_currency: payments.reduce((acc: Record<string, number>, payment: any) => {
        if (String(payment.payment_status).toLowerCase() === "completed" || String(payment.payment_status).toLowerCase() === "paid") {
          acc[payment.currency || "GBP"] = (acc[payment.currency || "GBP"] || 0) + Number(payment.amount || 0);
        }
        return acc;
      }, {}),
      customer_requests: {
        total: (requestsResult.data || []).length,
        new: (requestsResult.data || []).filter((request: any) => request.status === "New").length,
      },
      zimmy_chats_last_30_days: (chatsResult.data || []).length,
    };
  }

  if (tool === "collection_plan") {
    const range = dateRange(parameters);
    const route = cleanString(parameters.route, 120)?.toLowerCase() || null;
    const country = cleanString(parameters.country, 80)?.toLowerCase() || null;
    const { data: schedules, error } = await admin.from("collection_schedules").select("*").order("pickup_date", { ascending: true });
    if (error) throw error;
    const filteredSchedules = (schedules || []).filter((schedule: any) => {
      const parsedDate = parseCollectionDate(schedule.pickup_date);
      const date = parsedDate?.toISOString().slice(0, 10) || "";
      return (!range || (Boolean(date) && date >= range.start && date < range.end)) &&
        (!route || String(schedule.route || "").toLowerCase().includes(route)) &&
        (!country || String(schedule.country || "").toLowerCase().includes(country));
    });
    const scheduleIds = new Set(filteredSchedules.map((schedule: any) => schedule.id));
    const { data: shipments } = await admin.from("shipments").select("*").order("created_at", { ascending: false }).limit(1000);
    const pickups = (shipments || []).filter((shipment: any) => {
      const metadata = metadataOf(shipment);
      const rawCollectionDate = metadata.collection?.date || shipment.created_at || "";
      const collectionDate = parseCollectionDate(rawCollectionDate)?.toISOString().slice(0, 10) || String(rawCollectionDate).slice(0, 10);
      const routeMatches = !route || shipmentRoute(shipment).toLowerCase().includes(route);
      const dateMatches = !range || (collectionDate >= range.start && collectionDate < range.end);
      return scheduleIds.has(shipment.collection_schedule_id) || (routeMatches && dateMatches);
    }).map((shipment: any) => ({
      tracking_number: shipment.tracking_number,
      customer_reference: shipment.customer_reference,
      customer: senderOf(shipment).name || `${senderOf(shipment).firstName || ""} ${senderOf(shipment).lastName || ""}`.trim(),
      phone: senderOf(shipment).phone || null,
      collection_address: senderOf(shipment).address || shipment.origin,
      route: shipmentRoute(shipment),
      items: shipmentItems(shipment),
      status: shipment.status,
    }));
    return { schedules: filteredSchedules, pickup_count: pickups.length, pickups: pickups.slice(0, 150) };
  }

  if (tool === "popular_requests") {
    const days = Math.min(365, Math.max(1, Number(parameters.days) || 30));
    const { data, error } = await admin.from("zimmy_chat_events")
      .select("intent,channel,request_text,created_at")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const counts = (data || []).reduce((acc: Record<string, number>, event: any) => {
      acc[event.intent || "general"] = (acc[event.intent || "general"] || 0) + 1;
      return acc;
    }, {});
    return { days, total: (data || []).length, by_intent: counts, recent_examples: (data || []).slice(0, 15) };
  }

  const identifier = cleanString(parameters.tracking_number || parameters.customer_reference || parameters.search, 160);
  let query = admin.from("shipments").select("*").order("created_at", { ascending: false }).limit(250);
  if (parameters.tracking_number) query = query.eq("tracking_number", parameters.tracking_number);
  if (parameters.customer_reference) query = query.eq("customer_reference", parameters.customer_reference);
  const { data: shipmentRows, error } = await query;
  if (error) throw error;
  let shipments = shipmentRows || [];
  if (identifier && !parameters.tracking_number && !parameters.customer_reference) {
    const needle = identifier.toLowerCase();
    shipments = shipments.filter((shipment: any) =>
      String(shipment.tracking_number || "").toLowerCase().includes(needle) ||
      String(shipment.customer_reference || "").toLowerCase().includes(needle) ||
      String(senderOf(shipment).name || "").toLowerCase().includes(needle)
    );
  }

  if (tool === "tracking_lookup") {
    return shipments.slice(0, 20).map((shipment: any) => ({
      tracking_number: shipment.tracking_number,
      customer_reference: shipment.customer_reference,
      customer: senderOf(shipment).name || null,
      status: shipment.status,
      collection_status: shipment.collection_status,
      route: shipmentRoute(shipment),
      origin: shipment.origin,
      destination: shipment.destination,
      updated_at: shipment.updated_at,
    }));
  }
  if (tool === "invoice_lookup") {
    let invoices = shipments.map(invoiceSummary);
    const status = cleanString(parameters.status, 40)?.toLowerCase();
    if (status) invoices = invoices.filter((invoice: any) => invoice.status === status);
    return { count: invoices.length, invoices: invoices.slice(0, 150) };
  }
  if (tool === "delivery_note_lookup") {
    return shipments.slice(0, 150).map((shipment: any) => ({
      tracking_number: shipment.tracking_number,
      customer_reference: shipment.customer_reference,
      customer: senderOf(shipment).name || null,
      recipient: recipientOf(shipment).name || null,
      route: shipmentRoute(shipment),
      delivery_note_status: shipment.delivery_note_status || metadataOf(shipment).deliveryNote?.status || "Draft",
      note: typeof metadataOf(shipment).deliveryNote === "string"
        ? metadataOf(shipment).deliveryNote
        : metadataOf(shipment).deliveryNoteText || null,
    }));
  }
  return {};
}

function actionSummary(tool: string, parameters: Record<string, unknown>) {
  if (tool === "create_collection_schedule") {
    return `Create ${parameters.route || "a new"} collection schedule for ${parameters.pickup_date || "an unspecified date"}.`;
  }
  if (tool === "update_collection_schedule") {
    return `Update collection schedule ${parameters.schedule_id || parameters.route || "(not identified)"} with ${JSON.stringify(parameters)}.`;
  }
  if (tool === "update_invoice") {
    return `Update invoice for ${parameters.tracking_number || parameters.customer_reference || "(not identified)"} with ${JSON.stringify(parameters)}.`;
  }
  return `Update delivery note for ${parameters.tracking_number || parameters.customer_reference || "(not identified)"} with ${JSON.stringify(parameters)}.`;
}

async function findShipment(admin: any, parameters: Record<string, unknown>) {
  if (parameters.tracking_number) {
    const { data, error } = await admin.from("shipments").select("*").eq("tracking_number", parameters.tracking_number).single();
    if (error) throw error;
    return data;
  }
  if (parameters.customer_reference) {
    const { data, error } = await admin.from("shipments").select("*").eq("customer_reference", parameters.customer_reference).single();
    if (error) throw error;
    return data;
  }
  throw new Error("A tracking number or customer reference is required.");
}

async function executeWriteAction(admin: any, action: any) {
  const parameters = action.payload || {};
  if (action.action_type === "create_collection_schedule") {
    const route = cleanString(parameters.route, 120);
    const pickupDate = cleanString(parameters.pickup_date, 20);
    if (!route || !pickupDate) throw new Error("Route and pickup date are required.");
    const { data, error } = await admin.from("collection_schedules").insert({
      route,
      pickup_date: pickupDate,
      areas: Array.isArray(parameters.areas) ? parameters.areas.map((area: unknown) => cleanString(area, 100)).filter(Boolean) : [],
      country: cleanString(parameters.country, 80) || "United Kingdom",
    }).select("*").single();
    if (error) throw error;
    return data;
  }

  if (action.action_type === "update_collection_schedule") {
    let schedule: any = null;
    if (parameters.schedule_id) {
      const result = await admin.from("collection_schedules").select("*").eq("id", parameters.schedule_id).single();
      if (result.error) throw result.error;
      schedule = result.data;
    } else if (parameters.route) {
      const result = await admin.from("collection_schedules").select("*").ilike("route", `%${parameters.route}%`).limit(2);
      if (result.error) throw result.error;
      if ((result.data || []).length !== 1) throw new Error("The route is ambiguous. Ask for the exact schedule or date.");
      schedule = result.data[0];
    }
    if (!schedule) throw new Error("Collection schedule not found.");
    const patch: Record<string, unknown> = {};
    if (parameters.pickup_date) patch.pickup_date = cleanString(parameters.pickup_date, 20);
    if (parameters.country) patch.country = cleanString(parameters.country, 80);
    if (Array.isArray(parameters.areas)) patch.areas = parameters.areas.map((area: unknown) => cleanString(area, 100)).filter(Boolean);
    if (!Object.keys(patch).length) throw new Error("No supported schedule changes were supplied.");
    const { data, error } = await admin.from("collection_schedules").update(patch).eq("id", schedule.id).select("*").single();
    if (error) throw error;
    return data;
  }

  if (action.action_type === "update_invoice") {
    const shipment = await findShipment(admin, parameters);
    const metadata = metadataOf(shipment);
    const invoice = { ...(metadata.invoice || {}) };
    if (parameters.due_date) invoice.dueDate = cleanString(parameters.due_date, 20);
    if (parameters.notes !== undefined) invoice.notes = cleanString(parameters.notes, 1000) || "";
    if (parameters.payment_terms) invoice.paymentTerms = cleanString(parameters.payment_terms, 500);
    if (parameters.currency) invoice.currency = cleanString(parameters.currency, 10)?.toUpperCase();
    if (parameters.mark_paid === true) invoice.paid = true;
    const { data, error } = await admin.from("shipments")
      .update({ metadata: { ...metadata, invoice } })
      .eq("id", shipment.id)
      .select("id,tracking_number,customer_reference,metadata")
      .single();
    if (error) throw error;
    return data;
  }

  if (action.action_type === "update_delivery_note") {
    const shipment = await findShipment(admin, parameters);
    const metadata = metadataOf(shipment);
    const patch: Record<string, unknown> = {};
    if (parameters.status) patch.delivery_note_status = cleanString(parameters.status, 80);
    if (parameters.note !== undefined) patch.metadata = {
      ...metadata,
      deliveryNoteText: cleanString(parameters.note, 1000) || "",
    };
    const { data, error } = await admin.from("shipments").update(patch).eq("id", shipment.id)
      .select("id,tracking_number,customer_reference,delivery_note_status,metadata").single();
    if (error) throw error;
    return data;
  }
  throw new Error("Unsupported admin action.");
}

async function logAdminEvent(admin: any, userId: string, conversationId: string, intent: string, requestText: string, responseText: string, metadata: Record<string, unknown> = {}) {
  await admin.from("zimmy_chat_events").insert({
    conversation_id: conversationId,
    channel: "admin",
    user_id: userId,
    event_type: "admin_message",
    intent,
    request_text: requestText.slice(0, 1200),
    response_text: responseText.slice(0, 1800),
    metadata,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Admin Zimmy is not configured" }, 500);
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin.from("profiles").select("is_admin,role").eq("id", user.id).single();
    if (!profile || (!profile.is_admin && !["admin", "staff"].includes(profile.role))) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const limited = await enforceAiRateLimit(req, "admin-zimmy", corsHeaders);
    if (limited) return limited;

    const body = await req.json();
    const conversationId = cleanString(body?.conversationId, 120) || crypto.randomUUID();

    if (body?.confirmActionId) {
      const { data: action, error } = await admin.from("zimmy_admin_actions").select("*")
        .eq("id", body.confirmActionId).eq("requested_by", user.id).single();
      if (error || !action) return jsonResponse({ error: "Pending action not found" }, 404);
      if (action.status !== "pending") return jsonResponse({ error: `Action is already ${action.status}` }, 409);
      if (new Date(action.expires_at) < new Date()) {
        await admin.from("zimmy_admin_actions").update({ status: "expired" }).eq("id", action.id);
        return jsonResponse({ error: "This confirmation expired. Ask Zimmy to prepare it again." }, 410);
      }
      try {
        const result = await executeWriteAction(admin, action);
        await admin.from("zimmy_admin_actions").update({
          status: "executed",
          result,
          executed_at: new Date().toISOString(),
        }).eq("id", action.id);
        await admin.from("audit_logs").insert({
          user_id: user.id,
          action: `ZIMMY_${String(action.action_type).toUpperCase()}`,
          entity_type: "ZIMMY_ADMIN_ACTION",
          entity_id: action.id,
          details: { payload: action.payload, result },
        });
        const reply = `Done. ${action.summary}`;
        await logAdminEvent(admin, user.id, conversationId, action.action_type, "Confirmed pending action", reply, { actionId: action.id, executed: true });
        return jsonResponse({ reply, actionExecuted: true, result });
      } catch (executionError) {
        const message = executionError instanceof Error ? executionError.message : "Action failed";
        await admin.from("zimmy_admin_actions").update({ status: "failed", result: { error: message } }).eq("id", action.id);
        return jsonResponse({ error: message }, 400);
      }
    }

    const history = cleanMessages(body?.messages);
    if (!history.length) return jsonResponse({ reply: "Ask me about schedules, pickups, invoices, delivery notes, tracking or business performance." });
    const latestQuestion = [...history].reverse().find((message) => message.role === "user")?.content || "";
    const plan = await planTool(history);
    const tool = cleanString(plan.tool, 80) || "none";
    const parameters = plan.parameters && typeof plan.parameters === "object" ? plan.parameters : {};
    const intent = cleanString(plan.intent, 80) || tool;

    if (WRITE_TOOLS.has(tool)) {
      const summary = actionSummary(tool, parameters);
      const { data: pendingAction, error } = await admin.from("zimmy_admin_actions").insert({
        requested_by: user.id,
        action_type: tool,
        summary,
        payload: parameters,
      }).select("id,summary,expires_at").single();
      if (error) throw error;
      const reply = `${summary} Please review and confirm this action before I change the live system.`;
      await logAdminEvent(admin, user.id, conversationId, intent, latestQuestion, reply, { tool, pendingActionId: pendingAction.id });
      return jsonResponse({ reply, tool, requiresConfirmation: true, pendingAction });
    }

    if (READ_TOOLS.has(tool)) {
      const result = await executeReadTool(admin, tool, parameters);
      const reply = await summariseResult(latestQuestion, tool, result);
      await logAdminEvent(admin, user.id, conversationId, intent, latestQuestion, reply, { tool });
      return jsonResponse({ reply, tool, data: result });
    }

    const reply = cleanString(plan.reply, 1800) || "I can help with schedules, pickups, invoices, delivery notes, tracking and business analytics.";
    await logAdminEvent(admin, user.id, conversationId, intent, latestQuestion, reply, { tool: "none" });
    return jsonResponse({ reply, tool: "none" });
  } catch (error) {
    console.error("admin-zimmy error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
