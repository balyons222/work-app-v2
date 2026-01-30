import { createClient } from '../../../utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  // 1. Fetch the specific profile
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
        <Link href="/search" className="text-primary hover:text-secondary mb-6 inline-block font-medium transition-colors">
          ← Back to Search
        </Link>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Section - Now using Brand Navy */}
          <div className="bg-primary h-32 w-full relative">
            <div className="absolute -bottom-12 left-8">
              <div className="w-24 h-24 bg-white p-1 rounded-full">
                {/* Avatar Circle - Now using Brand Teal */}
                <div className="w-full h-full bg-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {profile.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary">{profile.full_name}</h1>
                <p className="text-slate-500 flex items-center gap-2 mt-2 text-lg">
                  📍 {profile.city || 'Location not listed'}, {profile.state}
                </p>
              </div>
              
              {/* Message Button - Now using Brand Teal */}
              <Link 
                href={`/messages?workerId=${profile.id}`} 
                className="bg-secondary hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md text-center w-full md:w-auto"
              >
                Message Me
              </Link>
            </div>

            {/* Divider */}
            <hr className="my-8 border-slate-100" />

            {/* Skills Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-primary mb-4">Skills & Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills ? (
                  profile.skills.split(',').map((skill: string, i: number) => (
                    // Skill Tags - Light Teal background, Dark Navy text
                    <span key={i} className="bg-teal-50 text-primary font-medium px-4 py-2 rounded-lg border border-teal-100">
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No skills listed yet.</span>
                )}
              </div>
            </div>

            {/* About Section */}
            <div>
              <h2 className="text-lg font-bold text-primary mb-4">About</h2>
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