
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import * as base32 from 'https://deno.land/std@0.177.0/encoding/base32.ts'

// CORS headers to allow browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate QR code URL for MFA setup
const generateQrCodeUrl = (secret: string, account: string, issuer: string): string => {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(account);
  const otpAuthUrl = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`;
  
  // Generate QR code image through a free QR code API
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
};

// Generate a random MFA secret key
const generateSecret = (): string => {
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  
  // Convert to base32 for MFA compatibility
  const secret = base32.encode(randomBytes).replace(/=/g, '');
  return secret;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Only POST requests allowed
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Generate a new secret for the user
    const secret = generateSecret();
    
    // Generate QR code URL
    const qrCode = generateQrCodeUrl(secret, userId, 'Zimbabwe Shipping');
    
    return new Response(JSON.stringify({ secret, qrCode }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating MFA secret:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to generate MFA secret' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
