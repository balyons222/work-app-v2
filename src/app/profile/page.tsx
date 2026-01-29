'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { JOB_ROLES } from '@/src/constants/roles'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [accountType, setAccountType] = useState('worker') // 'worker' | 'organizer'
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setEmail(user.email || '')

    const { data } = await supabase
      .from('profiles')
      .select('full_name, bio, avatar_url, account_type, skills')
      .eq('id', user.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || '')
      setAccountType(data.account_type || 'worker')
      setSelectedSkills(data.skills || [])
    }
    setLoading(false)
  }

  // Handle Image Upload
  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      toast.success('Image uploaded!')
    } catch (error) {
      toast.error('Error uploading image')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  // Handle Saving Profile
  async function updateProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
        account_type: accountType,
        skills: selectedSkills,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) toast.error('Error updating profile')
    else toast.success('Profile updated!')
  }

  // Toggle Skill Selection
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill))
    } else {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  if (loading) return <div className="p-12 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        
        {/* Account Type Toggle */}
        <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-lg inline-flex">
          <button 
            onClick={() => setAccountType('worker')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${accountType === 'worker' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
          >
            👷 I'm a Worker
          </button>
          <button 
             onClick={() => setAccountType('organizer')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${accountType === 'organizer' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
          >
            🏢 I'm an Organizer
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* LEFT: Image Upload */}
          <div className="col-span-1 flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
               {avatarUrl ? (
                 <img src={avatarUrl} alt="Avatar" className={`w-full h-full object-cover border border-gray-200 ${accountType === 'worker' ? 'rounded-full' : 'rounded-lg'}`} />
               ) : (
                 <div className={`w-full h-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-2 ${accountType === 'worker' ? 'rounded-full' : 'rounded-lg'}`}>
                   {accountType === 'worker' ? 'No Headshot' : 'No Logo'}
                 </div>
               )}
               {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs rounded-full">Uploading...</div>}
            </div>
            
            <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 text-xs font-bold py-2 px-4 rounded hover:bg-gray-50">
              Upload {accountType === 'worker' ? 'Headshot' : 'Logo'}
              <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>

          {/* RIGHT: Basic Info */}
          <div className="col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
              <input type="text" value={email} disabled className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{accountType === 'worker' ? 'Full Name' : 'Company Name'}</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Bio / {accountType === 'worker' ? 'About Me' : 'Company Mission'}</label>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black outline-none" />
            </div>
          </div>
        </div>

        {/* SKILLS SECTION (Only for Workers) */}
        {accountType === 'worker' && (
          <div className="mb-8 border-t border-gray-100 pt-6">
            <h3 className="font-bold text-lg mb-4">Qualified Roles</h3>
            <p className="text-sm text-gray-500 mb-4">Select the roles you are qualified to perform.</p>
            
            <div className="space-y-6">
              {Object.entries(JOB_ROLES).map(([category, roles]) => (
                <div key={category}>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {roles.map(role => (
                      <button
                        key={role}
                        onClick={() => toggleSkill(role)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selectedSkills.includes(role)
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {selectedSkills.includes(role) ? '✓ ' : '+ '} {role}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={updateProfile} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Save Profile
        </button>

      </div>
    </div>
  )
}