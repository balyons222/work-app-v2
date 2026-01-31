'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

export default function SetupProfile() {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('contractor') // default
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          role: role,
          updated_at: new Date(),
        })

      if (!error) {
        router.push(role === 'contractor' ? '/search' : '/jobs/new')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-primary mb-2">Complete Your Profile</h1>
        <p className="text-slate-500 mb-8">Tell us who you are before you get to work.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Full Name</label>
            <input 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
              placeholder="John Doe"
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-primary mb-2">I am a...</label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="contractor">Event Professional (Looking for work)</option>
              <option value="organizer">Event Organizer (Hiring talent)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-secondary hover:bg-teal-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            {loading ? 'Saving...' : 'Start Using FxD'}
          </button>
        </form>
      </div>
    </div>
  )
}