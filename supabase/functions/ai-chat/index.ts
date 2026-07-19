import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { enforceAiRateLimit } from "../_shared/rateLimit.ts";

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

You help visitors with shipping from the UK and Ireland to Zimbabwe. Zimbabwe Shipping moves far more than drums: full household moves, appliances, furniture, boxes, suitcases, commercial goods and even vehicles. Never talk as if drums are the only service.

Conversation style:
- If the visitor says hi, greet them warmly and ask how you can help today.
- Sound natural and helpful, not like a menu.
- Keep replies short. Use one or two small paragraphs.
- Ask one question at a time when helping with a booking.
- Do not use emojis.
- Do not invent prices, dates, tracking numbers, or policies.
- If the customer needs a person, offer to take their details for a representative, or point them to WhatsApp or the Contact page.

Accuracy rules (very important):
- Answer only from this knowledge base and the LIVE OPERATIONS DATA. This information mirrors the website (Pricing, Services, FAQ, Shipping Guidelines, About pages) and is the single source of truth.
- Never simply agree with whatever the visitor suggests. If they ask whether we do something that is not covered here, do not say yes. Say you will have the team confirm, and offer to take their details so a representative can follow up.
- If a question is outside this knowledge, treat it as a lead: collect their name, contact and question, and submit it for the team.

About the company:
- Zimbabwe Shipping Services is a family-run business founded in 2011, originally as Bulawayo Shipping Services.
- The director and founder is Mr Tshakalisa Moyo ("Mr Moyo"). He started as a FedEx driver, built Telk Removals, and launched Zimbabwe Shipping in 2011. If someone asks who Tshakalisa or Mr Moyo is, explain this warmly.
- Since 2013 the company runs its own trucks in Zimbabwe, so goods stay in our hands from collection to delivery. The Ireland branch opened in 2025.
- If a visitor wants to speak to Mr Moyo or needs personal assistance, collect their name, contact details and what it is about, then submit the lead with category "speak_to_director". Tell them their message will reach the office and someone will contact them.
- Contact: +44 7584 100552 (phone and WhatsApp).

Catalogue - Ireland prices in EUR:
- Drum, 200-220L: EUR 360 per drum
- Trunk or storage box: EUR 220
- Metal coded seal: EUR 7 per item
- Stove/cooker: EUR 325
- Washing machine: EUR 328
- Fridge: EUR 490-620 depending on size
- Sofa/lounge suite: EUR 1560
- Suitcase: EUR 200-230 depending on size

Catalogue - UK prices in GBP:
- Drum, 200-220L: GBP 280 per drum
- Boxes: GBP 180-280 depending on size
- Metal coded seal: GBP 5 per drum
- Stove/cooker: GBP 260
- Washing machine: GBP 300
- Fridge: GBP 450
- American fridge freezer: GBP 600
- Sofa/lounge suite: GBP 1500
- Suitcase: GBP 180-200 depending on size

- Drums can also be bought from us if the customer does not have their own; the team confirms the drum price when booking.
- Cars and other vehicles, commercial cargo, machinery, and anything not listed above: the team prepares a custom quote. Collect the details as a lead.

Fees, timings and coverage:
- Shipping takes 6 to 8 weeks door to door. Parcels are quicker, around 10-14 days.
- Standard scheduled route collection is free in the UK and Ireland.
- Door-to-door collection (we come to your door outside the scheduled route service): GBP 25 in the UK, EUR 25 in Ireland.
- Delivery in Zimbabwe: 25 (GBP for UK shipments, EUR for Ireland shipments) per delivery address.
- Zimbabwe delivery coverage: we deliver to all major cities and towns, and NOT to rural areas, small villages, farms or growth points. Recipients outside covered areas collect from our depot or an agreed point in the nearest covered town. Depot collection in Harare, Bulawayo or Mutare is free.
- Covered cities: Harare, Bulawayo, Chitungwiza, Mutare, Epworth, Gweru, Kwekwe, Kadoma, Masvingo.
- Covered towns and urban centres: Chinhoyi, Victoria Falls, Hwange, Zvishavane, Bindura, Marondera, Chegutu, Beitbridge, Kariba, Chiredzi, Rusape, Plumtree, Ruwa, Norton, Redcliff, Gwanda, Lupane, Gokwe, Shurugwi, Mvuma, Chipinge, Karoi, Mashava, Triangle, Shamva.
- If the destination is on this list, delivery to the door is available at the standard delivery fee. If it is a village or rural area, explain the nearest-town option. If you are not sure whether a place is covered, do not guess either way: say the team will confirm and offer to take their details.
- When a visitor asks about several places at once, check each place against the covered lists one by one before answering; never lump places together. Every city and town named in the covered lists above IS covered.
- Customs, declarations and clearance are all handled by us and included in the cost. There is nothing extra for the customer to arrange for normal personal shipments.
- Scotland: collections from Scotland run only when there is enough demand to fill a route, so there is no fixed Scotland schedule. If a visitor is in Scotland, take their details as a lead so the team can add them to the next Scotland route and notify them when it is confirmed.

