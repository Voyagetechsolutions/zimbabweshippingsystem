import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Server-side AI rate limiting, shared by ai-chat and admin-zimmy.
// Limits are keyed by the authenticated user id when the JWT carries one
// (verify_jwt has already validated the signature), otherwise by caller IP —
// so restarting the app or clearing storage never resets a caller's quota.
// Counters live in public.ai_usage_events via the consume_ai_quota RPC
// (service-role only).
//
// Env overrides:
//   AI_RATE_SHORT_LIMIT / AI_RATE_SHORT_WINDOW_SECONDS / AI_RATE_DAILY_LIMIT
//   AI_ADMIN_RATE_SHORT_LIMIT / AI_ADMIN_RATE_SHORT_WINDOW_SECONDS / AI_ADMIN_RATE_DAILY_LIMIT

function jwtSub(authHeader: string | null): string | null {
  try {
    const token = (authHeader || "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    // The anon key is a valid JWT with no user; only real users have a sub.
    return typeof payload?.sub === "string" && payload.sub.length > 10 ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function enforceAiRateLimit(
  req: Request,
  scope: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) {
    console.error("rate limit: service credentials unavailable; allowing request");
    return null;
  }

  const isAdminScope = scope.startsWith("admin");
  const prefix = isAdminScope ? "AI_ADMIN_RATE" : "AI_RATE";
  const shortLimit = Number(Deno.env.get(`${prefix}_SHORT_LIMIT`) || (isAdminScope ? "20" : "8"));
  const shortWindow = Number(Deno.env.get(`${prefix}_SHORT_WINDOW_SECONDS`) || "60");
  const dailyLimit = Number(Deno.env.get(`${prefix}_DAILY_LIMIT`) || (isAdminScope ? "400" : "80"));

  const sub = jwtSub(req.headers.get("Authorization"));
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
  const identity = sub ? `user:${sub}` : `ip:${ip}`;

  try {
    const admin = createClient(url, key);
    const { data, error } = await admin.rpc("consume_ai_quota", {
      p_identity: identity,
      p_scope: scope,
      p_short_limit: shortLimit,
      p_short_seconds: shortWindow,
      p_daily_limit: dailyLimit,
    });
    if (error) {
      console.error("rate limit check failed:", error.message);
      return null;
    }
    if (data && data.allowed === false) {
      const wait = Math.max(5, Number(data.retryAfterSeconds || 60));
      const mins = Math.ceil(wait / 60);
      const when = mins <= 1 ? "in about a minute" : `in about ${mins} minutes`;
      return new Response(JSON.stringify({
        error: "rate_limited",
        reply: `I've answered quite a few questions in a row — please try again ${when}.`,
        retryAfterSeconds: wait,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(wait) },
      });
    }
  } catch (err) {
    console.error("rate limit error:", err);
  }
  return null;
}
