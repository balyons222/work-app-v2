import { createClient } from '@/src/utils/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// This generates the page for each unique profile ID
export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 1. Fetch the specific profile by ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  // 2. If no profile is found, show the 404 page
  if (!profile) {
    notFound()
  }

  // Helper to handle skills whether they are String or Array
  const renderSkills = () => {
    let skillsArray: string[] = []
    
    if (Array.isArray(profile.skills)) {
      skillsArray = profile.skills
    } else if (typeof profile.skills === 'string') {
      skillsArray = profile.skills.split(',')
    }

    return skillsArray.map((skill, i) => (
      <span key={i} className="px-3 py-1 bg-teal-50 text-secondary border border-teal-100 text-xs font-bold uppercase rounded-md">
        {skill.trim()}
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Button */}
        <Link href="/search" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Search
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header / Avatar */}
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
              <div className="mt-4 inline-block px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest">
                {profile.role}
              </div>
            </div>
          </div>

          {/* Details Section */}
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
                  {renderSkills().length > 0 ? renderSkills() : (
                    <span className="text-slate-400 italic">No skills listed</span>
                  )}
                </div>
              </section>

              {/* Action Button (Optional - Message/Hire) */}
              <section className="pt-8 border-t border-slate-200">
                 <button className="w-full md:w-auto px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg">
                   Contact {profile.full_name.split(' ')[0]}
                 </button>
              </section>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
