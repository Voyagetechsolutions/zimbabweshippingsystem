import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL") || "";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODERATION_PROMPT = `You are Zimmy, moderating customer reviews for Zimbabwe Shipping's public website.

Classify the review into exactly one sentiment:
- "positive": happy customer, praise, recommendation.
- "okay": mixed or neutral; some criticism but fair and mild overall.
- "negative": strongly unhappy, serious complaint, accusation (lost/stolen goods, scam claims, threats of legal action), abusive or offensive language, spam, or anything that would damage trust if shown publicly without the team responding first.

Rules:
- Judge the comment text first; use the star rating (1-5) as supporting signal.
- A low rating with a mild comment can still be "okay". A high rating with an abusive or accusatory comment is "negative".
- Reviews that name staff members negatively, contain profanity, phone numbers, or competitor advertising are "negative".

Return only JSON: {"sentiment": "positive" | "okay" | "negative", "reason": "one short sentence explaining the decision"}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Idempotent schema setup so moderation columns exist without a manual migration.
async function ensureSchema() {
  if (!SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is not available");
  const sql = postgres(SUPABASE_DB_URL, { prepare: false });
  try {
    await sql.unsafe(`
      alter table public.reviews add column if not exists moderation_status text not null default 'pending';
      alter table public.reviews add column if not exists moderation_sentiment text;
      alter table public.reviews add column if not exists moderated_at timestamptz;
      alter table public.reviews add column if not exists moderation_reason text;
      create index if not exists reviews_moderation_status_idx on public.reviews (moderation_status);

      -- Security fix (Supabase linter: security_definer_view). Recreate the
      -- legacy reviews_needing_attention view so it runs with the querying
      -- user's permissions and is not readable anonymously (it exposes
      -- customer names, emails and WhatsApp numbers from service_reviews).
      drop view if exists public.reviews_needing_attention;
      create view public.reviews_needing_attention
      with (security_invoker = on) as
      select
        id, created_at, first_name, last_name, email, whatsapp_number,
        booking_ease, communication_rating, customer_service_rating,
        delivery_on_time, goods_condition, overall_satisfaction,
        follow_up_answers, additional_feedback, liked_most, can_improve
      from public.service_reviews
      where needs_admin_attention = true
      order by created_at desc;
      revoke all on public.reviews_needing_attention from anon, public;
      grant select on public.reviews_needing_attention to authenticated;

      -- Only admins/staff may read customer feedback (it contains PII).
      -- The public Feedback form only inserts, so this breaks nothing.
      drop policy if exists "Allow authenticated select" on public.service_reviews;
      drop policy if exists "Admins can read service reviews" on public.service_reviews;
      create policy "Admins can read service reviews" on public.service_reviews
        for select to authenticated
        using (exists (
          select 1 from public.profiles
          where id = auth.uid() and (is_admin = true or role in ('admin', 'staff'))
        ));
    `);
  } finally {
    await sql.end();
  }
}

async function classifyReview(rating: number, comment: string): Promise<{ sentiment: string; reason: string }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 150,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content: `Star rating: ${rating}/5\nReview comment: ${comment || "(no comment)"}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI moderation failed: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  const sentiment = ["positive", "okay", "negative"].includes(parsed.sentiment) ? parsed.sentiment : "negative";
  const reason = String(parsed.reason || "No reason returned").slice(0, 300);
  return { sentiment, reason };
}

async function moderatePending(reviewId?: string) {
  const supabase = getAdminClient();
  let query = supabase
    .from("reviews")
    .select("id, rating, comment, user_id, created_at")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);
  if (reviewId) query = query.eq("id", reviewId);

  const { data: pending, error } = await query;
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  for (const review of pending || []) {
    let sentiment: string;
    let reason: string;
    try {
      ({ sentiment, reason } = await classifyReview(Number(review.rating || 0), String(review.comment || "")));
    } catch (classifyError) {
      console.error("Classification failed for review", review.id, classifyError);
      continue; // leave as pending so it can be retried
    }

    const status = sentiment === "negative" ? "flagged" : "published";
    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        moderation_status: status,
        moderation_sentiment: sentiment,
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", review.id);
    if (updateError) {
      console.error("Failed to update review", review.id, updateError.message);
      continue;
    }

    if (status === "flagged") {
      const snippet = String(review.comment || "").slice(0, 140);
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: SYSTEM_USER_ID,
        title: "Zimmy flagged a customer review",
        message: `${review.rating}/5 — "${snippet}" (${reason})`,
        type: "flagged_review",
        related_id: review.id,
        is_read: false,
      });
      if (notificationError) {
        console.error("Failed to create flagged review notification:", notificationError.message);
      }
    }

    results.push({ id: review.id, status, sentiment, reason });
  }

  return results;
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const admin = getAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin,role").eq("id", user.id).single();
  if (!profile || (!profile.is_admin && !["admin", "staff"].includes(profile.role))) return null;
  return user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "moderate");

    if (action === "setup") {
      await ensureSchema();
      return json({ ok: true, message: "Review moderation schema is ready." });
    }

    if (action === "moderate") {
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);
      const reviewId = typeof body?.reviewId === "string" ? body.reviewId : undefined;
      const results = await moderatePending(reviewId);
      return json({ ok: true, moderated: results.length, results });
    }

    if (action === "admin_update") {
      const adminUser = await requireAdmin(req);
      if (!adminUser) return json({ error: "Admin access required" }, 403);
      const reviewId = String(body?.reviewId || "");
      const status = String(body?.status || "");
      if (!reviewId || !["published", "hidden"].includes(status)) {
        return json({ error: "reviewId and a status of published or hidden are required" }, 400);
      }
      const supabase = getAdminClient();
      const { error } = await supabase
        .from("reviews")
        .update({
          moderation_status: status,
          moderation_reason: `Set to ${status} by admin`,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;
      return json({ ok: true, reviewId, status });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("moderate-review error:", err);
    return json({ error: "Something went wrong" }, 500);
  }
});
