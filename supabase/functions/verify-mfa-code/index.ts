import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createHmac } from 'https://deno.land/std@0.177.0/hash/sha1.ts'

// CORS headers to allow browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Base32 decoder (simplified version for this example, use a proper one in production)
const base32Decode = (str) => {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let buffer = '';
  for (let i = 0; i < str.length; i++) {
    const index = base32chars.indexOf(str[i].toUpperCase());
    if (index === -1) continue;  // Skip invalid characters
    bits += index.toString(2).padStart(5, '0');
  }

  while (bits.length >= 8) {
    buffer += String.fromCharCode(parseInt(bits.slice(0, 8), 2));
    bits = bits.slice(8);
  }
  return buffer;
}

// Calculate TOTP token using HMAC-SHA1 and base32-decoded secret
const calculateTOTP = (secret: string, counter: number): string => {
  const decodedSecret = base32Decode(secret);  // Decode the base32 secret
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  
  // Convert the counter to a buffer (big-endian 64-bit integer)
  for (let i = 0; i < 8; i++) {
    view.setUint8(7 - i, counter & 0xff);
    counter = counter >> 8;
  }

  // Generate HMAC-SHA1
  const hmac = createHmac('sha1', decodedSecret);
  hmac.update(new Uint8Array(buffer));
  const hash = new Uint8Array(hmac.digest());

  // Extract the dynamic binary code (4-byte)
  const offset = hash[hash.length - 1] & 0xf;
  const binaryCode = (hash[offset] & 0x7f) << 24 |
                     (hash[offset + 1] & 0xff) << 16 |
                     (hash[offset + 2] & 0xff) << 8 |
                     (hash[offset + 3] & 0xff);

  // Get a 6-digit code
  const code = Math.abs(binaryCode) % 1000000;

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
});
