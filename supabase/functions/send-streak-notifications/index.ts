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
    const now = new Date()
    
    console.log(`Checking streak notifications at ${now.toISOString()}`)

    // Get all active goals with their users
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select(`
        id,
        user_id,
        title,
        streak_interval,
        last_posted_at,
        notification_time,
        users!goals_user_id_fkey (
          id,
          username,
          push_token,
          push_notifications_enabled
        )
      `)
      .eq('completed', false)
      .not('last_posted_at', 'is', null)

    if (goalsError) throw goalsError

    const notifications: any[] = []
    const notificationRecords: any[] = []
    const goalsToUpdate: { id: string, notification_time: string }[] = []

    for (const goal of goals || []) {
      // Skip if user has no push token or notifications disabled
      if (!goal.users?.push_notifications_enabled || !goal.users?.push_token) {
        continue
      }

      const lastPosted = new Date(goal.last_posted_at)
      const streakExpiresAt = new Date(lastPosted.getTime() + (goal.streak_interval * 24 * 60 * 60 * 1000))
      
      const fourHourWarning = new Date(streakExpiresAt.getTime() - (4 * 60 * 60 * 1000))
      const oneHourWarning = new Date(streakExpiresAt.getTime() - (1 * 60 * 60 * 1000))
      
      const timeSinceLastPost = now.getTime() - lastPosted.getTime()
      const timeUntilExpiry = streakExpiresAt.getTime() - now.getTime()
      
      // Check if streak already expired
      if (timeUntilExpiry <= 0) {
        console.log(`Goal ${goal.id} streak already expired`)
        continue
      }

      let shouldSend4Hour = false
      let shouldSend1Hour = false
      
      // Check if we're in the 4-hour warning window
      if (now >= fourHourWarning && now < oneHourWarning) {
        shouldSend4Hour = true
      }
      
      // Check if we're in the 1-hour warning window (and they still haven't posted)
      if (now >= oneHourWarning && now < streakExpiresAt) {
        shouldSend1Hour = true
      }

      // Check if we already sent a notification recently
      if (goal.notification_time) {
        const lastNotification = new Date(goal.notification_time)
        const hoursSinceLastNotification = (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60)
        
        // If we sent 4-hour warning, only send 1-hour if they haven't posted
        if (hoursSinceLastNotification < 3) {
          // Skip if we sent a notification less than 3 hours ago
          shouldSend4Hour = false
        }
        
        // Don't send 1-hour if we already sent it
        if (hoursSinceLastNotification < 0.5) {
          shouldSend1Hour = false
        }
      }

      let notificationType = ''
      let title = ''
      let body = ''

      if (shouldSend4Hour) {
        notificationType = 'streak_4hr'
        title = `⚠️ ${goal.title} - 4 Hours Left!`
        body = `Your streak expires in 4 hours. Post now to keep it alive! 🔥`
      } else if (shouldSend1Hour) {
        notificationType = 'streak_1hr'
        title = `🚨 ${goal.title} - 1 Hour Left!`
        body = `Last chance! Your streak expires in 1 hour. Don't lose your progress! ⏰`
      }

      if (notificationType) {
        console.log(`Sending ${notificationType} for goal ${goal.id}`)
        
        notifications.push({
          to: goal.users.push_token,
          sound: 'default',
          title,
          body,
          data: { 
            goalId: goal.id,
            type: notificationType 
          },
          priority: 'high',
        })

        notificationRecords.push({
          user_id: goal.user_id,
          type: notificationType,
          title,
          body,
          data: { 
            goalId: goal.id,
            expiresAt: streakExpiresAt.toISOString()
          },
          read: false,
        })

        goalsToUpdate.push({
          id: goal.id,
          notification_time: now.toISOString()
        })
      }
    }

    // Send notifications to Expo
    let expoPushResults = []
    if (notifications.length > 0) {
      console.log(`Sending ${notifications.length} notifications to Expo`)
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(notifications),
      })

      expoPushResults = await response.json()
      console.log('Expo push result:', expoPushResults)

      // Save to notifications table
      if (notificationRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationRecords)
        
        if (insertError) {
          console.error('Error inserting notifications:', insertError)
        }
      }

      // Update notification_time for goals
      for (const goalUpdate of goalsToUpdate) {
        await supabase
          .from('goals')
          .update({ notification_time: goalUpdate.notification_time })
          .eq('id', goalUpdate.id)
      }
    } else {
      console.log('No streak notifications to send at this time')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: notifications.length,
        timestamp: now.toISOString(),
        checkedGoals: goals?.length || 0,
        expoPushResults
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