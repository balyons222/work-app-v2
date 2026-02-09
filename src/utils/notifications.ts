import { createClient } from '@/src/utils/supabase/client'

const supabase = createClient()

/**
 * Sends a notification to a specific user.
 */
export async function sendNotification({
  userId,
  title,
  message,
  link,
  type = 'info'
}: {
  userId: string
  title: string
  message: string
  link?: string
  type?: 'info' | 'success' | 'alert'
}) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      link,
      type
    })
    
    if (error) throw error
    console.log(`🔔 Notification sent to ${userId}: ${title}`)
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}
