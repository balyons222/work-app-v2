'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isHome = pathname === '/'

  useEffect(() => {
    const getAuthAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }
    }

    getAuthAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getAuthAndProfile()
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/')
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U'
  }

  // --- FIX: Variables must be defined here, before the return statement ---
  const navBg = isHome 
    ? 'bg-transparent border-transparent' 
    : 'bg-white border-slate-200 shadow-sm'
  
  const textColor = isHome ? 'text-white' : 'text-primary'

  return (
    <nav className={`${navBg} border-b sticky top-0 z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image 
                src="/fxd-v2.png" 
                alt="FxD Events" 
                width={150} 
                height={50} 
                // Added brightness-200 to ensure logo pops on dark home background
                className={`h-12 w-auto object-contain transition-all ${isHome ? 'invert brightness-200' : ''}`} 
                priority 
              />
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search" className={`${textColor} hover:text-secondary font-semibold transition-colors`}>Find Talent</Link>
            <Link href="/jobs" className={`${textColor} hover:text-secondary font-semibold transition-colors`}>Find Work</Link>
            
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-slate-200/30">
                <div className="text-right hidden lg:block">
                  <p className={`text-sm font-bold ${textColor} leading-none`}>{profile?.full_name || 'Member'}</p>
                  <Link href="/setup-profile" className="text-[10px] text-secondary font-bold uppercase hover:underline">
                    Edit Profile
                  </Link>
                </div>
                
                <Link href="/dashboard" className="h-10 w-10 rounded-full bg-slate-100/10 border border-slate-200/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-secondary transition-all">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className={`${textColor} font-bold`}>{getInitials(profile?.full_name)}</span>
                  )}
                </Link>

                <button 
                  onClick={handleSignOut}
                  className="bg-secondary hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className={`${textColor} hover:text-secondary font-semibold`}>Log In</Link>
                <Link href="/login?mode=signup" className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-all">
                  Join
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className={`p-2 ${textColor}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className={`md:hidden ${isHome ? 'bg-[#0B0E2A]' : 'bg-white'} border-t border-slate-100/10 px-4 py-6 space-y-4 shadow-inner`}>
          {user && (
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100/10">
               <div className="h-12 w-12 rounded-full bg-slate-100/10 border border-slate-200/20 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className={`${textColor} font-bold text-lg`}>{getInitials(profile?.full_name)}</span>
                )}
              </div>
              <div>
                <p className={`${textColor} font-bold leading-none`}>{profile?.full_name || 'Welcome'}</p>
                <Link href="/setup-profile" onClick={() => setIsOpen(false)} className="text-xs text-secondary font-bold">Edit Profile</Link>
              </div>
            </div>
          )}
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className={`block ${textColor} font-medium`}>Dashboard</Link>
          <Link href="/search" onClick={() => setIsOpen(false)} className={`block ${textColor} font-medium`}>Find Talent</Link>
          <Link href="/jobs" onClick={() => setIsOpen(false)} className={`block ${textColor} font-medium`}>Find Work</Link>
          <hr className="border-slate-100/10" />
          {user ? (
            <button onClick={handleSignOut} className="text-red-500 font-bold block w-full text-left">Sign Out</button>
          ) : (
            <Link href="/login?mode=signup" onClick={() => setIsOpen(false)} className={`block ${textColor} font-bold`}>Join FxD</Link>
          )}
        </div>
      )}
    </nav>
  )
}
