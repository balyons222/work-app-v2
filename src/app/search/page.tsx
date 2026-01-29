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
    
    // Call the server action we created in Step 2
    const data = await searchContractors(formData)
    setResults(data || [])
    
    setIsSearching(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Find Contractors</h1>

        {/* Search Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <form action={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input 
                name="location" 
                type="text" 
                placeholder="e.g. New York, NY" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill / Role</label>
              <input 
                name="skill" 
                type="text" 
                placeholder="e.g. Bartender, Security" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={isSearching}
                className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((profile) => (
            <div key={profile.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                  {profile.full_name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{profile.full_name}</h3>
                  <p className="text-sm text-gray-500">{profile.city || 'Unknown Location'}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills ? (
                    profile.skills.split(',').map((skill: string, i: number) => (
                      <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm italic">No skills listed</span>
                  )}
                </div>
              </div>

              <button className="w-full border border-blue-600 text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors">
                View Profile
              </button>
            </div>
          ))}
        </div>

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="text-center py-12 text-gray-500">
            No contractors found. Try changing your search terms.
          </div>
        )}
      </div>
    </div>
  )
}