
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers to allow browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate TOTP token (same function as in verify-mfa-code)
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
  
  // For demo purposes, using simplified algorithm
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = ((hash << 5) - hash) + secret.charCodeAt(i) + counter;
    hash |= 0;
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
    const { userId, token } = await req.json();
    
    if (!userId || !token) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create a Supabase client with the admin key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Get the user's MFA secret from the database
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('mfa_secret, mfa_enabled')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      throw new Error('User not found or error fetching user data');
    }
    
    // If MFA is not enabled for this user, return success (no verification needed)
    if (!data.mfa_enabled || !data.mfa_secret) {
      return new Response(JSON.stringify({ verified: true, message: 'MFA not enabled for this user' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get current 30-second counter
    const timeStep = 30;
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    
    // Check current and adjacent time steps to allow for clock skew
    let verified = false;
    for (let i = -1; i <= 1; i++) {
      const calculatedToken = calculateTOTP(data.mfa_secret, counter + i);
      if (calculatedToken === token) {
        verified = true;
        break;
      }
    }
    
    // Log the verification attempt
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'MFA_VERIFICATION',
      entity_type: 'USER',
      entity_id: userId,
      details: { success: verified }
    });
    
    return new Response(JSON.stringify({ verified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error verifying MFA login:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to verify MFA login', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
