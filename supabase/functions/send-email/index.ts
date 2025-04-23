
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/render@0.0.22";
import React from "npm:react@18.3.1";

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
}

const sendAuthEmail = async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, token, redirect_to }: AuthEmailRequest = await req.json();

    let subject = '';
    let html = '';

    switch (type) {
      case 'signup':
        subject = 'Welcome! Confirm Your Account';
        html = `
          <h1>Welcome to our Platform!</h1>
          <p>Click the link below to confirm your account:</p>
          <a href="${redirect_to || '/'}">Confirm Account</a>
        `;
        break;
      case 'magic_link':
        subject = 'Your Magic Login Link';
        html = `
          <h1>Login Magic Link</h1>
          <p>Click the link below to log in:</p>
          <a href="${redirect_to || '/'}>Login Now</a>
        `;
        break;
      case 'password_reset':
        subject = 'Password Reset Request';
        html = `
          <h1>Password Reset</h1>
          <p>Use this token to reset your password: ${token}</p>
          <a href="${redirect_to || '/reset-password'}">Reset Password</a>
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
