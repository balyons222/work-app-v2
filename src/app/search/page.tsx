'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '../../utils/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function SearchContent() {
  const [allProfiles, setAllProfiles] = useState<any[]>([]) 
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([])
  const [visibleCount, setVisibleCount] = useState(6)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
   
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery) setSearchTerm(initialQuery)
    fetchContractors(initialQuery || '')
  }, [searchParams])

  async function fetchContractors(query: string = '') {
    setLoading(true)
    
    // 1. FAILSAFE QUERY: Fetch ALL profiles first (No 'eq' filters)
    // We also verify if reviews can be joined. If this fails, we will fallback.
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        reviews!reviewee_id (rating)
      `)
    
    if (error) {
      console.error('Error fetching talent:', error)
      setLoading(false)
      return
    }

    // 2. JAVASCRIPT FILTERING (More robust than DB filtering for mismatched roles)
    // We manually check if role is 'contractor' OR 'worker' (Case insensitive)
    const workersOnly = data?.filter(p => {
       const role = p.role ? p.role.toLowerCase() : ''
       return role === 'contractor' || role === 'worker' || role === 'event professional'
    }) || []

    // 3. Process Ratings
    const profilesWithRating = workersOnly.map(p => {
      const ratings = p.reviews?.map((r: any) => r.rating) || []
      const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0
      return { ...p, avgRating: avg, reviewCount: ratings.length }
    })

    // 4. Sort: Highest Rated First
    const sortedProfiles = profilesWithRating.sort((a, b) => b.avgRating - a.avgRating)
    
    setAllProfiles(sortedProfiles)
    applyFilter(sortedProfiles, query)
    setLoading(false)
  }

  const applyFilter = (data: any[], query: string) => {
    const lowerQuery = query.toLowerCase()
    
    const results = data.filter(profile => {
      if (!lowerQuery) return true 
      const nameMatch = profile.full_name?.toLowerCase().includes(lowerQuery)
      const locationMatch = profile.location?.toLowerCase().includes(lowerQuery)
      const roleMatch = profile.role?.toLowerCase().includes(lowerQuery)
      
      let skillsMatch = false
      if (Array.isArray(profile.skills)) {
        skillsMatch = profile.skills.some((skill: string) => skill.toLowerCase().includes(lowerQuery))
      } else if (typeof profile.skills === 'string') {
        skillsMatch = profile.skills.toLowerCase().includes(lowerQuery)
      }

      return nameMatch || locationMatch || roleMatch || skillsMatch
    })

    setFilteredProfiles(results)
    setVisibleCount(6) 
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    applyFilter(allProfiles, term)
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 6)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-primary mb-4">Find Top Talent</h1>
          <p className="text-slate-500 mb-8">Search by name, role, or location</p>
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

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
            <p className="mt-4 text-slate-400">Searching network...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.slice(0, visibleCount).map((profile) => (
                  <div key={profile.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xl">
                            {profile.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        
                        {/* --- UPDATED: Name & Badge Container --- */}
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-lg text-primary truncate">{profile.full_name}</h3>
                          
                          {/* VERIFIED REFERRAL BADGE */}
                          {profile.referred_by && (
                            <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full" title="Invited by a trusted network member">
                              <svg className="w-2.5 h-2.5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-[9px] font-black text-secondary uppercase tracking-wider">
                                Verified
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 uppercase tracking-wide truncate">{profile.location || 'Location N/A'}</p>
                        
                        {profile.avgRating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                             <span className="text-yellow-400 text-xs">★</span>
                             <span className="text-xs font-bold text-slate-700">{profile.avgRating.toFixed(1)}</span>
                             <span className="text-[10px] text-slate-400">({profile.reviewCount})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-6 flex-1">
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {profile.bio || <span className="italic text-slate-300">No bio available.</span>}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {Array.isArray(profile.skills) ? (
                        profile.skills.slice(0, 3).map((skill: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{skill}</span>
                        ))
                      ) : profile.skills ? (
                        profile.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{skill}</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">No skills listed</span>
                      )}
                    </div>

                    <Link href={`/profile/${profile.id}`} className="block w-full py-2 text-center bg-primary text-white font-bold rounded-lg hover:bg-slate-800 transition-colors mt-auto">
                      View Profile
                    </Link>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-lg">No talent found.</p>
                  <button onClick={() => { setSearchTerm(''); applyFilter(allProfiles, ''); }} className="mt-4 text-secondary font-bold hover:underline">
                    Clear search
                  </button>
                </div>
              )}
            </div>

            {visibleCount < filteredProfiles.length && (
               <div className="mt-12 text-center">
                 <button onClick={handleLoadMore} className="bg-white border border-slate-300 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                   Load More Talent ↓
                 </button>
               </div>
            )}
          </>
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