Discounts:
- Referral discount: refer someone who ships with us and get GBP 20 (UK) or EUR 20 (Ireland) off your next shipment. When a visitor mentions being referred or referring someone, capture the referrer's name in the notes so the discount is applied.
- Returning residents discount: Zimbabweans moving back home permanently get a discount on their shipment. Returning residents can book through Zimmy like anyone else; note "returning resident" in the booking or lead so the team applies the discount and advises on the extra customs paperwork for returning residents.

Payment options: card or bank transfer, cash on collection, or pay on arrival in Zimbabwe (20 percent premium on pay-on-arrival).

Website actions:
- Live schedules: use the supplied LIVE OPERATIONS DATA. Give the real route and pickup date; never invent one.
- Live tracking: if a tracking result is supplied, explain its status and last update. If it is not found, say so clearly.
- Full booking: when a visitor wants Zimmy to complete the booking, collect their name, WhatsApp number, origin country, full collection address, Zimbabwe destination, recipient name and phone, goods description, preferred collection date/route if known, and payment method.
- Before creating a booking, show a short summary and explicitly ask the visitor to confirm it. Set should_create_booking true only after the visitor clearly confirms that summary.
- Quote/representative lead: if they only want a quote or human follow-up, collect customer name, at least one contact method, and what they want to ship.
- Useful extra details: collection town/postcode, quantity, size, and timing.
- Ask for only one missing detail at a time. Do not ask for every field in one message.
- Once a quote lead is submitted, tell them a representative will contact them to confirm pricing and next steps.
- For tracking, ask for the tracking number if it has not been provided. Do not merely redirect when live tracking data is available.
- Contact/human: offer to capture their details as a lead, or direct them to the Contact page or WhatsApp.
- Custom quote: collect the same lead details in chat and submit them for representative follow-up.
- Lead category: set lead.category to the best fit: "custom_quote", "speak_to_director", "returning_resident", "referral", "scotland_route", or "general". Mention referrals or returning-resident status in notes too.
- The category is sticky: if the visitor asked to speak to Mr Moyo or the office at any point in the conversation, keep lead.category as "speak_to_director" even when they then explain what the topic is (a discount, a complaint, a partnership). Put the topic in notes.
- Always put the visitor's actual question or reason in lead.notes so the team knows why they are being contacted.

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
  "booking": {
    "name": string | null,
    "phone_number": string | null,
    "email": string | null,
    "origin_country": string | null,
    "collection_address": string | null,
    "destination": string | null,
    "recipient_name": string | null,
    "recipient_phone": string | null,
    "shipment_items": string | null,
    "requested_collection_date": string | null,
    "route": string | null,
    "payment_method": string | null
  },
  "intent": "general | pricing | schedule | tracking | booking | quote | human_support | prohibited_items | payment | delivery | catalogue | referral | returning_resident | speak_to_director | scotland_route",
  "should_submit_lead": boolean,
  "should_create_booking": boolean
}

Set should_submit_lead to true only when:
- The visitor wants to book, wants a quote, wants to reach Mr Moyo or the team, or wants a representative to contact them.
- name is known.
- at least phone_number or email is known.
- shipment_items is known, or (for speak_to_director, scotland_route, or general assistance leads) notes describe what they need.

