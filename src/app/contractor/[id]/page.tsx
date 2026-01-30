import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// This tells Next.js this is a dynamic page that needs the ID from the URL
export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  // 1. Fetch the specific profile using the ID from the URL
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  // 2. If no user found, show a 404
  if (!profile) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Button */}
        <Link href="/search" className="text-slate-500 hover:text-blue-600 mb-6 inline-block font-medium">
          ← Back to Search
        </Link>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-slate-900 h-32 w-full relative">
            <div className="absolute -bottom-12 left-8">
              <div className="w-24 h-24 bg-white p-1 rounded-full">
                <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {profile.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{profile.full_name}</h1>
                <p className="text-slate-500 flex items-center gap-2 mt-2 text-lg">
                  📍 {profile.city || 'Location not listed'}, {profile.state}
                </p>
              </div>
              
              {/* Message Button - Links to your Messages page with this user pre-selected */}
              <Link 
                href={`/messages?workerId=${profile.id}`} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
              >
                Message Me
              </Link>
            </div>

            {/* Divider */}
            <hr className="my-8 border-slate-100" />

            {/* Skills Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Skills & Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills ? (
                  profile.skills.split(',').map((skill: string, i: number) => (
                    <span key={i} className="bg-blue-50 text-blue-700 font-medium px-4 py-2 rounded-lg border border-blue-100">
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No skills listed yet.</span>
                )}
              </div>
            </div>

            {/* About Section (You can add a 'bio' column to Supabase later) */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-600 leading-relaxed">
                {profile.bio || `${profile.full_name} has not added a bio yet.`}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}