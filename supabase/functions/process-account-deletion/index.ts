import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const { requestId } = await req.json()

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    // Get the deletion request
    const { data: deletionRequest, error: requestError } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !deletionRequest) {
      throw new Error('Deletion request not found')
    }

    if (deletionRequest.status !== 'pending') {
      throw new Error('Request has already been processed')
    }

    const userIdToDelete = deletionRequest.user_id

    // Update request status to processing
    await supabaseAdmin
      .from('account_deletion_requests')
      .update({ 
        status: 'processing', 
        processed_by: user.id,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    // Start deletion process
    console.log(`Processing deletion for user: ${userIdToDelete}`)

    // 1. Delete saved delivery addresses
    await supabaseAdmin
      .from('customer_addresses')
      .delete()
      .eq('user_id', userIdToDelete)

    // 2. Anonymize feedback (keep for analytics but remove identifying info)
    await supabaseAdmin
      .from('customer_feedback')
      .update({ 
        user_id: null,
        comments: '[User account deleted]'
      })
      .eq('user_id', userIdToDelete)

    // 3. Anonymize shipments (keep for records but remove personal details)
    // Note: We keep shipment records for legal/tax purposes
    await supabaseAdmin
      .from('shipments')
      .update({
        metadata: null, // Remove sender/recipient details
        notes: '[Customer account deleted - personal data removed]'
      })
      .eq('user_id', userIdToDelete)

    // 4. Delete notifications
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userIdToDelete)

    // 5. Delete user profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userIdToDelete)

    // 6. Delete the auth user (this will cascade to other tables)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
      userIdToDelete
    )

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      throw deleteUserError
    }

    // 7. Mark deletion request as completed
    await supabaseAdmin
      .from('account_deletion_requests')
      .update({ 
        status: 'completed',
        notes: 'Account successfully deleted. Shipment and financial records retained as required by law.'
      })
      .eq('id', requestId)

    console.log(`Successfully deleted account for user: ${userIdToDelete}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account deleted successfully',
        userId: userIdToDelete
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing account deletion:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process account deletion' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
