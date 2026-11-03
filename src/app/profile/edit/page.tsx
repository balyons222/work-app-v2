'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')
  const [willTravel, setWillTravel] = useState(false)
  const [skills, setSkills] = useState('')
  const [certs, setCerts] = useState('')
  const [bio, setBio] = useState('')
  const [keywords, setKeywords] = useState('')
  
  // File State
  const [headshot, setHeadshot] = useState<File | null>(null)
  const [portfolioFiles, setPortfolioFiles] = useState<FileList | null>(null)

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

    // Fetch existing profile data to pre-fill the form
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || '')
      setLocation(profile.location || '')
      setExperience(profile.years_experience?.toString() || '')
      setWillTravel(profile.will_travel || false)
      setSkills(profile.skills || '')
      setCerts(profile.certifications || '')
      setBio(profile.bio || '')
      setKeywords(profile.keywords || '')
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

  // --- SAVE FUNCTION ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const loadingToast = toast.loading("Saving profile...")

    try {
      if (!user) throw new Error("Not authenticated")

      let avatarUrl = undefined
      let portfolioUrls = []

      // 1. Upload Headshot if selected
      if (headshot) {
        toast.loading("Uploading headshot...", { id: loadingToast })
        avatarUrl = await uploadFile(headshot, user.id, 'avatar')
      }

      // 2. Upload Portfolio Images if selected
      if (portfolioFiles && portfolioFiles.length > 0) {
        if (portfolioFiles.length > 10) throw new Error("Maximum 10 portfolio images allowed.")
        toast.loading(`Uploading ${portfolioFiles.length} portfolio images...`, { id: loadingToast })
        
        for (let i = 0; i < portfolioFiles.length; i++) {
          const url = await uploadFile(portfolioFiles[i], user.id, 'portfolio')
          portfolioUrls.push(url)
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
        skills,
        certifications: certs,
        bio,
        keywords,
        updated_at: new Date().toISOString()
      }

      if (avatarUrl) updates.avatar_url = avatarUrl
      if (portfolioUrls.length > 0) updates.portfolio_urls = portfolioUrls

      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error

      toast.success("Profile saved successfully!", { id: loadingToast })
      router.push('/dashboard')

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to save profile", { id: loadingToast })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 font-medium">Cancel</Link>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          
          {/* Headshot */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Profile Photo (Headshot)</label>
            <input type="file" accept="image/*" onChange={(e) => setHeadshot(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
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

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Skills (Comma separated)</label>
            <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Bartending, VIP Hosting..." className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Certifications</label>
            <input type="text" value={certs} onChange={e => setCerts(e.target.value)} placeholder="TIPS, ServSafe..." className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Professional Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          {/* Portfolio Images */}
          <div className="border-t pt-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Work Portfolio (Max 10 images)</label>
            <input type="file" multiple accept="image/*" onChange={(e) => setPortfolioFiles(e.target.files)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-indigo-900 text-white py-3 rounded-xl font-bold mt-4 hover:bg-indigo-800 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}