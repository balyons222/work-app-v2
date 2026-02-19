'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // ✅ Control how many reviews are visible (Default 3)
  const [visibleCount, setVisibleCount] = useState(3)

  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // 1. Fetch Profile Info
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      toast.error('User not found')
      router.push('/dashboard')
      return
    }
    setProfile(data)

    // 2. Fetch Reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id ( full_name, avatar_url, role )
      `)
      .eq('reviewee_id', userId)
      .neq('status', 'removed') 
      .order('created_at', { ascending: false })

    setReviews(reviewsData || [])
    setLoading(false)
  }

  // ✅ HANDLE REPORT (Preserved)
  const handleReport = async (reviewId: string) => {
    const reason = prompt("Why are you reporting this review? (e.g. Spam, Harassment, Fake)")
    if (!reason) return

    const { error } = await supabase
      .from('reviews')
      .update({ 
        status: 'flagged',
        report_reason: reason 
      })
      .eq('id', reviewId)

    if (error) {
      toast.error("Could not report review.")
    } else {
      toast.success("Review flagged for admin attention.")
    }
  }

  // Calculate Average Rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'New'

  const starCount = Math.round(Number(averageRating) || 0)

  if (loading) return <div className="p-20 text-center text-slate-400">Loading Profile...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* 1. PROFILE HEADER CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-slate-900 to-slate-800"></div>
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <div className="h-24 w-24 rounded-full bg-white p-1 shadow-lg">
                <div className="h-full w-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-slate-400">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    profile.full_name?.charAt(0)
                  )}
                </div>
              </div>
              
              {currentUser?.id === userId && (
                <Link href="/setup-profile" className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all">
                  Edit Profile
                </Link>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-1">{profile.full_name}</h1>
              <p className="text-secondary font-bold uppercase text-xs tracking-widest mb-4">
                {profile.role} • {profile.location || 'Location not set'}
              </p>
              
              {/* ✅ DYNAMIC SKILLS SECTION (Replaces Hardcoded Tags) */}
              <div className="flex flex-wrap gap-2 mb-6">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((tag: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                      {tag}
                    </span>
                  ))
                ) : (
                  // Fallback if no specific skills listed
                  <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                    {profile.role || 'General Staff'}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">About</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {profile.bio || "No bio provided yet."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. REPUTATION & REVIEWS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* A. SCORE CARD */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center h-fit">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Reputation Score</h3>
            <div className="text-5xl font-black text-slate-900 mb-2">{averageRating}</div>
            <div className="flex justify-center gap-1 text-yellow-400 text-xl mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < starCount ? "text-yellow-400" : "text-slate-200"}>★</span>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase">{reviews.length} Verified Reviews</p>
          </div>

          {/* B. REVIEWS LIST */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-black text-slate-900">Recent Feedback</h3>
            
            {reviews.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
                No reviews yet. Hire this person to be the first!
              </div>
            ) : (
              <>
                {/* MAP ONLY VISIBLE REVIEWS */}
                {reviews.slice(0, visibleCount).map((review) => (
                  <div key={review.id} className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-secondary/30 transition-all group">
                    
                    {/* Report Button */}
                    {review.status !== 'flagged' && currentUser && (
                      <button 
                        onClick={() => handleReport(review.id)}
                        className="absolute top-4 right-4 text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Report this review"
                      >
                        🏳️ Report
                      </button>
                    )}
                    {review.status === 'flagged' && (
                      <span className="absolute top-4 right-4 text-[10px] font-bold text-red-400 bg-red-50 px-2 py-1 rounded">
                        ⚠️ Under Review
                      </span>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden">
                          {review.reviewer?.avatar_url ? (
                            <img src={review.reviewer.avatar_url} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-slate-400 text-xs">
                              {review.reviewer?.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{review.reviewer?.full_name || 'Anonymous User'}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{review.reviewer?.role || 'Member'}</p>
                        </div>
                      </div>
                      <div className="flex text-yellow-400 text-sm">
                        {[...Array(5)].map((_, i) => (
                           <span key={i} className={i < review.rating ? "text-yellow-400" : "text-slate-200"}>★</span>
                        ))}
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-slate-600 text-sm leading-relaxed">"{review.comment}"</p>
                    )}
                    
                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-4 text-right">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {/* SHOW MORE BUTTON */}
                {visibleCount < reviews.length && (
                  <button 
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="w-full py-3 text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Show More Reviews ({reviews.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> ecd62f0ab7e87e518b07fb4c317602e3389d3228
