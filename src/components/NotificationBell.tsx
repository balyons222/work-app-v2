'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()

    // Optional: Realtime subscription could go here
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  const handleMarkRead = async (id: string, link: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setUnreadCount(prev => Math.max(0, prev - 1))
    setIsOpen(false)
    router.push(link)
  }

  const handleMarkAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 BELL BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        
        {/* 🔴 RED DOT BADGE */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* 📜 DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-secondary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No new notifications.</div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.link || '#')}
                  className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-secondary' : 'bg-transparent'}`} />
                    <div>
                      <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}