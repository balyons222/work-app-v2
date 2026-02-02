'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'
import toast from 'react-hot-toast'

export default function SetupProfile() {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('contractor')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setFullName(data.full_name || '')
          setRole(data.role || 'contractor')
          setBio(data.bio || '')
          setSkills(data.skills || '')
          setLocation(data.location || '')
          setAvatarUrl(data.avatar_url || null)
        }
      }
    }
    getProfile()
  }, [supabase]) // Added supabase to dependency array

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      // Clean the filename to avoid URL issues
      const fileName = `${Date.now()}.${fileExt}` 

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setAvatarUrl(data.publicUrl)
      toast.success('Photo uploaded!')
    } catch (error: any) {
      toast.error('Error uploading image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          role: role,
          bio: bio,
          skills: skills,
          location: location,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(), // Use ISO string for consistency
        })

        if (!error) {
          toast.success('Profile finalized!')
          // Standardized redirect logic
          if (role === 'contractor') {
            router.push('/jobs')
          } else {
            router.push('/dashboard')
          }
          router.refresh()
        } else {
          toast.error(error.message)
        }
      }
    } catch (err) {
      toast.error('Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4">
      {/* Progress Bar */}
      <div className="max-w-md w-full mb-8">
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-secondary transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <p className="text-right text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">
          Step {step} of 3
        </p>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-200">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-primary">The Basics</h2>
            <div className="flex flex-col items-center">
              <div className="h-28 w-28 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-slate-300 text-3xl">👤</span>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <span className="text-white text-xs font-bold">{uploading ? '...' : 'Change'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                value={fullName}
                placeholder="Full Name"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" 
                onChange={(e) => setFullName(e.target.value)} 
              />
              <select 
                value={role}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" 
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="contractor">Event Professional</option>
                <option value="organizer">Event Organizer</option>
              </select>
            </div>
            <button onClick={() => setStep(2)} disabled={!fullName} className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:opacity-50">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-primary">Where & What</h2>
            <input 
              value={location}
              placeholder="City, State"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" 
              onChange={(e) => setLocation(e.target.value)} 
            />
            <input 
              value={skills}
              placeholder="Skills (comma separated)"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" 
              onChange={(e) => setSkills(e.target.value)} 
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 font-bold text-slate-400">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-primary text-white font-bold py-4 rounded-xl">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-primary">The Pitch</h2>
            <textarea 
              value={bio}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 outline-none focus:ring-2 focus:ring-secondary" 
              placeholder="Tell your story..."
              onChange={(e) => setBio(e.target.value)} 
            />
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-secondary text-white font-bold py-4 rounded-xl shadow-lg">
              {loading ? 'Finalizing...' : 'Finish Setup'}
            </button>
            <button onClick={handleSubmit} className="w-full text-slate-400 font-bold text-sm">Skip for now</button>
          </div>
        )}
      </div>
    </div>
  )
}
