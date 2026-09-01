'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
]

const ROLE_CATEGORIES = {
  "Operations": [
    "General Event Support", "Site Lead", "Site Manager", "Finish Line Lead", "Start Line Lead", "Course Lead", 
    "Vendor Manager", "Project Manager", "Equipment Operator", "Forklift Operator", "Truck Driver (nonCDL)", 
    "Truck Driver (CDL)", "Electrician/Power", "Volunteer Coordinator", "Expo Lead", "Expo Support", "Warehouse Coordinator"
  ],
  "Technology": [
    "Timer (Mylaps)", "Timer (Chronotrack)", "Timer (Race Result)", "Registration Support (Run Signup)", 
    "Registration Support (Race Roster)", "Registration Support (Haku)", "Sound/Audio"
  ],
  "Marketing/PR/Communications": [
    "Race Announcer", "Public Relations", "Communications Lead", "Marketing Support", "Content Creator", 
    "Social Media Influencer Coordinator", "Social Media Influencer", "Photographer - Content", 
    "Photographer - Individual Runner", "Community Outreach"
  ]
}

const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function ProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step') as string) : 1
  
  const [step, setStep] = useState(initialStep)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('contractor')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  
  // Referral State
  const [inviteCode, setInviteCode] = useState('')
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null)
  const [referredById, setReferredById] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (data) {
          setFullName(data.full_name || '')
          setPhone(data.phone || '')
          setRole(data.role?.toLowerCase() || 'contractor')
          setBio(data.bio || '')
          setAvatarUrl(data.avatar_url || null)
          setMyReferralCode(data.referral_code || null)
          setReferredById(data.referred_by || null)
          
          if (data.location) {
            const parts = data.location.split(', ')
            if (parts.length === 2) {
              setCity(parts[0])
              setState(parts[1])
            } else {
              setCity(data.location)
            }
          }
          
          if (Array.isArray(data.skills)) {
            setSelectedRoles(data.skills)
          } else if (typeof data.skills === 'string') {
            setSelectedRoles(data.skills.split(',').map((s: string) => s.trim()))
          }
        }
      }
    }
    getProfile()
  }, [supabase])

  const toggleRole = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleName))
    } else {
      setSelectedRoles([...selectedRoles, roleName])
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
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

  const handleSaveBasicInfo = async () => {
    if (!fullName || !phone) return toast.error('Name and phone are required')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let finalReferredBy = referredById

      // Process the invite code if they entered one and aren't already referred
      if (inviteCode && !referredById) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', inviteCode)
          .single()

        if (referrer) {
          finalReferredBy = referrer.id
          setReferredById(referrer.id) // Update state
        } else {
          setLoading(false)
          return toast.error('Invalid invite code')
        }
      }

      // Generate their own unique code if they don't have one yet
      const finalReferralCode = myReferralCode || generateReferralCode()
      if (!myReferralCode) setMyReferralCode(finalReferralCode)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          phone,
          role,
          avatar_url: avatarUrl,
          referred_by: finalReferredBy,
          referral_code: finalReferralCode,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      setStep(2)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save basic info')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    if (!city || !state) {
      toast.error('Please enter both City and State')
      setLoading(false)
      return
    }

    const formattedLocation = `${city.trim()}, ${state}`

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          phone: phone, 
          role: role,
          bio: bio,
          skills: selectedRoles, 
          location: formattedLocation,
          avatar_url: avatarUrl,
          referred_by: referredById,
          referral_code: myReferralCode,
          updated_at: new Date().toISOString(),
        })

        if (!error) {
          toast.success('Profile updated!')
          router.push(role === 'contractor' ? '/jobs' : '/dashboard')
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

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full mb-8">
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <p className="text-right text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Step {step} of 3</p>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-slate-200">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              <input value={fullName} placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" onChange={(e) => setFullName(e.target.value)} />
              <input type="tel" value={phone} placeholder="Mobile Phone" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" onChange={(e) => setPhone(e.target.value)} />
              <select value={role} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" onChange={(e) => setRole(e.target.value)}>
                <option value="contractor">Event Professional</option>
                <option value="organizer">Event Organizer</option>
              </select>
              
              {!referredById && (
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 ml-1">
                    Invite Code (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FXD123" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                    maxLength={6}
                  />
                </div>
              )}
            </div>
            
            <button 
              onClick={handleSaveBasicInfo} 
              disabled={!fullName || !phone || loading} 
              className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:bg-slate-800 transition-all"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-black text-primary">{role !== 'organizer' ? 'Your Expertise' : 'Your Location'}</h2>
            
            <div className="flex gap-4">
              <input value={city} placeholder="City (e.g. Austin)" className="w-2/3 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" onChange={(e) => setCity(e.target.value)} />
              <select value={state} onChange={(e) => setState(e.target.value)} className="w-1/3 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary">
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {role !== 'organizer' && (
              <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 sticky top-0 bg-white pb-2 z-10">Select all roles you are qualified for:</p>
                {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-bold text-primary mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => (
                        <button
                          key={r}
                          onClick={() => toggleRole(r)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left ${selectedRoles.includes(r) ? 'bg-secondary text-white border-secondary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-secondary hover:text-secondary'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button onClick={prevStep} className="flex-1 font-bold text-slate-400 hover:text-primary transition-colors">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-white text-secondary border border-secondary font-bold py-4 rounded-xl hover:bg-slate-50 transition-all">{loading ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={nextStep} className="flex-1 bg-primary text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-black text-primary">The Pitch</h2>
            <textarea value={bio} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 outline-none focus:ring-2 focus:ring-secondary" placeholder={role === 'organizer' ? "Tell us about your production company..." : "Tell us about your experience..."} onChange={(e) => setBio(e.target.value)} />
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-secondary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-600 transition-all">
              {loading ? 'Finalizing...' : 'Finish Setup'}
            </button>
            <div className="flex justify-between items-center mt-4">
               <button onClick={prevStep} className="text-slate-400 font-bold text-sm">← Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SetupProfile() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProfileForm />
    </Suspense>
  )
}