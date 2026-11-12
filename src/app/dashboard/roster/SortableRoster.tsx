'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/src/utils/supabase/client'
import ChatWindow from '@/src/components/ChatWindow'
import toast from 'react-hot-toast'

export default function SortableRoster({ initialRoster }: { initialRoster: any[] }) {
  const [sortBy, setSortBy] = useState('earned_desc')
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null)
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null)
  const supabase = createClient()

  const sortedRoster = useMemo(() => {
    return [...initialRoster].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': 
          return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '')
        case 'pending_desc': 
          return b.pendingPayments - a.pendingPayments
        case 'past_shifts_desc': 
          return b.eventsWorked - a.eventsWorked
        case 'upcoming_desc':
          return b.upcomingShifts - a.upcomingShifts
        case 'earned_desc':
        default: 
          return b.totalEarned - a.totalEarned
      }
    })
  }, [initialRoster, sortBy])

  const handleOpenChat = async (jobId: string, applicationId: string, workerId: string, workerName: string) => {
    setLoadingChatId(workerId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if conversation exists for this application
      const { data: existingChat } = await supabase
        .from('conversations')
        .select('id')
        .eq('application_id', applicationId)
        .maybeSingle()
        
      if (existingChat) {
        setActiveChat({ id: existingChat.id, name: workerName })
      } else {
        // Create a new conversation
        const { data: newChat, error } = await supabase
          .from('conversations')
          .insert({ 
            job_id: jobId, 
            application_id: applicationId, 
            organizer_id: user.id, 
            worker_id: workerId 
          })
          .select()
          .single()

        if (error && error.code === '23505') {
           // Handle race condition if chat was created simultaneously
           const { data: retryChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).single()
           if (retryChat) setActiveChat({ id: retryChat.id, name: workerName })
        } else if (!error && newChat) { 
           setActiveChat({ id: newChat.id, name: workerName })
        }
      }
    } catch (error) {
      toast.error("Could not open chat.")
    } finally {
      setLoadingChatId(null)
    }
  }

  return (
    <div>
      {/* Controls Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-sm font-bold text-gray-500">
          {sortedRoster.length} Contractor{sortedRoster.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort By:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-lg focus:ring-primary focus:border-primary block p-2 outline-none"
          >
            <option value="earned_desc">Highest Paid (YTD)</option>
            <option value="pending_desc">Highest Pending/Escrow</option>
            <option value="past_shifts_desc">Most Past Shifts</option>
            <option value="upcoming_desc">Most Upcoming Shifts</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedRoster.map((contractor, index) => {
          const profile = contractor.profile || {}
          const lastJob = contractor.jobHistory[0]

          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 bg-indigo-900 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold border border-slate-200 relative shrink-0">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                    ) : (
                      profile.full_name?.charAt(0) || 'C'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {profile.full_name || 'Unknown Contractor'}
                    </h2>
                    <div className="text-sm text-gray-500 flex gap-3 truncate mt-0.5">
                      {profile.email && <span>✉️ {profile.email}</span>}
                      {profile.phone && <span>📱 {profile.phone}</span>}
                    </div>
                  </div>
                </div>
                
                {/* MESSAGE BUTTON */}
                {lastJob && (
                  <button 
                    onClick={() => handleOpenChat(lastJob.jobId, lastJob.appId, profile.id, profile.full_name)}
                    disabled={loadingChatId === profile.id}
                    className="shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingChatId === profile.id ? '...' : '💬 Message'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 bg-slate-50">
                <div className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Paid YTD</p>
                  <p className="text-xl font-black text-green-600">${contractor.totalEarned}</p>
                </div>
                <div className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unpaid / Escrow</p>
                  <p className="text-xl font-black text-amber-500">${contractor.pendingPayments}</p>
                </div>
                <div className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Past Shifts</p>
                  <p className="text-xl font-black text-gray-900">{contractor.eventsWorked}</p>
                </div>
                <div className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Upcoming</p>
                  <p className="text-xl font-black text-indigo-600">{contractor.upcomingShifts}</p>
                </div>
              </div>

              <div className="p-5 bg-white text-sm">
                {lastJob ? (
                  <div className="flex justify-between items-center text-gray-600">
                    <div>
                      <span className="font-bold text-gray-900">Latest Event: </span> 
                      {lastJob.eventName} ({lastJob.role})
                    </div>
                    <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {lastJob.date.toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">No event history found.</span>
                )}
              </div>
              
            </div>
          )
        })}
      </div>
      
      {/* MOUNT THE CHAT WINDOW COMPONENT */}
      {activeChat && (
        <ChatWindow 
          conversationId={activeChat.id} 
          currentUserId={activeChat.id} // Supabase auth gets pulled inside ChatWindow
          otherUserName={activeChat.name} 
          onClose={() => setActiveChat(null)} 
        />
      )}
    </div>
  )
}