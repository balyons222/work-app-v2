'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useSearchParams } from 'next/navigation'

// 1. We create the main logic component (NOT exported as default yet)
function ChatContent() {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const supabase = createClient()
  const searchParams = useSearchParams()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-select chat from URL if present
  const startJobId = searchParams.get('jobId')
  const startWorkerId = searchParams.get('workerId')

  useEffect(() => {
    setupUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchConversations()
      subscribeToMessages()
    }
  }, [currentUser, activeChat])

  // Scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function setupUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUser(user)
  }

  async function fetchConversations() {
    // 1. Get all conversations where I am either user_a or user_b
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        job:jobs(title),
        profile_a:profiles!conversations_user_a_fkey(full_name),
        profile_b:profiles!conversations_user_b_fkey(full_name)
      `)
      .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching chats:', error)
    } else {
      setConversations(data || [])

      // If URL has params, find or create that chat
      if (startJobId && startWorkerId && !activeChat) {
        const existing = data?.find(c => c.job_id === startJobId)
        if (existing) {
          setActiveChat(existing.id)
        }
      }
    }
  }

  async function subscribeToMessages() {
    const channel = supabase
      .channel('chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.conversation_id === activeChat) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Load messages when clicking a chat
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat)
    }
  }, [activeChat])

  async function fetchMessages(chatId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUser) return

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeChat,
        sender_id: currentUser.id,
        content: newMessage
      })

    if (!error) {
      setNewMessage('')
    }
  }

  // Helper to get the "Other Person's" name
  function getChatName(chat: any) {
    if (!currentUser) return 'Chat'
    return chat.user_a === currentUser.id 
      ? chat.profile_b?.full_name 
      : chat.profile_a?.full_name
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar: List of Chats */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 font-bold text-lg">
          Messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                activeChat === chat.id ? 'bg-blue-50 border-blue-100' : ''
              }`}
            >
              <p className="font-bold text-gray-900">{getChatName(chat)}</p>
              <p className="text-xs text-gray-500 mt-1">{chat.job?.title}</p>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No conversations yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {activeChat ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-xl text-sm ${
                      isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <button 
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}

// 2. We export a "Wrapper" that handles the Suspense (Waiting state)
export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading messages...</div>}>
      <ChatContent />
    </Suspense>
  )
}