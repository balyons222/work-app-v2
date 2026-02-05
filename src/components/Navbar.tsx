'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  // const pathname = usePathname() // Removed since we want consistent styling
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
  }

  // ✅ FIX: Always use a White/Glass background so text is visible
  const navBg = 'bg-white/90 backdrop-blur-md border-b border-slate-200'
  const textColor = 'text-slate-900'

  return (
    <nav className={`${navBg} sticky top-0 z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              {/* Optional: Add a text logo fallback if image fails or for better SEO */}
               {/* <span className="font-black text-xl tracking-tighter text-slate-900">FxD Events</span> */}
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
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link href="/dashboard" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Dashboard</Link>
                <Link href="/events" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Events</Link>
                <Link href="/jobs" className={`${textColor} font-bold hover:text-secondary transition-colors`}>Find Work</Link>
                
                <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
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
                 {/* ✅ FIX: Made "Sign In" a solid black button for high visibility */}
                <Link 
                  href="/login" 
                  className="bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
                >
                  Sign In
                </Link>
                
                {/* Sign Up Button (Primary Color) */}
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
    </nav>
  )
}