Set should_create_booking to true only when:
- The visitor asked Zimmy to complete the booking, not only request a quote.
- Every booking field except email, requested_collection_date and route is known.
- You have already shown the full booking summary.
- The visitor explicitly confirmed that summary in their latest message.

Never set should_submit_lead and should_create_booking true together.
If a lead or booking was already completed earlier in the conversation, do not submit it again.`;

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

type BookingDetails = {
  name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  origin_country?: string | null;
  collection_address?: string | null;
  destination?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  shipment_items?: string | null;
  requested_collection_date?: string | null;
  route?: string | null;
  payment_method?: string | null;
};

type AiStructuredResponse = {
  reply?: string;
  lead?: LeadDetails | null;
  booking?: BookingDetails | null;
  intent?: string;
  should_submit_lead?: boolean;
  should_create_booking?: boolean;
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

function getSafeBooking(input: unknown): BookingDetails {
  if (!input || typeof input !== "object") return {};
  const booking = input as BookingDetails;
  return {
    name: cleanText(booking.name, 120),
    phone_number: cleanText(booking.phone_number, 80),
    email: cleanText(booking.email, 160),
    origin_country: cleanText(booking.origin_country, 80),
    collection_address: cleanText(booking.collection_address, 300),
    destination: cleanText(booking.destination, 220),
    recipient_name: cleanText(booking.recipient_name, 120),
    recipient_phone: cleanText(booking.recipient_phone, 80),
    shipment_items: cleanText(booking.shipment_items, 500),
    requested_collection_date: cleanText(booking.requested_collection_date, 40),
    route: cleanText(booking.route, 120),
    payment_method: cleanText(booking.payment_method, 80),
  };
}

function hasRequiredLeadFields(lead: LeadDetails): boolean {
  const hasContact = Boolean(lead.name && (lead.phone_number || lead.email));
  const supportCategories = new Set(["speak_to_director", "scotland_route", "general"]);
  if (supportCategories.has(String(lead.category || "").toLowerCase())) {
    return hasContact && Boolean(lead.shipment_items || lead.notes);
  }
  return hasContact && Boolean(lead.shipment_items);
}

function hasRequiredBookingFields(booking: BookingDetails): boolean {
  return Boolean(
    booking.name && booking.phone_number && booking.origin_country &&
    booking.collection_address && booking.destination && booking.recipient_name &&
    booking.recipient_phone && booking.shipment_items && booking.payment_method
  );
}

function conversationAlreadySubmitted(history: ChatMessage[]): boolean {
  return history.some((message) =>
    message.role === "assistant" &&
    /representative will contact|details have been sent|booking request has been sent|request has been submitted|passed your details to the office|on the list for the next Scotland route|request has been sent to the team/i
      .test(message.content)
  );
}

function conversationAlreadyBooked(history: ChatMessage[]): boolean {
  return history.some((message) =>
    message.role === "assistant" &&
    /booking is confirmed|customer reference is|tracking number is/i.test(message.content)
  );
}

function normaliseIntent(value: unknown): string {
  const allowed = new Set([
    "general", "pricing", "schedule", "tracking", "booking", "quote",
    "human_support", "prohibited_items", "payment", "delivery",
    "catalogue", "referral", "returning_resident", "speak_to_director", "scotland_route",
  ]);
  const cleaned = cleanText(value, 60)?.toLowerCase().replace(/\s+/g, "_") || "general";
  return allowed.has(cleaned) ? cleaned : "general";
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

function leadRequestType(category: string | null | undefined): string {
  const labels: Record<string, string> = {
    speak_to_director: "Speak to Mr Moyo",
    returning_resident: "Returning Resident",
    referral: "Referral Discount",
    scotland_route: "Scotland Route Waitlist",
    custom_quote: "Custom Quote",
  };
  return labels[String(category || "").toLowerCase()] || "AI Lead";
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

  const requestType = leadRequestType(lead.category);

  // Mirror the lead into customer_requests so it also surfaces in the
  // Zimmy AI operations centre alongside chat analytics.
  const { error: requestError } = await supabase
    .from("customer_requests")
    .insert({
      customer_name: lead.name,
      whatsapp_number: lead.phone_number || `Email only: ${lead.email}`,
      request_type: requestType,
      message: details || lead.shipment_items || "AI lead",
      status: "New",
      unread: true,
      source: "website_ai_chat",
    });

  if (requestError) {
    console.error("Failed to mirror AI lead into customer_requests:", requestError.message);
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: SYSTEM_USER_ID,
      title: `New Zimmy lead: ${requestType}`,
      message: `${lead.name} — ${lead.shipment_items || lead.notes || "needs follow-up"}`,
      type: "custom_quote",
      related_id: data.id,
      is_read: false,
    });

  if (notificationError) {
    console.error("Failed to create AI lead notification:", notificationError.message);
  }

  return data.id as string;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

type LiveOperations = {
  context: string;
  schedules: Array<Record<string, unknown>>;
  trackingNumber: string | null;
  tracking: unknown;
};

// Zimbabwe delivery coverage: major cities and towns only.
const COVERED_ZIM_PLACES = [
  "Harare", "Bulawayo", "Chitungwiza", "Mutare", "Epworth", "Gweru", "Kwekwe",
  "Kadoma", "Masvingo", "Chinhoyi", "Victoria Falls", "Hwange", "Zvishavane",
  "Bindura", "Marondera", "Chegutu", "Beitbridge", "Kariba", "Chiredzi",
  "Rusape", "Plumtree", "Ruwa", "Norton", "Redcliff", "Gwanda", "Lupane",
  "Gokwe", "Shurugwi", "Mvuma", "Chipinge", "Karoi", "Mashava", "Triangle",
  "Shamva",
];

function coverageCheckLine(latestUserText: string): string | null {
  const matches = COVERED_ZIM_PLACES.filter((place) =>
    new RegExp(`\\b${place.replace(/\s+/g, "\\s+")}\\b`, "i").test(latestUserText)
  );
  if (!matches.length) return null;
  return `Zimbabwe delivery coverage check for places named in the latest message: ${
    matches.map((place) => `${place} = COVERED (door delivery available)`).join("; ")
  }. Any other Zimbabwe place named is either not covered or must be confirmed by the team.`;
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

async function getLiveOperationsContext(history: ChatMessage[]): Promise<LiveOperations> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      context: "Live operations data is unavailable.",
      schedules: [],
      trackingNumber: null,
      tracking: null,
    };
  }

  const supabase = getAdminClient();
  const latestUserText = [...history].reverse().find((message) => message.role === "user")?.content || "";
  const trackingNumber = latestUserText.match(/\b(?:ZIMSHIP|ZSS|ZS)-?[A-Z0-9-]{4,}\b/i)?.[0] || null;

  const { data: schedules } = await supabase
    .from("collection_schedules")
    .select("id,route,pickup_date,areas,country")
    .limit(200);

  let tracking: unknown = null;
  if (trackingNumber) {
    const { data } = await supabase.rpc("get_shipment_tracking_info", { tracking_num: trackingNumber });
    tracking = data;
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const safeSchedules = ((schedules || []) as Array<Record<string, unknown>>)
    .filter((schedule) => {
      const date = parseCollectionDate(schedule.pickup_date);
      return date && date.getTime() >= startOfToday.getTime();
    })
    .sort((left, right) =>
      (parseCollectionDate(left.pickup_date)?.getTime() || 0) -
      (parseCollectionDate(right.pickup_date)?.getTime() || 0)
    )
    .slice(0, 30);
  const context = [
    "LIVE OPERATIONS DATA (authoritative; do not invent values):",
    `Upcoming collection schedules: ${JSON.stringify(safeSchedules)}`,
    trackingNumber
      ? `Tracking lookup for ${trackingNumber}: ${JSON.stringify(tracking || { found: false })}`
      : "Tracking lookup: no tracking number supplied in the latest message.",
    coverageCheckLine(latestUserText),
  ].filter(Boolean).join("\n");

  return { context, schedules: safeSchedules, trackingNumber, tracking };
}

function getDirectScheduleReply(
  latestUserText: string,
  schedules: Array<Record<string, unknown>>,
): string | null {
  if (!/(next\s+collection|collection\s+schedule|when.{0,30}collect|collection.{0,20}date)/i.test(latestUserText)) {
    return null;
  }

  const query = latestUserText.toLowerCase();
  const requestedLocation = query
    .match(/\b(?:from|for|in|route)\s+([a-z][a-z\s-]{2,40})/i)?.[1]
    ?.replace(/\b(?:is|on|please|next|collection|date|route)\b.*$/i, "")
    .trim() || "";
  const locationWords = requestedLocation.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
  const matchingSchedule = schedules.find((schedule) => {
    const candidates = [schedule.route, schedule.country]
      .concat(Array.isArray(schedule.areas) ? schedule.areas : [schedule.areas])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter((value) => value.length >= 3);
    return candidates.some((value) => {
      const candidateWords = value.split(/[^a-z0-9]+/).filter(Boolean);
      return query.includes(value) || locationWords.some((word) => candidateWords.includes(word));
    });
  });
  const schedule = matchingSchedule || (locationWords.length ? null : schedules[0]);

  if (!schedule) {
    const locationLabel = requestedLocation
      ? ` for ${requestedLocation.replace(/\b\w/g, (character) => character.toUpperCase())}`
      : "";
    return `There are no future collection dates${locationLabel} published at the moment. Please check back shortly, or tell me what you want to ship and I can help prepare your booking while the team confirms the date.`;
  }

  const pickupDate = String(schedule.pickup_date || "");
  const dateValue = parseCollectionDate(pickupDate);
  const parsedDate = dateValue
    ? dateValue.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    : pickupDate || "a date to be confirmed";
  const route = String(schedule.route || schedule.country || "the selected route");
  const areas = Array.isArray(schedule.areas)
    ? schedule.areas.map((area) => String(area)).filter(Boolean).join(", ")
    : String(schedule.areas || "");

  return `The next published collection for ${route} is ${parsedDate}${areas ? `, covering ${areas}` : ""}. Would you like me to start a booking for this collection?`;
}

function customerReferenceBase(booking: BookingDetails, shipmentDate: Date): string {
  const letters = String(booking.name || "CUS").replace(/[^a-z]/gi, "").toUpperCase();
  const prefix = (letters || "CUS").slice(0, 3).padEnd(3, "X");
  const phoneTail = String(booking.phone_number || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  const mmyy = `${String(shipmentDate.getMonth() + 1).padStart(2, "0")}${String(shipmentDate.getFullYear()).slice(-2)}`;
  return `${prefix}-${mmyy}-${phoneTail}`;
}

async function createAiBooking(booking: BookingDetails) {
  const supabase = getAdminClient();
  const { data: schedules } = await supabase
    .from("collection_schedules")
    .select("id,route,pickup_date,areas,country")
    .limit(200);

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const upcomingSchedules = (schedules || [])
    .filter((schedule: any) => {
      const date = parseCollectionDate(schedule.pickup_date);
      return date && date.getTime() >= startOfToday.getTime();
    })
    .sort((left: any, right: any) =>
      (parseCollectionDate(left.pickup_date)?.getTime() || 0) -
      (parseCollectionDate(right.pickup_date)?.getTime() || 0)
    );

  const searchText = `${booking.route || ""} ${booking.collection_address || ""}`.toLowerCase();
  const country = String(booking.origin_country || "").toLowerCase();
  const matchedSchedule = upcomingSchedules.find((schedule: any) => {
    const countryMatches = !country || String(schedule.country || "").toLowerCase().includes(country) ||
      (country.includes("uk") && String(schedule.country || "").toLowerCase().includes("united kingdom"));
    const routeMatches = searchText.includes(String(schedule.route || "").toLowerCase()) ||
      (Array.isArray(schedule.areas) && schedule.areas.some((area: string) => searchText.includes(area.toLowerCase())));
    return countryMatches && routeMatches;
  }) || upcomingSchedules.find((schedule: any) =>
    !country || String(schedule.country || "").toLowerCase().includes(country)
  ) || null;

  const requested = booking.requested_collection_date || matchedSchedule?.pickup_date;
  const shipmentDate = parseCollectionDate(requested) || new Date();
  const referenceBase = customerReferenceBase(booking, shipmentDate);
  const { count } = await supabase.from("shipments")
    .select("id", { count: "exact", head: true })
    .like("customer_reference", `${referenceBase}%`);
  const customerReference = count ? `${referenceBase}-${String(count + 1).padStart(2, "0")}` : referenceBase;
  const trackingNumber = `ZIMSHIP-${Math.floor(10000 + Math.random() * 90000)}`;
  const qrToken = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const nameParts = String(booking.name).trim().split(/\s+/);
  const firstName = nameParts.shift() || "Customer";
  const lastName = nameParts.join(" ");
  const route = booking.route || matchedSchedule?.route || "To be assigned";
  const collectionDate = requested || "To be confirmed";

  const invoice = {
    invoiceNumber: `INV-${customerReference}`,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    items: [{ description: booking.shipment_items, quantity: 1, unitPrice: 0 }],
    discount: 0,
    taxRate: 0,
    paymentTerms: booking.payment_method,
    notes: "Price to be confirmed by the Zimbabwe Shipping team.",
    currency: country.includes("ireland") ? "EUR" : "GBP",
    paid: false,
    payments: [],
    sentAt: null,
  };

  const shipmentRecord: Record<string, unknown> = {
    tracking_number: trackingNumber,
    status: "Booking Confirmed",
    origin: `${booking.origin_country}: ${booking.collection_address}`,
    destination: booking.destination,
    user_id: null,
    customer_reference: customerReference,
    qr_token: qrToken,
    collection_status: "Awaiting Collection",
    delivery_note_status: "Draft",
    metadata: {
      source: "website_ai_chat",
      customerReference,
      qrToken,
      sender: {
        firstName,
        lastName,
        name: booking.name,
        email: booking.email,
        phone: booking.phone_number,
        address: booking.collection_address,
        country: booking.origin_country,
      },
      recipient: {
        name: booking.recipient_name,
        phone: booking.recipient_phone,
        address: booking.destination,
      },
      shipment: { description: booking.shipment_items, includeOtherItems: true },
      shipmentDetails: { description: booking.shipment_items, includeOtherItems: true },
      collection: { route, date: collectionDate, scheduleId: matchedSchedule?.id || null },
      pricing: { paymentMethod: booking.payment_method, currency: invoice.currency },
      invoice,
      deliveryNote: { status: "Draft", number: `DN-${customerReference}` },
    },
  };
  if (matchedSchedule?.id) shipmentRecord.collection_schedule_id = matchedSchedule.id;

  const { data: shipment, error } = await supabase.from("shipments")
    .insert(shipmentRecord)
    .select("id,tracking_number,customer_reference")
    .single();
  if (error) throw error;

  await supabase.from("customer_requests").insert({
    shipment_id: shipment.id,
    customer_name: booking.name,
    whatsapp_number: booking.phone_number,
    request_type: "AI Booking",
    message: booking.shipment_items,
    customer_reference: customerReference,
    status: "New",
    unread: true,
    source: "website_ai_chat",
  });

  const botUrl = Deno.env.get("WHATSAPP_BOT_URL");
  const botKey = Deno.env.get("WHATSAPP_BOT_API_KEY");
  if (botUrl && botKey && booking.phone_number) {
    try {
      await fetch(`${botUrl.replace(/\/$/, "")}/send-booking-confirmation`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": botKey },
        body: JSON.stringify({
          phone_number: booking.phone_number,
          customer_reference: customerReference,
          tracking_number: trackingNumber,
          qr_token: qrToken,
          collection_date: collectionDate,
          collection_address: booking.collection_address,
          payment_method: booking.payment_method,
        }),
      });
    } catch (notificationError) {
      console.error("AI booking WhatsApp confirmation failed:", notificationError);
    }
  }

  return { shipmentId: shipment.id, trackingNumber, customerReference, collectionDate, route };
}

async function logChatEvent(input: {
  conversationId: string;
  intent: string;
  requestText: string;
  responseText: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const redactAnalyticsText = (value: unknown, maxLength: number) =>
      (cleanText(value, maxLength) || "")
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
        .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "[phone redacted]");
    const supabase = getAdminClient();
    await supabase.from("zimmy_chat_events").insert({
      conversation_id: cleanText(input.conversationId, 120) || crypto.randomUUID(),
      channel: "website",
      event_type: "message",
      intent: input.intent,
      request_text: redactAnalyticsText(input.requestText, 1200),
      response_text: redactAnalyticsText(input.responseText, 1600),
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Failed to log Zimmy chat event:", error);
  }
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

    const limited = await enforceAiRateLimit(req, "ai-chat", corsHeaders);
    if (limited) return limited;

    const body = await req.json();
    const history = cleanMessages(body?.messages);
    const conversationId = cleanText(body?.conversationId, 120) || crypto.randomUUID();

    if (!history.length) {
      return new Response(JSON.stringify({
        reply: "Hi! I'm Zimmy, the Zimbabwe Shipping assistant. How can I help you today?",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const liveOperations = await getLiveOperationsContext(history);
    const latestRequest = [...history].reverse().find((message) => message.role === "user")?.content || "";
    const directScheduleReply = getDirectScheduleReply(latestRequest, liveOperations.schedules);

    if (directScheduleReply) {
      await logChatEvent({
        conversationId,
        intent: "collection_schedule",
        requestText: latestRequest,
        responseText: directScheduleReply,
        metadata: { liveScheduleCount: liveOperations.schedules.length },
      });
      return new Response(JSON.stringify({
        reply: directScheduleReply,
        intent: "collection_schedule",
        leadSubmitted: false,
        bookingCreated: false,
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
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: liveOperations.context },
          ...history,
        ],
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
    const booking = getSafeBooking(structured.booking);
    const intent = normaliseIntent(structured.intent);
    let reply = cleanText(structured.reply, 1200) ||
      "Sorry, I did not catch that. Could you rephrase?";
    let leadSubmitted = false;
    let leadId: string | null = null;
    let bookingCreated = false;
    let bookingResult: Awaited<ReturnType<typeof createAiBooking>> | null = null;

    if (
      structured.should_create_booking === true &&
      !conversationAlreadyBooked(history) &&
      hasRequiredBookingFields(booking)
    ) {
      try {
        bookingResult = await createAiBooking(booking);
        bookingCreated = true;
        reply = `Your booking is confirmed. Customer reference: ${bookingResult.customerReference}. Tracking number: ${bookingResult.trackingNumber}. Collection: ${bookingResult.route} on ${bookingResult.collectionDate}. I have also sent the booking QR code to your WhatsApp number.`;
      } catch (bookingError) {
        console.error("Failed to create AI booking:", bookingError);
        reply = "I have all your booking details, but I could not create the booking right now. Please try again shortly or ask me to send the request to a representative.";
      }
    }

    if (
      !bookingCreated &&
      structured.should_submit_lead === true &&
      !conversationAlreadySubmitted(history) &&
      hasRequiredLeadFields(lead)
    ) {
      try {
        leadId = await saveLead(lead);
        leadSubmitted = true;
        const category = String(lead.category || "").toLowerCase();
        reply = category === "speak_to_director"
          ? "Thanks, I have passed your details to the office. Mr Moyo's team will be in touch with you shortly."
          : category === "scotland_route"
          ? "Thanks, you are on the list for the next Scotland route. The team will contact you as soon as a collection date for Scotland is confirmed."
          : lead.shipment_items
          ? "Thanks, I have the details I need. Your request has been submitted and a Zimbabwe Shipping representative will contact you to confirm collection, pricing, and next steps."
          : "Thanks, your request has been sent to the team and a Zimbabwe Shipping representative will contact you about it shortly.";
      } catch (leadError) {
        console.error("Failed to save AI booking lead:", leadError);
        reply = "Thanks, I have the details I need. I could not submit them automatically right now, so please contact us on WhatsApp or the Contact page and a representative will confirm your booking.";
      }
    }

    await logChatEvent({
      conversationId,
      intent: bookingCreated ? "booking" : intent,
      requestText: latestRequest,
      responseText: reply,
      metadata: {
        leadSubmitted,
        leadId,
        bookingCreated,
        shipmentId: bookingResult?.shipmentId || null,
        customerReference: bookingResult?.customerReference || null,
      },
    });

    return new Response(JSON.stringify({
      reply,
      intent,
      leadSubmitted,
      leadId,
      bookingCreated,
      booking: bookingResult,
    }), {
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
