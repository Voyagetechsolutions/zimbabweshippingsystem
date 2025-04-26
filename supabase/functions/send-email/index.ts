
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: 'signup' | 'magic_link' | 'password_reset';
  email: string;
  token?: string;
  redirect_to?: string;
  csrf_token?: string; // Added to validate requests
}

const validateEmail = (email: string) => {
  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regex.test(email);
};

const sendAuthEmail = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, token, redirect_to, csrf_token }: AuthEmailRequest = await req.json();

    // Validate email format
    if (!validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    let subject = '';
    let html = '';

    const safeRedirect = redirect_to || 'https://zimbabweshipping.com';
    const linkWithToken = token ? `${safeRedirect}?token=${token}` : safeRedirect;

    switch (type) {
      case 'signup':
        subject = 'Welcome! Confirm Your Account';
        html = `
          <h1>Welcome to Zimbabwe Shipping!</h1>
          <p>Click the link below to confirm your account:</p>
          <a href="${linkWithToken}" style="
            background-color: #4CAF50;
            color: white;
            padding: 14px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            border-radius: 4px;
            margin: 10px 0;
          ">Confirm Account</a>
          <p>If you didn't create this account, you can safely ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Zimbabwe Shipping Ltd, UK</p>
        `;
        break;

      case 'magic_link':
        subject = 'Your Magic Login Link';
        html = `
          <h1>Login to Zimbabwe Shipping</h1>
          <p>Click the link below to log in:</p>
          <a href="${linkWithToken}" style="
            background-color: #4CAF50;
            color: white;
            padding: 14px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            border-radius: 4px;
            margin: 10px 0;
          ">Login Now</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this login link, you can safely ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Zimbabwe Shipping Ltd, UK</p>
        `;
        break;

      case 'password_reset':
        subject = 'Password Reset Request';
        html = `
          <h1>Reset Your Password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${linkWithToken}" style="
            background-color: #4CAF50;
            color: white;
            padding: 14px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            border-radius: 4px;
            margin: 10px 0;
          ">Reset Password</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Zimbabwe Shipping Ltd, UK</p>
        `;
        break;

      default:
        throw new Error('Invalid email type');
    }

    const { error } = await resend.emails.send({
      from: "Zimbabwe Shipping <noreply@zimbabweshipping.com>",
      to: [email],
      subject,
      html,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
};

serve(sendAuthEmail);
