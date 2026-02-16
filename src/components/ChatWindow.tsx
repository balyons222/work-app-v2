'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'
import { RealtimeChannel } from '@supabase/supabase-js' // Import type if using TypeScript

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  otherUserName: string
  onClose: () => void
}

export default function ChatWindow({ conversationId, currentUserId, otherUserName, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false) // ✅ NEW: Typing state
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null) // ✅ NEW: Store channel to send events later
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null) // ✅ NEW: Timer to clear typing status
  
  const supabase = createClient()

  // 1. Initial Load
  useEffect(() => {
    fetchMessages()
    markAsRead()
  }, [conversationId])

  // 2. Realtime Subscription (Messages + Typing)
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${conversationId}`) 
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        }, 
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          
          if (payload.new.sender_id !== currentUserId) {
            markAsRead();
            setIsTyping(false); // Clear typing indicator immediately when message arrives
          }
        }
      )
      // ✅ NEW: Listen for "Typing" events
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUserId) {
          setIsTyping(true)
          
          // Clear any existing timeout so it doesn't flicker
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          
          // Auto-hide after 3 seconds of no updates
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
          }, 3000)
        }
      })
      .subscribe();

    channelRef.current = channel // Store for sending events later

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // 3. Auto-scroll
  useEffect(() => {
    if (messages.length > 0 || isTyping) { // Scroll if typing too!
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages, isTyping])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load chat')
    } else {
      setMessages(data || [])
    }
    setLoading(false)
  }

  const markAsRead = async () => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', currentUserId); 

    if (error) console.error('Error marking as read:', error);
  };

  // ✅ NEW: Broadcast "I am typing" event
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId }
      })
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgContent = newMessage.trim()
    setNewMessage('') 

    // Optimistic UI Update (Optional: makes it feel faster)
    /* setMessages(prev => [...prev, { 
       id: 'temp-' + Date.now(), 
       content: msgContent, 
       sender_id: currentUserId, 
       created_at: new Date().toISOString() 
    }]) */

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: msgContent,
      is_read: false
    })

    if (error) {
      toast.error('Failed to send')
      setNewMessage(msgContent)
    }
  }

  return (
    <div className="fixed bottom-0 right-4 w-80 md:w-96 h-[500px] bg-white rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col z-[100] animate-in slide-in-from-bottom-10">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
              {otherUserName.charAt(0)}
            </div>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-sm">{otherUserName}</span>
            <span className="text-[10px] text-slate-400 font-medium">Active Now</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2">&times;</button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 p-4 overflow-y-auto bg-white space-y-3">
        {loading ? (
          <div className="flex justify-center mt-10"><div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-transparent rounded-full"></div></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-slate-300 mt-10">Say hello! 👋</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-black text-white rounded-br-none' 
                      : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        
        {/* ✅ NEW: Typing Bubble Indicator */}
        {isTyping && (
           <div className="flex justify-start animate-pulse">
             <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 flex gap-1 items-center">
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
        <input 
          type="text" 
          value={newMessage}
          onChange={handleInputChange} // ✅ Changed to use our new handler
          placeholder="Type a message..."
          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black/10 text-sm transition-all"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()} 
          className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-slate-800 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
