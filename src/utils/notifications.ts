import { createClient } from '@/src/utils/supabase/client'

const supabase = createClient()

interface NotificationPayload {
  userId: string
  title: string
  message: string
  link: string
  type?: 'info' | 'success' | 'warning' | 'error'
}

export async function sendNotification({ userId, title, message, link, type = 'info' }: NotificationPayload) {
  try {
    // 1. In-App Notification (Database)
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        link,
        type,
        is_read: false
      })

    if (dbError) {
      console.error('Error creating DB notification:', dbError)
    }

    // 2. Email Notification (Server API)
    // We fire-and-forget this so the UI doesn't wait for the email to send
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message, link, type })
    }).catch(err => console.error('Failed to trigger email:', err))

    return true

  } catch (error) {
    console.error('Notification failed:', error)
    return false
  }
}