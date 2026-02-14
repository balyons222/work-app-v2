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

  // 1. Initial Load
  useEffect(() => {
    fetchMessages()
  }, [conversationId])

  // 2. Realtime Subscription setup
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
          console.log('⚡️ NEW REALTIME EVENT:', payload.new);
          
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === payload.new.id)) {
              console.log('Duplicate message ignored');
              return prev;
            }
            console.log('Adding new message to state...');
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => {
        console.log(`🔌 Channel Status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // 3. Auto-Scroll triggers WHENEVER messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

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
    }
    setLoading(false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgContent = newMessage.trim()
    setNewMessage('') 

    // Optimistic Update (Optional: Remove if you prefer waiting for DB)
    // setMessages(prev => [...prev, { id: 'temp-' + Date.now(), content: msgContent, sender_id: currentUserId, is_temp: true }])

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: msgContent
    })

    if (error) {
      toast.error('Failed to send')
      setNewMessage(msgContent)
    }
  }

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[500px] bg-white rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col z-[100] animate-in slide-in-from-bottom-10">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <span className="font-bold text-slate-900 block leading-none">{otherUserName}</span>
            {/* 🛠️ DEBUG COUNTER: If this number goes up, the code is working */}
            <span className="text-[10px] text-slate-400 font-mono">
              Count: {messages.length} | ID: {conversationId.slice(0,4)}...
            </span>
          </div>
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
            
            // Check for potential ID mismatch issues
            if (!msg.sender_id) return null; 

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm border ${
                    isMe 
                      ? 'bg-secondary text-white border-transparent rounded-br-none' 
                      : 'bg-slate-100 text-slate-800 border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                  {/* Debug: Tiny timestamp to verify unique rendering */}
                  {/* <div className="text-[8px] opacity-50 mt-1">{msg.created_at?.slice(11,16)}</div> */}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-secondary text-sm"
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-slate-800 transition-colors">
          Send
        </button>
      </form>
    </div>
  )
}
