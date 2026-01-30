'use client'

import { useState } from 'react'
import { searchContractors } from './actions'

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch(formData: FormData) {
    setIsSearching(true)
    setHasSearched(true)
    const data = await searchContractors(formData)
    setResults(data || [])
    setIsSearching(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Find the perfect talent.
          </h1>
          <p className="text-slate-500 mb-8 max-w-2xl text-lg">
            Search our network of verified professionals by location or skill set.
          </p>

          {/* Search Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100 max-w-3xl">
            <form action={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3.5 text-slate-400">📍</span>
                <input 
                  name="location" 
                  type="text" 
                  placeholder="City or State (e.g. Chicago)" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3.5 text-slate-400">💼</span>
                <input 
                  name="skill" 
                  type="text" 
                  placeholder="Skill (e.g. Bartender)" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {hasSearched && (
          <h2 className="text-slate-400 font-medium mb-6 uppercase tracking-wider text-sm">
            {results.length} Result{results.length !== 1 && 's'} Found
          </h2>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((profile) => (
            <div key={profile.id} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              
              {/* Header: Avatar & Name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {profile.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                      {profile.full_name}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <span>📍</span> {profile.city || 'Remote'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {profile.skills ? (
                    profile.skills.split(',').map((skill: string, i: number) => (
                      <span key={i} className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">No skills listed</span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                View Profile
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {hasSearched && results.length === 0 && !isSearching && (
          <div className="text-center py-20">
            <div className="inline-block p-6 rounded-full bg-slate-100 mb-4 text-4xl">
              🔍
            </div>
            <h3 className="text-xl font-bold text-slate-900">No matches found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search terms or location.</p>
          </div>
        )}
      </div>
    </div>
  )
}