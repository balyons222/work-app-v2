'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { createClient } from '../../utils/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PUBLIC_PROFILE_COLUMNS } from '@/src/utils/profileColumns'
import CompletedJobsBadge from '@/src/components/CompletedJobsBadge'
import ProBadge from '@/src/components/ProBadge'
import { isContractorPro, isOrganizerHub } from '@/src/config/subscriptions'

// Advanced filters are an Organizer Hub benefit. Profiles' public columns are readable by anyone,
// so this gate is a product feature, not a security boundary.
type Filters = {
  location: string
  minRating: number
  minJobs: number
  maxRate: string
  minYears: number
  willTravel: boolean
  verifiedOnly: boolean
  sort: 'recommended' | 'rating' | 'jobs' | 'rate'
}

const NO_FILTERS: Filters = {
  location: '', minRating: 0, minJobs: 0, maxRate: '', minYears: 0, willTravel: false, verifiedOnly: false, sort: 'recommended',
}

// Recommended order: Contractor Pro first (priority placement), then rating, then completed jobs
function recommendedOrder(a: any, b: any) {
  return (Number(b.isPro) - Number(a.isPro))
    || (b.avgRating - a.avgRating)
    || ((b.completed_jobs ?? 0) - (a.completed_jobs ?? 0))
}

function matchesQuery(profile: any, lowerQuery: string) {
  if (!lowerQuery) return true
  const skills = Array.isArray(profile.skills)
    ? profile.skills
    : typeof profile.skills === 'string' ? profile.skills.split(',') : []
  return [profile.full_name, profile.location, profile.role, ...skills]
    .some((v: any) => typeof v === 'string' && v.toLowerCase().includes(lowerQuery))
}

