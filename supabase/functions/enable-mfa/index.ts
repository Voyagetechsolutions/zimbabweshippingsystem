
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers to allow browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { userId, secret } = await req.json();
    
    if (!userId || !secret) {
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
    
    // Store the MFA secret in the user's profile with encryption
    // In a real implementation, we would hash this properly
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        mfa_enabled: true,
        mfa_secret: secret, // In production, encrypt this value
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
    
    // Log this security change
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'MFA_ENABLED',
      entity_type: 'USER',
      entity_id: userId,
      details: { event: 'MFA enabled for user account' }
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error enabling MFA:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to enable MFA' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
