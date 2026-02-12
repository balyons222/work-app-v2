'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'

export default function InviteTalentModal({ eventId, onClose }: { eventId: string, onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, location')
      .eq('role', 'contractor')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(5)

    if (error) {
      console.error(error)
      toast.error("Search failed")
    } else {
      setResults(data || [])
    }
    setLoading(false)
  }

  const sendInvite = async (talentId: string) => {
    // 1. Insert the invitation into the database
    const { error } = await supabase
      .from('event_invitations')
      .insert({ 
        event_id: eventId, 
        invitee_id: talentId,
        status: 'pending' 
      })

    if (error) {
      if (error.code === '23505') {
        toast.error("This person is already invited.")
      } else {
        console.error(error)
        toast.error("Invite failed")
      }
    } else {
      // 2. ✅ TRIGGER NOTIFICATION (Success Path)
      await sendNotification({
        userId: talentId, // Use the actual ID passed to this function
        title: "You're Invited! 🎟️",
        message: "You have been invited to an exclusive event. Check your dashboard.",
        link: "/dashboard",
        type: "info"
      })

      toast.success("Invitation sent!")
      // Optional: Remove them from the list so you don't invite again immediately
      setResults(prev => prev.filter(p => p.id !== talentId))
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900">Invite Talent</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>

        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Search by name..." 
            className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} className="bg-black text-white px-4 rounded-xl font-bold disabled:opacity-50">
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {results.map(person => (
            <div key={person.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} className="h-full w-full object-cover" alt={person.full_name} />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{person.full_name?.[0]}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{person.full_name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{person.location || 'Remote'}</p>
                </div>
              </div>
              <button 
                onClick={() => sendInvite(person.id)}
                className="text-xs font-bold text-secondary bg-white border border-secondary/20 px-3 py-1 rounded-lg hover:bg-secondary hover:text-white transition-all"
              >
                Invite
              </button>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <p className="text-center text-slate-400 text-sm py-4">
              {searchTerm ? 'No contractors found.' : 'Search for talent to invite.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
