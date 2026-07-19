import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// Deletes driver photographs 48 hours after a shipment's delivery code was
// verified and the delivery completed. Invoked hourly by pg_cron (see the
// driver-proofs-retention job created in 20260719_operations_upgrade.sql).
// Non-image audit data (who captured it, when, type, when/why deleted) is kept
// on the driver_proofs row forever.
//
// Auth: the caller must present the x-retention-secret header matching
// private.app_config('retention_secret'); verify_jwt is disabled for this
// function so the database scheduler can call it directly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retention-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RETENTION_HOURS = Number(Deno.env.get("PROOF_RETENTION_HOURS") || "48");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL is not available");
    const sql = postgres(dbUrl, { prepare: false });

    try {
      const secretRows = await sql`select value from private.app_config where key = 'retention_secret'`;
      const expected = secretRows[0]?.value;
      const presented = req.headers.get("x-retention-secret");
      if (!expected || !presented || presented !== expected) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Eligible: proofs of shipments whose delivery was completed with a
      // verified delivery code more than RETENTION_HOURS ago.
      const eligible = await sql`
        select p.id, p.storage_path
        from public.driver_proofs p
        join public.shipments s on s.id = p.shipment_id
        left join public.delivery_notes dn on dn.shipment_id = s.id and dn.status = 'completed'
        where p.deleted_at is null
          and s.status = 'Delivered'
          and coalesce(
                dn.delivered_at,
                nullif(s.metadata->'deliveryConfirmation'->>'deliveredAt', '')::timestamptz
              ) < now() - make_interval(hours => ${RETENTION_HOURS})
          and coalesce(dn.customer_code_verified,
                (s.metadata->'deliveryConfirmation'->>'codeVerified')::boolean, false)
        limit 200`;

      if (eligible.length === 0) {
        return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(supabaseUrl, serviceKey);

      const paths = eligible.map((row: { storage_path: string }) => row.storage_path).filter(Boolean);
      // Storage removal first; only rows whose file is gone get stamped.
      const { error: removeError } = await admin.storage.from("driver-proofs").remove(paths);
      if (removeError) console.error("storage removal:", removeError.message);

      const ids = eligible.map((row: { id: string }) => row.id);
      await sql`
        update public.driver_proofs
        set deleted_at = now(),
            deletion_reason = ${"auto_retention_" + RETENTION_HOURS + "h_after_verified_delivery"}
        where id = any(${ids})`;

      return new Response(JSON.stringify({ ok: true, deleted: ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      await sql.end();
    }
  } catch (err) {
    console.error("photo-retention error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
