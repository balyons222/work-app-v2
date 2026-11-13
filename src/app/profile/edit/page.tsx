'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getPlanLimits } from '@/src/config/subscriptions'
import { ROLE_CATEGORIES } from '@/src/config/roles'

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')
  const [willTravel, setWillTravel] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [certs, setCerts] = useState('')
  const [bio, setBio] = useState('')
  const [keywords, setKeywords] = useState('')
  
  // Subscription State
  const [planTier, setPlanTier] = useState('free')
  
  // File State (New Uploads)
  const [headshot, setHeadshot] = useState<File | null>(null)
  const [portfolioFiles, setPortfolioFiles] = useState<FileList | null>(null)

  // Existing Data State (Visuals)
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null)
  const [existingPortfolio, setExistingPortfolio] = useState<string[]>([])

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUserAndProfile()
  }, [])

  async function loadUserAndProfile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      toast.error("User not found. Please log in.")
      router.push('/login')
      return
    }

    setUser(user)

    const { data: profile } = await supabase
      .from('my_profile')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || '')
      setLocation(profile.location || '')
      setExperience(profile.years_experience?.toString() || '')
      setWillTravel(profile.will_travel || false)
      setSelectedRoles(
        Array.isArray(profile.skills) 
          ? profile.skills 
          : typeof profile.skills === 'string' 
            ? profile.skills.split(',').map((s: string) => s.trim()) 
            : []
      )
      setCerts(profile.certifications || '')
      setBio(profile.bio || '')
      setKeywords(profile.keywords || '')
      setPlanTier(profile.plan_tier || 'free')
      
      // Set existing images
      setExistingAvatar(profile.avatar_url || null)
      setExistingPortfolio(profile.portfolio_urls || [])
    }
    
    setLoading(false)
  }

  // --- UPLOAD HELPER ---
  async function uploadFile(file: File, userId: string, folder: string) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const filePath = `${userId}/${folder}/${Date.now()}_${cleanName}`
    
    const { error } = await supabase.storage.from('images').upload(filePath, file)
    if (error) throw error

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  // --- REMOVE EXISTING IMAGE ---
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingPortfolio(prev => prev.filter(url => url !== urlToRemove))
  }

  // --- SAVE FUNCTION ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const loadingToast = toast.loading("Saving profile...")

    try {
      if (!user) throw new Error("Not authenticated")

      let avatarUrl = existingAvatar
      let finalPortfolioUrls = [...existingPortfolio]

      // 1. Upload Headshot if a new one was selected
      if (headshot) {
        toast.loading("Uploading headshot...", { id: loadingToast })
        avatarUrl = await uploadFile(headshot, user.id, 'avatar')
      }

      // 2. Upload NEW Portfolio Images
      if (portfolioFiles && portfolioFiles.length > 0) {
        const limits = getPlanLimits(planTier)
        
        // Ensure old images + new images don't exceed limit
        if ((finalPortfolioUrls.length + portfolioFiles.length) > limits.maxImages) {
          throw new Error(`Your ${planTier} plan allows a maximum of ${limits.maxImages} total images.`)
        }

        toast.loading(`Uploading ${portfolioFiles.length} new portfolio images...`, { id: loadingToast })
        
        for (let i = 0; i < portfolioFiles.length; i++) {
          const url = await uploadFile(portfolioFiles[i], user.id, 'portfolio')
          finalPortfolioUrls.push(url)
        }
      }

      // 3. Save to Database
      toast.loading("Updating database...", { id: loadingToast })
      const updates: any = {
        id: user.id,
        full_name: fullName,
        location,
        years_experience: parseInt(experience) || 0,
        will_travel: willTravel,
        skills: selectedRoles, 
        certifications: certs,
        bio,
        keywords,
        avatar_url: avatarUrl,
        portfolio_urls: finalPortfolioUrls,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('profiles').upsert(updates)
      
      if (error) {
        console.error("🚨 Supabase Raw Error:", JSON.stringify(error, null, 2))
        throw new Error(error.message || "Database update failed")
      }

      toast.success("Profile saved successfully!", { id: loadingToast })
      router.push('/dashboard')

    } catch (error: any) {
      console.error("Caught Error:", error)
      toast.error(error.message || "Failed to save profile", { id: loadingToast })
    } finally {
      setSaving(false)
    }
  }

  const currentLimits = getPlanLimits(planTier)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 font-medium">Cancel</Link>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          
          {/* Headshot Section */}
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-slate-200 rounded-full overflow-hidden shrink-0 border border-slate-300">
              {headshot ? (
                <img src={URL.createObjectURL(headshot)} alt="New preview" className="h-full w-full object-cover" />
              ) : existingAvatar ? (
                <img src={existingAvatar} alt="Current avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-bold">No Image</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Profile Photo (Headshot)</label>
              <input type="file" accept="image/*" onChange={(e) => setHeadshot(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-700">Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-700">Location (City, State)</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-700">Years of Experience</label>
              <input type="number" value={experience} onChange={e => setExperience(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center pt-6">
              <input type="checkbox" id="travel" checked={willTravel} onChange={e => setWillTravel(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <label htmlFor="travel" className="ml-2 text-sm font-bold text-slate-700">Willing to travel for events?</label>
            </div>
          </div>

          {/* Categorized Roles / Skills */}
          <div>
            <label className="block text-sm font-black mb-4 text-slate-900 text-lg">Roles You Work</label>
            
            {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
              <div key={category} className="mb-6 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{category}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roles.map((role) => (
                    <label 
                      key={role} 
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRoles.includes(role) 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role])
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role))
                          }
                        }}
                      />
                      <span className="text-sm font-bold">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Certifications</label>
            <input type="text" value={certs} onChange={e => setCerts(e.target.value)} placeholder="TIPS, ServSafe..." className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Professional Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          {/* DYNAMIC Portfolio Images Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-end mb-4">
              <label className="block text-sm font-bold text-slate-700">
                Work Portfolio
              </label>
              <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-1 rounded capitalize">
                {planTier} Plan: {currentLimits.maxImages} Images Max
              </span>
            </div>

            {/* Display Existing Images */}
            {existingPortfolio.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {existingPortfolio.map((url, idx) => (
                  <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={url} className="w-full h-full object-cover" alt={`Portfolio ${idx}`} />
                    <button 
                      type="button"
                      onClick={() => handleRemoveExistingImage(url)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold shadow-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={(e) => {
                const files = e.target.files
                if (files && (existingPortfolio.length + files.length > currentLimits.maxImages)) {
                  toast.error(`Your plan allows up to ${currentLimits.maxImages} total images. You currently have ${existingPortfolio.length}.`)
                  e.target.value = '' // Reset input
                  setPortfolioFiles(null)
                } else {
                  setPortfolioFiles(files)
                }
              }} 
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" 
            />

            {/* Upsell for Free Users */}
            {planTier === 'free' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <p className="text-sm text-amber-900 font-bold">Want to show more of your work?</p>
                  <p className="text-xs text-amber-700 mt-1">Upgrade to Premium to upload up to 10 portfolio images.</p>
                </div>
                <Link href="/pricing" className="text-sm bg-amber-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-600 transition shadow-sm whitespace-nowrap ml-4">
                  Upgrade
                </Link>
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full bg-indigo-900 text-white py-3 rounded-xl font-bold mt-4 hover:bg-indigo-800 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}