function SearchContent() {
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [visibleCount, setVisibleCount] = useState(6)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewerTier, setViewerTier] = useState<string | null>(null)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()
  const searchParams = useSearchParams()
  const hasHub = isOrganizerHub(viewerTier)
  const isOrganizer = (viewerRole || '').toLowerCase() === 'organizer'

  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery) setSearchTerm(initialQuery)
    fetchContractors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function fetchContractors() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: me } = await supabase.from('profiles').select('plan_tier, role').eq('id', user.id).maybeSingle()
      setViewerTier(me?.plan_tier ?? null)
      setViewerRole(me?.role ?? null)
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        ${PUBLIC_PROFILE_COLUMNS},
        reviews!reviewee_id (rating)
      `)

    if (error) {
      console.error('Error fetching talent:', error)
      setLoading(false)
      return
    }

    // Contractors only (role names vary), minus anyone who turned off "Show me in Find Talent"
    const workersOnly = (data || []).filter(p => {
      const role = p.role ? p.role.toLowerCase() : ''
      if (p.is_private) return false
      return role === 'contractor' || role === 'worker' || role === 'event professional'
    })

    const profiles = workersOnly.map(p => {
      const ratings = p.reviews?.map((r: any) => r.rating) || []
      const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0
      return { ...p, avgRating: avg, reviewCount: ratings.length, isPro: isContractorPro(p.plan_tier) }
    })

    setAllProfiles(profiles.sort(recommendedOrder))
    setLoading(false)
  }

  // Free text search for everyone; advanced filters and sorting only apply for Organizer Hub
  const results = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    let list = allProfiles.filter(p => matchesQuery(p, q))
    if (!hasHub) return list

    const f = filters
    const loc = f.location.trim().toLowerCase()
    const maxRate = f.maxRate === '' ? null : Number(f.maxRate)
    list = list.filter(p => {
      if (loc && ![p.location, p.city, p.state].some((v: any) => typeof v === 'string' && v.toLowerCase().includes(loc))) return false
      if (f.minRating && p.avgRating < f.minRating) return false
      if (f.minJobs && (p.completed_jobs ?? 0) < f.minJobs) return false
      if (maxRate !== null && !isNaN(maxRate) && (p.hourly_rate == null || Number(p.hourly_rate) > maxRate)) return false
      if (f.minYears && (p.years_experience ?? 0) < f.minYears) return false
      if (f.willTravel && !p.will_travel) return false
      if (f.verifiedOnly && !p.is_location_verified) return false
      return true
    })

    if (f.sort === 'rating') list = [...list].sort((a, b) => (b.avgRating - a.avgRating) || recommendedOrder(a, b))
    if (f.sort === 'jobs') list = [...list].sort((a, b) => ((b.completed_jobs ?? 0) - (a.completed_jobs ?? 0)) || recommendedOrder(a, b))
    if (f.sort === 'rate') list = [...list].sort((a, b) => (Number(a.hourly_rate ?? Infinity) - Number(b.hourly_rate ?? Infinity)) || recommendedOrder(a, b))
    return list
  }, [allProfiles, searchTerm, filters, hasHub])

  useEffect(() => { setVisibleCount(6) }, [searchTerm, filters])

  const activeFilterCount = hasHub
    ? [filters.location.trim(), filters.minRating, filters.minJobs, filters.maxRate, filters.minYears, filters.willTravel, filters.verifiedOnly, filters.sort !== 'recommended']
        .filter(Boolean).length
    : 0

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters(prev => ({ ...prev, [key]: value }))
  const clearAll = () => { setSearchTerm(''); setFilters(NO_FILTERS) }

  const selectClass = 'w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none'
  const labelClass = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1'

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-primary mb-4">Find Top Talent</h1>
          <p className="text-slate-500 mb-8">Search by name, role, skill, or location</p>
          <div className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search talent..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-secondary outline-none text-lg"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            </div>
            {(hasHub || isOrganizer) && (
              <button
                onClick={() => setShowFilters(s => !s)}
                className={`shrink-0 px-4 rounded-xl border font-bold text-sm shadow-sm transition-colors ${
                  showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                aria-expanded={showFilters}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}{!hasHub && ' 🔒'}
              </button>
            )}
          </div>
        </div>

        {showFilters && (hasHub ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>City or state</label>
                <input type="text" value={filters.location} onChange={e => setFilter('location', e.target.value)}
                  placeholder="e.g. Austin or TX" className={selectClass} />
              </div>
              <div>
                <label className={labelClass}>Rating</label>
                <select value={filters.minRating} onChange={e => setFilter('minRating', Number(e.target.value))} className={selectClass}>
                  <option value={0}>Any</option>
                  <option value={3}>3★ and up</option>
                  <option value={4}>4★ and up</option>
                  <option value={4.5}>4.5★ and up</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Jobs completed</label>
                <select value={filters.minJobs} onChange={e => setFilter('minJobs', Number(e.target.value))} className={selectClass}>
                  <option value={0}>Any</option>
                  <option value={1}>1 or more</option>
                  <option value={5}>5 or more</option>
                  <option value={10}>10 or more</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Max hourly rate ($)</label>
                <input type="number" min={0} value={filters.maxRate} onChange={e => setFilter('maxRate', e.target.value)}
                  placeholder="Any" className={selectClass} />
              </div>
              <div>
                <label className={labelClass}>Experience</label>
                <select value={filters.minYears} onChange={e => setFilter('minYears', Number(e.target.value))} className={selectClass}>
                  <option value={0}>Any</option>
                  <option value={1}>1+ years</option>
                  <option value={3}>3+ years</option>
                  <option value={5}>5+ years</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Sort by</label>
                <select value={filters.sort} onChange={e => setFilter('sort', e.target.value as Filters['sort'])} className={selectClass}>
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest rated</option>
                  <option value="jobs">Most jobs completed</option>
                  <option value="rate">Lowest hourly rate</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={filters.willTravel} onChange={e => setFilter('willTravel', e.target.checked)} />
                  Willing to travel
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={filters.verifiedOnly} onChange={e => setFilter('verifiedOnly', e.target.checked)} />
                  Location verified
                </label>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 text-sm">
              <span className="text-slate-500">{results.length} {results.length === 1 ? 'match' : 'matches'}</span>
              <button onClick={() => setFilters(NO_FILTERS)} className="font-bold text-secondary hover:underline">Reset filters</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 text-center">
            <p className="font-black text-primary mb-1">Advanced filters are part of Organizer Hub</p>
            <p className="text-sm text-slate-500 mb-4">
              Filter by location, rating, jobs completed, hourly rate, experience and travel, and sort the results your way.
            </p>
            <Link href="/pricing" className="inline-block bg-primary text-white font-bold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
              See Organizer Hub
            </Link>
          </div>
        ))}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
            <p className="mt-4 text-slate-400">Searching network...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.length > 0 ? (
                results.slice(0, visibleCount).map((profile) => (
                  <div key={profile.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col group ${
                    profile.isPro ? 'border-amber-200' : 'border-slate-100'
                  }`}>
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
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-lg text-primary truncate">{profile.full_name}</h3>
                          {profile.isPro && <ProBadge />}
                        </div>

                        <p className="text-xs text-slate-500 uppercase tracking-wide truncate">{profile.location || 'Location N/A'}</p>
                        {profile.typical_availability && (
                          <p className="text-[11px] text-secondary font-bold truncate">Available: {profile.typical_availability}</p>
                        )}

                        {profile.avgRating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                             <span className="text-yellow-400 text-xs">★</span>
                             <span className="text-xs font-bold text-slate-700">{profile.avgRating.toFixed(1)}</span>
                             <span className="text-[10px] text-slate-400">({profile.reviewCount})</span>
                          </div>
                        )}
                        <div className="mt-1">
                          <CompletedJobsBadge count={profile.completed_jobs} />
                        </div>
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
                  <button onClick={clearAll} className="mt-4 text-secondary font-bold hover:underline">
                    Clear search{activeFilterCount > 0 ? ' and filters' : ''}
                  </button>
                </div>
              )}
            </div>

            {visibleCount < results.length && (
               <div className="mt-12 text-center">
                 <button onClick={() => setVisibleCount(prev => prev + 6)} className="bg-white border border-slate-300 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95">
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
