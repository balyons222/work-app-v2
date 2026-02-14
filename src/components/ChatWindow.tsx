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

  // 1. Fetch History
  useEffect(() => {
    console.log("🔄 Fetching history for:", conversationId)
    fetchMessages()
  }, [conversationId])

  // 2. Realtime Listener
  useEffect(() => {
    const channelName = `chat_${conversationId}`
    console.log("🔌 Subscribing to channel:", channelName)

    const channel = supabase
      .channel(channelName) 
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        }, 
        (payload) => {
          console.log('⚡️ REALTIME EVENT RECEIVED', payload.new);
          
          // ⚠️ DIAGNOSTIC: Logic inside the setter to see what React "sees"
          setMessages((prev) => {
            console.log(`📊 Current Message Count: ${prev.length}`);
            
            // Check if it's a duplicate
            const isDuplicate = prev.some(m => m.id === payload.new.id);
            console.log(`🧐 Is Duplicate? ${isDuplicate ? 'YES (Ignored)' : 'NO (Adding)'}`);

            if (isDuplicate) return prev;

            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => console.log(`📡 Subscription Status: ${status}`));

    return () => {
      console.log("🔌 Unsubscribing...")
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // 3. Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load chat')
    } else {
      console.log("📥 History Loaded:", data?.length, "messages");
      setMessages(data || [])
    }
    setLoading(false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgContent = newMessage.trim()
    setNewMessage('') 

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: msgContent
    })

    if (error) {
      toast.error('Failed to send')
      console.error(error)
    }
  }

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[500px] bg-white rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col z-[100]">
      
      {/* HEADER WITH DEBUG INFO */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 leading-none">{otherUserName}</span>
            {/* 🛠️ DEBUG DATA - Check these values! */}
            <span className="text-[9px] text-slate-400 font-mono mt-1">
              Me: {currentUserId?.slice(0,4)}... | Msgs: {messages.length}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 p-4 overflow-y-auto bg-white space-y-3">
        {loading ? (
          <p className="text-center text-xs text-slate-400 mt-10">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-slate-300 mt-10">Start the conversation!</p>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm border ${isMe ? 'bg-secondary text-white border-secondary rounded-br-none' : 'bg-slate-100 text-slate-800 border-slate-200 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-secondary text-sm"
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">Send</button>
      </form>
    </div>
  )
}
