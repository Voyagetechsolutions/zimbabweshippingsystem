import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// SMTP Configuration - set these in Supabase Edge Function secrets
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") || "";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "";
const FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") || "noreply@zimbabweshipping.com";
const FROM_NAME = Deno.env.get("SMTP_FROM_NAME") || "Zimbabwe Shipping";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  customerName: string;
  invoiceNumber: string;
  pdfBase64: string;
  // Legacy: a single "amount paid" string (treated as a paid receipt).
  amount?: string;
  // Invoice2go-style fields for sending an invoice that may still be owed.
  status?: "paid" | "partial" | "unpaid";
  total?: string;       // formatted, e.g. "€120.00"
  amountDue?: string;   // formatted balance owed
  dueDate?: string;     // e.g. "2026-06-22"
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, customerName, invoiceNumber, pdfBase64, amount, total, amountDue, dueDate } = body;
    // Default to "paid" when no status is given, preserving the legacy receipt behaviour.
    const status = body.status || "paid";

    // Validate required fields
    if (!to || !customerName || !invoiceNumber || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if SMTP is configured
    if (!SMTP_HOST || !SMTP_USERNAME || !SMTP_PASSWORD) {
      console.error("SMTP settings not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please set SMTP secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Header gradient + wording adapt to whether the invoice is paid or still owed.
    const isPaid = status === "paid";
    const headerGradient = isPaid
      ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
      : "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)";
    const intro = isPaid
      ? "Thank you for your payment! Please find your receipt attached for your records."
      : "Thank you for your business. Please find your invoice attached. We'd be grateful if you could arrange payment using the details on the invoice.";

    const statusPill = isPaid
      ? `<span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:500;">✓ Paid</span>`
      : status === "partial"
        ? `<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:500;">Part Paid</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:500;">Unpaid</span>`;

    // Build the summary rows depending on what was supplied.
    const rows: string[] = [
      `<tr><td style="padding:8px 0;color:#6b7280;">Invoice Number:</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#111827;">${invoiceNumber}</td></tr>`,
    ];
    if (total) {
      rows.push(`<tr><td style="padding:8px 0;color:#6b7280;">Invoice Total:</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#111827;">${total}</td></tr>`);
    }
    if (isPaid && amount) {
      rows.push(`<tr><td style="padding:8px 0;color:#6b7280;">Amount Paid:</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#16a34a;font-size:18px;">${amount}</td></tr>`);
    }
    if (!isPaid && amountDue) {
      rows.push(`<tr><td style="padding:8px 0;color:#6b7280;">Amount Due:</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#b91c1c;font-size:18px;">${amountDue}</td></tr>`);
    }
    if (!isPaid && dueDate) {
      rows.push(`<tr><td style="padding:8px 0;color:#6b7280;">Due Date:</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#111827;">${dueDate}</td></tr>`);
    }
    rows.push(`<tr><td style="padding:8px 0;color:#6b7280;">Status:</td><td style="padding:8px 0;text-align:right;">${statusPill}</td></tr>`);

    const subject = isPaid
      ? `Receipt ${invoiceNumber} - Zimbabwe Shipping`
      : `Invoice ${invoiceNumber} - Zimbabwe Shipping`;

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice from Zimbabwe Shipping</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${headerGradient}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Zimbabwe Shipping</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Nexus Logistics</p>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">Dear ${customerName},</h2>

            <p style="font-size: 16px; color: #4b5563;">${intro}</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                ${rows.join("\n")}
              </table>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Your ${isPaid ? "receipt" : "invoice"} is attached as a PDF document.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                If you have any questions about this ${isPaid ? "receipt" : "invoice"}, please don't hesitate to contact us.
              </p>
            </div>
          </div>

          <div style="background: #111827; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              Zimbabwe Shipping Nexus
            </p>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">
              support@zimbabweshipping.com | www.zimbabweshipping.com
            </p>
          </div>
        </body>
      </html>
    `;

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_PORT === 465,
        auth: {
          username: SMTP_USERNAME,
          password: SMTP_PASSWORD,
        },
      },
    });

    // Convert base64 PDF to Uint8Array for attachment
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    // Send email via SMTP
    await client.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: `${isPaid ? "Receipt" : "Invoice"}-${invoiceNumber}.pdf`,
          content: pdfBytes,
          contentType: "application/pdf",
        },
      ],
    });

    await client.close();

    console.log("Email sent successfully to:", to);

    return new Response(
      JSON.stringify({ success: true, message: `Invoice sent to ${to}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
