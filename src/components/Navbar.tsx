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
          .select('full_name, avatar_url')
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

  // Visual Helpers
  const navBg = isHome ? 'bg-transparent border-transparent' : 'bg-white border-slate-200 shadow-sm'
  const textColor = isHome ? 'text-white' : 'text-primary'

  return (
    <nav className={`${navBg} border-b sticky top-0 z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          
          {/* 1. LOGO (Original Color) */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image 
                src="/fxd-v2.png" 
                alt="FxD Events" 
                width={150} 
                height={50} 
                className="h-12 w-auto object-contain" 
                priority 
              />
            </Link>
          </div>
          
          {/* 2. NAVIGATION BUTTONS */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                {/* Logged In View */}
                <Link href="/dashboard" className={`${textColor} font-semibold hover:text-secondary transition-colors`}>Dashboard</Link>
                <Link href="/search" className={`${textColor} font-semibold hover:text-secondary transition-colors`}>Find Talent</Link>
                <Link href="/jobs" className={`${textColor} font-semibold hover:text-secondary transition-colors`}>Find Work</Link>
                
                <div className="flex items-center gap-4 pl-4 border-l border-slate-300/30">
                  <div className="text-right">
                    <p className={`text-xs font-bold leading-none mb-1 ${textColor}`}>{profile?.full_name || 'Member'}</p>
                    <Link href="/setup-profile" className="text-[10px] text-secondary font-bold uppercase hover:underline">
                      Edit Profile
                    </Link>
                  </div>

                  {/* Profile Avatar */}
                  <Link href="/dashboard" className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300/50">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-primary font-bold bg-slate-100">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>

                  <button 
                    onClick={handleSignOut}
                    className="bg-secondary hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Logged Out View */}
                <Link href="/login" className={`${textColor} font-semibold hover:text-secondary transition-colors`}>Sign In</Link>
                <Link 
                  href="/login?mode=signup" 
                  className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className={textColor}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className={`md:hidden ${isHome ? 'bg-[#0B0E2A]' : 'bg-white'} p-4 space-y-4 shadow-xl`}>
          {user ? (
            <>
              <Link href="/dashboard" className={`block font-bold ${textColor}`}>Dashboard</Link>
              <Link href="/setup-profile" className="block text-secondary font-bold">Edit Profile</Link>
              <button onClick={handleSignOut} className="block text-red-500 font-bold">Log Out</button>
            </>
          ) : (
            <Link href="/login" className={`block font-bold ${textColor}`}>Sign In / Sign Up</Link>
          )}
        </div>
      )}
    </nav>
  )
}
