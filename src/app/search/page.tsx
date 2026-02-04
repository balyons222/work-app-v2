'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '../../utils/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function SearchContent() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    // If URL has ?q=Something, set it as initial search
    const initialQuery = searchParams.get('q')
    if (initialQuery) setSearchTerm(initialQuery)
    
    fetchContractors(initialQuery || '')
  }, [searchParams])

  async function fetchContractors(query: string = '') {
    setLoading(true)
    
    // 1. Fetch ALL contractors first
    // Note: In a massive app, you'd paginate this. For now, fetching all is faster/easier.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'contractor')
    
    if (error) {
      console.error('Error fetching talent:', error)
      setLoading(false)
      return
    }

    // 2. Client-side filtering (Robust handling for Array vs String skills)
    // This fixes the "no results" issue by safely checking both Name, Location, AND the Skills Array
    const results = data?.filter(profile => {
      const lowerQuery = query.toLowerCase()
      if (!lowerQuery) return true // Show all if no search

      // Check Name
      const nameMatch = profile.full_name?.toLowerCase().includes(lowerQuery)
      
      // Check Location
      const locationMatch = profile.location?.toLowerCase().includes(lowerQuery)
      
      // Check Skills (Handles both Array and legacy String data)
      let skillsMatch = false
      if (Array.isArray(profile.skills)) {
        // If it's an array (New Format), check if ANY skill includes the search term
        skillsMatch = profile.skills.some((skill: string) => 
          skill.toLowerCase().includes(lowerQuery)
        )
      } else if (typeof profile.skills === 'string') {
        // If it's a string (Old Format), check simple text inclusion
        skillsMatch = profile.skills.toLowerCase().includes(lowerQuery)
      }

      return nameMatch || locationMatch || skillsMatch
    })

    setProfiles(data || [])
    setFilteredProfiles(results || [])
    setLoading(false)
  }

  // Handle typing in search box
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    
    // Re-run the filter logic locally (Instant search)
    if (!profiles.length) return

    const results = profiles.filter(profile => {
      const lowerQuery = term.toLowerCase()
      const nameMatch = profile.full_name?.toLowerCase().includes(lowerQuery)
      const locationMatch = profile.location?.toLowerCase().includes(lowerQuery)
      
      let skillsMatch = false
      if (Array.isArray(profile.skills)) {
        skillsMatch = profile.skills.some((skill: string) => 
          skill.toLowerCase().includes(lowerQuery)
        )
      } else if (typeof profile.skills === 'string') {
        skillsMatch = profile.skills.toLowerCase().includes(lowerQuery)
      }

      return nameMatch || locationMatch || skillsMatch
    })
    
    setFilteredProfiles(results)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header & Search Bar */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-primary mb-4">Find Top Talent</h1>
          <p className="text-slate-500 mb-8">Search by name, role, or location (e.g. "Audio", "Austin", "Rigger")</p>
          
          <div className="max-w-xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Search talent..." 
              value={searchTerm}
              onChange={handleSearch}
              className="w-full p-4 pl-12 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-secondary outline-none text-lg"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
            <p className="mt-4 text-slate-400">Searching network...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <div key={profile.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col">
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xl">
                          {profile.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary">{profile.full_name}</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{profile.location || 'Location N/A'}</p>
                    </div>
                  </div>

                  <div className="mb-6 flex-1">
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {profile.bio || <span className="italic text-slate-300">No bio available.</span>}
                    </p>
                  </div>

                  {/* Skills Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.isArray(profile.skills) ? (
                      profile.skills.slice(0, 3).map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                          {skill}
                        </span>
                      ))
                    ) : profile.skills ? (
                      // Handle old string format fallback
                      profile.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">No skills listed</span>
                    )}
                    {(Array.isArray(profile.skills) ? profile.skills.length : (profile.skills?.split(',').length || 0)) > 3 && (
                      <span className="px-2 py-1 text-[10px] text-slate-400">+ more</span>
                    )}
                  </div>

                  <Link 
                    href={`/profile/${profile.id}`} 
                    className="block w-full py-2 text-center bg-primary text-white font-bold rounded-lg hover:bg-slate-800 transition-colors mt-auto"
                  >
                    View Profile
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-lg">No talent found matching "{searchTerm}"</p>
                <button 
                  onClick={() => { setSearchTerm(''); fetchContractors(''); }}
                  className="mt-4 text-secondary font-bold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  )
}
