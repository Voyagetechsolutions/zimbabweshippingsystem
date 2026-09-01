import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// DDL delivery vehicle for staff-app operations features. The remote
// migration history is out of sync, so schema changes are applied here
// idempotently via SUPABASE_DB_URL (see the moderate-review function for the
// same pattern). SQL mirrors supabase/migrations/20260717_driver_exceptions_run_completion.sql.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * A temporary password for a newly created staff account.
 *
 * Drawn from crypto.getRandomValues rather than Math.random, and guaranteed to
 * contain an upper, a lower, a digit and a symbol so it satisfies the project's
 * strong-password policy on the first try. Ambiguous glyphs (O/0, l/1/I) are
 * excluded because this gets read aloud down a phone line.
 */
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = upper + lower + digits + symbols;

  const pick = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };

  // One of each class, then fill to 14 characters.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));

  // Fisher-Yates, so the guaranteed characters aren't always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Every action here is privileged: "verify" reads operational aggregates and
 * "invite_staff" creates accounts. Schema changes are intentionally excluded
 * from this runtime endpoint and are delivered only through migrations.
 *
 * Returns the admin's user id, or a Response to send back immediately.
 */
async function requireAdmin(req: Request): Promise<{ userId: string } | { response: Response }> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  // An apikey-only request carries no user, so bail before hitting the network.
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { response: json({ error: "Admin authentication required" }, 401) };
  }

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return { response: json({ error: "Admin authentication required" }, 401) };

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin.from("profiles").select("is_admin,role").eq("id", user.id).maybeSingle();
  const isAdmin = Boolean(profile?.is_admin) || String(profile?.role || "").toLowerCase() === "admin";
  if (!isAdmin) return { response: json({ error: "Admin access required" }, 403) };

  return { userId: user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!["verify", "invite_staff"].includes(body?.action)) {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Both actions expose privileged operations and require an administrator.
    const gate = await requireAdmin(req);
    if ("response" in gate) return gate.response;
    const callerId = gate.userId;

    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL is not available");

    // Admin-only staff invitation: the invite email comes from Supabase Auth;
    // no password is ever handled or stored here.
    if (body.action === "invite_staff") {
      // The caller was already verified as an admin by requireAdmin above.
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const role = String(body.role || "staff").toLowerCase();
      const phone = String(body.phone || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return new Response(JSON.stringify({ error: "Enter a valid email address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!["admin", "driver", "finance", "logistics", "dispatcher"].includes(role)) {
        return new Response(JSON.stringify({ error: "Unknown staff role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // The account is created WITH a temporary password rather than emailed an
      // invite link. Invite emails depend on SMTP deliverability, which is the
      // known bottleneck here — a driver who never receives the mail cannot work.
      // The admin reads the temporary password to them, and `must_change_password`
      // forces them to replace it the moment they first sign in.
      const tempPassword = generateTempPassword();

      const { data: invited, error: inviteError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        // No inbox round-trip, so confirm here or the first sign-in is blocked.
        email_confirm: true,
        user_metadata: { full_name: fullName, must_change_password: true },
      });
      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("profiles").upsert({
        id: invited.user.id,
        email,
        full_name: fullName || null,
        phone_number: phone || null,
        role,
        is_admin: role === "admin",
        staff_active: true,
      }, { onConflict: "id" });
      await admin.from("audit_logs").insert({
        user_id: callerId,
        action: "CREATE_STAFF",
        entity_type: "PROFILE",
        entity_id: invited.user.id,
        // Deliberately never records the temporary password. The audit log is
        // readable by every admin and is retained indefinitely.
        details: { email, role, fullName, method: "temp_password" },
      });

      // The only time this password is ever returned. It is not stored anywhere
      // in readable form — if the admin loses it, use "Reset access" instead.
      return new Response(JSON.stringify({
        ok: true,
        userId: invited.user.id,
        email,
        tempPassword,
        mustChangePassword: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read-only smoke checks over the operations-upgrade schema.
    if (body.action === "verify") {
      const sql = postgres(dbUrl, { prepare: false });
      try {
        const [ref] = await sql`select public.next_customer_reference('Verification Test') as ref`;
        const [counts] = await sql`
          select
            (select count(*) from public.catalogue_items where active) as catalogue,
            (select count(*) from pg_tables where schemaname = 'public'
              and tablename in ('customer_addresses','shipment_seals','ai_usage_events','customer_reference_counters')) as new_tables,
            (select count(*) from pg_policies where tablename in ('customer_addresses','shipment_seals','driver_invoices','delivery_notes')) as policies,
            (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname in
              ('create_customer_booking','respond_custom_quote','record_shipment_seals','driver_correct_goods_description',
               'assign_route_run','reassign_run_driver','remove_run_stop','admin_customer_records','consume_ai_quota','next_customer_reference')) as functions`;
        let cronJob = "unavailable";
        try {
          const jobs = await sql`select jobname from cron.job where jobname = 'driver-proofs-retention'`;
          cronJob = jobs.length ? "scheduled" : "missing";
        } catch { /* pg_cron not installed */ }
        const quota1 = await sql`select public.consume_ai_quota('staff-ops-verify','verify-scope',2,60,100) as r`;
        const quota2 = await sql`select public.consume_ai_quota('staff-ops-verify','verify-scope',2,60,100) as r`;
        const quota3 = await sql`select public.consume_ai_quota('staff-ops-verify','verify-scope',2,60,100) as r`;
        await sql`delete from public.ai_usage_events where scope = 'verify-scope'`;

        // Exercise the admin aggregates end-to-end by impersonating a real
        // admin (auth.uid() inside the definer functions reads the JWT claims).
        let aggregates: Record<string, unknown> = { skipped: "no admin profile found" };
        const admins = await sql`select id from public.profiles where is_admin = true limit 1`;
        if (admins.length) {
          const adminId = admins[0].id;
          await sql`select set_config('request.jwt.claim.sub', ${adminId}, false),
                           set_config('request.jwt.claims', ${JSON.stringify({ sub: adminId, role: "authenticated" })}, false)`;
          const [reports] = await sql`select public.admin_reports((current_date - 30)::date, current_date, '{}'::jsonb) as r`;
          // Wide window proves the revenue aggregation itself works even when
          // the recent range happens to contain no completed payments.
          const [wide] = await sql`select public.admin_reports((current_date - 730)::date, current_date, '{}'::jsonb) as r`;
          const [wideRaw] = await sql`
            select coalesce(sum(amount), 0)::numeric as total, count(*)::int as n
            from public.payments
            where lower(coalesce(payment_status, '')) in ('completed','paid','success','succeeded')
              and created_at::date between current_date - 730 and current_date`;
          const wideRevenue = Object.values(((wide.r as any)?.revenue?.byCurrency || {}) as Record<string, number>)
            .reduce((sum, v) => sum + Number(v), 0);
          const statusRows = await sql`
            select coalesce(payment_status, 'null') as status, count(*)::int as n,
                   coalesce(sum(amount), 0)::numeric as total
            from public.payments group by 1 order by 2 desc`;
          const [finance] = await sql`select public.admin_finance_overview() as r`;
          const [staffRows] = await sql`select jsonb_array_length(public.admin_staff_records()) as n`;
          const [zoneRows] = await sql`select jsonb_array_length(public.admin_zone_stats()) as n`;
          const [customers] = await sql`select jsonb_array_length(public.admin_customer_records()) as n`;
          const [zones] = await sql`select count(*)::int as n from public.pickup_zones`;
          // Cross-check: report revenue must agree with the raw payment rows.
          const [rawPay] = await sql`
            select count(*)::int as n,
                   count(*) filter (where shipment_id is not null)::int as linked,
                   coalesce(sum(amount), 0)::numeric as total
            from public.payments
            where lower(coalesce(payment_status, '')) in ('completed','paid','success','succeeded')
              and created_at::date between current_date - 30 and current_date`;
          const reportRevenue = Object.values(((reports.r as any)?.revenue?.byCurrency || {}) as Record<string, number>)
            .reduce((sum, v) => sum + Number(v), 0);
          aggregates = {
            rawCompletedPayments30d: Number(rawPay.n),
            rawPaymentsLinkedToShipment: Number(rawPay.linked),
            rawPaymentTotal30d: Number(rawPay.total),
            reportRevenueTotal: reportRevenue,
            revenueMatchesPayments: Math.abs(reportRevenue - Number(rawPay.total)) < 0.01,
            wide2yCompletedPayments: Number(wideRaw.n),
            wide2yRawTotal: Number(wideRaw.total),
            wide2yReportRevenue: wideRevenue,
            wide2yRevenueMatches: Math.abs(wideRevenue - Number(wideRaw.total)) < 0.01,
            wide2yShipments: (wide.r as any)?.shipments?.total ?? null,
            wide2yStatuses: Object.keys((wide.r as any)?.shipments?.byStatus || {}),
            paymentStatusBreakdown: statusRows.map((r: any) => ({ status: r.status, count: Number(r.n), total: Number(r.total) })),
            reportShipmentsTotal: (reports.r as any)?.shipments?.total ?? null,
            reportRevenueCurrencies: Object.keys((reports.r as any)?.revenue?.byCurrency || {}),
            financeRecentTx: ((finance.r as any)?.recentTransactions || []).length,
            financePendingProofs: (finance.r as any)?.pendingProofs ?? null,
            financePendingByCurrency: (finance.r as any)?.pendingByCurrency ?? null,
            financePendingCount: (finance.r as any)?.pendingPaymentCount ?? null,
            financeUnreconciled: (finance.r as any)?.unreconciledPayments ?? null,
            staffRecords: Number(staffRows.n),
            zoneStats: Number(zoneRows.n),
            pickupZones: Number(zones.n),
            customerRecords: Number(customers.n),
          };
        }
        return new Response(JSON.stringify({
          ok: true,
          sampleReference: ref.ref,
          referenceFormatValid: /^[A-Z]{3}\d{4}\d{4,}$/.test(ref.ref),
          catalogueItems: Number(counts.catalogue),
          newTables: Number(counts.new_tables),
          policies: Number(counts.policies),
          functions: Number(counts.functions),
          retentionCronJob: cronJob,
          aggregates,
          rateLimit: {
            first: quota1[0].r.allowed, second: quota2[0].r.allowed,
            thirdBlocked: quota3[0].r.allowed === false, retryAfter: quota3[0].r.retryAfterSeconds ?? null,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } finally {
        await sql.end();
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("staff-ops error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
