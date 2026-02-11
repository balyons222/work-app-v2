'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

export default function InviteTalentModal({ eventId, onClose }: { eventId: string, onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSearch = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, location')
      .eq('role', 'contractor')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(5)

    if (error) toast.error("Search failed")
    else setResults(data || [])
    setLoading(false)
  }

  const sendInvite = async (talentId: string) => {
    const { error } = await supabase
      .from('event_invitations')
      .insert({ event_id: eventId, invitee_id: talentId })

    if (error) {
      if (error.code === '23505') toast.error("Already invited")
      else toast.error("Invite failed")
    } else {
      toast.success("Invitation sent!")
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
          />
          <button onClick={handleSearch} className="bg-black text-white px-4 rounded-xl font-bold">Search</button>
        </div>

        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {results.map(person => (
            <div key={person.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                  {person.avatar_url && <img src={person.avatar_url} className="h-full w-full object-cover" />}
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
          {results.length === 0 && !loading && <p className="text-center text-slate-400 text-sm py-4">Search for talent to invite.</p>}
        </div>
      </div>
    </div>
  )
}
