import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!EXPO_ACCESS_TOKEN) {
      throw new Error('EXPO_ACCESS_TOKEN not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get notification data from request body
    const { userId, type, data } = await req.json()
    
    console.log(`Sending ${type} notification to user ${userId}`)

    // Get user's push token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('push_token, push_notifications_enabled, username')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    if (!user.push_notifications_enabled || !user.push_token) {
      console.log(`User ${userId} has notifications disabled or no push token`)
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let title = ''
    let body = ''
    let notificationData = data

    // Build notification based on type
    if (type === 'friend_request') {
      title = '👋 New Friend Request'
      body = `${data.fromUsername} wants to be friends!`
    } else if (type === 'friend_accepted') {
      title = '🎉 Friend Request Accepted'
      body = `${data.fromUsername} accepted your friend request!`
    } else {
      throw new Error(`Unknown notification type: ${type}`)
    }

    // Send to Expo
    const notification = {
      to: user.push_token,
      sound: 'default',
      title,
      body,
      data: notificationData,
      priority: 'high',
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(notification),
    })

    const expoPushResult = await response.json()
    console.log('Expo push result:', expoPushResult)

    // Save to notifications table
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data: notificationData,
        read: false,
      })

    if (insertError) {
      console.error('Error saving notification:', insertError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: true,
        expoPushResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})