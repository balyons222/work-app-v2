'use client'

import { useEffect, useState } from 'react'
// ✅ FIXED: Use absolute path with @ alias
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
// ✅ FIXED: Use absolute path with @ alias
import StarRating from '@/src/components/StarRating'

export default function PublicProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  // safely cast the param to string
  const profileId = params?.id as string

  useEffect(() => {
    async function loadProfile() {
      if (!profileId) return

      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // 2. Fetch the Profile being viewed
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        toast.error('Profile not found')
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    loadProfile()
  }, [profileId, supabase])

  const handleContact = async () => {
    if (!currentUser) {
      toast.error('Please log in to contact this user')
      router.push('/login')
      return
    }
    toast.success(`Feature coming soon: Chat with ${profile.full_name}`)
  }

  // Helper for Skills
  const renderSkills = () => {
    if (!profile?.skills) return <span className="text-slate-400 italic">No skills listed</span>
    
    let skillsArray = []
    if (Array.isArray(profile.skills)) {
      skillsArray = profile.skills
    } else if (typeof profile.skills === 'string') {
      skillsArray = profile.skills.split(',')
    }

    return skillsArray.map((s: string, i: number) => (
      <span key={i} className="px-3 py-1 bg-teal-50 text-secondary border border-teal-100 text-xs font-bold uppercase rounded-md">
        {s.trim()}
      </span>
    ))
  }

  if (loading) return <div className="p-20 text-center">Loading Profile...</div>
  if (!profile) return <div className="p-20 text-center">Profile not found.</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Button */}
        <Link href="/search" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Search
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 border-b border-slate-100">
            <div className="h-32 w-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-slate-300">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black text-primary mb-2">{profile.full_name}</h1>
              <p className="text-lg text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2">
                📍 {profile.location || 'Location Not Set'}
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest">
                  {profile.role}
                </span>
                {/* StarRating Component */}
                <StarRating userId={profile.id} readOnly />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 md:p-12 bg-slate-50/50">
            <div className="grid gap-10">
              
              {/* Bio */}
              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">About</h3>
                <p className="text-slate-700 leading-relaxed text-lg">
                  {profile.bio || "This user hasn't written a bio yet."}
                </p>
              </section>

              {/* Skills */}
              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                  {profile.role === 'organizer' ? 'Events Managed' : 'Skills & Roles'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {renderSkills()}
                </div>
              </section>

              {/* Actions */}
              <section className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                 {currentUser?.id !== profile.id && (
                   <button 
                    onClick={handleContact}
                    className="flex-1 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                   >
                     Message {profile.full_name.split(' ')[0]}
                   </button>
                 )}
              </section>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}