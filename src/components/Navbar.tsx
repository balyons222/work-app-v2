'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/utils/supabase/client'
// ✅ IMPORT THE BELL
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getAuthAndProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
      
      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', authUser.id)
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
    router.push('/')
    router.refresh()
    setIsMobileMenuOpen(false)
  }

  const navBg = 'bg-white/90 backdrop-blur-md border-b border-slate-200'
  const textColor = 'text-slate-900'

  return (
    <nav className={`${navBg} sticky top-0 z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsMobileMenuOpen(false)}>
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
          
          {/* ✅ MOBILE HEADER (Bell + Hamburger) */}
          <div className="flex items-center md:hidden gap-4">
            {/* Show Bell on Mobile Header so it's always visible */}
            {user && <NotificationBell userId={user.id} />}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-primary hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>

          {/* DESKTOP MENU (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link href="/dashboard" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Dashboard</Link>
                <Link href="/search" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Find Talent</Link>
                <Link href="/events" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Events</Link>
                <Link href="/jobs" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Find Work</Link>
                
                <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                  
                  {/* ✅ BELL ICON (Desktop) */}
                  <NotificationBell userId={user.id} />

                  <div className="text-right hidden lg:block">
                    <p className={`text-xs font-black uppercase tracking-tighter ${textColor}`}>
                      {profile?.full_name || 'Member'}
                    </p>
                    <Link href="/setup-profile" className="text-[10px] text-secondary font-bold hover:underline">
                      Edit Profile
                    </Link>
                  </div>

                  {/* Avatar */}
                  <Link href="/dashboard" className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden hover:ring-2 hover:ring-secondary transition-all">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>

                  <button 
                    onClick={handleSignOut}
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/login" 
                  className="bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
                >
                  Sign In
                </Link>
                <Link 
                  href="/login?mode=signup" 
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-primary/10"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU PANEL */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 absolute w-full left-0 top-20 shadow-xl animate-in slide-in-from-top-5">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                   <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-bold text-slate-500">{profile?.full_name?.charAt(0)}</span>
                      )}
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">{profile?.full_name || 'Member'}</p>
                      <Link href="/setup-profile" onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-secondary font-bold">Edit Profile</Link>
                   </div>
                </div>

                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 rounded-md text-base font-bold text-slate-700 hover:text-primary hover:bg-slate-50">Dashboard</Link>
                <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 rounded-md text-base font-bold text-slate-700 hover:text-primary hover:bg-slate-50">Find Talent</Link>
                <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 rounded-md text-base font-bold text-slate-700 hover:text-primary hover:bg-slate-50">Events</Link>
                <Link href="/jobs" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 rounded-md text-base font-bold text-slate-700 hover:text-primary hover:bg-slate-50">Find Work</Link>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left block px-3 py-4 rounded-md text-base font-bold text-red-500 hover:bg-red-50"
                >
                  Log Out
                </button>
              </>
            ) : (
              <div className="space-y-3 p-4">
                <Link 
                  href="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center bg-slate-100 text-slate-900 px-4 py-3 rounded-xl font-bold"
                >
                  Sign In
                </Link>
                <Link 
                  href="/login?mode=signup" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center bg-primary text-white px-4 py-3 rounded-xl font-bold"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
