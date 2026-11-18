'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatWindow from '@/src/components/ChatWindow'

type Person = { full_name: string | null; company_name?: string | null; avatar_url: string | null } | null

type Conversation = {
  id: string
  organizer_id: string | null
  worker_id: string | null
  created_at: string
  job: { title: string | null } | null
  organizer: Person
  worker: Person
}

type Summary = { lastText: string; lastAt: string; lastFromMe: boolean; unread: number }

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const days = (now.getTime() - d.getTime()) / 86_400_000
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Inbox() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const wantedId = searchParams.get('id')
  const wantedWorker = searchParams.get('workerId')

  const [me, setMe] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [summaries, setSummaries] = useState<Record<string, Summary>>({})
  const [activeId, setActiveId] = useState<string | null>(wantedId)
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(activeId)
  activeRef.current = activeId

  const load = useCallback(async (userId: string) => {
    const { data: convs, error } = await supabase
      .from('conversations')
      .select(`
        id, organizer_id, worker_id, created_at,
        job:jobs(title),
        organizer:profiles!conversations_organizer_id_fkey(full_name, company_name, avatar_url),
        worker:profiles!conversations_worker_id_fkey(full_name, avatar_url)
      `)
      .or(`organizer_id.eq.${userId},worker_id.eq.${userId}`)
    if (error) {
      console.error('Error loading conversations:', error.message)
      setLoading(false)
      return
    }
    const list: Conversation[] = (convs || []).map((c: any) => ({
      ...c, job: one(c.job), organizer: one(c.organizer), worker: one(c.worker),
    }))

    // Last message + unread count per conversation (newest first, so the first one seen is the latest)
    const next: Record<string, Summary> = {}
    if (list.length) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, content, created_at, is_read')
        .in('conversation_id', list.map(c => c.id))
        .order('created_at', { ascending: false })
        .limit(2000)
      for (const m of msgs || []) {
        if (!m.conversation_id) continue
        const s = next[m.conversation_id] ??= {
          lastText: m.content, lastAt: m.created_at, lastFromMe: m.sender_id === userId, unread: 0,
        }
        // The open chat marks incoming messages read itself; don't flash a badge for it meanwhile
        if (!m.is_read && m.sender_id !== userId && m.conversation_id !== activeRef.current) s.unread++
      }
    }

    const at = (c: Conversation) => next[c.id]?.lastAt || c.created_at
    list.sort((a, b) => at(b).localeCompare(at(a)))
    setConversations(list)
    setSummaries(next)
    setLoading(false)

    // Older profile links pass ?workerId=: open the latest conversation with that person
    if (!wantedId && wantedWorker) {
      const match = list.find(c => c.worker_id === wantedWorker || c.organizer_id === wantedWorker)
      if (match) setActiveId(prev => prev ?? match.id)
    }
  }, [supabase, wantedId, wantedWorker])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setMe(user.id)
      load(user.id)
    })
  }, [supabase, router, load])

  // New messages in any of my conversations (RLS only delivers ones I can read) refresh the list
  useEffect(() => {
    if (!me) return
    const channel = supabase
      .channel(`inbox_${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load(me))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, me, load])

  // Follow notification links that change ?id= while already on this page
  useEffect(() => {
    if (wantedId) setActiveId(wantedId)
  }, [wantedId])

  const openChat = (id: string) => {
    setActiveId(id)
    router.replace(`/messages?id=${id}`, { scroll: false })
  }

  const closeChat = () => {
    setActiveId(null)
    router.replace('/messages', { scroll: false })
  }

  const markReadLocally = useCallback((id: string) => {
    setSummaries(prev => (prev[id]?.unread ? { ...prev, [id]: { ...prev[id], unread: 0 } } : prev))
  }, [])

  const otherPerson = (c: Conversation) => {
    const iAmOrganizer = c.organizer_id === me
    const p = iAmOrganizer ? c.worker : c.organizer
    const name = (iAmOrganizer ? p?.full_name : p?.company_name || p?.full_name) || 'FxD member'
    return { name, avatar: p?.avatar_url || null }
  }

  const active = conversations.find(c => c.id === activeId) || null

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-6xl mx-auto md:px-6 md:py-8">
        <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex h-[calc(100vh-5rem)] md:h-[calc(100vh-9rem)]">

          {/* Conversation list (hidden on phones while a chat is open) */}
          <aside className={`w-full md:w-80 md:border-r border-slate-200 flex-col ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h1 className="font-black text-lg text-slate-900">Messages</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm leading-relaxed">
                  No conversations yet. Use <span className="font-bold">Message</span> on an application, job or profile to start one.
                </div>
              ) : (
                conversations.map(c => {
                  const s = summaries[c.id]
                  const who = otherPerson(c)
                  const unread = s?.unread || 0
                  return (
                    <button
                      key={c.id}
                      onClick={() => openChat(c.id)}
                      className={`w-full text-left px-5 py-4 border-b border-slate-50 flex gap-3 transition-colors hover:bg-slate-50 ${c.id === activeId ? 'bg-teal-50' : ''}`}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-slate-500">
                        {who.avatar ? <img src={who.avatar} alt="" className="h-full w-full object-cover" /> : who.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`truncate text-sm ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>{who.name}</p>
                          {s && <span className="text-[11px] text-slate-400 flex-shrink-0">{timeLabel(s.lastAt)}</span>}
                        </div>
                        {c.job?.title && <p className="text-[11px] font-bold text-secondary truncate">{c.job.title}</p>}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${unread ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                            {s ? `${s.lastFromMe ? 'You: ' : ''}${s.lastText}` : 'No messages yet'}
                          </p>
                          {unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Open conversation */}
          <section className={`flex-1 min-w-0 ${active ? 'flex' : 'hidden md:flex'}`}>
            {active && me ? (
              <ChatWindow
                key={active.id}
                variant="inline"
                conversationId={active.id}
                currentUserId={me}
                otherUserName={otherPerson(active).name}
                onClose={closeChat}
                onRead={() => markReadLocally(active.id)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                {!loading && activeId && !active ? 'That conversation could not be found.' : 'Select a conversation'}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading messages…</div>}>
      <Inbox />
    </Suspense>
  )
}
