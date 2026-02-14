'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    
    // ✅ REALTIME SUBSCRIPTION
    // Using an underscore in the channel name is safer
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
          // Double-check for duplicates to ensure UI remains clean
          setMessages((prev) => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      toast.error('Failed to load chat')
    } else {
      setMessages(data || [])
      scrollToBottom()
    }
    setLoading(false)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgContent = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: msgContent
      })

    if (error) {
      toast.error('Failed to send')
      setNewMessage(msgContent) // Restore text on fail
    }
  }

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[500px] bg-white rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col z-[100] animate-in slide-in-from-bottom-10">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-bold text-slate-900">{otherUserName}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 p-4 overflow-y-auto bg-white space-y-3">
        {loading ? (
          <p className="text-center text-xs text-slate-400 mt-10">Loading history...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-slate-300 mt-10">Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-secondary text-white rounded-br-none' : 'bg-slate-100 text-slate-700 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-secondary text-sm"
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  )
}
