
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// CORS headers to allow browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate TOTP token
const calculateTOTP = (secret: string, counter: number): string => {
  // This is a simplified TOTP calculation for the example
  // In production, use a full TOTP library with proper HMAC-SHA1
  
  // Convert the counter to a buffer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  
  // Counter needs to be a big-endian unsigned 64-bit integer
  for (let i = 0; i < 8; i++) {
    view.setUint8(7 - i, counter & 0xff);
    counter = counter >> 8;
  }
  
  // In a real implementation, we would:
  // 1. Decode the base32 secret
  // 2. Use HMAC-SHA1 to generate a hash
  // 3. Extract a 4-byte dynamic binary code using the hash
  // 4. Convert to a 6-digit number
  
  // For demo purposes, we're just using a deterministic algorithm
  // based on the secret and counter to generate a 6-digit code
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = ((hash << 5) - hash) + secret.charCodeAt(i) + counter;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Generate a positive 6-digit number
  const code = Math.abs(hash) % 1000000;
  
  // Pad with leading zeros to ensure 6 digits
  return code.toString().padStart(6, '0');
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
    const { userId, secret, token } = await req.json();
    
    if (!userId || !secret || !token) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // In a real implementation, we would:
    // 1. Get the current time step (usually 30 seconds)
    // 2. Check the token against the current time step and possibly adjacent ones for tolerance
    
    // Get current 30-second counter
    const timeStep = 30;
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    
    // Check current and adjacent time steps to allow for clock skew
    let verified = false;
    for (let i = -1; i <= 1; i++) {
      const calculatedToken = calculateTOTP(secret, counter + i);
      if (calculatedToken === token) {
        verified = true;
        break;
      }
    }
    
    return new Response(JSON.stringify({ verified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error verifying MFA code:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to verify MFA code' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
