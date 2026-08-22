import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAppleConfig, revokeAppleToken } from '../_shared/apple.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppleRevocation = {
  // True when Apple is part of this deletion's story — either the user signed in
  // with Apple, or we could not establish that they didn't. Both are worth
  // writing down; only a confirmed non-Apple account is silent.
  applicable: boolean
  revoked: boolean
  revokedAt: string | null
  detail: string
}

/**
 * Apple requires apps offering Sign in with Apple to revoke the user's token
 * when they delete their account — deleting our own rows is not enough, and App
 * Review checks this path (Guideline 5.1.1 (v)).
 *
 * The refresh token is captured at sign-in by the `apple-auth` edge function,
 * because the native Apple flow gives Supabase only an identity token and the
 * authorization code that could be exchanged for a refresh token dies after five
 * minutes.
 *
 * This never throws. A failed revocation must not strand a customer in a
 * half-deleted state: erasure under GDPR Article 17 is a hard obligation with a
 * deadline, whereas Apple's token expires on its own. The outcome is recorded on
 * the deletion request so an admin can see and report exactly what happened.
 */
async function revokeAppleAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<AppleRevocation> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error || !data?.user) {
      return { applicable: true, revoked: false, revokedAt: null, detail: 'Could not read the auth user, so it was not possible to check for an Apple identity or revoke a token.' }
    }

    const hasAppleIdentity = (data.user.identities ?? []).some(
      (identity: { provider?: string }) => identity.provider === 'apple',
    )
    if (!hasAppleIdentity) {
      return { applicable: false, revoked: false, revokedAt: null, detail: 'No Apple identity on this account.' }
    }

    if (!getAppleConfig()) {
      return { applicable: true, revoked: false, revokedAt: null, detail: 'Apple key material is not configured on this project, so the token could not be revoked.' }
    }

    const { data: stored } = await supabaseAdmin
      .from('apple_auth_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (!stored?.refresh_token) {
      // Expected for anyone who signed in with Apple before token capture
      // shipped. Their token cannot be revoked; it lapses on Apple's own clock.
      return { applicable: true, revoked: false, revokedAt: null, detail: 'No stored Apple refresh token for this user, so there was nothing to revoke.' }
    }

    const result = await revokeAppleToken(stored.refresh_token, 'refresh_token')
    if (result.ok) {
      return {
        applicable: true,
        revoked: true,
        revokedAt: new Date().toISOString(),
        detail: result.alreadyInvalid
          ? 'Apple token was already invalid; access is revoked.'
          : 'Apple token revoked.',
      }
    }
    return { applicable: true, revoked: false, revokedAt: null, detail: result.error }
  } catch (error) {
    return { applicable: true, revoked: false, revokedAt: null, detail: `Apple revocation errored: ${(error as Error).message}` }
  }
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

    // 0. Revoke Apple access first, while the auth user and its stored refresh
    // token still exist — deleting the auth user cascades the token away, after
    // which revocation is impossible.
    const appleRevocation = await revokeAppleAccess(supabaseAdmin, userIdToDelete)
    console.log(`Apple revocation for ${userIdToDelete}: ${appleRevocation.detail}`)
    if (appleRevocation.revokedAt) {
      await supabaseAdmin
        .from('account_deletion_requests')
        .update({ apple_token_revoked_at: appleRevocation.revokedAt })
        .eq('id', requestId)
    }

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

    // 6. Drop the stored Apple refresh token. It also cascades with the auth
    // user below, but there is no reason to keep a live credential around for
    // even one more statement.
    await supabaseAdmin
      .from('apple_auth_tokens')
      .delete()
      .eq('user_id', userIdToDelete)

    // 7. Delete the auth user (this will cascade to other tables)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
      userIdToDelete
    )

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      throw deleteUserError
    }

    // 8. Mark deletion request as completed
    const notes = [
      'Account successfully deleted. Shipment and financial records retained as required by law.',
      appleRevocation.applicable ? `Sign in with Apple: ${appleRevocation.detail}` : null,
    ].filter(Boolean).join(' ')

    await supabaseAdmin
      .from('account_deletion_requests')
      .update({ status: 'completed', notes })
      .eq('id', requestId)

    console.log(`Successfully deleted account for user: ${userIdToDelete}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        userId: userIdToDelete,
        apple: {
          applicable: appleRevocation.applicable,
          revoked: appleRevocation.revoked,
          detail: appleRevocation.detail,
        }
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
