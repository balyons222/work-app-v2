'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'

/**
 * Navbar link to /messages with a count of unread messages sent to this user.
 * RLS only returns messages in the user's own conversations, so "unread and not sent by me" is the count.
 */
export default function MessagesLink({ userId, className, onClick }: { userId: string; className?: string; onClick?: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let alive = true
    const count = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', userId)
      if (alive) setUnread(count ?? 0)
    }
    count()

    const channel = supabase
      .channel(`unread_${userId}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, count)
      .subscribe()
    const interval = setInterval(count, 60_000)
    window.addEventListener('fxd:messages-read', count)

    return () => {
      alive = false
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener('fxd:messages-read', count)
    }
  }, [supabase, userId])

  return (
    <Link href="/messages" onClick={onClick} className={`relative inline-flex items-center gap-1.5 ${className || ''}`}>
      Messages
      {unread > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" aria-label={`${unread} unread`}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
