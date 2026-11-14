import { createClient } from '../../../utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PUBLIC_PROFILE_COLUMNS } from '@/src/utils/profileColumns'

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  // 1. Fetch the specific profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', params.id)
    .single()

  // 2. If no user found, show a 404
  if (!profile) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <Link href="/search" className="text-primary hover:text-secondary mb-6 inline-block font-medium transition-colors">
          ← Back to Search
        </Link>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-primary h-32 w-full relative">
            <div className="absolute -bottom-12 left-8">
              <div className="w-24 h-24 bg-white p-1 rounded-full shadow-sm">
                {/* Avatar: Uses uploaded image if available, else falls back to initial */}
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name ?? ''} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {profile.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary">{profile.full_name}</h1>
                <p className="text-slate-500 flex items-center gap-2 mt-2 text-lg">
                  📍 {profile.location || 'Location not listed'}
                </p>
              </div>
              
              <Link 
                href={`/messages?workerId=${profile.id}`} 
                className="bg-secondary hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md text-center w-full md:w-auto"
              >
                Message Me
              </Link>
            </div>

            {/* Quick Stats Row (NEW) */}
            <div className="flex flex-wrap gap-6 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Experience</p>
                <p className="font-bold text-primary">{profile.years_experience || 0} Years</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Travel</p>
                <p className="font-bold text-primary">{profile.will_travel ? 'Willing to Travel' : 'Local Only'}</p>
              </div>
            </div>

            <hr className="my-8 border-slate-100" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column: Details */}
              <div className="md:col-span-2 space-y-8">
                {/* About Section */}
                <div>
                  <h2 className="text-lg font-bold text-primary mb-4">About</h2>
                  <p className="text-slate-600 leading-relaxed">
                    {profile.bio || `${profile.full_name} has not added a bio yet.`}
                  </p>
                </div>

                {/* Portfolio Gallery (NEW) */}
                {profile.portfolio_urls && profile.portfolio_urls.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-primary mb-4">Work Portfolio</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {profile.portfolio_urls.map((url: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          <img 
                            src={url} 
                            alt={`Portfolio image ${index + 1}`} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Skills & Certs */}
              <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100 h-fit">
                {/* Skills */}
                <div>
                  <h3 className="font-bold text-primary mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills ? (
                      (Array.isArray(profile.skills) ? profile.skills : String(profile.skills).split(',')).map((skill: string, i: number) => (
                        <span key={i} className="bg-teal-50 text-teal-800 text-sm font-medium px-3 py-1 rounded-md border border-teal-100">
                          {skill.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-sm">None listed.</span>
                    )}
                  </div>
                </div>

                {/* Certifications (NEW) */}
                <div>
                  <h3 className="font-bold text-primary mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications ? (
                      profile.certifications.split(',').map((cert: string, i: number) => (
                        <span key={i} className="bg-indigo-50 text-indigo-800 text-sm font-medium px-3 py-1 rounded-md border border-indigo-100">
                          {cert.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-sm">None listed.</span>
                    )}
                  </div>
                </div>

                {/* Keywords (NEW) - Usually hidden, but useful for tags */}
                {profile.keywords && (
                  <div>
                    <h3 className="font-bold text-primary mb-3">Expertise Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {profile.keywords.split(',').map((kw: string, i: number) => (
                        <span key={i} className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                          #{kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}