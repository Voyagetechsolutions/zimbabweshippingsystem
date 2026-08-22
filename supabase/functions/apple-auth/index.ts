import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import {
  appleSubFromIdToken,
  exchangeAppleAuthorizationCode,
  getAppleConfig,
} from "../_shared/apple.ts";

// Captures the Apple refresh token at sign-in time so that account deletion can
// revoke it later, as Apple requires of every app offering Sign in with Apple.
//
// Why this function has to exist at all: the customer app uses the *native*
// Apple flow, where Supabase only ever sees the identity token. Supabase does
// not persist a provider refresh token for that flow, so there is nothing on the
// auth.identities row to revoke with. Apple's authorization code — the only
// thing that can be traded for a refresh token — is single-use and expires after
// five minutes, so it must be exchanged during sign-in and stored ourselves.
//
// Actions:
//   setup  – admin only; creates the apple_auth_tokens table and the deletion
//            bookkeeping column. Applied through SUPABASE_DB_URL because this
//            project must never run `supabase db push`.
//   link   – called by the app straight after a successful Apple sign-in.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SETUP_SQL = `
-- Apple refresh tokens, captured at sign-in so account deletion can revoke them.
-- Service-role only: RLS is on with no policies, so anon/authenticated see
-- nothing, and the table grants are revoked outright as a second lock.
create table if not exists public.apple_auth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apple_sub text,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apple_auth_tokens enable row level security;
revoke all on public.apple_auth_tokens from anon, authenticated;

comment on table public.apple_auth_tokens is
  'Apple refresh tokens for Sign in with Apple users. Read only by the service role, and only so process-account-deletion can call appleid.apple.com/auth/revoke on deletion. Cascades away with the auth user.';

-- Bookkeeping so an admin can prove revocation happened for App Review.
alter table public.account_deletion_requests
  add column if not exists apple_token_revoked_at timestamptz;
`;

async function ensureSchema() {
  if (!SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is not available");
  const sql = postgres(SUPABASE_DB_URL, { prepare: false });
  try {
    await sql.unsafe(SETUP_SQL);
  } finally {
    await sql.end();
  }
}

async function getRequestUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data.user) return null;
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "link");

    if (action === "setup") {
      const user = await getRequestUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: profile } = await getAdminClient()
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile || profile.role !== "admin") return json({ error: "Admin access required" }, 403);

      await ensureSchema();
      return json({ ok: true, message: "Apple auth token storage is ready." });
    }

    if (action === "link") {
      const user = await getRequestUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);

      const authorizationCode = typeof body?.authorizationCode === "string"
        ? body.authorizationCode.trim()
        : "";
      if (!authorizationCode) return json({ error: "authorizationCode is required" }, 400);

      // Nothing to store until the .p8 key exists. Report it as a non-failure so
      // a half-configured environment never blocks a customer from signing in.
      if (!getAppleConfig()) {
        console.warn("apple-auth: link skipped, Apple key material is not configured");
        return json({ ok: true, stored: false, reason: "not_configured" });
      }

      const tokens = await exchangeAppleAuthorizationCode(authorizationCode);
      if (!tokens.refresh_token) {
        console.error("apple-auth: Apple returned no refresh token");
        return json({ ok: true, stored: false, reason: "no_refresh_token" });
      }

      const { error } = await getAdminClient()
        .from("apple_auth_tokens")
        .upsert(
          {
            user_id: user.id,
            apple_sub: appleSubFromIdToken(tokens.id_token),
            refresh_token: tokens.refresh_token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw new Error(`Could not store Apple refresh token: ${error.message}`);

      return json({ ok: true, stored: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("apple-auth error:", error);
    return json({ error: (error as Error).message || "Apple auth request failed" }, 500);
  }
});
